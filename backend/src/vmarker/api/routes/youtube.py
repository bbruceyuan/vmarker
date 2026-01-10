"""
[INPUT]: 依赖 FastAPI, youtube_transcript, youtube_downloader, asr, chapter_bar, temp_manager
[OUTPUT]: 对外提供 router (APIRouter 实例)
[POS]: YouTube 章节生成功能的 API 路由，支持两种模式：字幕提取（快速）和下载 ASR（备选）
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
"""

import os

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from vmarker import chapter_bar
from vmarker.asr import ASRConfig, transcribe_video
from vmarker.temp_manager import TempSession
from vmarker.youtube_downloader import download_audio, validate_youtube_url
from vmarker.youtube_transcript import get_transcript, extract_video_id


router = APIRouter()


# =============================================================================
#  请求/响应模型
# =============================================================================


class YouTubeRequest(BaseModel):
    url: str


class ChapterResponse(BaseModel):
    title: str
    start_time: float
    end_time: float


class YouTubeChaptersResponse(BaseModel):
    video_title: str
    duration: float
    chapters: list[ChapterResponse]
    youtube_format: str


# =============================================================================
#  路由 - 字幕提取方式（推荐，快速，无需登录）
# =============================================================================


@router.post("/from-url", response_model=YouTubeChaptersResponse)
async def generate_chapters_from_transcript(req: YouTubeRequest):
    """
    从 YouTube 链接生成章节（字幕提取方式）

    流程：获取现有字幕 → AI 分段 → 格式化
    优点：快速、无需登录、不消耗 ASR 配额
    """
    api_key = os.getenv("API_KEY", "")
    api_base = os.getenv("API_BASE", "https://api.openai.com/v1")
    api_model = os.getenv("API_MODEL", "gpt-4o-mini")

    if not api_key:
        raise HTTPException(400, "未配置 AI API Key")

    # 验证 URL
    video_id = extract_video_id(req.url)
    if not video_id:
        raise HTTPException(400, "无效的 YouTube 链接")

    # Step 1: 获取字幕
    try:
        info = get_transcript(req.url)
    except ValueError as e:
        raise HTTPException(400, str(e))
    except RuntimeError as e:
        raise HTTPException(400, str(e))

    # Step 2: AI 分段
    try:
        chapter_list = await chapter_bar.extract_ai(
            info.subtitles,
            info.duration,
            api_key=api_key,
            api_base=api_base,
            model=api_model,
        )
    except Exception as e:
        raise HTTPException(500, f"AI 分段失败: {e}")

    # Step 3: 格式化
    youtube_format = _format_youtube_chapters(chapter_list.chapters)

    return YouTubeChaptersResponse(
        video_title=info.video_id,
        duration=info.duration,
        chapters=[
            ChapterResponse(
                title=ch.title,
                start_time=ch.start_time,
                end_time=ch.end_time,
            )
            for ch in chapter_list.chapters
        ],
        youtube_format=youtube_format,
    )


# =============================================================================
#  路由 - 下载 ASR 方式（备选，需要登录）
# =============================================================================


@router.post("/from-url-download", response_model=YouTubeChaptersResponse)
async def generate_chapters_from_download(req: YouTubeRequest):
    """
    从 YouTube 链接生成章节（下载 ASR 方式）

    流程：下载音频 → ASR 转录 → AI 分段 → 格式化
    适用：视频无字幕时的备选方案
    """
    api_key = os.getenv("API_KEY", "")
    api_base = os.getenv("API_BASE", "https://api.openai.com/v1")
    api_model = os.getenv("API_MODEL", "gpt-4o-mini")
    asr_api_base = os.getenv("ASR_API_BASE", api_base)
    asr_model = os.getenv("ASR_MODEL", "whisper-1")

    if not api_key:
        raise HTTPException(400, "未配置 AI API Key")

    if not validate_youtube_url(req.url):
        raise HTTPException(400, "无效的 YouTube 链接")

    session = TempSession()

    try:
        # Step 1: 下载音频
        try:
            info = download_audio(req.url, session.session_dir)
        except ValueError as e:
            raise HTTPException(400, str(e))
        except RuntimeError as e:
            raise HTTPException(400, str(e))

        # Step 2: ASR 转录
        asr_config = ASRConfig(
            api_key=api_key,
            api_base=asr_api_base,
            model=asr_model,
        )
        srt_file = await transcribe_video(info.audio_path, asr_config)

        # Step 3: AI 分段
        chapter_list = await chapter_bar.extract_ai(
            srt_file.subtitles,
            info.duration,
            api_key=api_key,
            api_base=api_base,
            model=api_model,
        )

        # Step 4: 格式化
        youtube_format = _format_youtube_chapters(chapter_list.chapters)

        return YouTubeChaptersResponse(
            video_title=info.title,
            duration=info.duration,
            chapters=[
                ChapterResponse(
                    title=ch.title,
                    start_time=ch.start_time,
                    end_time=ch.end_time,
                )
                for ch in chapter_list.chapters
            ],
            youtube_format=youtube_format,
        )

    finally:
        session.cleanup()


# =============================================================================
#  辅助函数
# =============================================================================


def _format_youtube_chapters(chapters: list) -> str:
    """格式化为 YouTube Description 时间戳格式"""
    lines = []
    for ch in chapters:
        timestamp = _format_timestamp(ch.start_time)
        lines.append(f"{timestamp} {ch.title}")
    return "\n".join(lines)


def _format_timestamp(seconds: float) -> str:
    """将秒数格式化为 YouTube 时间戳"""
    total_seconds = int(seconds)
    hours = total_seconds // 3600
    minutes = (total_seconds % 3600) // 60
    secs = total_seconds % 60

    if hours > 0:
        return f"{hours}:{minutes:02d}:{secs:02d}"
    return f"{minutes}:{secs:02d}"
