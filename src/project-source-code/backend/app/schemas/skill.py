"""
Skill and StudentSkill Schemas
"""

from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, Field

from app.models.enums import ProficiencyLevel, SkillDirection


class SkillBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    category: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    aliases: Optional[str] = None  # Comma-separated or string list
    parent_skill_id: Optional[str] = None


class SkillCreate(SkillBase):
    pass


class SkillUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    category: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    aliases: Optional[str] = None
    parent_skill_id: Optional[str] = None


class SkillSummary(BaseModel):
    id: str
    name: str
    category: str
    description: Optional[str] = None

    model_config = {"from_attributes": True}


class SkillResponse(SkillBase):
    id: str
    created_at: datetime
    sub_skills: List[SkillSummary] = []

    model_config = {"from_attributes": True}


# --- StudentSkill Schemas ---

class StudentSkillCreate(BaseModel):
    skill_id: str
    direction: SkillDirection
    proficiency_level: ProficiencyLevel = ProficiencyLevel.BEGINNER
    years_experience: float = Field(default=0.0, ge=0.0)
    description: Optional[str] = None


class StudentSkillUpdate(BaseModel):
    direction: Optional[SkillDirection] = None
    proficiency_level: Optional[ProficiencyLevel] = None
    years_experience: Optional[float] = Field(None, ge=0.0)
    description: Optional[str] = None


class StudentSkillResponse(BaseModel):
    id: str
    student_id: str
    skill_id: str
    skill_name: Optional[str] = None
    skill_category: Optional[str] = None
    direction: SkillDirection
    proficiency_level: ProficiencyLevel
    years_experience: float
    description: Optional[str] = None
    verified: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
