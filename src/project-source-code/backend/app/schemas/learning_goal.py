"""
Learning Goal Schemas
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.models.enums import ProficiencyLevel, GoalStatus


class LearningGoalCreate(BaseModel):
    skill_id: str
    target_proficiency: ProficiencyLevel = ProficiencyLevel.INTERMEDIATE
    target_date: Optional[datetime] = None
    description: Optional[str] = None


class LearningGoalUpdate(BaseModel):
    target_proficiency: Optional[ProficiencyLevel] = None
    target_date: Optional[datetime] = None
    description: Optional[str] = None
    status: Optional[GoalStatus] = None


class LearningGoalResponse(BaseModel):
    id: str
    student_id: str
    skill_id: str
    skill_name: Optional[str] = None
    skill_category: Optional[str] = None
    target_proficiency: ProficiencyLevel
    target_date: Optional[datetime] = None
    description: Optional[str] = None
    status: GoalStatus
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
