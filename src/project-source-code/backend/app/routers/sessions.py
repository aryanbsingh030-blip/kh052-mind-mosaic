"""
Teaching and Learning Sessions Endpoints — Stage 7
"""

from datetime import datetime, timezone, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, or_, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload, joinedload

from app.config import get_settings
from app.database import get_db
from app.models.activity import ActivityEvent
from app.models.credit import SkillCreditTransaction
from app.models.enums import ActivityEventType, CreditTransactionType, SessionStatus
from app.models.profile import StudentProfile
from app.models.session import TeachingSession, LearningSession
from app.models.skill import Skill
from app.schemas.session import (
    TeachingSessionCreate,
    SessionRequestCreate,
    SessionAcceptRequest,
    SessionCompleteRequest,
    SessionCancelRequest,
    TeachingSessionUpdateStatus,
    TeachingSessionResponse,
    LearningSessionLogCreate,
    LearningSessionResponse,
)

router = APIRouter(prefix="/v1/sessions", tags=["Teaching & Learning Sessions"])


def _session_to_response(s: TeachingSession) -> TeachingSessionResponse:
    log_res = None
    if s.learning_log:
        log_res = LearningSessionResponse(
            id=s.learning_log.id,
            session_id=s.learning_log.session_id,
            student_id=s.learning_log.student_id,
            rating=s.learning_log.rating,
            feedback=s.learning_log.feedback,
            learned_summary=s.learning_log.learned_summary,
            completed_at=s.learning_log.completed_at,
        )

    return TeachingSessionResponse(
        id=s.id,
        teacher_student_id=s.teacher_student_id,
        teacher_name=s.teacher.full_name if s.teacher else None,
        learner_student_id=s.learner_student_id,
        learner_name=s.learner.full_name if s.learner else None,
        skill_id=s.skill_id,
        skill_name=s.skill.name if s.skill else None,
        scheduled_at=s.scheduled_at,
        duration_minutes=s.duration_minutes,
        status=s.status,
        credit_amount=s.credit_amount,
        meeting_link=s.meeting_link,
        notes=s.notes,
        verification_notes=s.verification_notes,
        completed_at=s.completed_at,
        created_at=s.created_at,
        learning_log=log_res,
    )


async def _check_anti_abuse_velocity(teacher_id: str, learner_id: str, db: AsyncSession):
    """Prevent spam/collusion session creation between the same two users."""
    settings = get_settings()
    active_count_res = await db.execute(
        select(func.count(TeachingSession.id)).where(
            TeachingSession.teacher_student_id == teacher_id,
            TeachingSession.learner_student_id == learner_id,
            TeachingSession.status.in_([SessionStatus.REQUESTED, SessionStatus.ACCEPTED]),
        )
    )
    active_count = active_count_res.scalar_one()
    if active_count >= settings.max_daily_sessions_per_pair:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Anti-abuse safeguard: Limit of {settings.max_daily_sessions_per_pair} active/pending sessions between the same teacher and learner reached.",
        )


