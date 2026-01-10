"""
[INPUT]: 依赖 FastAPI, shownotes, parser
[OUTPUT]: 对外提供 router (APIRouter 实例)
[POS]: Show Notes 功能的 API 路由
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
"""

import os
from typing import Annotated

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel

from vmarker import shownotes as sn
from vmarker.parser import decode_srt_bytes, parse_srt


router = APIRouter()


# =============================================================================
#  响应模型
# =============================================================================

class OutlineItemResponse(BaseModel):
    timestamp: float
    title: str


class ShowNotesResponse(BaseModel):
    summary: str
    outline: list[OutlineItemResponse]


# =============================================================================
#  路由
# =============================================================================

@router.post("/generate", response_model=ShowNotesResponse)
async def generate_shownotes(
    file: Annotated[UploadFile, File(description="SRT 字幕文件")],
):
    """从字幕生成视频大纲"""
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
        result = await sn.generate_shownotes(
            srt.subtitles,
            api_key=api_key,
            api_base=api_base,
            model=api_model,
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(500, f"生成大纲失败: {e}")

    return ShowNotesResponse(
        summary=result.summary,
        outline=[
            OutlineItemResponse(timestamp=item.timestamp, title=item.title)
            for item in result.outline
        ],
    )
