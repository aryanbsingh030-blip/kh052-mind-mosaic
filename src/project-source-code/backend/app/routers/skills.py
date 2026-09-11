"""
Skills and Student Skills Endpoints
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload, joinedload

from app.database import get_db
from app.models.enums import SkillDirection, ActivityEventType
from app.models.activity import ActivityEvent
from app.models.profile import StudentProfile
from app.models.skill import Skill, StudentSkill
from app.schemas.skill import (
    SkillCreate,
    SkillUpdate,
    SkillResponse,
    SkillSummary,
    StudentSkillCreate,
    StudentSkillUpdate,
    StudentSkillResponse,
)

router = APIRouter(prefix="/v1/skills", tags=["Skills"])


@router.get("", response_model=List[SkillResponse])
async def list_skills(
    category: Optional[str] = None,
    search: Optional[str] = None,
    parent_only: bool = False,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    """List skills with optional filtering by category, search query, or hierarchy root."""
    query = select(Skill).options(selectinload(Skill.sub_skills))

    if category:
        query = query.where(Skill.category == category)
    if parent_only:
        query = query.where(Skill.parent_skill_id.is_(None))
    if search:
        term = f"%{search.strip()}%"
        query = query.where(
            or_(
                Skill.name.ilike(term),
                Skill.category.ilike(term),
                Skill.description.ilike(term),
                Skill.aliases.ilike(term),
            )
        )

    query = query.order_by(Skill.category, Skill.name).offset(skip).limit(limit)
    result = await db.execute(query)
    skills = result.scalars().all()

    response_list = []
    for s in skills:
        sub_skills_summary = [
            SkillSummary(
                id=sub.id,
                name=sub.name,
                category=sub.category,
                description=sub.description,
            )
            for sub in s.sub_skills
        ]
        response_list.append(
            SkillResponse(
                id=s.id,
                name=s.name,
                category=s.category,
                description=s.description,
                aliases=s.aliases,
                parent_skill_id=s.parent_skill_id,
                created_at=s.created_at,
                sub_skills=sub_skills_summary,
            )
        )
    return response_list


@router.get("/search", response_model=List[SkillResponse])
async def search_skills(
    q: str = Query("", description="Search term for skills"),
    category: Optional[str] = None,
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Search skills by query term across name, category, description, and aliases."""
    return await list_skills(category=category, search=q, parent_only=False, skip=0, limit=limit, db=db)


@router.post("", response_model=SkillResponse, status_code=status.HTTP_201_CREATED)
async def create_skill(data: SkillCreate, db: AsyncSession = Depends(get_db)):
    """Create a new skill in the campus taxonomy."""
    # Check for duplicate
    existing = await db.execute(
        select(Skill).where(func.lower(Skill.name) == data.name.strip().lower())
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Skill '{data.name}' already exists",
        )

    if data.parent_skill_id:
        parent = await db.get(Skill, data.parent_skill_id)
        if not parent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Specified parent skill not found",
            )

    new_skill = Skill(
        name=data.name.strip(),
        category=data.category.strip(),
        description=data.description,
        aliases=data.aliases,
        parent_skill_id=data.parent_skill_id,
    )
    db.add(new_skill)
    await db.commit()
    await db.refresh(new_skill)

    return SkillResponse(
        id=new_skill.id,
        name=new_skill.name,
        category=new_skill.category,
        description=new_skill.description,
        aliases=new_skill.aliases,
        parent_skill_id=new_skill.parent_skill_id,
        created_at=new_skill.created_at,
        sub_skills=[],
    )


@router.get("/categories", response_model=List[str])
async def list_categories(db: AsyncSession = Depends(get_db)):
    """Get all unique skill categories."""
    result = await db.execute(select(Skill.category).distinct().order_by(Skill.category))
    return [row[0] for row in result.all()]


@router.get("/{skill_id}", response_model=SkillResponse)
async def get_skill(skill_id: str, db: AsyncSession = Depends(get_db)):
    """Get skill details and child sub-skills by ID."""
    result = await db.execute(
        select(Skill).where(Skill.id == skill_id).options(selectinload(Skill.sub_skills))
    )
    skill = result.scalar_one_or_none()
    if not skill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill not found")

    return SkillResponse(
        id=skill.id,
        name=skill.name,
        category=skill.category,
        description=skill.description,
        aliases=skill.aliases,
        parent_skill_id=skill.parent_skill_id,
        created_at=skill.created_at,
        sub_skills=[
            SkillSummary(
                id=sub.id,
                name=sub.name,
                category=sub.category,
                description=sub.description,
            )
            for sub in skill.sub_skills
        ],
    )


