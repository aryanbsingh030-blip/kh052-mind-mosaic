"""
Skill Match Schemas
"""

from datetime import datetime
from typing import Dict, List, Optional

from pydantic import BaseModel, Field

from app.models.enums import MatchStatus


class SkillMatchCreate(BaseModel):
    learner_student_id: str
    teacher_student_id: str
    skill_id: str
    match_score: float = Field(..., ge=0.0, le=1.0)
    match_reason: str


class SkillMatchUpdateStatus(BaseModel):
    status: MatchStatus


class SkillMatchResponse(BaseModel):
    id: str
    learner_student_id: str
    learner_name: Optional[str] = None
    teacher_student_id: str
    teacher_name: Optional[str] = None
    skill_id: str
    skill_name: Optional[str] = None
    match_score: float
    match_reason: str
    status: MatchStatus
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Stage 4: Intelligent Hybrid Matching Schemas ---

class MatchFactors(BaseModel):
    skill_compatibility: float
    reciprocity: float
    semantic_similarity: float
    experience_compatibility: float
    interest_compatibility: float
    availability_compatibility: float


class LearningOpportunity(BaseModel):
    you_learn: List[str] = []
    they_learn: List[str] = []


class CommonAvailabilitySlot(BaseModel):
    day: str
    start_time: str
    end_time: str
    duration_minutes: int


class MatchRecommendation(BaseModel):
    candidate_id: str
    candidate_name: str
    candidate_department: str
    candidate_year: str
    candidate_avatar_url: Optional[str] = None
    candidate_bio: Optional[str] = None
    match_score: int
    is_reciprocal: bool
    matching_factors: MatchFactors
    learning_opportunity: LearningOpportunity
    explanation: List[str]
    common_availability: List[CommonAvailabilitySlot] = []
    skills_offered: List[str] = []
    skills_sought: List[str] = []


class MatchCalculationRequest(BaseModel):
    student_a_id: str
    student_b_id: str


class MatchCalculationResponse(BaseModel):
    student_a_id: str
    student_a_name: str
    student_b_id: str
    student_b_name: str
    match_score: int
    is_reciprocal: bool
    matching_factors: MatchFactors
    learning_opportunity: LearningOpportunity
    explanation: List[str]
    common_availability: List[CommonAvailabilitySlot] = []
