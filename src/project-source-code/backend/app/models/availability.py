"""
Availability Model
"""

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import String, Boolean, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import DayOfWeek

if TYPE_CHECKING:
    from app.models.profile import StudentProfile


class Availability(Base):
    """Weekly recurring availability slots for student teaching and collaborating."""

    __tablename__ = "availabilities"

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
    day_of_week: Mapped[DayOfWeek] = mapped_column(
        SAEnum(DayOfWeek, native_enum=False, length=20),
        nullable=False,
    )
    start_time: Mapped[str] = mapped_column(String(10), nullable=False)  # e.g., "09:00"
    end_time: Mapped[str] = mapped_column(String(10), nullable=False)    # e.g., "11:00"
    timezone: Mapped[str] = mapped_column(String(50), default="UTC", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    student: Mapped["StudentProfile"] = relationship("StudentProfile", back_populates="availabilities")

    def __repr__(self) -> str:
        return f"<Availability(student={self.student_id}, day={self.day_of_week}, time={self.start_time}-{self.end_time})>"
