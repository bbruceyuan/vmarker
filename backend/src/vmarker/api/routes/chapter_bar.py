"""
[INPUT]: 依赖 FastAPI, chapter_bar, parser, themes, models
[OUTPUT]: 对外提供 router (APIRouter 实例)
[POS]: Chapter Bar 功能的 API 路由
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
"""

import os
from pathlib import Path
from tempfile import TemporaryDirectory
from typing import Annotated

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel

from vmarker import chapter_bar as cb
from vmarker.models import Chapter, ChapterBarConfig, ChapterValidationResult, ColorScheme, VideoConfig
from vmarker.parser import decode_srt_bytes, parse_srt
from vmarker.themes import THEMES, get_theme


router = APIRouter()


# =============================================================================
#  响应模型
# =============================================================================

class ThemeInfo(BaseModel):
    name: str
    display_name: str
    played_bg: str
    unplayed_bg: str


class ParseResponse(BaseModel):
    subtitle_count: int
    duration: float


class ChaptersResponse(BaseModel):
    chapters: list[Chapter]
    duration: float


class CustomColors(BaseModel):
    """自定义配色"""
    played_bg: str
    unplayed_bg: str


class GenerateRequest(BaseModel):
    chapters: list[Chapter]
    duration: float
    width: int = 1920
    height: int = 60
    theme: str = "tech-blue"
    format: str = "mp4"  # "mp4" 通用格式 / "mov" 透明背景
    custom_colors: CustomColors | None = None  # 自定义配色（优先于 theme）


# =============================================================================
#  路由
# =============================================================================

@router.get("/themes", response_model=list[ThemeInfo])
async def get_themes():
    """获取配色方案列表"""
    return [
        ThemeInfo(
            name=name,
            display_name=scheme.name,
            played_bg=scheme.played_bg,
            unplayed_bg=scheme.unplayed_bg,
        )
        for name, scheme in THEMES.items()
    ]


@router.post("/parse", response_model=ParseResponse)
async def parse_srt_file(
    file: Annotated[UploadFile, File(description="SRT 字幕文件")],
):
    """解析 SRT 文件"""
    if not file.filename or not file.filename.endswith(".srt"):
        raise HTTPException(400, "请上传 .srt 文件")

    try:
        content = decode_srt_bytes(await file.read())
        result = parse_srt(content)
    except ValueError as e:
        raise HTTPException(400, str(e))

    return ParseResponse(subtitle_count=len(result.subtitles), duration=result.duration)


@router.post("/chapters/auto", response_model=ChaptersResponse)
async def extract_auto(
    file: Annotated[UploadFile, File(description="SRT 字幕文件")],
    interval: Annotated[int, Form(ge=30, le=300)] = 60,
):
    """自动分段提取章节"""
    try:
        content = decode_srt_bytes(await file.read())
        srt = parse_srt(content)
    except ValueError as e:
        raise HTTPException(400, str(e))

    chapters = cb.extract_auto(srt.subtitles, srt.duration, interval)
    return ChaptersResponse(chapters=chapters.chapters, duration=chapters.duration)


@router.post("/chapters/ai", response_model=ChaptersResponse)
async def extract_ai(
    file: Annotated[UploadFile, File(description="SRT 字幕文件")],
):
    """AI 智能分段提取章节"""
    # 从环境变量获取配置（使用 .env 中的变量名）
    api_key = os.getenv("API_KEY", "")
    api_base = os.getenv("API_BASE", "https://api.openai.com/v1")
    api_model = os.getenv("API_MODEL", "gpt-4o-mini")

    if not api_key:
        raise HTTPException(400, "未配置 AI API Key，请在 backend/.env 中设置 API_KEY")

    try:
        content = decode_srt_bytes(await file.read())
        srt = parse_srt(content)
    except ValueError as e:
        raise HTTPException(400, str(e))

    try:
        chapters = await cb.extract_ai(
            srt.subtitles, srt.duration,
            api_key=api_key, api_base=api_base, model=api_model,
        )
    except Exception as e:
        # 打印错误日志便于调试
        import traceback
        traceback.print_exc()
        # 降级到自动分段
        chapters = cb.extract_auto(srt.subtitles, srt.duration)

    return ChaptersResponse(chapters=chapters.chapters, duration=chapters.duration)


@router.post("/validate", response_model=ChapterValidationResult)
async def validate_chapters(chapters: list[Chapter], duration: float):
    """验证章节配置"""
    return cb.validate(chapters, duration)


@router.post("/generate")
async def generate_video(request: GenerateRequest):
    """生成章节进度条视频"""
    if request.format not in ("mp4", "mov"):
        raise HTTPException(400, "format 必须是 'mp4' 或 'mov'")

    # 确定配色方案
    if request.custom_colors:
        # 使用自定义配色
        scheme = ColorScheme(
            name="自定义",
            played_bg=request.custom_colors.played_bg,
            unplayed_bg=request.custom_colors.unplayed_bg,
            played_text="#FFFFFF",
            unplayed_text="#FFFFFF",
            indicator="#FFFFFF",
            separator="#FFFFFF",
        )
    else:
        # 使用预设主题
        if request.theme not in THEMES:
            raise HTTPException(400, f"配色方案 '{request.theme}' 不存在")
        scheme = get_theme(request.theme)

    validation = cb.validate(request.chapters, request.duration)
    if not validation.valid:
        blocking = [i for i in validation.issues if i.blocking]
        raise HTTPException(400, f"章节配置错误: {blocking[0].message}")

    config = ChapterBarConfig(
        chapters=validation.chapters,
        duration=request.duration,
        video=VideoConfig(width=request.width, height=request.height),
        theme=request.theme,
    )

    # 根据格式选择文件扩展名和 MIME 类型
    if request.format == "mp4":
        filename = "chapter_bar.mp4"
        media_type = "video/mp4"
    else:
        filename = "chapter_bar.mov"
        media_type = "video/quicktime"

    with TemporaryDirectory() as tmpdir:
        output = Path(tmpdir) / filename
        try:
            cb.generate(config, output, format=request.format, scheme=scheme)
        except RuntimeError as e:
            raise HTTPException(500, f"生成失败: {e}")

        # 读取文件内容到内存，避免 TemporaryDirectory 退出后文件消失
        content = output.read_bytes()

    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
