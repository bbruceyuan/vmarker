"""
[INPUT]: 依赖 jose, os, FastAPI
[OUTPUT]: get_current_user 依赖函数, AuthUser 数据模型
[POS]: Supabase JWT 验证
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
"""

import os
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from pydantic import BaseModel

# =============================================================================
#  配置
# =============================================================================

SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")
SUPABASE_URL = os.getenv("SUPABASE_URL", "")

ALGORITHM = "HS256"


# =============================================================================
#  数据模型
# =============================================================================


class AuthUser(BaseModel):
    """认证用户信息"""
    id: str
    email: str | None = None
    role: str = "authenticated"
    aud: str = "authenticated"


# =============================================================================
#  JWT 验证
# =============================================================================

security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
) -> AuthUser:
    """
    验证 Supabase JWT 并返回当前用户

    Args:
        credentials: HTTP Bearer Token

    Returns:
        AuthUser: 当前用户信息

    Raises:
        HTTPException 401: Token 无效或缺失
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization header",
        )

    token = credentials.credentials

    try:
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=[ALGORITHM],
            options={"verify_aud": False},
        )
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}",
        ) from e

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing user id",
        )

    return AuthUser(
        id=user_id,
        email=payload.get("email"),
        role=payload.get("role", "authenticated"),
        aud=payload.get("aud", "authenticated"),
    )


async def get_optional_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
) -> AuthUser | None:
    """
    可选的用户认证，不抛出异常

    Returns:
        AuthUser | None: 当前用户信息，未认证返回 None
    """
    if not credentials:
        return None

    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None


# =============================================================================
#  类型别名
# =============================================================================

CurrentUser = Annotated[AuthUser, Depends(get_current_user)]
OptionalUser = Annotated[AuthUser | None, Depends(get_optional_user)]
