"""
Authentication and Cryptographic Utilities
"""

import hashlib
import hmac
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import jwt

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "skill-exchange-dev-secret-key-change-in-prod-99382104")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days


def hash_password(password: str) -> str:
    """Hash password using PBKDF2-HMAC-SHA256 with random salt."""
    salt = secrets.token_hex(16)
    kdf = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        iterations=100000,
    )
    return f"{salt}${kdf.hex()}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against stored salt and hash."""
    try:
        salt, expected_hash = hashed_password.split("$", 1)
        actual_hash = hashlib.pbkdf2_hmac(
            "sha256",
            plain_password.encode("utf-8"),
            salt.encode("utf-8"),
            iterations=100000,
        ).hex()
        return hmac.compare_digest(actual_hash, expected_hash)
    except Exception:
        return False


def create_access_token(data: dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create signed JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[dict[str, Any]]:
    """Decode and validate a JWT access token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except Exception:
        return None
