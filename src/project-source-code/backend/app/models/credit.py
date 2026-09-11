"""
Skill Credit Economy Models
"""

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional

from sqlalchemy import String, Integer, Text, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import CreditTransactionType

if TYPE_CHECKING:
    from app.models.profile import StudentProfile
    from app.models.session import TeachingSession


class SkillCreditTransaction(Base):
    """Ledger transaction for skill credit transfers, rewards, costs, bonuses, and refunds."""

    __tablename__ = "skill_credit_transactions"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    student_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("student_profiles.id", ondelete="CASCADE"),
        index=True,
        nullable=True,
    )
    from_student_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("student_profiles.id", ondelete="SET NULL"),
        index=True,
        nullable=True,  # Null for system rewards or initial grants
    )
    to_student_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("student_profiles.id", ondelete="CASCADE"),
        index=True,
        nullable=True,
    )
    amount: Mapped[int] = mapped_column(Integer, nullable=False)
    transaction_type: Mapped[CreditTransactionType] = mapped_column(
        SAEnum(CreditTransactionType, native_enum=False, length=30),
        default=CreditTransactionType.SESSION_TRANSFER,
        nullable=False,
    )
    session_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("teaching_sessions.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    student: Mapped[Optional["StudentProfile"]] = relationship(
        "StudentProfile",
        foreign_keys=[student_id],
        lazy="joined",
    )
    from_student: Mapped[Optional["StudentProfile"]] = relationship(
        "StudentProfile",
        foreign_keys=[from_student_id],
        back_populates="sent_transactions",
        lazy="joined",
    )
    to_student: Mapped[Optional["StudentProfile"]] = relationship(
        "StudentProfile",
        foreign_keys=[to_student_id],
        back_populates="received_transactions",
        lazy="joined",
    )
    session: Mapped[Optional["TeachingSession"]] = relationship(
        "TeachingSession",
        foreign_keys=[session_id],
        lazy="joined",
    )

    # Stage 7 requirement property aliases
    @property
    def student_profile(self) -> Optional["StudentProfile"]:
        return self.student or self.to_student or self.from_student

    @property
    def reason(self) -> Optional[str]:
        return self.description

    @reason.setter
    def reason(self, val: Optional[str]):
        self.description = val

    @property
    def timestamp(self) -> datetime:
        return self.created_at

    @timestamp.setter
    def timestamp(self, val: datetime):
        self.created_at = val

    @property
    def type(self) -> CreditTransactionType:
        return self.transaction_type

    @type.setter
    def type(self, val: CreditTransactionType):
        self.transaction_type = val

    @property
    def related_session(self) -> Optional["TeachingSession"]:
        return self.session

    def __repr__(self) -> str:
        return f"<SkillCreditTransaction(id={self.id}, student={self.student_id}, amount={self.amount}, type={self.transaction_type})>"