# --- Student Skills Endpoints ---

@router.post("/student-skills", response_model=StudentSkillResponse, status_code=status.HTTP_201_CREATED)
async def add_student_skill(
    student_id: str,
    data: StudentSkillCreate,
    db: AsyncSession = Depends(get_db),
):
    """Associate a skill with a student profile (either to teach or learn)."""
    # Verify student exists
    student = await db.get(StudentProfile, student_id)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student profile not found")

    # Verify skill exists
    skill = await db.get(Skill, data.skill_id)
    if not skill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill not found")

    # Check if this student already has this skill with this direction
    existing = await db.execute(
        select(StudentSkill).where(
            StudentSkill.student_id == student_id,
            StudentSkill.skill_id == data.skill_id,
            StudentSkill.direction == data.direction,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Student already has '{skill.name}' marked to {data.direction.value}",
        )

    student_skill = StudentSkill(
        student_id=student_id,
        skill_id=data.skill_id,
        direction=data.direction,
        proficiency_level=data.proficiency_level,
        years_experience=data.years_experience,
        description=data.description,
        verified=False,
    )
    db.add(student_skill)

    # Activity log
    event = ActivityEvent(
        student_id=student_id,
        event_type=ActivityEventType.SKILL_ADDED,
        title=f"Added Skill: {skill.name}",
        description=f"{data.direction.value.capitalize()}ing {skill.name} at {data.proficiency_level.value} level",
    )
    db.add(event)
    await db.commit()
    await db.refresh(student_skill)

    return StudentSkillResponse(
        id=student_skill.id,
        student_id=student_skill.student_id,
        skill_id=student_skill.skill_id,
        skill_name=skill.name,
        skill_category=skill.category,
        direction=student_skill.direction,
        proficiency_level=student_skill.proficiency_level,
        years_experience=student_skill.years_experience,
        description=student_skill.description,
        verified=student_skill.verified,
        created_at=student_skill.created_at,
        updated_at=student_skill.updated_at,
    )


@router.get("/student-skills/{student_id}", response_model=List[StudentSkillResponse])
async def get_student_skills(
    student_id: str,
    direction: Optional[SkillDirection] = None,
    db: AsyncSession = Depends(get_db),
):
    """Get all skills declared by a student, optionally filtered by direction (TEACH / LEARN)."""
    query = (
        select(StudentSkill)
        .where(StudentSkill.student_id == student_id)
        .options(joinedload(StudentSkill.skill))
    )
    if direction:
        query = query.where(StudentSkill.direction == direction)

    query = query.order_by(StudentSkill.direction, StudentSkill.created_at.desc())
    result = await db.execute(query)
    records = result.scalars().all()

    return [
        StudentSkillResponse(
            id=r.id,
            student_id=r.student_id,
            skill_id=r.skill_id,
            skill_name=r.skill.name if r.skill else None,
            skill_category=r.skill.category if r.skill else None,
            direction=r.direction,
            proficiency_level=r.proficiency_level,
            years_experience=r.years_experience,
            description=r.description,
            verified=r.verified,
            created_at=r.created_at,
            updated_at=r.updated_at,
        )
        for r in records
    ]


@router.put("/student-skills/{student_skill_id}", response_model=StudentSkillResponse)
async def update_student_skill(
    student_skill_id: str,
    data: StudentSkillUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update proficiency or experience details of a student's declared skill."""
    result = await db.execute(
        select(StudentSkill)
        .where(StudentSkill.id == student_skill_id)
        .options(joinedload(StudentSkill.skill))
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student skill record not found")

    update_dict = data.model_dump(exclude_unset=True)
    for field, val in update_dict.items():
        setattr(record, field, val)

    await db.commit()
    await db.refresh(record)

    return StudentSkillResponse(
        id=record.id,
        student_id=record.student_id,
        skill_id=record.skill_id,
        skill_name=record.skill.name if record.skill else None,
        skill_category=record.skill.category if record.skill else None,
        direction=record.direction,
        proficiency_level=record.proficiency_level,
        years_experience=record.years_experience,
        description=record.description,
        verified=record.verified,
        created_at=record.created_at,
        updated_at=record.updated_at,
    )


@router.delete("/student-skills/{student_skill_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_student_skill(student_skill_id: str, db: AsyncSession = Depends(get_db)):
    """Remove a declared skill from a student profile."""
    record = await db.get(StudentSkill, student_skill_id)
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student skill record not found")

    await db.delete(record)
    await db.commit()
    return None
