"""
[INPUT]: 依赖 httpx, pathlib, models, parser
[OUTPUT]: 对外提供 ASRConfig, transcribe_video()
[POS]: ASR 语音识别模块，支持 OpenAI Whisper API 及兼容服务
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
"""

from dataclasses import dataclass
from pathlib import Path

import httpx

from vmarker.models import SubtitleFile
from vmarker.parser import parse_srt


# =============================================================================
#  配置
# =============================================================================


@dataclass
class ASRConfig:
    """ASR 配置"""

    api_key: str
    api_base: str = "https://api.openai.com/v1"
    model: str = "whisper-1"
    language: str = "zh"
    timeout: float = 300.0  # 5 分钟超时，ASR 处理较慢


# =============================================================================
#  核心函数
# =============================================================================


async def transcribe_video(video_path: Path, config: ASRConfig) -> SubtitleFile:
    """
    使用 Whisper API 转录视频文件

    Whisper API 直接支持常见视频格式（mp4, webm, mov 等），
    无需提取音频。

    Args:
        video_path: 视频文件路径
        config: ASR 配置

    Returns:
        SubtitleFile 实例

    Raises:
        FileNotFoundError: 文件不存在
        httpx.HTTPStatusError: API 请求失败
        ValueError: 响应解析失败
    """
    if not video_path.exists():
        raise FileNotFoundError(f"视频文件不存在: {video_path}")

    url = f"{config.api_base.rstrip('/')}/audio/transcriptions"

    async with httpx.AsyncClient(timeout=config.timeout) as client:
        with open(video_path, "rb") as f:
            # 构建 multipart form data
            files = {"file": (video_path.name, f, _get_mime_type(video_path))}
            data = {
                "model": config.model,
                "language": config.language,
                "response_format": "srt",
            }

            response = await client.post(
                url,
                headers={"Authorization": f"Bearer {config.api_key}"},
                files=files,
                data=data,
            )

        response.raise_for_status()
        srt_content = response.text

    # 复用现有 SRT 解析器
    return parse_srt(srt_content)


async def transcribe_to_srt(video_path: Path, config: ASRConfig) -> str:
    """
    转录视频并返回 SRT 字符串

    Args:
        video_path: 视频文件路径
        config: ASR 配置

    Returns:
        SRT 格式字符串
    """
    if not video_path.exists():
        raise FileNotFoundError(f"视频文件不存在: {video_path}")

    url = f"{config.api_base.rstrip('/')}/audio/transcriptions"

    async with httpx.AsyncClient(timeout=config.timeout) as client:
        with open(video_path, "rb") as f:
            files = {"file": (video_path.name, f, _get_mime_type(video_path))}
            data = {
                "model": config.model,
                "language": config.language,
                "response_format": "srt",
            }

            response = await client.post(
                url,
                headers={"Authorization": f"Bearer {config.api_key}"},
                files=files,
                data=data,
            )

        response.raise_for_status()
        return response.text


# =============================================================================
#  辅助函数
# =============================================================================


def _get_mime_type(path: Path) -> str:
    """根据文件扩展名获取 MIME 类型"""
    mime_map = {
        ".mp4": "video/mp4",
        ".mov": "video/quicktime",
        ".webm": "video/webm",
        ".mkv": "video/x-matroska",
        ".avi": "video/x-msvideo",
        ".mp3": "audio/mpeg",
        ".wav": "audio/wav",
        ".m4a": "audio/mp4",
        ".flac": "audio/flac",
    }
    return mime_map.get(path.suffix.lower(), "application/octet-stream")
