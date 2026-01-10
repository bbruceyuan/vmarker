"""
[INPUT]: 依赖 api.main
[OUTPUT]: 对外提供 app (FastAPI 实例)
[POS]: API 入口点
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
"""

from vmarker.api.main import app

__all__ = ["app"]
