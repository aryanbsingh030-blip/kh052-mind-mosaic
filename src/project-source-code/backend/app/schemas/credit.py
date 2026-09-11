"""
Skill Credit Economy Schemas
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.models.enums import CreditTransactionType


class CreditTransferRequest(BaseModel):
    to_student_id: str = Field(..., min_length=1, max_length=64)
    amount: int = Field(..., gt=0, le=500, description="Amount of credits must be between 1 and 500")
    description: Optional[str] = Field(None, max_length=255)
    reason: Optional[str] = Field(None, max_length=255)
    session_id: Optional[str] = Field(None, max_length=64)


class CreditTransactionResponse(BaseModel):
    id: str
    student_id: Optional[str] = None
    student_name: Optional[str] = None
    student: Optional[str] = None
    from_student_id: Optional[str] = None
    from_student_name: Optional[str] = None
    to_student_id: Optional[str] = None
    to_student_name: Optional[str] = None
    amount: int
    type: CreditTransactionType
    transaction_type: CreditTransactionType
    reason: Optional[str] = None
    description: Optional[str] = None
    timestamp: datetime
    created_at: datetime
    session_id: Optional[str] = None
    related_session_id: Optional[str] = None

    model_config = {"from_attributes": True}


class CreditBalanceResponse(BaseModel):
    student_id: str
    student_name: str
    credit_balance: int
    total_earned: int = 0
    total_spent: int = 0
    allow_negative_balance: bool = False
    recent_transactions: list[CreditTransactionResponse] = Field(default_factory=list)


class AdminAdjustmentRequest(BaseModel):
    student_id: str
    amount: int = Field(..., description="Amount to adjust (can be positive or negative)")
    reason: str = Field(..., min_length=3, description="Audit reason for admin adjustment")


class BonusAwardRequest(BaseModel):
    student_id: str
    amount: int = Field(..., gt=0, description="Bonus credit amount")
    reason: str = Field(..., min_length=3, description="Reason for bonus award")


class SkillDemandIndexItem(BaseModel):
    skill_id: str
    skill_name: str
    category: str
    learners_count: int
    teachers_count: int
    demand_index: float
    is_high_demand: bool
    status: str  # HIGH_DEMAND | BALANCED | SURPLUS | CRITICAL_SHORTAGE
    recommended_reward_multiplier: float = 1.0


class SkillDemandIndexResponse(BaseModel):
    skills: list[SkillDemandIndexItem]
    high_demand_count: int
    total_skills: int
    average_demand_index: float
