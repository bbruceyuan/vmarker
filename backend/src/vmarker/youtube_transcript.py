"""
[INPUT]: 依赖 youtube_transcript_api, re
[OUTPUT]: 对外提供 YouTubeTranscriptInfo, get_transcript(), extract_video_id()
[POS]: YouTube 字幕获取模块，直接从 YouTube 获取现有字幕（自动生成或人工）
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
"""

import re
from dataclasses import dataclass

from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import (
    NoTranscriptFound,
    TranscriptsDisabled,
    VideoUnavailable,
)

from vmarker.models import Subtitle


# =============================================================================
#  常量
# =============================================================================

MAX_DURATION_MINUTES = 60  # 字幕方式支持更长视频
VIDEO_ID_PATTERN = re.compile(
    r"(?:youtube\.com/(?:watch\?v=|shorts/)|youtu\.be/)([\w-]{11})"
)


# =============================================================================
#  数据模型
# =============================================================================


@dataclass
class YouTubeTranscriptInfo:
    """YouTube 字幕信息"""

    video_id: str
    title: str  # 暂时用 video_id 代替
    duration: float
    subtitles: list[Subtitle]


# =============================================================================
#  核心函数
# =============================================================================


def extract_video_id(url: str) -> str | None:
    """从 YouTube URL 提取视频 ID"""
    match = VIDEO_ID_PATTERN.search(url)
    return match.group(1) if match else None


def get_transcript(url: str, languages: list[str] | None = None) -> YouTubeTranscriptInfo:
    """
    从 YouTube 获取字幕

    Args:
        url: YouTube 视频 URL
        languages: 优先语言列表，默认 ["zh-Hans", "zh", "en"]

    Returns:
        YouTubeTranscriptInfo 包含字幕列表和时长

    Raises:
        ValueError: URL 无效或视频 ID 提取失败
        RuntimeError: 字幕获取失败
    """
    video_id = extract_video_id(url)
    if not video_id:
        raise ValueError("无效的 YouTube 链接")

    if languages is None:
        languages = ["zh-Hans", "zh", "zh-Hant", "en"]

    try:
        # 创建 API 实例并列出可用字幕
        ytt_api = YouTubeTranscriptApi()
        transcript_list = ytt_api.list(video_id)

        # 查找最佳字幕
        transcript = _find_best_transcript(transcript_list, languages)

        # 获取原始字幕数据（字典列表）
        fetched = transcript.fetch()
        raw_data = fetched if isinstance(fetched, list) else list(fetched)

        subtitles = _convert_to_subtitles(raw_data)
        duration = _calculate_duration(raw_data)
        _check_duration(duration)

        return YouTubeTranscriptInfo(
            video_id=video_id,
            title=video_id,  # API 不返回标题，用 ID 代替
            duration=duration,
            subtitles=subtitles,
        )

    except VideoUnavailable:
        raise RuntimeError("视频不存在或已被删除")
    except TranscriptsDisabled:
        raise RuntimeError("该视频已禁用字幕")
    except NoTranscriptFound:
        raise RuntimeError("未找到可用字幕（尝试的语言：中文、英文）")
    except Exception as e:
        raise RuntimeError(f"获取字幕失败: {e}")


# =============================================================================
#  辅助函数
# =============================================================================


def _find_best_transcript(transcript_list, languages: list[str]):
    """按优先级查找最佳字幕"""
    # 先尝试手动上传的字幕
    try:
        return transcript_list.find_manually_created_transcript(languages)
    except NoTranscriptFound:
        pass

    # 再尝试自动生成的字幕
    try:
        return transcript_list.find_generated_transcript(languages)
    except NoTranscriptFound:
        pass

    # 最后尝试任何可用的字幕（可能需要翻译）
    for transcript in transcript_list:
        if transcript.language_code in languages:
            return transcript

    # 如果都没有，尝试翻译到中文
    for transcript in transcript_list:
        try:
            return transcript.translate("zh-Hans")
        except Exception:
            continue

    raise NoTranscriptFound(None, languages, transcript_list)


def _convert_to_subtitles(raw_data: list[dict]) -> list[Subtitle]:
    """将 youtube-transcript-api 返回的数据转为 Subtitle 列表"""
    return [
        Subtitle(
            index=i + 1,
            start_time=item["start"],
            end_time=item["start"] + item["duration"],
            text=item["text"].replace("\n", " ").strip(),
        )
        for i, item in enumerate(raw_data)
    ]


def _calculate_duration(raw_data: list[dict]) -> float:
    """从字幕数据计算视频时长"""
    if not raw_data:
        return 0.0
    last = raw_data[-1]
    return last["start"] + last["duration"]


def _check_duration(duration: float) -> None:
    """检查视频时长"""
    max_seconds = MAX_DURATION_MINUTES * 60
    if duration > max_seconds:
        raise ValueError(f"视频时长超过 {MAX_DURATION_MINUTES} 分钟限制")
