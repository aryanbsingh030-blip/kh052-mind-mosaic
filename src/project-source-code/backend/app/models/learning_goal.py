"""
Learning Goal Model
"""

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional

from sqlalchemy import String, Text, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import ProficiencyLevel, GoalStatus

if TYPE_CHECKING:
    from app.models.profile import StudentProfile
    from app.models.skill import Skill


class LearningGoal(Base):
    """Represents an active learning target set by a student."""

    __tablename__ = "learning_goals"

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
    target_proficiency: Mapped[ProficiencyLevel] = mapped_column(
        SAEnum(ProficiencyLevel, native_enum=False, length=20),
        default=ProficiencyLevel.INTERMEDIATE,
        nullable=False,
    )
    target_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[GoalStatus] = mapped_column(
        SAEnum(GoalStatus, native_enum=False, length=20),
        default=GoalStatus.NOT_STARTED,
        nullable=False,
    )

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
    student: Mapped["StudentProfile"] = relationship("StudentProfile", back_populates="learning_goals")
    skill: Mapped["Skill"] = relationship("Skill", back_populates="learning_goals", lazy="joined")

    def __repr__(self) -> str:
        return f"<LearningGoal(student={self.student_id}, skill={self.skill_id}, target={self.target_proficiency})>"