@router.post("", response_model=TeachingSessionResponse, status_code=status.HTTP_201_CREATED)
async def schedule_session(
    teacher_id: str,
    data: TeachingSessionCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Schedule/request a skill teaching session between a teacher and learner.
    Enforces anti-abuse validation (no self-teaching, negative balance check, velocity limit).
    """
    settings = get_settings()

    if teacher_id == data.learner_student_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Anti-abuse safeguard: Teacher and learner cannot be the same student")

    teacher = await db.get(StudentProfile, teacher_id)
    if not teacher:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Teacher student profile not found")

    learner = await db.get(StudentProfile, data.learner_student_id)
    if not learner:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Learner student profile not found")

    # Anti-abuse: check learner balance
    if not settings.allow_negative_balance and learner.credit_balance < data.credit_amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Learner has insufficient credits ({learner.credit_balance} available, {data.credit_amount} required).",
        )

    await _check_anti_abuse_velocity(teacher_id, data.learner_student_id, db)

    skill = await db.get(Skill, data.skill_id)
    if not skill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill not found")

    initial_status = data.status if data.status is not None else SessionStatus.SCHEDULED
    session = TeachingSession(
        teacher_student_id=teacher_id,
        learner_student_id=data.learner_student_id,
        skill_id=data.skill_id,
        scheduled_at=data.scheduled_at,
        duration_minutes=data.duration_minutes,
        credit_amount=data.credit_amount,
        meeting_link=data.meeting_link,
        notes=data.notes,
        status=initial_status,
    )
    db.add(session)

    event = ActivityEvent(
        student_id=teacher_id,
        event_type=ActivityEventType.SESSION_SCHEDULED,
        title=f"Session Requested: {skill.name}",
        description=f"Teaching {learner.full_name} for {data.duration_minutes} mins ({data.credit_amount} credits)",
    )
    db.add(event)
    await db.commit()

    return await get_session_by_id(session.id, db)


@router.post("/request", response_model=TeachingSessionResponse, status_code=status.HTTP_201_CREATED)
async def request_learning_session(
    learner_id: str,
    data: SessionRequestCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Learner Flow: Learner submits a request to learn a skill from a teacher.
    Initial state is REQUESTED.
    """
    create_data = TeachingSessionCreate(
        learner_student_id=learner_id,
        skill_id=data.skill_id,
        scheduled_at=data.scheduled_at,
        duration_minutes=data.duration_minutes,
        credit_amount=data.credit_amount,
        meeting_link=data.meeting_link,
        notes=data.notes,
        status=SessionStatus.REQUESTED,
    )
    return await schedule_session(teacher_id=data.teacher_student_id, data=create_data, db=db)


@router.put("/{session_id}/accept", response_model=TeachingSessionResponse)
async def accept_session(
    session_id: str,
    data: Optional[SessionAcceptRequest] = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Teacher Flow: Accept an incoming session request.
    Transitions status from REQUESTED -> ACCEPTED.
    """
    session = await db.get(TeachingSession, session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    if session.status != SessionStatus.REQUESTED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot accept session with status '{session.status}'. Only REQUESTED sessions can be accepted.",
        )

    if data:
        if data.meeting_link:
            session.meeting_link = data.meeting_link
        if data.scheduled_at:
            session.scheduled_at = data.scheduled_at
        if data.notes:
            session.notes = data.notes

    session.status = SessionStatus.ACCEPTED

    event = ActivityEvent(
        student_id=session.teacher_student_id,
        event_type=ActivityEventType.SESSION_SCHEDULED,
        title="Teaching Session Accepted",
        description=f"Session scheduled with meeting details.",
    )
    db.add(event)

    await db.commit()
    return await get_session_by_id(session_id, db)


@router.put("/{session_id}/complete", response_model=TeachingSessionResponse)
async def complete_session(
    session_id: str,
    data: Optional[SessionCompleteRequest] = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Completion Flow: Mark session as COMPLETED and award credits.
    ANTI-ABUSE VALIDATION:
    1. Session MUST have been ACCEPTED (cannot skip straight from REQUESTED).
    2. Cannot re-complete an already completed session (replay protection).
    3. Negative balance safeguard: Learner must have enough credits.
    4. Anti-collusion rate limiting: Maximum completed sessions per day between pair.
    5. Credits are awarded AFTER completion into immutable ledger entries (LEARNING_COST & TEACHING_REWARD).
    """
    settings = get_settings()
    session = await db.get(TeachingSession, session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    if session.status == SessionStatus.COMPLETED:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Session is already marked as COMPLETED.")

    if session.status not in (SessionStatus.ACCEPTED, SessionStatus.SCHEDULED):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Anti-abuse safeguard: Session must be in ACCEPTED state before completion (current status: {session.status}).",
        )

    # Anti-collusion check: ensure no more than 5 completed sessions between same pair in last 24 hours
    twenty_four_hrs_ago = datetime.now(timezone.utc) - timedelta(hours=24)
    recent_comp_res = await db.execute(
        select(func.count(TeachingSession.id)).where(
            TeachingSession.teacher_student_id == session.teacher_student_id,
            TeachingSession.learner_student_id == session.learner_student_id,
            TeachingSession.status == SessionStatus.COMPLETED,
            TeachingSession.created_at >= twenty_four_hrs_ago,
        )
    )
    if recent_comp_res.scalar_one() >= 5:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Anti-abuse safeguard: Daily completion limit reached between these students to prevent credit farming.",
        )

    learner = await db.get(StudentProfile, session.learner_student_id)
    teacher = await db.get(StudentProfile, session.teacher_student_id)
    skill = await db.get(Skill, session.skill_id)
    skill_title = skill.name if skill else "Skill"

    credit_amount = session.credit_amount

    if learner and teacher and credit_amount > 0:
        if not settings.allow_negative_balance and learner.credit_balance < credit_amount:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Learner has insufficient credit balance ({learner.credit_balance} available, {credit_amount} required).",
            )

        # Atomically adjust balances
        learner.credit_balance -= credit_amount
        teacher.credit_balance += credit_amount

        now_utc = datetime.now(timezone.utc)

        # 1. Transparent ledger entry: LEARNING_COST for learner
        tx_learner = SkillCreditTransaction(
            student_id=learner.id,
            from_student_id=learner.id,
            to_student_id=teacher.id,
            amount=credit_amount,
            transaction_type=CreditTransactionType.LEARNING_COST,
            session_id=session.id,
            description=f"Learning cost: {skill_title} session with {teacher.full_name}",
            created_at=now_utc,
        )
        db.add(tx_learner)

        # 2. Transparent ledger entry: TEACHING_REWARD for teacher
        tx_teacher = SkillCreditTransaction(
            student_id=teacher.id,
            from_student_id=learner.id,
            to_student_id=teacher.id,
            amount=credit_amount,
            transaction_type=CreditTransactionType.TEACHING_REWARD,
            session_id=session.id,
            description=f"Teaching reward: {skill_title} session taught to {learner.full_name}",
            created_at=now_utc,
        )
        db.add(tx_teacher)

        # Activity events
        db.add(
            ActivityEvent(
                student_id=learner.id,
                event_type=ActivityEventType.SESSION_COMPLETED,
                title="Completed Learning Session",
                description=f"Completed {session.duration_minutes}m session on {skill_title} with {teacher.full_name}",
            )
        )
        db.add(
            ActivityEvent(
                student_id=teacher.id,
                event_type=ActivityEventType.SESSION_COMPLETED,
                title="Completed Teaching Session",
                description=f"Earned {credit_amount} credits teaching {skill_title} to {learner.full_name}",
            )
        )

    session.status = SessionStatus.COMPLETED
    session.completed_at = datetime.now(timezone.utc)
    if data and data.verification_notes:
        session.verification_notes = data.verification_notes
    if data and data.actual_duration_minutes:
        session.duration_minutes = data.actual_duration_minutes

    # If learner feedback was provided alongside completion
    if data and (data.rating or data.learner_feedback):
        existing_log_res = await db.execute(select(LearningSession).where(LearningSession.session_id == session.id))
        log = existing_log_res.scalar_one_or_none()
        if not log:
            log = LearningSession(
                session_id=session.id,
                student_id=session.learner_student_id,
                rating=data.rating,
                feedback=data.learner_feedback,
                learned_summary=data.verification_notes,
                completed_at=datetime.now(timezone.utc),
            )
            db.add(log)

    await db.commit()
    return await get_session_by_id(session_id, db)


