"""
User API endpoints.

Handles CRUD operations for student profiles.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.user import (
    UserCreate,
    UserUpdate,
    UserResponse,
    UserListResponse,
    UserSkillResponse,
)
from app.services.user_service import UserService

router = APIRouter(prefix="/v1/users", tags=["Users"])


def _user_to_response(user) -> UserResponse:
    """Convert a User ORM object to a UserResponse schema."""
    skills = []
    for us in (user.skills or []):
        skills.append(UserSkillResponse(
            id=us.id,
            skill_id=us.skill_id,
            skill_name=us.skill.name if us.skill else None,
            direction=us.direction.value if hasattr(us.direction, 'value') else us.direction,
            proficiency_level=us.proficiency_level,
            description=us.description,
        ))

    credit_balance = 0
    if user.credit_account:
        credit_balance = user.credit_account.balance

    return UserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        bio=user.bio,
        avatar_url=user.avatar_url,
        department=user.department,
        year=user.year,
        created_at=user.created_at,
        updated_at=user.updated_at,
        credit_balance=credit_balance,
        skills=skills,
    )


@router.get("", response_model=UserListResponse)
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """List all users with pagination."""
    service = UserService(db)
    users, total = await service.list_users(page=page, page_size=page_size)

    return UserListResponse(
        users=[_user_to_response(u) for u in users],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=UserResponse, status_code=201)
async def create_user(
    data: UserCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new user profile."""
    service = UserService(db)

    existing = await service.get_user_by_email(data.email)
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    user = await service.create_user(data)
    return _user_to_response(user)


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get a user by ID."""
    service = UserService(db)
    user = await service.get_user(user_id)

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return _user_to_response(user)


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    data: UserUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update a user's profile."""
    service = UserService(db)
    user = await service.get_user(user_id)

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user = await service.update_user(user, data)
    return _user_to_response(user)
