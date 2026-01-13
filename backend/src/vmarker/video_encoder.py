"""
[INPUT]: 依赖 Pillow, subprocess (FFmpeg)
[OUTPUT]: 对外提供 VideoEncoder, hex_to_rgba(), get_font()
[POS]: 视频编码工具，被 chapter_bar 和未来的 progress_bar 消费
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
"""

import subprocess
import tempfile
from collections.abc import Callable, Iterator
from contextlib import contextmanager
from pathlib import Path

from PIL import Image, ImageFont


# =============================================================================
#  类型定义
# =============================================================================

ProgressCallback = Callable[[int, int], None]
FrameRenderer = Callable[[float], Image.Image]


# =============================================================================
#  颜色工具
# =============================================================================

def hex_to_rgba(hex_color: str, alpha: int = 255) -> tuple[int, int, int, int]:
    """十六进制颜色转 RGBA"""
    hex_color = hex_color.lstrip("#")
    r = int(hex_color[0:2], 16)
    g = int(hex_color[2:4], 16)
    b = int(hex_color[4:6], 16)
    return (r, g, b, alpha)


# =============================================================================
#  字体工具
# =============================================================================

_FONT_PATHS = [
    # macOS
    "/System/Library/Fonts/PingFang.ttc",
    "/System/Library/Fonts/STHeiti Light.ttc",
    # Linux
    "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
    # Windows
    "C:/Windows/Fonts/msyh.ttc",
    "C:/Windows/Fonts/simhei.ttf",
]


def get_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    """获取字体，优先使用系统中文字体"""
    for path in _FONT_PATHS:
        if Path(path).exists():
            try:
                return ImageFont.truetype(path, size)
            except OSError:
                continue
    return ImageFont.load_default()


# =============================================================================
#  视频编码器
# =============================================================================

class VideoEncoder:
    """视频编码器（基于 FFmpeg）"""

    def __init__(self, width: int, height: int, fps: int = 30):
        self.width = width
        self.height = height
        self.fps = fps

    @contextmanager
    def _temp_dir(self) -> Iterator[Path]:
        """创建临时目录"""
        with tempfile.TemporaryDirectory() as tmpdir:
            yield Path(tmpdir)

    def encode(
        self,
        duration: float,
        render_frame: FrameRenderer,
        output_path: Path,
        *,
        progress_callback: ProgressCallback | None = None,
        format: str = "webm",
        key_frame_interval: float | None = None,
    ) -> Path:
        """
        编码视频

        Args:
            duration: 视频时长（秒）
            render_frame: 帧渲染函数，接收当前时间，返回 PIL Image
            output_path: 输出路径
            progress_callback: 进度回调
            format: 输出格式 ("webm" 或 "mov")
            key_frame_interval: 关键帧间隔（秒），设置后只渲染关键帧并用 FFmpeg 补帧

        Returns:
            输出文件路径
        """
        total_frames = int(duration * self.fps)
        frame_step = self._key_frame_step(key_frame_interval)

        with self._temp_dir() as tmpdir:
            if frame_step > 1:
                total_keyframes = (total_frames + frame_step - 1) // frame_step
                keyframe_idx = 0
                for frame_idx in range(0, total_frames, frame_step):
                    current_time = frame_idx / self.fps
                    img = render_frame(current_time)
                    frame_path = tmpdir / f"frame_{keyframe_idx:06d}.png"
                    img.save(frame_path, "PNG")

                    if progress_callback:
                        progress_callback(keyframe_idx + 1, total_keyframes)
                    keyframe_idx += 1

                filter_chain = f"fps={self.fps}"
                input_fps = self.fps / frame_step
                self._ffmpeg_encode(
                    tmpdir,
                    output_path,
                    format,
                    input_fps=input_fps,
                    filter_arg=filter_chain,
                )
            else:
                # 渲染所有帧
                for frame_idx in range(total_frames):
                    current_time = frame_idx / self.fps
                    img = render_frame(current_time)
                    frame_path = tmpdir / f"frame_{frame_idx:06d}.png"
                    img.save(frame_path, "PNG")

                    if progress_callback:
                        progress_callback(frame_idx + 1, total_frames)

                # FFmpeg 合成
                self._ffmpeg_encode(tmpdir, output_path, format)

        return output_path

    def _ffmpeg_encode(
        self,
        frames_dir: Path,
        output_path: Path,
        format: str,
        *,
        input_fps: float | None = None,
        filter_arg: str | None = None,
    ) -> None:
        """调用 FFmpeg 合成视频"""
        input_fps = self.fps if input_fps is None else input_fps
        if format == "mp4":
            # MP4 (H.264) - 通用格式，浏览器兼容，文件小
            cmd = [
                "ffmpeg",
                "-y",
                "-framerate", str(input_fps),
                "-i", str(frames_dir / "frame_%06d.png"),
            ]
            if filter_arg:
                cmd.extend(["-vf", filter_arg])
            cmd += [
                "-c:v", "libx264",
                "-pix_fmt", "yuv420p",
                "-crf", "18",
                "-preset", "fast",
                str(output_path),
            ]
        else:
            # MOV (PNG codec) - 透明背景，专业剪辑
            cmd = [
                "ffmpeg",
                "-y",
                "-framerate", str(input_fps),
                "-i", str(frames_dir / "frame_%06d.png"),
            ]
            if filter_arg:
                cmd.extend(["-vf", filter_arg])
            cmd += [
                "-c:v", "png",
                "-pix_fmt", "rgba",
                str(output_path),
            ]

        result = subprocess.run(cmd, capture_output=True, text=True)

        if result.returncode != 0:
            raise RuntimeError(f"FFmpeg 执行失败: {result.stderr}")

    def _key_frame_step(self, key_frame_interval: float | None) -> int:
        if key_frame_interval is None:
            return 1
        if key_frame_interval <= 0:
            return 1
        return max(1, int(self.fps * key_frame_interval))
