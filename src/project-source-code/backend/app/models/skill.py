"""
Skill and StudentSkill Models
"""

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import String, Text, Float, Boolean, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import ProficiencyLevel, SkillDirection

if TYPE_CHECKING:
    from app.models.profile import StudentProfile
    from app.models.learning_goal import LearningGoal
    from app.models.project import ProjectSkillRequirement
    from app.models.match import SkillMatch
    from app.models.session import TeachingSession
    from app.models.assessment import SkillAssessment


class Skill(Base):
    """Canonical skill taxonomy entry supporting hierarchy, aliases, and category."""

    __tablename__ = "skills"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    name: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    category: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    aliases: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # Comma-separated or JSON list of alternative terms
    
    parent_skill_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("skills.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Self-referential hierarchy
    parent_skill: Mapped[Optional["Skill"]] = relationship(
        "Skill",
        remote_side=[id],
        back_populates="sub_skills",
    )
    sub_skills: Mapped[List["Skill"]] = relationship(
        "Skill",
        back_populates="parent_skill",
        cascade="all",
    )

    # Relationships
    student_skills: Mapped[List["StudentSkill"]] = relationship(
        "StudentSkill",
        back_populates="skill",
        cascade="all, delete-orphan",
    )
    learning_goals: Mapped[List["LearningGoal"]] = relationship(
        "LearningGoal",
        back_populates="skill",
        cascade="all, delete-orphan",
    )
    project_requirements: Mapped[List["ProjectSkillRequirement"]] = relationship(
        "ProjectSkillRequirement",
        back_populates="skill",
        cascade="all, delete-orphan",
    )
    matches: Mapped[List["SkillMatch"]] = relationship(
        "SkillMatch",
        back_populates="skill",
        cascade="all, delete-orphan",
    )
    teaching_sessions: Mapped[List["TeachingSession"]] = relationship(
        "TeachingSession",
        back_populates="skill",
        cascade="all, delete-orphan",
    )
    assessments: Mapped[List["SkillAssessment"]] = relationship(
        "SkillAssessment",
        back_populates="skill",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Skill(id={self.id}, name={self.name}, category={self.category})>"


class StudentSkill(Base):
    """Junction table connecting a student profile with a skill, indicating teach/learn intent & proficiency."""

    __tablename__ = "student_skills"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    student_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("student_profiles.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    skill_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("skills.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    direction: Mapped[SkillDirection] = mapped_column(
        SAEnum(SkillDirection, native_enum=False, length=10),
        nullable=False,
    )
    proficiency_level: Mapped[ProficiencyLevel] = mapped_column(
        SAEnum(ProficiencyLevel, native_enum=False, length=20),
        default=ProficiencyLevel.BEGINNER,
        nullable=False,
    )
    years_experience: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

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
    student: Mapped["StudentProfile"] = relationship("StudentProfile", back_populates="skills")
    skill: Mapped["Skill"] = relationship("Skill", back_populates="student_skills", lazy="joined")

    def __repr__(self) -> str:
        return f"<StudentSkill(student={self.student_id}, skill={self.skill_id}, dir={self.direction}, prof={self.proficiency_level})>"
