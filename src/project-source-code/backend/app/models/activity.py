"""
Activity/Event Model
"""

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional

from sqlalchemy import String, Text, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import ActivityEventType

if TYPE_CHECKING:
    from app.models.profile import StudentProfile


class ActivityEvent(Base):
    """Audit log and campus activity feed event recording key milestones and actions."""

    __tablename__ = "activity_events"

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
    event_type: Mapped[ActivityEventType] = mapped_column(
        SAEnum(ActivityEventType, native_enum=False, length=30),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    metadata_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    student: Mapped["StudentProfile"] = relationship("StudentProfile", back_populates="activities")

    def __repr__(self) -> str:
        return f"<ActivityEvent(student={self.student_id}, type={self.event_type}, title={self.title})>"
