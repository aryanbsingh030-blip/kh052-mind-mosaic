"""
Database models package for AI Skill Exchange.
Exposes all ORM models and domain enums.
"""

from app.models.enums import (
    ProficiencyLevel,
    SkillDirection,
    UserRole,
    GoalStatus,
    ProjectStatus,
    RequirementImportance,
    MatchStatus,
    TeamStatus,
    TeamRole,
    CreditTransactionType,
    SessionStatus,
    DayOfWeek,
    ActivityEventType,
)
from app.models.user import User
from app.models.profile import StudentProfile
from app.models.skill import Skill, StudentSkill
from app.models.learning_goal import LearningGoal
from app.models.project import Project, ProjectSkillRequirement, Team, TeamMember
from app.models.match import SkillMatch
from app.models.credit import SkillCreditTransaction
from app.models.session import TeachingSession, LearningSession
from app.models.availability import Availability
from app.models.assessment import SkillAssessment
from app.models.activity import ActivityEvent

__all__ = [
    "ProficiencyLevel",
    "SkillDirection",
    "UserRole",
    "GoalStatus",
    "ProjectStatus",
    "RequirementImportance",
    "MatchStatus",
    "TeamStatus",
    "TeamRole",
    "CreditTransactionType",
    "SessionStatus",
    "DayOfWeek",
    "ActivityEventType",
    "User",
    "StudentProfile",
    "Skill",
    "StudentSkill",
    "LearningGoal",
    "Project",
    "ProjectSkillRequirement",
    "Team",
    "TeamMember",
    "SkillMatch",
    "SkillCreditTransaction",
    "TeachingSession",
    "LearningSession",
    "Availability",
    "SkillAssessment",
    "ActivityEvent",
]
