"""
Pydantic Schemas for AI Skill Exchange
"""

from app.schemas.auth import (
    UserRegister,
    UserLogin,
    TokenResponse,
    UserMeResponse,
)
from app.schemas.profile import (
    ProfileCreate,
    ProfileUpdate,
    ProfileResponse,
    ProfileSummaryResponse,
)
from app.schemas.skill import (
    SkillCreate,
    SkillUpdate,
    SkillResponse,
    SkillSummary,
    StudentSkillCreate,
    StudentSkillUpdate,
    StudentSkillResponse,
)
from app.schemas.learning_goal import (
    LearningGoalCreate,
    LearningGoalUpdate,
    LearningGoalResponse,
)
from app.schemas.project import (
    ProjectCreate,
    ProjectUpdate,
    ProjectResponse,
    ProjectSkillRequirementCreate,
    ProjectSkillRequirementResponse,
    TeamCreate,
    TeamResponse,
    TeamMemberAdd,
    TeamMemberResponse,
)
from app.schemas.match import (
    SkillMatchCreate,
    SkillMatchUpdateStatus,
    SkillMatchResponse,
)
from app.schemas.credit import (
    CreditTransferRequest,
    CreditTransactionResponse,
    CreditBalanceResponse,
)
from app.schemas.session import (
    TeachingSessionCreate,
    TeachingSessionUpdateStatus,
    TeachingSessionResponse,
    LearningSessionLogCreate,
    LearningSessionResponse,
)
from app.schemas.availability import (
    AvailabilityCreate,
    AvailabilityResponse,
)
from app.schemas.assessment import (
    SkillAssessmentCreate,
    SkillAssessmentResponse,
)
from app.schemas.activity import (
    ActivityEventResponse,
)

__all__ = [
    "UserRegister",
    "UserLogin",
    "TokenResponse",
    "UserMeResponse",
    "ProfileCreate",
    "ProfileUpdate",
    "ProfileResponse",
    "ProfileSummaryResponse",
    "SkillCreate",
    "SkillUpdate",
    "SkillResponse",
    "SkillSummary",
    "StudentSkillCreate",
    "StudentSkillUpdate",
    "StudentSkillResponse",
    "LearningGoalCreate",
    "LearningGoalUpdate",
    "LearningGoalResponse",
    "ProjectCreate",
    "ProjectUpdate",
    "ProjectResponse",
    "ProjectSkillRequirementCreate",
    "ProjectSkillRequirementResponse",
    "TeamCreate",
    "TeamResponse",
    "TeamMemberAdd",
    "TeamMemberResponse",
    "SkillMatchCreate",
    "SkillMatchUpdateStatus",
    "SkillMatchResponse",
    "CreditTransferRequest",
    "CreditTransactionResponse",
    "CreditBalanceResponse",
    "TeachingSessionCreate",
    "TeachingSessionUpdateStatus",
    "TeachingSessionResponse",
    "LearningSessionLogCreate",
    "LearningSessionResponse",
    "AvailabilityCreate",
    "AvailabilityResponse",
    "SkillAssessmentCreate",
    "SkillAssessmentResponse",
    "ActivityEventResponse",
]
