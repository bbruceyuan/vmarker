"""
[INPUT]: 依赖 FastAPI, routes, dotenv
[OUTPUT]: 对外提供 app (FastAPI 实例)
[POS]: FastAPI 应用主入口
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
"""

from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


# =============================================================================
#  加载环境变量
# =============================================================================

# 从 backend/.env 加载
_env_path = Path(__file__).parent.parent.parent.parent / ".env"
load_dotenv(_env_path)

from vmarker import __version__
from vmarker.api.routes import auth, chapter_bar, progress_bar, shownotes, subtitle, video, youtube


# =============================================================================
#  生命周期
# =============================================================================


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动时清理过期的视频处理会话
    from vmarker.temp_manager import cleanup_old_sessions

    cleaned = cleanup_old_sessions(max_age_hours=24)
    if cleaned:
        print(f"[vmarker] 已清理 {cleaned} 个过期会话")

    yield


# =============================================================================
#  FastAPI 应用
# =============================================================================

app = FastAPI(
    title="vmarker API",
    description="视频标记工具集 API - Make video structure visible",
    version=__version__,
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =============================================================================
#  通用路由
# =============================================================================


class HealthResponse(BaseModel):
    status: str
    version: str


@app.get("/health", response_model=HealthResponse)
async def health():
    """健康检查"""
    return HealthResponse(status="ok", version=__version__)


# =============================================================================
#  注册功能路由
# =============================================================================

app.include_router(auth.router, prefix="/api/v1/auth", tags=["Auth"])
app.include_router(chapter_bar.router, prefix="/api/v1/chapter-bar", tags=["Chapter Bar"])
app.include_router(shownotes.router, prefix="/api/v1/shownotes", tags=["Show Notes"])
app.include_router(subtitle.router, prefix="/api/v1/subtitle", tags=["Subtitle"])
app.include_router(progress_bar.router, prefix="/api/v1/progress-bar", tags=["Progress Bar"])
app.include_router(video.router, prefix="/api/v1/video", tags=["Video"])
app.include_router(youtube.router, prefix="/api/v1/youtube", tags=["YouTube"])
