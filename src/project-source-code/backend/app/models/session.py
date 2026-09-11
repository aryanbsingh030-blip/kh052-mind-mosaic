"""
Teaching and Learning Session Models
"""

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional

from sqlalchemy import String, Text, Integer, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import SessionStatus

if TYPE_CHECKING:
    from app.models.profile import StudentProfile
    from app.models.skill import Skill


class TeachingSession(Base):
    """A scheduled or completed teaching interaction between a teacher student and learner student."""

    __tablename__ = "teaching_sessions"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    teacher_student_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("student_profiles.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    learner_student_id: Mapped[str] = mapped_column(
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
    scheduled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=60, nullable=False)
    status: Mapped[SessionStatus] = mapped_column(
        SAEnum(SessionStatus, native_enum=False, length=20),
        default=SessionStatus.REQUESTED,
        nullable=False,
    )
    credit_amount: Mapped[int] = mapped_column(Integer, default=10, nullable=False)
    meeting_link: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    verification_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    teacher: Mapped["StudentProfile"] = relationship(
        "StudentProfile",
        foreign_keys=[teacher_student_id],
        back_populates="teaching_sessions",
        lazy="joined",
    )
    learner: Mapped["StudentProfile"] = relationship(
        "StudentProfile",
        foreign_keys=[learner_student_id],
        back_populates="learning_sessions",
        lazy="joined",
    )
    skill: Mapped["Skill"] = relationship("Skill", back_populates="teaching_sessions", lazy="joined")
    
    learning_log: Mapped[Optional["LearningSession"]] = relationship(
        "LearningSession",
        back_populates="teaching_session",
        uselist=False,
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<TeachingSession(teacher={self.teacher_student_id}, learner={self.learner_student_id}, skill={self.skill_id}, status={self.status})>"


class LearningSession(Base):
    """The learner reflection, feedback, and rating log linked to a completed teaching session."""

    __tablename__ = "learning_sessions"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    session_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("teaching_sessions.id", ondelete="CASCADE"),
        unique=True,
        index=True,
        nullable=False,
    )
    student_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("student_profiles.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    rating: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # 1-5 scale
    feedback: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    learned_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    teaching_session: Mapped["TeachingSession"] = relationship("TeachingSession", back_populates="learning_log")
    student: Mapped["StudentProfile"] = relationship("StudentProfile", back_populates="learning_session_logs", lazy="joined")

    def __repr__(self) -> str:
        return f"<LearningSession(session={self.session_id}, student={self.student_id}, rating={self.rating})>"
