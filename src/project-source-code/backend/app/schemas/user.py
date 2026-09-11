"""
Pydantic schemas for User API requests and responses.
"""

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


# --- Request Schemas ---

class UserCreate(BaseModel):
    """Schema for creating a new user."""
    email: EmailStr
    name: str = Field(..., min_length=1, max_length=255)
    bio: str | None = None
    avatar_url: str | None = None
    department: str | None = None
    year: str | None = None


class UserUpdate(BaseModel):
    """Schema for updating an existing user. All fields optional."""
    name: str | None = Field(None, min_length=1, max_length=255)
    bio: str | None = None
    avatar_url: str | None = None
    department: str | None = None
    year: str | None = None


# --- Response Schemas ---

class SkillCreditResponse(BaseModel):
    """Embedded credit balance in user response."""
    balance: int

    model_config = {"from_attributes": True}


class UserSkillResponse(BaseModel):
    """Embedded skill in user response."""
    id: str
    skill_id: str
    skill_name: str | None = None
    direction: str
    proficiency_level: int
    description: str | None = None

    model_config = {"from_attributes": True}


class UserResponse(BaseModel):
    """Full user response with skills and credits."""
    id: str
    email: str
    name: str
    bio: str | None = None
    avatar_url: str | None = None
    department: str | None = None
    year: str | None = None
    created_at: datetime
    updated_at: datetime
    credit_balance: int = 0
    skills: list[UserSkillResponse] = []

    model_config = {"from_attributes": True}


class UserListResponse(BaseModel):
    """Paginated list of users."""
    users: list[UserResponse]
    total: int
    page: int
    page_size: int
