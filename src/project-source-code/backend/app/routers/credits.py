"""
Skill Credit Economy Endpoints — Stage 7
"""

from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, or_, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.config import get_settings
from app.core.dependencies import get_current_user_optional
from app.core.permissions import require_role
from app.core.rate_limiter import rate_limit_sensitive
from app.core.sanitizer import sanitize_text
from app.database import get_db
from app.models.activity import ActivityEvent
from app.models.credit import SkillCreditTransaction
from app.models.enums import ActivityEventType, CreditTransactionType, SkillDirection, UserRole
from app.models.learning_goal import LearningGoal
from app.models.profile import StudentProfile
from app.models.skill import Skill, StudentSkill
from app.models.user import User
from app.schemas.credit import (
    CreditTransferRequest,
    CreditTransactionResponse,
    CreditBalanceResponse,
    AdminAdjustmentRequest,
    BonusAwardRequest,
    SkillDemandIndexItem,
    SkillDemandIndexResponse,
)

router = APIRouter(prefix="/v1/credits", tags=["Skill Credits"])


def _format_transaction(t: SkillCreditTransaction, current_student_id: Optional[str] = None) -> CreditTransactionResponse:
    """Format transaction entity into standardized response."""
    # Determine primary student reference
    student_name = "Campus System"
    student_id = t.student_id

    if t.student:
        student_name = t.student.full_name
        student_id = t.student.id
    elif t.to_student:
        student_name = t.to_student.full_name
        student_id = t.to_student_id
    elif t.from_student:
        student_name = t.from_student.full_name
        student_id = t.from_student_id

    # For bilateral transfers, show counterparty appropriately if queried for specific student
    from_name = t.from_student.full_name if t.from_student else "Campus System"
    to_name = t.to_student.full_name if t.to_student else "Campus System"

    return CreditTransactionResponse(
        id=t.id,
        student_id=student_id,
        student_name=student_name,
        student=student_name,
        from_student_id=t.from_student_id,
        from_student_name=from_name,
        to_student_id=t.to_student_id,
        to_student_name=to_name,
        amount=t.amount,
        type=t.transaction_type,
        transaction_type=t.transaction_type,
        reason=t.description,
        description=t.description,
        timestamp=t.created_at,
        created_at=t.created_at,
        session_id=t.session_id,
        related_session_id=t.session_id,
    )


@router.get("/balance/{student_id}", response_model=CreditBalanceResponse)
async def get_credit_balance(student_id: str, db: AsyncSession = Depends(get_db)):
    """Get student current credit balance, total credits earned, total spent, and recent transactions."""
    student = await db.get(StudentProfile, student_id)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student profile not found")

    settings = get_settings()

    # Calculate total earned:
    # 1. Transactions where student_id == student_id and type is an earning type
    # 2. Incoming session transfers where student is to_student
    earned_res = await db.execute(
        select(func.coalesce(func.sum(SkillCreditTransaction.amount), 0)).where(
            or_(
                and_(
                    SkillCreditTransaction.student_id == student_id,
                    SkillCreditTransaction.transaction_type.in_([
                        CreditTransactionType.TEACHING_REWARD,
                        CreditTransactionType.BONUS,
                        CreditTransactionType.REFUND,
                        CreditTransactionType.REWARD,
                    ]),
                ),
                and_(
                    SkillCreditTransaction.to_student_id == student_id,
                    SkillCreditTransaction.from_student_id != None,
                    SkillCreditTransaction.from_student_id != student_id,
                    SkillCreditTransaction.transaction_type == CreditTransactionType.SESSION_TRANSFER,
                ),
            )
        )
    )
    total_earned = earned_res.scalar_one()

    # Calculate total spent:
    # 1. Transactions where student_id == student_id and type == LEARNING_COST
    # 2. Outgoing session transfers where student is from_student
    spent_res = await db.execute(
        select(func.coalesce(func.sum(SkillCreditTransaction.amount), 0)).where(
            or_(
                and_(
                    SkillCreditTransaction.student_id == student_id,
                    SkillCreditTransaction.transaction_type == CreditTransactionType.LEARNING_COST,
                ),
                and_(
                    SkillCreditTransaction.from_student_id == student_id,
                    SkillCreditTransaction.transaction_type == CreditTransactionType.SESSION_TRANSFER,
                ),
            )
        )
    )
    total_spent = spent_res.scalar_one()

    # Fetch recent transactions
    recent_txs = await db.execute(
        select(SkillCreditTransaction)
        .where(
            or_(
                SkillCreditTransaction.student_id == student_id,
                SkillCreditTransaction.from_student_id == student_id,
                SkillCreditTransaction.to_student_id == student_id,
            )
        )
        .options(
            joinedload(SkillCreditTransaction.student),
            joinedload(SkillCreditTransaction.from_student),
            joinedload(SkillCreditTransaction.to_student),
            joinedload(SkillCreditTransaction.session),
        )
        .order_by(SkillCreditTransaction.created_at.desc())
        .limit(10)
    )
    tx_list = [_format_transaction(t, student_id) for t in recent_txs.scalars().all()]

    return CreditBalanceResponse(
        student_id=student.id,
        student_name=student.full_name,
        credit_balance=student.credit_balance,
        total_earned=int(total_earned),
        total_spent=int(total_spent),
        allow_negative_balance=settings.allow_negative_balance,
        recent_transactions=tx_list,
    )


