"""
[INPUT]: 依赖 video_encoder
[OUTPUT]: 对外提供 generate() 函数
[POS]: 简单进度条视频生成模块，无章节分段的细线进度条
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
"""

from dataclasses import dataclass
from pathlib import Path
from typing import Callable

from PIL import Image, ImageDraw

from vmarker.video_encoder import VideoEncoder


# =============================================================================
#  数据模型
# =============================================================================

@dataclass
class ProgressBarConfig:
    """进度条配置"""
    duration: float            # 视频时长（秒）
    width: int = 1920          # 视频宽度
    height: int = 8            # 进度条高度（4/8/12）
    played_color: str = "#2563EB"    # 已播放颜色
    unplayed_color: str = "#64748B"  # 未播放颜色


# 回调类型
ProgressCallback = Callable[[float, str], None]


# =============================================================================
#  默认配色
# =============================================================================

DEFAULT_COLORS = {
    "blue": {"played": "#2563EB", "unplayed": "#64748B"},
    "green": {"played": "#10B981", "unplayed": "#6B7280"},
    "red": {"played": "#EF4444", "unplayed": "#6B7280"},
    "purple": {"played": "#8B5CF6", "unplayed": "#6B7280"},
    "orange": {"played": "#F97316", "unplayed": "#6B7280"},
    "white": {"played": "#FFFFFF", "unplayed": "#9CA3AF"},
}


# =============================================================================
#  核心函数
# =============================================================================

def _render_frame(
    config: ProgressBarConfig,
    current_time: float,
) -> Image.Image:
    """渲染单帧进度条"""
    progress = current_time / config.duration if config.duration > 0 else 0
    progress = min(1.0, max(0.0, progress))

    img = Image.new("RGBA", (config.width, config.height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # 计算已播放区域宽度
    played_width = int(config.width * progress)

    # 绘制未播放区域（整个背景）
    draw.rectangle(
        [0, 0, config.width, config.height],
        fill=config.unplayed_color,
    )

    # 绘制已播放区域
    if played_width > 0:
        draw.rectangle(
            [0, 0, played_width, config.height],
            fill=config.played_color,
        )

    return img


def generate(
    config: ProgressBarConfig,
    output_path: str | Path,
    *,
    progress_callback: ProgressCallback | None = None,
    format: str = "mp4",
    key_frame_interval: float | None = None,
) -> Path:
    """
    生成进度条视频

    Args:
        config: 进度条配置
        output_path: 输出文件路径
        progress_callback: 进度回调
        format: 输出格式（mp4/mov）
        key_frame_interval: 关键帧间隔（秒），设置后只渲染关键帧并用 FFmpeg 补帧

    Returns:
        输出文件路径
    """
    output_path = Path(output_path)
    fps = 30

    # 直接传参数，不用 VideoConfig（因为 VideoConfig 的 height 约束是 >= 20）
    encoder = VideoEncoder(config.width, config.height, fps)

    def render_frame(current_time: float) -> Image.Image:
        return _render_frame(config, current_time)

    # 内部进度回调转换
    def internal_callback(frame: int, total: int) -> None:
        if progress_callback:
            percent = (frame / total) * 100
            progress_callback(percent, f"渲染帧 {frame}/{total}")

    encoder.encode(
        config.duration,
        render_frame,
        output_path,
        progress_callback=internal_callback,
        format=format,
        key_frame_interval=key_frame_interval,
    )

    if progress_callback:
        progress_callback(100, "完成")

    return output_path
