"""
[INPUT]: 依赖 FastAPI, subtitle, parser
[OUTPUT]: 对外提供 router (APIRouter 实例)
[POS]: 字幕润色功能的 API 路由
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
"""

import os
from typing import Annotated

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel

from vmarker import subtitle as sub
from vmarker.parser import decode_srt_bytes, parse_srt


router = APIRouter()


# =============================================================================
#  响应模型
# =============================================================================

class PolishedSubtitleItem(BaseModel):
    index: int
    start_time: float
    end_time: float
    original_text: str
    polished_text: str
    changed: bool


class PolishResponse(BaseModel):
    subtitles: list[PolishedSubtitleItem]
    changes_count: int
    srt_content: str  # 润色后的 SRT 文件内容


# =============================================================================
#  路由
# =============================================================================

@router.post("/polish", response_model=PolishResponse)
async def polish_subtitles(
    file: Annotated[UploadFile, File(description="SRT 字幕文件")],
):
    """润色字幕"""
    # 获取 AI 配置
    api_key = os.getenv("API_KEY", "")
    api_base = os.getenv("API_BASE", "https://api.openai.com/v1")
    api_model = os.getenv("API_MODEL", "gpt-4o-mini")

    if not api_key:
        raise HTTPException(400, "未配置 AI API Key，请在 backend/.env 中设置 API_KEY")

    if not file.filename or not file.filename.endswith(".srt"):
        raise HTTPException(400, "请上传 .srt 文件")

    try:
        content = decode_srt_bytes(await file.read())
        srt = parse_srt(content)
    except ValueError as e:
        raise HTTPException(400, str(e))

    try:
        result = await sub.polish_subtitles(
            srt.subtitles,
            api_key=api_key,
            api_base=api_base,
            model=api_model,
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(500, f"润色字幕失败: {e}")

    # 生成 SRT 内容
    srt_content = sub.generate_srt(result.subtitles)

    return PolishResponse(
        subtitles=[
            PolishedSubtitleItem(
                index=s.index,
                start_time=s.start_time,
                end_time=s.end_time,
                original_text=s.original_text,
                polished_text=s.polished_text,
                changed=s.original_text != s.polished_text,
            )
            for s in result.subtitles
        ],
        changes_count=result.changes_count,
        srt_content=srt_content,
    )


@router.post("/download")
async def download_polished(
    file: Annotated[UploadFile, File(description="SRT 字幕文件")],
):
    """润色字幕并直接返回 SRT 文件"""
    # 获取 AI 配置
    api_key = os.getenv("API_KEY", "")
    api_base = os.getenv("API_BASE", "https://api.openai.com/v1")
    api_model = os.getenv("API_MODEL", "gpt-4o-mini")

    if not api_key:
        raise HTTPException(400, "未配置 AI API Key")

    if not file.filename or not file.filename.endswith(".srt"):
        raise HTTPException(400, "请上传 .srt 文件")

    try:
        content = decode_srt_bytes(await file.read())
        srt = parse_srt(content)
    except ValueError as e:
        raise HTTPException(400, str(e))

    try:
        result = await sub.polish_subtitles(
            srt.subtitles,
            api_key=api_key,
            api_base=api_base,
            model=api_model,
        )
    except Exception as e:
        raise HTTPException(500, f"润色字幕失败: {e}")

    srt_content = sub.generate_srt(result.subtitles)

    # 生成文件名
    original_name = file.filename.rsplit(".", 1)[0] if file.filename else "subtitles"
    filename = f"{original_name}_polished.srt"

    return Response(
        content=srt_content.encode("utf-8"),
        media_type="text/plain; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
