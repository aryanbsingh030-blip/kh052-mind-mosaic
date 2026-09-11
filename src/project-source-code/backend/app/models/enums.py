"""
Domain Enums for AI Skill Exchange
"""

import enum


class ProficiencyLevel(str, enum.Enum):
    BEGINNER = "BEGINNER"
    INTERMEDIATE = "INTERMEDIATE"
    ADVANCED = "ADVANCED"
    EXPERT = "EXPERT"


class SkillDirection(str, enum.Enum):
    TEACH = "TEACH"
    LEARN = "LEARN"


class UserRole(str, enum.Enum):
    STUDENT = "STUDENT"
    FACULTY = "FACULTY"
    ADMIN = "ADMIN"


class GoalStatus(str, enum.Enum):
    NOT_STARTED = "NOT_STARTED"
    IN_PROGRESS = "IN_PROGRESS"
    ACHIEVED = "ACHIEVED"


class ProjectStatus(str, enum.Enum):
    PLANNING = "PLANNING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"


class RequirementImportance(str, enum.Enum):
    MANDATORY = "MANDATORY"
    PREFERRED = "PREFERRED"


class MatchStatus(str, enum.Enum):
    PROPOSED = "PROPOSED"
    ACCEPTED = "ACCEPTED"
    DECLINED = "DECLINED"
    COMPLETED = "COMPLETED"


class TeamStatus(str, enum.Enum):
    FORMING = "FORMING"
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"


class TeamRole(str, enum.Enum):
    LEAD = "LEAD"
    DEVELOPER = "DEVELOPER"
    DESIGNER = "DESIGNER"
    RESEARCHER = "RESEARCHER"
    CONTRIBUTOR = "CONTRIBUTOR"


class CreditTransactionType(str, enum.Enum):
    TEACHING_REWARD = "TEACHING_REWARD"
    LEARNING_COST = "LEARNING_COST"
    BONUS = "BONUS"
    ADMIN_ADJUSTMENT = "ADMIN_ADJUSTMENT"
    REFUND = "REFUND"
    INITIAL_GRANT = "INITIAL_GRANT"
    SESSION_TRANSFER = "SESSION_TRANSFER"
    REWARD = "REWARD"


class SessionStatus(str, enum.Enum):
    REQUESTED = "REQUESTED"
    ACCEPTED = "ACCEPTED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    SCHEDULED = "SCHEDULED"  # Backwards compatibility alias for ACCEPTED


class DayOfWeek(str, enum.Enum):
    MONDAY = "MONDAY"
    TUESDAY = "TUESDAY"
    WEDNESDAY = "WEDNESDAY"
    THURSDAY = "THURSDAY"
    FRIDAY = "FRIDAY"
    SATURDAY = "SATURDAY"
    SUNDAY = "SUNDAY"


class ActivityEventType(str, enum.Enum):
    PROFILE_CREATED = "PROFILE_CREATED"
    SKILL_ADDED = "SKILL_ADDED"
    LEARNING_GOAL_SET = "LEARNING_GOAL_SET"
    MATCH_GENERATED = "MATCH_GENERATED"
    SESSION_SCHEDULED = "SESSION_SCHEDULED"
    SESSION_COMPLETED = "SESSION_COMPLETED"
    CREDIT_TRANSFERRED = "CREDIT_TRANSFERRED"
    PROJECT_CREATED = "PROJECT_CREATED"
    TEAM_FORMED = "TEAM_FORMED"
