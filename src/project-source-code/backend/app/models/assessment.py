"""
Skill Assessment Model
"""

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional

from sqlalchemy import String, Text, Float, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import ProficiencyLevel

if TYPE_CHECKING:
    from app.models.profile import StudentProfile
    from app.models.skill import Skill


class SkillAssessment(Base):
    """Peer or mentor assessment of a student's demonstrated skill proficiency."""

    __tablename__ = "skill_assessments"

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
    assessor_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("student_profiles.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    score: Mapped[float] = mapped_column(Float, default=100.0, nullable=False)
    proficiency_awarded: Mapped[ProficiencyLevel] = mapped_column(
        SAEnum(ProficiencyLevel, native_enum=False, length=20),
        default=ProficiencyLevel.INTERMEDIATE,
        nullable=False,
    )
    feedback: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    assessed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    student: Mapped["StudentProfile"] = relationship(
        "StudentProfile",
        foreign_keys=[student_id],
        back_populates="assessments",
        lazy="joined",
    )
    assessor: Mapped[Optional["StudentProfile"]] = relationship(
        "StudentProfile",
        foreign_keys=[assessor_id],
        lazy="joined",
    )
    skill: Mapped["Skill"] = relationship("Skill", back_populates="assessments", lazy="joined")

    def __repr__(self) -> str:
        return f"<SkillAssessment(student={self.student_id}, skill={self.skill_id}, awarded={self.proficiency_awarded})>"
