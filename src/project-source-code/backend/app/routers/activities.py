"""
Activity and Audit Log Endpoints
"""

from typing import List

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.database import get_db
from app.models.activity import ActivityEvent
from app.schemas.activity import ActivityEventResponse

router = APIRouter(prefix="/v1/activities", tags=["Activities"])


@router.get("/campus", response_model=List[ActivityEventResponse])
async def list_campus_activities(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """List recent campus-wide skill exchange activity events."""
    result = await db.execute(
        select(ActivityEvent)
        .options(joinedload(ActivityEvent.student))
        .order_by(ActivityEvent.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    events = result.scalars().all()
    return [
        ActivityEventResponse(
            id=e.id,
            student_id=e.student_id,
            student_name=e.student.full_name if e.student else "Student",
            event_type=e.event_type,
            title=e.title,
            description=e.description,
            metadata_json=e.metadata_json,
            created_at=e.created_at,
        )
        for e in events
    ]


@router.get("/student/{student_id}", response_model=List[ActivityEventResponse])
async def list_student_activities(
    student_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """List activity events for a specific student."""
    result = await db.execute(
        select(ActivityEvent)
        .where(ActivityEvent.student_id == student_id)
        .options(joinedload(ActivityEvent.student))
        .order_by(ActivityEvent.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    events = result.scalars().all()
    return [
        ActivityEventResponse(
            id=e.id,
            student_id=e.student_id,
            student_name=e.student.full_name if e.student else "Student",
            event_type=e.event_type,
            title=e.title,
            description=e.description,
            metadata_json=e.metadata_json,
            created_at=e.created_at,
        )
        for e in events
    ]
