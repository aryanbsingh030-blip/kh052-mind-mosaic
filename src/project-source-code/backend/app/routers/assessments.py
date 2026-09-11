"""
Skill Assessment Endpoints
"""

from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.database import get_db
from app.models.assessment import SkillAssessment
from app.models.profile import StudentProfile
from app.models.skill import Skill
from app.schemas.assessment import SkillAssessmentCreate, SkillAssessmentResponse

router = APIRouter(prefix="/v1/assessments", tags=["Skill Assessments"])


@router.post("", response_model=SkillAssessmentResponse, status_code=status.HTTP_201_CREATED)
async def create_assessment(
    assessor_id: str,
    data: SkillAssessmentCreate,
    db: AsyncSession = Depends(get_db),
):
    """Record a peer, mentor, or self assessment of a student's proficiency level."""
    student = await db.get(StudentProfile, data.student_id)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student profile not found")

    skill = await db.get(Skill, data.skill_id)
    if not skill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill not found")

    assessor = await db.get(StudentProfile, assessor_id)

    assessment = SkillAssessment(
        student_id=data.student_id,
        skill_id=data.skill_id,
        assessor_id=assessor_id if assessor else None,
        score=data.score,
        proficiency_awarded=data.proficiency_awarded,
        feedback=data.feedback,
        assessed_at=datetime.now(timezone.utc),
    )
    db.add(assessment)
    await db.commit()
    await db.refresh(assessment)

    return SkillAssessmentResponse(
        id=assessment.id,
        student_id=assessment.student_id,
        student_name=student.full_name,
        skill_id=assessment.skill_id,
        skill_name=skill.name,
        assessor_id=assessment.assessor_id,
        assessor_name=assessor.full_name if assessor else None,
        score=assessment.score,
        proficiency_awarded=assessment.proficiency_awarded,
        feedback=assessment.feedback,
        assessed_at=assessment.assessed_at,
    )


@router.get("/student/{student_id}", response_model=List[SkillAssessmentResponse])
async def list_student_assessments(student_id: str, db: AsyncSession = Depends(get_db)):
    """List all skill assessments recorded for a student."""
    result = await db.execute(
        select(SkillAssessment)
        .where(SkillAssessment.student_id == student_id)
        .options(
            joinedload(SkillAssessment.student),
            joinedload(SkillAssessment.skill),
            joinedload(SkillAssessment.assessor),
        )
        .order_by(SkillAssessment.assessed_at.desc())
    )
    assessments = result.scalars().all()

    return [
        SkillAssessmentResponse(
            id=a.id,
            student_id=a.student_id,
            student_name=a.student.full_name if a.student else None,
            skill_id=a.skill_id,
            skill_name=a.skill.name if a.skill else None,
            assessor_id=a.assessor_id,
            assessor_name=a.assessor.full_name if a.assessor else None,
            score=a.score,
            proficiency_awarded=a.proficiency_awarded,
            feedback=a.feedback,
            assessed_at=a.assessed_at,
        )
        for a in assessments
    ]