@router.get("/ledger/{student_id}", response_model=List[CreditTransactionResponse])
@router.get("/transactions/{student_id}", response_model=List[CreditTransactionResponse])
async def list_student_ledger(
    student_id: str,
    tx_type: Optional[CreditTransactionType] = Query(None, alias="type"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """
    Transparent credit ledger for a student.
    Returns all transactions with student, amount, type, reason, timestamp, and related session.
    """
    student = await db.get(StudentProfile, student_id)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student profile not found")

    conditions = [
        or_(
            SkillCreditTransaction.student_id == student_id,
            SkillCreditTransaction.from_student_id == student_id,
            SkillCreditTransaction.to_student_id == student_id,
        )
    ]

    if tx_type:
        conditions.append(SkillCreditTransaction.transaction_type == tx_type)

    query = (
        select(SkillCreditTransaction)
        .where(and_(*conditions))
        .options(
            joinedload(SkillCreditTransaction.student),
            joinedload(SkillCreditTransaction.from_student),
            joinedload(SkillCreditTransaction.to_student),
            joinedload(SkillCreditTransaction.session),
        )
        .order_by(SkillCreditTransaction.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(query)
    transactions = result.scalars().all()

    return [_format_transaction(t, student_id) for t in transactions]


@router.post(
    "/transfer",
    response_model=CreditTransactionResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(rate_limit_sensitive)],
)
async def transfer_credits(
    from_student_id: str,
    data: CreditTransferRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Transfer skill credits from one student to another for tutoring or collaboration.
    Enforces negative balance protection unless explicitly allowed by system config.
    """
    settings = get_settings()

    if from_student_id == data.to_student_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot transfer credits to oneself",
        )

    sender = await db.get(StudentProfile, from_student_id)
    if not sender:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sender student profile not found")

    recipient = await db.get(StudentProfile, data.to_student_id)
    if not recipient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recipient student profile not found")

    # Anti-abuse: negative balance validation
    if not settings.allow_negative_balance and sender.credit_balance < data.amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient credit balance ({sender.credit_balance} available, {data.amount} required). System prohibits negative balances.",
        )

    # Perform balance transfer
    sender.credit_balance -= data.amount
    recipient.credit_balance += data.amount

    raw_reason = data.reason or data.description or f"Credit transfer from {sender.full_name} to {recipient.full_name}"
    reason = sanitize_text(raw_reason)

    tx = SkillCreditTransaction(
        student_id=sender.id,
        from_student_id=sender.id,
        to_student_id=recipient.id,
        amount=data.amount,
        transaction_type=CreditTransactionType.SESSION_TRANSFER,
        session_id=data.session_id,
        description=reason,
    )
    db.add(tx)

    # Activity events for both parties
    db.add(
        ActivityEvent(
            student_id=sender.id,
            event_type=ActivityEventType.CREDIT_TRANSFERRED,
            title="Spent Skill Credits",
            description=f"Transferred {data.amount} credits to {recipient.full_name}",
        )
    )
    db.add(
        ActivityEvent(
            student_id=recipient.id,
            event_type=ActivityEventType.CREDIT_TRANSFERRED,
            title="Earned Skill Credits",
            description=f"Received {data.amount} credits from {sender.full_name}",
        )
    )

    await db.commit()
    await db.refresh(tx)

    return _format_transaction(tx, sender.id)


@router.post(
    "/admin-adjust",
    response_model=CreditTransactionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def admin_credit_adjustment(
    data: AdminAdjustmentRequest,
    db: AsyncSession = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    """
    Admin adjustment of student credits.
    Verifies ADMIN role when caller is authenticated.
    Supports positive (credit) or negative (debit) adjustments with mandatory audit reason.
    Enforces negative balance constraints unless system configured otherwise.
    """
    if user and user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Admin role required",
        )
    settings = get_settings()
    student = await db.get(StudentProfile, data.student_id)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student profile not found")

    if not settings.allow_negative_balance and (student.credit_balance + data.amount) < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Adjustment would result in negative balance ({student.credit_balance + data.amount}). Negative balance is prohibited.",
        )

    student.credit_balance += data.amount
    sanitized_reason = sanitize_text(data.reason)

    tx = SkillCreditTransaction(
        student_id=student.id,
        to_student_id=student.id if data.amount >= 0 else None,
        from_student_id=student.id if data.amount < 0 else None,
        amount=abs(data.amount),
        transaction_type=CreditTransactionType.ADMIN_ADJUSTMENT,
        description=f"Admin adjustment: {sanitized_reason} ({'+' if data.amount >= 0 else ''}{data.amount})",
    )
    db.add(tx)

    db.add(
        ActivityEvent(
            student_id=student.id,
            event_type=ActivityEventType.CREDIT_TRANSFERRED,
            title="Credit Adjustment",
            description=f"Admin adjustment of {data.amount} credits: {data.reason}",
        )
    )

    await db.commit()
    await db.refresh(tx)
    return _format_transaction(tx, student.id)


@router.post("/bonus", response_model=CreditTransactionResponse, status_code=status.HTTP_201_CREATED)
async def award_bonus(
    data: BonusAwardRequest,
    db: AsyncSession = Depends(get_db),
):
    """Award bonus skill credits to a student (e.g. peer onboarding, milestone reward)."""
    student = await db.get(StudentProfile, data.student_id)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student profile not found")

    student.credit_balance += data.amount

    tx = SkillCreditTransaction(
        student_id=student.id,
        to_student_id=student.id,
        from_student_id=None,
        amount=data.amount,
        transaction_type=CreditTransactionType.BONUS,
        description=f"Bonus award: {data.reason}",
    )
    db.add(tx)

    db.add(
        ActivityEvent(
            student_id=student.id,
            event_type=ActivityEventType.CREDIT_TRANSFERRED,
            title="Bonus Credits Received",
            description=f"Awarded {data.amount} bonus credits: {data.reason}",
        )
    )

    await db.commit()
    await db.refresh(tx)
    return _format_transaction(tx, student.id)


@router.get("/demand-index", response_model=SkillDemandIndexResponse)
@router.get("/high-demand", response_model=SkillDemandIndexResponse)
async def get_skill_demand_index(db: AsyncSession = Depends(get_db)):
    """
    Calculate Campus Skill Demand Index for all skills:
    Demand = number of learners requesting skill / number of available teachers
    Identifies high-demand skills to incentivize peer educators.
    """
    settings = get_settings()

    # Fetch all skills
    skills_result = await db.execute(select(Skill).order_by(Skill.name))
    skills = skills_result.scalars().all()

    # Query learners count per skill (direction == LEARN in student_skills)
    learners_res = await db.execute(
        select(StudentSkill.skill_id, func.count(StudentSkill.id))
        .where(StudentSkill.direction == SkillDirection.LEARN)
        .group_by(StudentSkill.skill_id)
    )
    learners_map = {row[0]: row[1] for row in learners_res.all()}

    # Query teachers count per skill (direction == TEACH in student_skills)
    teachers_res = await db.execute(
        select(StudentSkill.skill_id, func.count(StudentSkill.id))
        .where(StudentSkill.direction == SkillDirection.TEACH)
        .group_by(StudentSkill.skill_id)
    )
    teachers_map = {row[0]: row[1] for row in teachers_res.all()}

    # Also check active learning goals as an additional demand signal
    goals_res = await db.execute(
        select(LearningGoal.skill_id, func.count(LearningGoal.id))
        .group_by(LearningGoal.skill_id)
    )
    goals_map = {row[0]: row[1] for row in goals_res.all()}

    items: List[SkillDemandIndexItem] = []
    total_demand = 0.0

    for s in skills:
        learn_reqs = learners_map.get(s.id, 0) + goals_map.get(s.id, 0)
        teachers_avail = teachers_map.get(s.id, 0)

        if teachers_avail == 0:
            if learn_reqs == 0:
                demand_idx = 0.0
                status_str = "BALANCED"
            else:
                # High critical shortage: learners wanting skill with zero teachers
                demand_idx = round(float(learn_reqs) * 2.0, 2)
                status_str = "CRITICAL_SHORTAGE"
        else:
            demand_idx = round(float(learn_reqs) / float(teachers_avail), 2)
            if demand_idx >= settings.high_demand_threshold:
                status_str = "HIGH_DEMAND"
            elif demand_idx >= 0.8:
                status_str = "BALANCED"
            else:
                status_str = "SURPLUS"

        is_high = (demand_idx >= settings.high_demand_threshold) or (status_str == "CRITICAL_SHORTAGE")
        multiplier = 1.5 if is_high else 1.0

        items.append(
            SkillDemandIndexItem(
                skill_id=s.id,
                skill_name=s.name,
                category=s.category,
                learners_count=learn_reqs,
                teachers_count=teachers_avail,
                demand_index=demand_idx,
                is_high_demand=is_high,
                status=status_str,
                recommended_reward_multiplier=multiplier,
            )
        )
        total_demand += demand_idx

    # Sort descending by demand index then learners count
    items.sort(key=lambda x: (x.demand_index, x.learners_count), reverse=True)

    high_demand_count = sum(1 for item in items if item.is_high_demand)
    avg_demand = round(total_demand / max(len(items), 1), 2)

    return SkillDemandIndexResponse(
        skills=items,
        high_demand_count=high_demand_count,
        total_skills=len(items),
        average_demand_index=avg_demand,
    )
