"""
Skill Assessment Schemas
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.models.enums import ProficiencyLevel


class SkillAssessmentCreate(BaseModel):
    student_id: str
    skill_id: str
    score: float = Field(..., ge=0.0, le=100.0)
    proficiency_awarded: ProficiencyLevel
    feedback: Optional[str] = None


class SkillAssessmentResponse(BaseModel):
    id: str
    student_id: str
    student_name: Optional[str] = None
    skill_id: str
    skill_name: Optional[str] = None
    assessor_id: Optional[str] = None
    assessor_name: Optional[str] = None
    score: float
    proficiency_awarded: ProficiencyLevel
    feedback: Optional[str] = None
    assessed_at: datetime

    model_config = {"from_attributes": True}