@router.put("/{session_id}/cancel", response_model=TeachingSessionResponse)
async def cancel_session(
    session_id: str,
    data: SessionCancelRequest,
    db: AsyncSession = Depends(get_db),
):
    """Cancel a session with mandatory reason. Completed sessions cannot be cancelled."""
    session = await db.get(TeachingSession, session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    if session.status == SessionStatus.COMPLETED:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot cancel a completed session.")

    session.status = SessionStatus.CANCELLED
    session.notes = f"{session.notes or ''} [Cancelled: {data.reason}]".strip()

    await db.commit()
    return await get_session_by_id(session_id, db)


@router.put("/{session_id}/status", response_model=TeachingSessionResponse)
async def update_session_status(
    session_id: str,
    data: TeachingSessionUpdateStatus,
    db: AsyncSession = Depends(get_db),
):
    """
    Backward-compatible status updater route.
    Delegates to complete or cancel when applicable.
    """
    if data.status == SessionStatus.COMPLETED:
        comp_req = SessionCompleteRequest(verification_notes=data.verification_notes or "Session verified and completed")
        return await complete_session(session_id=session_id, data=comp_req, db=db)
    elif data.status == SessionStatus.CANCELLED:
        return await cancel_session(session_id=session_id, data=SessionCancelRequest(reason="Status updated to CANCELLED"), db=db)
    elif data.status in (SessionStatus.ACCEPTED, SessionStatus.SCHEDULED):
        session = await db.get(TeachingSession, session_id)
        if not session:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
        session.status = SessionStatus.ACCEPTED
        await db.commit()
        return await get_session_by_id(session_id, db)

    session = await db.get(TeachingSession, session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    session.status = data.status
    await db.commit()
    return await get_session_by_id(session_id, db)


@router.get("/student/{student_id}", response_model=List[TeachingSessionResponse])
async def list_student_sessions(
    student_id: str,
    role: Optional[str] = Query(None, description="'teacher' or 'learner'"),
    status_filter: Optional[SessionStatus] = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db),
):
    """List all teaching and learning sessions for a student with role and status filters."""
    conditions = []
    if role == "teacher":
        conditions.append(TeachingSession.teacher_student_id == student_id)
    elif role == "learner":
        conditions.append(TeachingSession.learner_student_id == student_id)
    else:
        conditions.append(
            or_(
                TeachingSession.teacher_student_id == student_id,
                TeachingSession.learner_student_id == student_id,
            )
        )

    if status_filter:
        conditions.append(TeachingSession.status == status_filter)

    result = await db.execute(
        select(TeachingSession)
        .where(and_(*conditions))
        .options(
            joinedload(TeachingSession.teacher),
            joinedload(TeachingSession.learner),
            joinedload(TeachingSession.skill),
            selectinload(TeachingSession.learning_log),
        )
        .order_by(TeachingSession.scheduled_at.desc())
    )
    sessions = result.scalars().all()
    return [_session_to_response(s) for s in sessions]


@router.get("/{session_id}", response_model=TeachingSessionResponse)
async def get_session_by_id(session_id: str, db: AsyncSession = Depends(get_db)):
    """Get single session details with teacher, learner, skill, and learning log."""
    result = await db.execute(
        select(TeachingSession)
        .where(TeachingSession.id == session_id)
        .options(
            joinedload(TeachingSession.teacher),
            joinedload(TeachingSession.learner),
            joinedload(TeachingSession.skill),
            selectinload(TeachingSession.learning_log),
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    return _session_to_response(session)


@router.post("/{session_id}/learning-log", response_model=LearningSessionResponse, status_code=status.HTTP_201_CREATED)
async def submit_learning_log(
    session_id: str,
    data: LearningSessionLogCreate,
    db: AsyncSession = Depends(get_db),
):
    """Learner submits feedback and notes for a completed session."""
    session = await db.get(TeachingSession, session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Teaching session not found")

    existing_log = await db.execute(select(LearningSession).where(LearningSession.session_id == session_id))
    if existing_log.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Learning log already submitted for this session")

    log = LearningSession(
        session_id=session_id,
        student_id=session.learner_student_id,
        rating=data.rating,
        feedback=data.feedback,
        learned_summary=data.learned_summary,
        completed_at=datetime.now(timezone.utc),
    )
    db.add(log)
    await db.commit()
    await db.refresh(log)

    return LearningSessionResponse(
        id=log.id,
        session_id=log.session_id,
        student_id=log.student_id,
        rating=log.rating,
        feedback=log.feedback,
        learned_summary=log.learned_summary,
        completed_at=log.completed_at,
    )

