"""
SkillMatch Model
"""

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import String, Text, Float, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import MatchStatus

if TYPE_CHECKING:
    from app.models.profile import StudentProfile
    from app.models.skill import Skill


class SkillMatch(Base):
    """Represents an intelligent pairing between a learner and a teacher for a specific skill."""

    __tablename__ = "skill_matches"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    learner_student_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("student_profiles.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    teacher_student_id: Mapped[str] = mapped_column(
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
    match_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    match_reason: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[MatchStatus] = mapped_column(
        SAEnum(MatchStatus, native_enum=False, length=20),
        default=MatchStatus.PROPOSED,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    learner: Mapped["StudentProfile"] = relationship(
        "StudentProfile",
        foreign_keys=[learner_student_id],
        back_populates="matches_as_learner",
        lazy="joined",
    )
    teacher: Mapped["StudentProfile"] = relationship(
        "StudentProfile",
        foreign_keys=[teacher_student_id],
        back_populates="matches_as_teacher",
        lazy="joined",
    )
    skill: Mapped["Skill"] = relationship("Skill", back_populates="matches", lazy="joined")

    def __repr__(self) -> str:
        return f"<SkillMatch(learner={self.learner_student_id}, teacher={self.teacher_student_id}, skill={self.skill_id}, score={self.match_score})>"
