"""
AI Skill Exchange — Role-Based Access Control and Ownership Authorization
Enforces permissions across Student, Faculty, and Admin roles.
"""

from typing import Callable, List
from fastapi import Depends, HTTPException, status

from app.core.dependencies import get_current_user, get_current_user_optional
from app.models.enums import UserRole
from app.models.user import User


def require_role(allowed_roles: List[UserRole] | UserRole) -> Callable:
    """
    Dependency factory to enforce role-based access control.
    Accepts single role or list of acceptable roles.
    """
    if isinstance(allowed_roles, UserRole):
        allowed_roles = [allowed_roles]

    async def role_checker(user: User = Depends(get_current_user)) -> User:
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Requires one of roles: {[r.value for r in allowed_roles]}",
            )
        return user

    return role_checker


def verify_owner_or_admin(target_student_id: str, current_user: User, student_profile_id: str = None) -> bool:
    """
    Verify that the authenticated user is either the owner of the student profile
    or holds administrative privileges.
    """
    if current_user.role == UserRole.ADMIN:
        return True

    # If student profile ID is known
    if student_profile_id and student_profile_id == target_student_id:
        return True

    # Fallback to user ID check
    if current_user.id == target_student_id:
        return True

    return False
