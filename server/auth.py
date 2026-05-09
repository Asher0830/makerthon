# ==============================================================================
# 認證與授權工具 (JWT 簽發 / 驗證 / 路由保護)
# ==============================================================================

import jwt
from datetime import datetime, timedelta, timezone
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import bcrypt

from config import (
    JWT_SECRET_KEY,
    JWT_ALGORITHM,
    JWT_EXPIRE_DAYS,
    STORE_JWT_EXPIRE_HOURS,
    ADMIN_JWT_EXPIRE_HOURS,
)

bearer_scheme = HTTPBearer()

# ── 密碼雜湊工具 ──────────────────────────────────────────────────────────────

def get_password_hash(password: str) -> str:
    pwd_bytes = password.encode('utf-8')[:72]
    return bcrypt.hashpw(pwd_bytes, bcrypt.gensalt()).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    pwd_bytes = plain_password.encode('utf-8')[:72]
    try:
        return bcrypt.checkpw(pwd_bytes, hashed_password.encode('utf-8'))
    except ValueError:
        return False

# ── JWT 工具 ──────────────────────────────────────────────────────────────────

def create_user_token(user_id: str) -> str:
    """為使用者簽發 JWT（有效期 30 天）。"""
    payload = {
        "sub": user_id,
        "role": "user",
        "exp": datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRE_DAYS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def create_store_token(store_id: str) -> str:
    """為店家簽發 JWT（有效期 12 小時）。"""
    payload = {
        "sub": store_id,
        "role": "store",
        "exp": datetime.now(timezone.utc) + timedelta(hours=STORE_JWT_EXPIRE_HOURS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def create_admin_token() -> str:
    """為超級管理員簽發 JWT（有效期 8 小時）。"""
    payload = {
        "sub": "super_admin",
        "role": "admin",
        "exp": datetime.now(timezone.utc) + timedelta(hours=ADMIN_JWT_EXPIRE_HOURS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    """解碼並驗證 JWT，回傳 payload。"""
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token 已過期，請重新登入",
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token 無效",
        )


# ── FastAPI Dependencies（路由保護）────────────────────────────────────────────

def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> str:
    """取得當前使用者 UUID（需 role=user 的 JWT）。"""
    payload = decode_token(credentials.credentials)
    if payload.get("role") != "user":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="此端點僅限使用者存取",
        )
    return payload["sub"]


def get_current_store_id(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> str:
    """取得當前店家 store_id（需 role=store 的 JWT）。"""
    payload = decode_token(credentials.credentials)
    if payload.get("role") != "store":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="此端點僅限店家存取",
        )
    return payload["sub"]


def get_admin(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> str:
    """驗證超級管理員身分（需 role=admin 的 JWT）。"""
    payload = decode_token(credentials.credentials)
    if payload.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="此端點僅限超級管理員存取",
        )
    return payload["sub"]
