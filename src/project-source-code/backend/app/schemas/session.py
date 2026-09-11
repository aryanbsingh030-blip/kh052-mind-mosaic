"""
Teaching and Learning Session Schemas
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.models.enums import SessionStatus


class TeachingSessionCreate(BaseModel):
    learner_student_id: str
    skill_id: str
    scheduled_at: datetime
    duration_minutes: int = Field(default=60, ge=15, le=240)
    credit_amount: int = Field(default=10, ge=0)
    meeting_link: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[SessionStatus] = None


class SessionRequestCreate(BaseModel):
    teacher_student_id: str
    skill_id: str
    scheduled_at: datetime
    duration_minutes: int = Field(default=60, ge=15, le=240)
    credit_amount: int = Field(default=10, ge=0)
    meeting_link: Optional[str] = None
    notes: Optional[str] = None


class SessionAcceptRequest(BaseModel):
    meeting_link: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    notes: Optional[str] = None


class SessionCompleteRequest(BaseModel):
    verification_notes: Optional[str] = Field(None, description="Summary notes confirming session took place")
    actual_duration_minutes: Optional[int] = Field(None, ge=15, description="Actual duration conducted")
    rating: Optional[int] = Field(None, ge=1, le=5)
    learner_feedback: Optional[str] = None


class SessionCancelRequest(BaseModel):
    reason: str = Field(..., min_length=3, description="Reason for session cancellation")


class TeachingSessionUpdateStatus(BaseModel):
    status: SessionStatus
    verification_notes: Optional[str] = None


class LearningSessionLogCreate(BaseModel):
    rating: Optional[int] = Field(None, ge=1, le=5)
    feedback: Optional[str] = None
    learned_summary: Optional[str] = None


class LearningSessionResponse(BaseModel):
    id: str
    session_id: str
    student_id: str
    rating: Optional[int] = None
    feedback: Optional[str] = None
    learned_summary: Optional[str] = None
    completed_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class TeachingSessionResponse(BaseModel):
    id: str
    teacher_student_id: str
    teacher_name: Optional[str] = None
    learner_student_id: str
    learner_name: Optional[str] = None
    skill_id: str
    skill_name: Optional[str] = None
    scheduled_at: datetime
    duration_minutes: int
    status: SessionStatus
    credit_amount: int
    meeting_link: Optional[str] = None
    notes: Optional[str] = None
    verification_notes: Optional[str] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    learning_log: Optional[LearningSessionResponse] = None

    model_config = {"from_attributes": True}
