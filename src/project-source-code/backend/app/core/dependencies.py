"""
Authentication and Dependency Injection Helpers
"""

from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_access_token
from app.database import get_db
from app.models.profile import StudentProfile
from app.models.user import User

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    """Extract authenticated user from Bearer token, if provided."""
    if not credentials or not credentials.credentials:
        return None

    payload = decode_access_token(credentials.credentials)
    if not payload or "sub" not in payload:
        return None

    user_id = payload["sub"]
    result = await db.execute(select(User).where(User.id == user_id, User.is_active == True))
    return result.scalar_one_or_none()


async def get_current_user(
    user: Optional[User] = Depends(get_current_user_optional),
) -> User:
    """Require valid authenticated user."""
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


async def get_current_student_profile(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StudentProfile:
    """Require authenticated user to have an associated StudentProfile."""
    result = await db.execute(select(StudentProfile).where(StudentProfile.user_id == user.id))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student profile not found for current user",
        )
    return profile
