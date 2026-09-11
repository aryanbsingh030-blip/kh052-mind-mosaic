"""
Authentication and User Registration Schemas
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field

from app.models.enums import UserRole


class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, description="Password at least 6 characters")
    full_name: str = Field(..., min_length=1, max_length=255)
    department: str = Field(..., min_length=1, max_length=255)
    year_of_study: str = Field(..., min_length=1, max_length=50)
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    github_url: Optional[str] = None
    linkedin_url: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    profile_id: Optional[str] = None
    email: str
    full_name: Optional[str] = None
    role: str


class UserMeResponse(BaseModel):
    id: str
    email: str
    is_active: bool
    role: UserRole
    created_at: datetime
    profile_id: Optional[str] = None
    full_name: Optional[str] = None
    department: Optional[str] = None
    year_of_study: Optional[str] = None
    credit_balance: int = 100

    model_config = {"from_attributes": True}
