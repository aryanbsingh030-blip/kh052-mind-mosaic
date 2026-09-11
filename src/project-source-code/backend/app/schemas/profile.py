"""
Student Profile Schemas
"""

from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, Field

from app.schemas.skill import StudentSkillResponse


class ProfileCreate(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=255)
    department: str = Field(..., min_length=1, max_length=255)
    year_of_study: str = Field(..., min_length=1, max_length=50)
    bio: Optional[str] = None
    raw_project_experience: Optional[str] = None
    interests: Optional[str] = None
    project_interests: Optional[str] = None
    avatar_url: Optional[str] = None
    github_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    portfolio_url: Optional[str] = None


class ProfileUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=1, max_length=255)
    department: Optional[str] = Field(None, min_length=1, max_length=255)
    year_of_study: Optional[str] = Field(None, min_length=1, max_length=50)
    bio: Optional[str] = None
    raw_project_experience: Optional[str] = None
    interests: Optional[str] = None
    project_interests: Optional[str] = None
    avatar_url: Optional[str] = None
    github_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    portfolio_url: Optional[str] = None


class ProfileSummaryResponse(BaseModel):
    id: str
    user_id: str
    full_name: str
    department: str
    year_of_study: str
    avatar_url: Optional[str] = None
    credit_balance: int
    teach_skills_count: int = 0
    learn_skills_count: int = 0

    model_config = {"from_attributes": True}


class ProfileResponse(BaseModel):
    id: str
    user_id: str
    email: Optional[str] = None
    full_name: str
    department: str
    year_of_study: str
    bio: Optional[str] = None
    raw_project_experience: Optional[str] = None
    interests: Optional[str] = None
    project_interests: Optional[str] = None
    avatar_url: Optional[str] = None
    github_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    credit_balance: int
    created_at: datetime
    updated_at: datetime
    skills: List[StudentSkillResponse] = []

    model_config = {"from_attributes": True}
