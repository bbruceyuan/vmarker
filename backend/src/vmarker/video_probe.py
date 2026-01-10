"""
[INPUT]: 依赖 subprocess (FFprobe), json, pathlib
[OUTPUT]: 对外提供 VideoInfo, probe(), validate_video()
[POS]: 视频元数据探测模块，为视频上传和合成提供基础信息
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
"""

import json
import subprocess
from dataclasses import dataclass
from pathlib import Path


# =============================================================================
#  数据模型
# =============================================================================


@dataclass
class VideoInfo:
    """视频元数据"""

    duration: float  # 时长（秒）
    width: int  # 宽度
    height: int  # 高度
    fps: float  # 帧率
    codec: str  # 编码格式
    file_size: int  # 文件大小（字节）


# =============================================================================
#  常量
# =============================================================================

DEFAULT_MAX_DURATION = 300  # 5 分钟
DEFAULT_MAX_SIZE_MB = 500  # 500MB


# =============================================================================
#  核心函数
# =============================================================================


def probe(video_path: Path) -> VideoInfo:
    """
    探测视频元数据

    Args:
        video_path: 视频文件路径

    Returns:
        VideoInfo 实例

    Raises:
        FileNotFoundError: 文件不存在
        RuntimeError: FFprobe 执行失败
        ValueError: 无法解析视频信息
    """
    if not video_path.exists():
        raise FileNotFoundError(f"视频文件不存在: {video_path}")

    cmd = [
        "ffprobe",
        "-v",
        "quiet",
        "-print_format",
        "json",
        "-show_format",
        "-show_streams",
        str(video_path),
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode != 0:
        raise RuntimeError(f"FFprobe 执行失败: {result.stderr}")

    try:
        data = json.loads(result.stdout)
    except json.JSONDecodeError as e:
        raise ValueError(f"无法解析 FFprobe 输出: {e}") from e

    # 查找视频流
    video_stream = next(
        (s for s in data.get("streams", []) if s.get("codec_type") == "video"),
        None,
    )

    if not video_stream:
        raise ValueError("未找到视频流")

    # 解析帧率 (如 "30/1" 或 "29.97")
    fps = _parse_frame_rate(video_stream.get("r_frame_rate", "30/1"))

    # 解析时长
    duration = _parse_duration(data, video_stream)

    return VideoInfo(
        duration=duration,
        width=int(video_stream["width"]),
        height=int(video_stream["height"]),
        fps=fps,
        codec=video_stream.get("codec_name", "unknown"),
        file_size=int(data["format"].get("size", 0)),
    )


def validate_video(
    video_path: Path,
    max_duration: float = DEFAULT_MAX_DURATION,
    max_size_mb: float = DEFAULT_MAX_SIZE_MB,
) -> VideoInfo:
    """
    验证视频是否满足限制条件

    Args:
        video_path: 视频路径
        max_duration: 最大时长（秒），默认 5 分钟
        max_size_mb: 最大文件大小（MB），默认 500MB

    Returns:
        VideoInfo 实例（验证通过）

    Raises:
        ValueError: 视频不满足限制条件
    """
    info = probe(video_path)

    if info.duration > max_duration:
        raise ValueError(
            f"视频时长 {info.duration:.1f}s 超出限制 {max_duration}s (约 {max_duration / 60:.0f} 分钟)"
        )

    max_size_bytes = max_size_mb * 1024 * 1024
    if info.file_size > max_size_bytes:
        raise ValueError(
            f"文件大小 {info.file_size / 1024 / 1024:.1f}MB 超出限制 {max_size_mb}MB"
        )

    return info


# =============================================================================
#  辅助函数
# =============================================================================


def _parse_frame_rate(fps_str: str) -> float:
    """解析帧率字符串"""
    if "/" in fps_str:
        parts = fps_str.split("/")
        if len(parts) == 2 and parts[1] != "0":
            return float(parts[0]) / float(parts[1])
    try:
        return float(fps_str)
    except ValueError:
        return 30.0  # 默认帧率


def _parse_duration(data: dict, video_stream: dict) -> float:
    """从多个来源解析时长"""
    # 优先使用 format.duration
    if "format" in data and "duration" in data["format"]:
        try:
            return float(data["format"]["duration"])
        except (ValueError, TypeError):
            pass

    # 其次使用流的 duration
    if "duration" in video_stream:
        try:
            return float(video_stream["duration"])
        except (ValueError, TypeError):
            pass

    # 最后尝试从帧数计算
    if "nb_frames" in video_stream:
        try:
            nb_frames = int(video_stream["nb_frames"])
            fps = _parse_frame_rate(video_stream.get("r_frame_rate", "30/1"))
            return nb_frames / fps
        except (ValueError, TypeError):
            pass

    raise ValueError("无法确定视频时长")
