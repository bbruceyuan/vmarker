"""
[INPUT]: 依赖 FastAPI, progress_bar
[OUTPUT]: 对外提供 router (APIRouter 实例)
[POS]: Progress Bar 功能的 API 路由
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
"""

from pathlib import Path
from tempfile import TemporaryDirectory

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field

from vmarker import progress_bar as pb


router = APIRouter()


# =============================================================================
#  请求/响应模型
# =============================================================================

class ColorOption(BaseModel):
    name: str
    display_name: str
    played: str
    unplayed: str


class GenerateRequest(BaseModel):
    duration: float = Field(..., gt=0, description="视频时长（秒）")
    width: int = Field(1920, ge=100, le=4096, description="视频宽度")
    height: int = Field(8, ge=4, le=20, description="进度条高度")
    played_color: str = Field("#2563EB", description="已播放颜色")
    unplayed_color: str = Field("#64748B", description="未播放颜色")
    format: str = Field("mp4", description="输出格式（mp4/mov）")
    key_frame_interval: float | None = Field(None, gt=0, description="关键帧间隔（秒）")


# =============================================================================
#  路由
# =============================================================================

@router.get("/colors", response_model=list[ColorOption])
async def get_colors():
    """获取可用配色列表"""
    color_names = {
        "blue": "科技蓝",
        "green": "清新绿",
        "red": "活力红",
        "purple": "优雅紫",
        "orange": "活力橙",
        "white": "简约白",
    }

    return [
        ColorOption(
            name=name,
            display_name=color_names.get(name, name),
            played=colors["played"],
            unplayed=colors["unplayed"],
        )
        for name, colors in pb.DEFAULT_COLORS.items()
    ]


@router.post("/generate")
async def generate_progress_bar(request: GenerateRequest):
    """生成进度条视频"""
    if request.format not in ("mp4", "mov"):
        raise HTTPException(400, "format 必须是 'mp4' 或 'mov'")

    if request.duration > 600:
        raise HTTPException(400, "视频时长不能超过 10 分钟")

    config = pb.ProgressBarConfig(
        duration=request.duration,
        width=request.width,
        height=request.height,
        played_color=request.played_color,
        unplayed_color=request.unplayed_color,
    )

    # 根据格式选择文件扩展名和 MIME 类型
    if request.format == "mp4":
        filename = "progress_bar.mp4"
        media_type = "video/mp4"
    else:
        filename = "progress_bar.mov"
        media_type = "video/quicktime"

    with TemporaryDirectory() as tmpdir:
        output = Path(tmpdir) / filename
        try:
            pb.generate(
                config,
                output,
                format=request.format,
                key_frame_interval=request.key_frame_interval,
            )
        except RuntimeError as e:
            raise HTTPException(500, f"生成失败: {e}")

        content = output.read_bytes()

    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
