"""
Student Profile Model
"""

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import String, Text, Integer, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.skill import StudentSkill
    from app.models.learning_goal import LearningGoal
    from app.models.project import Project, TeamMember
    from app.models.match import SkillMatch
    from app.models.credit import SkillCreditTransaction
    from app.models.session import TeachingSession, LearningSession
    from app.models.availability import Availability
    from app.models.assessment import SkillAssessment
    from app.models.activity import ActivityEvent


class StudentProfile(Base):
    """Profile entity containing student academic and skill exchange details."""

    __tablename__ = "student_profiles"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        index=True,
        nullable=False,
    )
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    department: Mapped[str] = mapped_column(String(255), nullable=False)
    year_of_study: Mapped[str] = mapped_column(String(50), nullable=False)  # Freshman, Sophomore, Junior, Senior, Masters, PhD
    bio: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    raw_project_experience: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    interests: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    project_interests: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    github_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    linkedin_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    portfolio_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    credit_balance: Mapped[int] = mapped_column(Integer, default=100, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="profile")
    
    skills: Mapped[List["StudentSkill"]] = relationship(
        "StudentSkill",
        back_populates="student",
        cascade="all, delete-orphan",
    )
    
    learning_goals: Mapped[List["LearningGoal"]] = relationship(
        "LearningGoal",
        back_populates="student",
        cascade="all, delete-orphan",
    )
    
    projects: Mapped[List["Project"]] = relationship(
        "Project",
        back_populates="owner",
        cascade="all, delete-orphan",
    )
    
    team_memberships: Mapped[List["TeamMember"]] = relationship(
        "TeamMember",
        back_populates="student",
        cascade="all, delete-orphan",
    )
    
    matches_as_learner: Mapped[List["SkillMatch"]] = relationship(
        "SkillMatch",
        foreign_keys="SkillMatch.learner_student_id",
        back_populates="learner",
        cascade="all, delete-orphan",
    )
    
    matches_as_teacher: Mapped[List["SkillMatch"]] = relationship(
        "SkillMatch",
        foreign_keys="SkillMatch.teacher_student_id",
        back_populates="teacher",
        cascade="all, delete-orphan",
    )
    
    teaching_sessions: Mapped[List["TeachingSession"]] = relationship(
        "TeachingSession",
        foreign_keys="TeachingSession.teacher_student_id",
        back_populates="teacher",
        cascade="all, delete-orphan",
    )
    
    learning_sessions: Mapped[List["TeachingSession"]] = relationship(
        "TeachingSession",
        foreign_keys="TeachingSession.learner_student_id",
        back_populates="learner",
        cascade="all, delete-orphan",
    )

    learning_session_logs: Mapped[List["LearningSession"]] = relationship(
        "LearningSession",
        back_populates="student",
        cascade="all, delete-orphan",
    )
    
    sent_transactions: Mapped[List["SkillCreditTransaction"]] = relationship(
        "SkillCreditTransaction",
        foreign_keys="SkillCreditTransaction.from_student_id",
        back_populates="from_student",
    )
    
    received_transactions: Mapped[List["SkillCreditTransaction"]] = relationship(
        "SkillCreditTransaction",
        foreign_keys="SkillCreditTransaction.to_student_id",
        back_populates="to_student",
    )
    
    availabilities: Mapped[List["Availability"]] = relationship(
        "Availability",
        back_populates="student",
        cascade="all, delete-orphan",
    )
    
    assessments: Mapped[List["SkillAssessment"]] = relationship(
        "SkillAssessment",
        foreign_keys="SkillAssessment.student_id",
        back_populates="student",
        cascade="all, delete-orphan",
    )
    
    activities: Mapped[List["ActivityEvent"]] = relationship(
        "ActivityEvent",
        back_populates="student",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<StudentProfile(id={self.id}, name={self.full_name}, dept={self.department})>"
