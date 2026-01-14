"""
[INPUT]: 依赖 subprocess, asyncio, pathlib, video_probe, video_composer, os
[OUTPUT]: 对外提供 ParallelConfig, compose_vstack_parallel()
[POS]: 并行视频合成模块，将长视频分片并行处理后再拼接
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
"""

import asyncio
import os
import subprocess
from dataclasses import dataclass
from dataclasses import field as dc_field
from enum import Enum
from pathlib import Path

from vmarker.video_probe import probe
from vmarker.video_composer import OverlayPosition


# =============================================================================
#  环境变量配置
# =============================================================================

DEFAULT_CHUNK_SECONDS = int(os.getenv("COMPOSE_CHUNK_SECONDS", "300"))  # 默认 5 分钟
DEFAULT_MAX_WORKERS = int(os.getenv("COMPOSE_MAX_WORKERS", "2"))  # 并发上限
DEFAULT_MAX_ACTIVE_JOBS = int(os.getenv("COMPOSE_MAX_ACTIVE_JOBS", "2"))  # 最大活动任务数


# =============================================================================
#  枚举和数据模型
# =============================================================================


class JobStatus(str, Enum):
    """任务状态"""
    QUEUED = "queued"
    RUNNING = "running"
    DONE = "done"
    FAILED = "failed"


@dataclass
class Segment:
    """分片信息"""
    index: int
    start: float  # 开始时间（秒）
    duration: float  # 时长（秒）
    status: JobStatus = JobStatus.QUEUED
    output_path: Path | None = None
    error: str | None = None


@dataclass
class ParallelConfig:
    """并行合成配置"""
    position: OverlayPosition = OverlayPosition.BOTTOM
    chunk_seconds: int = DEFAULT_CHUNK_SECONDS
    max_workers: int = DEFAULT_MAX_WORKERS
    gop_multiplier: int = 2  # GOP = fps * gop_multiplier

    def __post_init__(self):
        """验证配置参数"""
        if self.chunk_seconds <= 0:
            raise ValueError(f"chunk_seconds must be positive, got {self.chunk_seconds}")
        if self.max_workers <= 0:
            raise ValueError(f"max_workers must be positive, got {self.max_workers}")


@dataclass
class JobProgress:
    """任务进度"""
    job_id: str
    status: JobStatus
    total_segments: int
    completed_segments: int = 0
    failed_segments: int = 0
    segments: list[Segment] = dc_field(default_factory=list)
    error: str | None = None


# =============================================================================
#  核心函数
# =============================================================================


def calculate_segments(duration: float, chunk_seconds: int) -> list[Segment]:
    """
    计算视频分片

    Args:
        duration: 视频总时长（秒）
        chunk_seconds: 每片时长（秒）

    Returns:
        Segment 列表

    Raises:
        ValueError: chunk_seconds <= 0
    """
    if chunk_seconds <= 0:
        raise ValueError(f"chunk_seconds must be positive, got {chunk_seconds}")

    segments: list[Segment] = []
    index = 0
    start = 0.0

    while start < duration:
        # 计算当前分片的时长（最后一片可能不足 chunk_seconds）
        remaining = duration - start
        segment_duration = min(chunk_seconds, remaining)

        segments.append(Segment(
            index=index,
            start=start,
            duration=segment_duration,
        ))

        start += segment_duration
        index += 1

    return segments


async def compose_segment(
    source_video: Path,
    bar_video: Path,
    segment: Segment,
    output_path: Path,
    config: ParallelConfig,
    source_info: "VideoInfo",  # type: ignore
) -> Path:
    """
    合成单个分片

    使用固定 GOP 确保拼接时关键帧对齐。
    """
    # 计算 GOP（关键帧间隔）
    gop = int(source_info.fps * config.gop_multiplier)

    # 构建 filter_complex
    if config.position == OverlayPosition.TOP:
        filter_complex = (
            f"[1:v]scale={source_info.width}:-1[bar];"
            f"[bar][0:v]vstack=inputs=2[out]"
        )
    else:
        filter_complex = (
            f"[1:v]scale={source_info.width}:-1[bar];"
            f"[0:v][bar]vstack=inputs=2[out]"
        )

    # 构建命令
    cmd = [
        "ffmpeg", "-y",
        # 输入源视频（分片）
        "-ss", str(segment.start),
        "-t", str(segment.duration),
        "-i", str(source_video),
        # 输入 Bar 视频（分片）
        "-ss", str(segment.start),
        "-t", str(segment.duration),
        "-i", str(bar_video),
        # 滤镜
        "-filter_complex", filter_complex,
        "-map", "[out]",
        "-map", "0:a?",  # 保留音频（如果有）
        # 视频编码：固定 GOP
        "-c:v", "libx264",
        "-crf", "18",
        "-preset", "fast",
        "-g", str(gop),
        "-keyint_min", str(gop),
        "-sc_threshold", "0",  # 禁用场景切换检测
        # 音频编码
        "-c:a", "aac",
        "-b:a", "128k",
        # 重置时间戳（便于拼接）
        "-reset_timestamps", "1",
        "-fflags", "+genpts",  # 生成 PTS
        # 输出
        str(output_path),
    ]

    # 运行 FFmpeg
    process = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )

    _, stderr = await process.communicate()

    if process.returncode != 0:
        error_msg = stderr.decode("utf-8", errors="ignore")[-500:]  # 最后 500 字符
        raise RuntimeError(f"FFmpeg 分片合成失败: {error_msg}")

    return output_path


