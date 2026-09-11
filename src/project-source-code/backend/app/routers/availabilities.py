"""
Student Availability Schedule Endpoints
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.availability import Availability
from app.models.profile import StudentProfile
from app.schemas.availability import AvailabilityCreate, AvailabilityResponse

router = APIRouter(prefix="/v1/availabilities", tags=["Availability"])


@router.post("", response_model=AvailabilityResponse, status_code=status.HTTP_201_CREATED)
async def create_availability(
    student_id: str,
    data: AvailabilityCreate,
    db: AsyncSession = Depends(get_db),
):
    """Add a weekly recurring availability slot for a student."""
    student = await db.get(StudentProfile, student_id)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student profile not found")

    slot = Availability(
        student_id=student_id,
        day_of_week=data.day_of_week,
        start_time=data.start_time,
        end_time=data.end_time,
        timezone=data.timezone,
        is_active=data.is_active,
    )
    db.add(slot)
    await db.commit()
    await db.refresh(slot)

    return AvailabilityResponse(
        id=slot.id,
        student_id=slot.student_id,
        day_of_week=slot.day_of_week,
        start_time=slot.start_time,
        end_time=slot.end_time,
        timezone=slot.timezone,
        is_active=slot.is_active,
    )


@router.get("/student/{student_id}", response_model=List[AvailabilityResponse])
async def list_student_availabilities(student_id: str, db: AsyncSession = Depends(get_db)):
    """List all availability slots for a student."""
    result = await db.execute(
        select(Availability).where(Availability.student_id == student_id, Availability.is_active == True)
    )
    slots = result.scalars().all()
    return [
        AvailabilityResponse(
            id=s.id,
            student_id=s.student_id,
            day_of_week=s.day_of_week,
            start_time=s.start_time,
            end_time=s.end_time,
            timezone=s.timezone,
            is_active=s.is_active,
        )
        for s in slots
    ]


@router.delete("/{availability_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_availability(availability_id: str, db: AsyncSession = Depends(get_db)):
    """Delete an availability slot."""
    slot = await db.get(Availability, availability_id)
    if not slot:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Availability slot not found")

    await db.delete(slot)
    await db.commit()
    return None
