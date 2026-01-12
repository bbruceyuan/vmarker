"""
[INPUT]: 依赖 pytest, jose, FastAPI TestClient
[OUTPUT]: auth 模块测试
[POS]: JWT 验证逻辑测试
[PROTOCOL]: 变更时更新此头部， then check CLAUDE.md
"""

from datetime import UTC, datetime, timedelta

import pytest
from fastapi import status
from fastapi.testclient import TestClient
from jose import jwt

from vmarker.api import auth as auth_module
from vmarker.api.main import app

# =============================================================================
#  常量
# =============================================================================

JWT_SECRET = "test-secret-key-for-jwt-signing"


# =============================================================================
#  Helper 函数
# =============================================================================


def create_token(payload: dict, secret: str = JWT_SECRET) -> str:
    """创建 JWT Token"""
    return jwt.encode(payload, secret, algorithm="HS256")


def create_valid_token() -> str:
    """创建有效的测试 Token"""
    payload = {
        "sub": "user-123",
        "email": "test@example.com",
        "role": "authenticated",
        "aud": "authenticated",
        "exp": datetime.now(tz=UTC) + timedelta(hours=1),
    }
    return create_token(payload)


def create_expired_token() -> str:
    """创建过期的测试 Token"""
    payload = {
        "sub": "user-123",
        "email": "test@example.com",
        "role": "authenticated",
        "aud": "authenticated",
        "exp": datetime.now(tz=UTC) - timedelta(hours=1),
    }
    return create_token(payload)


# =============================================================================
#  Fixtures
# =============================================================================


@pytest.fixture
def client():
    """测试客户端，设置测试 JWT Secret"""

    # 保存原始值
    original_secret = auth_module.SUPABASE_JWT_SECRET

    # 设置测试 secret
    auth_module.SUPABASE_JWT_SECRET = JWT_SECRET

    with TestClient(app) as test_client:
        yield test_client

    # 恢复原始值
    auth_module.SUPABASE_JWT_SECRET = original_secret


# =============================================================================
#  /api/v1/auth/me 测试
# =============================================================================


def test_auth_me_success(client):
    """测试成功获取用户信息"""
    token = create_valid_token()
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["id"] == "user-123"
    assert data["email"] == "test@example.com"
    assert data["role"] == "authenticated"


def test_auth_me_missing_header(client):
    """测试缺少 Authorization 头"""
    response = client.get("/api/v1/auth/me")

    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_auth_me_invalid_token(client):
    """测试无效 Token"""
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer invalid-token"},
    )

    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_auth_me_expired_token(client):
    """测试过期 Token"""
    token = create_expired_token()
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_auth_me_no_bearer(client):
    """测试缺少 Bearer 前缀 - FastAPI 会拒绝格式错误的 header"""
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "token123"},
    )

    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_auth_me_malformed_token(client):
    """测试格式错误的 Token"""
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer not.a.valid.jwt"},
    )

    assert response.status_code == status.HTTP_401_UNAUTHORIZED


# =============================================================================
#  /api/v1/auth/check 测试
# =============================================================================


def test_auth_check_authenticated(client):
    """测试已登录状态检查"""
    token = create_valid_token()
    response = client.get(
        "/api/v1/auth/check",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["authenticated"] is True
    assert data["user"]["id"] == "user-123"


def test_auth_check_guest(client):
    """测试未登录状态检查"""
    response = client.get("/api/v1/auth/check")

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["authenticated"] is False
    assert data["user"] is None


def test_auth_check_invalid_token(client):
    """测试无效 Token 的 check 端点"""
    response = client.get(
        "/api/v1/auth/check",
        headers={"Authorization": "Bearer invalid-token"},
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["authenticated"] is False
    assert data["user"] is None