async def compose_segments_parallel(
    source_video: Path,
    bar_video: Path,
    segments: list[Segment],
    output_dir: Path,
    config: ParallelConfig,
    source_info: "VideoInfo",  # type: ignore
) -> list[Path]:
    """
    并行合成所有分片

    Args:
        source_video: 源视频路径
        bar_video: Bar 视频路径
        segments: 分片列表
        output_dir: 输出目录
        config: 并行配置
        source_info: 源视频信息

    Returns:
        输出文件路径列表（按索引排序）
    """
    semaphore = asyncio.Semaphore(config.max_workers)

    async def process_segment(seg: Segment) -> tuple[int, Path]:
        """处理单个分片（带并发控制）"""
        async with semaphore:
            seg.status = JobStatus.RUNNING
            output_path = output_dir / f"segment_{seg.index:04d}.mp4"

            try:
                result = await compose_segment(
                    source_video, bar_video, seg, output_path, config, source_info
                )
                seg.status = JobStatus.DONE
                seg.output_path = result
                return (seg.index, result)
            except Exception as e:
                seg.status = JobStatus.FAILED
                seg.error = str(e)
                raise

    # 并行处理所有分片
    tasks = [process_segment(seg) for seg in segments]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    # 收集成功的输出
    outputs: dict[int, Path] = {}
    for result in results:
        if isinstance(result, Exception):
            continue
        index, path = result
        outputs[index] = path

    # 按索引排序返回
    return [outputs[i] for i in range(len(segments)) if i in outputs]


def concat_segments(
    segment_paths: list[Path],
    output_path: Path,
    reencode: bool = False,
) -> Path:
    """
    拼接分片

    Args:
        segment_paths: 分片文件路径列表（按顺序）
        output_path: 输出路径
        reencode: 是否强制重编码（False 时先尝试 -c copy）

    Returns:
        输出文件路径
    """
    if not segment_paths:
        raise RuntimeError("没有可拼接的分片")

    # 生成 concat 列表文件
    concat_file = output_path.parent / "segments.txt"
    with open(concat_file, "w") as f:
        for path in segment_paths:
            # 转义路径中的特殊字符
            safe_path = str(path).replace("'", r"\'")
            f.write(f"file '{safe_path}'\n")

    # 先尝试无重编码拼接
    if not reencode:
        cmd = [
            "ffmpeg", "-y",
            "-f", "concat",
            "-safe", "0",
            "-i", str(concat_file),
            "-c", "copy",
            str(output_path),
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)

        if result.returncode == 0 and output_path.exists():
            return output_path

    # 降级到重编码拼接
    cmd = [
        "ffmpeg", "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", str(concat_file),
        "-c:v", "libx264",
        "-crf", "18",
        "-preset", "fast",
        "-c:a", "aac",
        "-b:a", "128k",
        str(output_path),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode != 0:
        raise RuntimeError(f"FFmpeg 拼接失败: {result.stderr}")

    return output_path


def cleanup_segments(segment_paths: list[Path]) -> None:
    """清理分片文件"""
    for path in segment_paths:
        try:
            if path.exists():
                path.unlink()
        except Exception:
            pass  # 忽略清理错误


async def compose_vstack_parallel(
    source_video: Path,
    bar_video: Path,
    output_path: Path,
    config: ParallelConfig | None = None,
) -> Path:
    """
    并行合成视频（垂直堆叠 Bar）

    流程：
    1. 计算分片
    2. 并行合成各分片
    3. 拼接分片
    4. 清理临时文件

    Args:
        source_video: 源视频路径
        bar_video: Bar 视频路径
        output_path: 输出路径
        config: 并行配置

    Returns:
        输出文件路径

    Raises:
        FileNotFoundError: 输入文件不存在
        RuntimeError: 合成失败
    """
    if not source_video.exists():
        raise FileNotFoundError(f"源视频不存在: {source_video}")
    if not bar_video.exists():
        raise FileNotFoundError(f"Bar 视频不存在: {bar_video}")

    config = config or ParallelConfig()
    source_info = probe(source_video)

    # 1. 计算分片
    segments = calculate_segments(source_info.duration, config.chunk_seconds)

    # 如果只有一个分片，直接使用原有串行逻辑
    if len(segments) == 1:
        from vmarker.video_composer import compose_vstack, CompositionConfig
        serial_config = CompositionConfig(position=config.position)
        return compose_vstack(source_video, bar_video, output_path, serial_config)

    # 2. 并行合成分片
    output_dir = output_path.parent
    segment_outputs = await compose_segments_parallel(
        source_video, bar_video, segments, output_dir, config, source_info
    )

    if len(segment_outputs) != len(segments):
        raise RuntimeError(f"部分分片合成失败: {len(segment_outputs)}/{len(segments)} 成功")

    # 3. 拼接分片
    concat_segments(segment_outputs, output_path, reencode=False)

    # 4. 清理临时分片
    cleanup_segments(segment_outputs)

    # 清理 concat 列表文件
    concat_file = output_dir / "segments.txt"
    try:
        if concat_file.exists():
            concat_file.unlink()
    except Exception:
        pass

    return output_path
