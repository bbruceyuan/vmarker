"""
[INPUT]: 依赖 subprocess (FFmpeg), video_probe, pathlib
[OUTPUT]: 对外提供 OverlayPosition, CompositionConfig, compose_vstack()
[POS]: 视频合成模块，将 Bar 视频合成到原视频上方或下方
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
"""

import subprocess
from dataclasses import dataclass
from enum import Enum
from pathlib import Path

from vmarker.video_probe import probe


# =============================================================================
#  枚举和配置
# =============================================================================


class OverlayPosition(Enum):
    """叠加位置"""

    TOP = "top"  # Bar 在视频上方
    BOTTOM = "bottom"  # Bar 在视频下方


@dataclass
class CompositionConfig:
    """合成配置"""

    position: OverlayPosition = OverlayPosition.BOTTOM
    output_format: str = "mp4"  # mp4 或 mov


# =============================================================================
#  核心函数
# =============================================================================


def compose_vstack(
    source_video: Path,
    bar_video: Path,
    output_path: Path,
    config: CompositionConfig | None = None,
) -> Path:
    """
    将 Bar 视频垂直堆叠到源视频上方或下方

    使用 FFmpeg vstack filter 实现垂直堆叠：
    - TOP: Bar 在上，源视频在下
    - BOTTOM: 源视频在上，Bar 在下

    Bar 视频会自动缩放到与源视频相同的宽度。

    Args:
        source_video: 源视频路径
        bar_video: Bar 视频路径
        output_path: 输出路径
        config: 合成配置，默认为 BOTTOM + MP4

    Returns:
        输出文件路径

    Raises:
        FileNotFoundError: 输入文件不存在
        RuntimeError: FFmpeg 执行失败
    """
    if not source_video.exists():
        raise FileNotFoundError(f"源视频不存在: {source_video}")
    if not bar_video.exists():
        raise FileNotFoundError(f"Bar 视频不存在: {bar_video}")

    config = config or CompositionConfig()
    source_info = probe(source_video)

    # 构建 filter_complex
    # 1. 将 bar 缩放到源视频宽度
    # 2. 根据位置决定堆叠顺序
    if config.position == OverlayPosition.TOP:
        # Bar 在上: [bar][source] vstack
        filter_complex = (
            f"[1:v]scale={source_info.width}:-1[bar];"
            f"[bar][0:v]vstack=inputs=2[out]"
        )
    else:
        # Bar 在下: [source][bar] vstack
        filter_complex = (
            f"[1:v]scale={source_info.width}:-1[bar];"
            f"[0:v][bar]vstack=inputs=2[out]"
        )

    # 构建 FFmpeg 命令
    cmd = [
        "ffmpeg",
        "-y",
        "-i",
        str(source_video),
        "-i",
        str(bar_video),
        "-filter_complex",
        filter_complex,
        "-map",
        "[out]",
        "-map",
        "0:a?",  # 保留源视频音频（如果有）
        "-c:v",
        "libx264",
        "-crf",
        "18",
        "-preset",
        "fast",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        str(output_path),
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode != 0:
        raise RuntimeError(f"FFmpeg 合成失败: {result.stderr}")

    return output_path


def get_composed_dimensions(
    source_video: Path,
    bar_height: int,
) -> tuple[int, int]:
    """
    计算合成后视频的尺寸

    Args:
        source_video: 源视频路径
        bar_height: Bar 高度

    Returns:
        (width, height) 合成后的宽高
    """
    info = probe(source_video)
    return (info.width, info.height + bar_height)
