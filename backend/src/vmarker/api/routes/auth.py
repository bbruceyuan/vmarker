"""
[INPUT]: 依赖 FastAPI, auth 模块
[OUTPUT]: auth 路由 (router)
[POS]: 认证相关 API 端点
[PROTOCOL]: 变更时更新此头部， then check CLAUDE.md
"""

from fastapi import APIRouter

from vmarker.api.auth import AuthUser, CurrentUser, OptionalUser

router = APIRouter()


# =============================================================================
#  数据模型
# =============================================================================


class MeResponse(AuthUser):
    """当前用户信息响应"""
    pass


# =============================================================================
#  认证端点
# =============================================================================


@router.get("/me", response_model=MeResponse)
async def get_me(user: CurrentUser) -> AuthUser:
    """
    获取当前登录用户信息

    需要提供有效的 Supabase JWT Token：
    ```
    Authorization: Bearer <access_token>
    ```

    Returns:
        AuthUser: 当前用户信息
    """
    return user


@router.get("/check")
async def auth_check(user: OptionalUser) -> dict:
    """
    检查认证状态（不强制登录）

    - 已登录：返回用户信息
    - 未登录：返回 guest 状态

    Returns:
        dict: 认证状态
    """
    if user is None:
        return {"authenticated": False, "user": None}

    return {
        "authenticated": True,
        "user": user.model_dump(),
    }
