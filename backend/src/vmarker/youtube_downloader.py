"""
[INPUT]: 依赖 yt-dlp, pathlib, re
[OUTPUT]: 对外提供 YouTubeInfo, download_audio(), validate_youtube_url()
[POS]: YouTube 音频下载模块，仅下载音轨以加快处理速度
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
"""

import re
from dataclasses import dataclass
from pathlib import Path

import yt_dlp


# =============================================================================
#  常量
# =============================================================================

MAX_DURATION_MINUTES = 30
YOUTUBE_URL_PATTERN = re.compile(
    r"^(https?://)?(www\.)?"
    r"(youtube\.com/(watch\?v=|shorts/)|youtu\.be/)"
    r"[\w-]+"
)


# =============================================================================
#  数据模型
# =============================================================================


@dataclass
class YouTubeInfo:
    """YouTube 视频信息"""

    title: str
    duration: float  # 秒
    audio_path: Path


# =============================================================================
#  核心函数
# =============================================================================


def validate_youtube_url(url: str) -> bool:
    """验证 YouTube URL 格式"""
    return bool(YOUTUBE_URL_PATTERN.match(url.strip()))


def download_audio(url: str, output_dir: Path) -> YouTubeInfo:
    """
    下载 YouTube 视频的音频轨

    Args:
        url: YouTube 视频 URL
        output_dir: 输出目录

    Returns:
        YouTubeInfo 包含标题、时长和音频路径

    Raises:
        ValueError: URL 格式无效或视频超时长
        RuntimeError: 下载失败（私有视频、不存在等）
    """
    if not validate_youtube_url(url):
        raise ValueError("无效的 YouTube 链接")

    output_dir.mkdir(parents=True, exist_ok=True)
    output_template = str(output_dir / "%(id)s.%(ext)s")

    ydl_opts = {
        "format": "bestaudio/best",
        "outtmpl": output_template,
        "quiet": True,
        "no_warnings": True,
        "extract_flat": False,
        "postprocessors": [
            {
                "key": "FFmpegExtractAudio",
                "preferredcodec": "m4a",
                "preferredquality": "128",
            }
        ],
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            title, duration, video_id = _extract_video_info(info)
            _check_duration(duration)

            ydl.download([url])
            audio_path = _find_audio_file(output_dir, video_id)

            return YouTubeInfo(title=title, duration=duration, audio_path=audio_path)

    except yt_dlp.utils.DownloadError as e:
        raise RuntimeError(_parse_download_error(str(e))) from e


# =============================================================================
#  辅助函数
# =============================================================================


def _extract_video_info(info: dict) -> tuple[str, float, str]:
    """从 yt-dlp info dict 提取视频信息"""
    title = info.get("title", "未知标题")
    duration = float(info.get("duration", 0))
    video_id = info.get("id", "unknown")
    return title, duration, video_id


def _check_duration(duration: float) -> None:
    """检查视频时长是否在限制内"""
    max_seconds = MAX_DURATION_MINUTES * 60
    if duration > max_seconds:
        raise ValueError(f"视频时长超过 {MAX_DURATION_MINUTES} 分钟限制")


def _find_audio_file(output_dir: Path, video_id: str) -> Path:
    """查找下载的音频文件"""
    for ext in ("m4a", "mp3", "webm", "opus"):
        audio_path = output_dir / f"{video_id}.{ext}"
        if audio_path.exists():
            return audio_path
    raise RuntimeError("音频文件下载失败")


def _parse_download_error(error_msg: str) -> str:
    """解析下载错误，返回用户友好的消息"""
    if "Private video" in error_msg:
        return "视频不可用：私有视频"
    if "Video unavailable" in error_msg:
        return "视频不存在或已被删除"
    if "Sign in" in error_msg:
        return "视频不可用：需要登录"
    if "age-restricted" in error_msg:
        return "视频不可用：年龄限制"
    return "视频下载失败，请检查链接是否正确"
