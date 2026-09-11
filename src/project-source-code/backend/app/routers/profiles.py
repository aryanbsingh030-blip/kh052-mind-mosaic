"""
Student Profile Endpoints
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.dependencies import get_current_user, get_current_user_optional
from app.database import get_db
from app.models.enums import SkillDirection
from app.models.profile import StudentProfile
from app.models.skill import StudentSkill
from app.models.user import User
from app.schemas.profile import ProfileCreate, ProfileUpdate, ProfileResponse, ProfileSummaryResponse
from app.schemas.skill import StudentSkillResponse

router = APIRouter(prefix="/v1/profiles", tags=["Student Profiles"])


def _profile_to_response(profile: StudentProfile, email: Optional[str] = None) -> ProfileResponse:
    skills = []
    for s in profile.skills:
        skills.append(
            StudentSkillResponse(
                id=s.id,
                student_id=s.student_id,
                skill_id=s.skill_id,
                skill_name=s.skill.name if s.skill else None,
                skill_category=s.skill.category if s.skill else None,
                direction=s.direction,
                proficiency_level=s.proficiency_level,
                years_experience=s.years_experience,
                description=s.description,
                verified=s.verified,
                created_at=s.created_at,
                updated_at=s.updated_at,
            )
        )

    return ProfileResponse(
        id=profile.id,
        user_id=profile.user_id,
        email=email or (profile.user.email if profile.user else None),
        full_name=profile.full_name,
        department=profile.department,
        year_of_study=profile.year_of_study,
        bio=profile.bio,
        raw_project_experience=profile.raw_project_experience,
        interests=profile.interests,
        project_interests=profile.project_interests,
        avatar_url=profile.avatar_url,
        github_url=profile.github_url,
        linkedin_url=profile.linkedin_url,
        portfolio_url=profile.portfolio_url,
        credit_balance=profile.credit_balance,
        created_at=profile.created_at,
        updated_at=profile.updated_at,
        skills=skills,
    )


@router.get("", response_model=List[ProfileSummaryResponse])
async def list_profiles(
    department: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """List student profiles with optional department filter and keyword search."""
    query = select(StudentProfile).options(selectinload(StudentProfile.skills))

    if department:
        query = query.where(StudentProfile.department == department)
    if search:
        term = f"%{search.strip()}%"
        query = query.where(
            or_(
                StudentProfile.full_name.ilike(term),
                StudentProfile.department.ilike(term),
                StudentProfile.bio.ilike(term),
            )
        )

    query = query.order_by(StudentProfile.full_name).offset(skip).limit(limit)
    result = await db.execute(query)
    profiles = result.scalars().all()

    summaries = []
    for p in profiles:
        teach_count = sum(1 for s in p.skills if s.direction == SkillDirection.TEACH)
        learn_count = sum(1 for s in p.skills if s.direction == SkillDirection.LEARN)
        summaries.append(
            ProfileSummaryResponse(
                id=p.id,
                user_id=p.user_id,
                full_name=p.full_name,
                department=p.department,
                year_of_study=p.year_of_study,
                avatar_url=p.avatar_url,
                credit_balance=p.credit_balance,
                teach_skills_count=teach_count,
                learn_skills_count=learn_count,
            )
        )
    return summaries


@router.get("/me", response_model=ProfileResponse)
async def get_my_profile(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the current authenticated student's profile."""
    result = await db.execute(
        select(StudentProfile)
        .where(StudentProfile.user_id == user.id)
        .options(
            selectinload(StudentProfile.user),
            selectinload(StudentProfile.skills).joinedload(StudentSkill.skill),
        )
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    return _profile_to_response(profile, user.email)


@router.get("/{profile_id}", response_model=ProfileResponse)
async def get_profile_by_id(profile_id: str, db: AsyncSession = Depends(get_db)):
    """Get detailed student profile by profile ID."""
    result = await db.execute(
        select(StudentProfile)
        .where(StudentProfile.id == profile_id)
        .options(
            selectinload(StudentProfile.user),
            selectinload(StudentProfile.skills).joinedload(StudentSkill.skill),
        )
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student profile not found")
    return _profile_to_response(profile)


from app.core.permissions import verify_owner_or_admin
from app.core.sanitizer import sanitize_text

@router.put("/{profile_id}", response_model=ProfileResponse)
async def update_profile(
    profile_id: str,
    data: ProfileUpdate,
    db: AsyncSession = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    """Update student profile details with sanitization and authorization check."""
    result = await db.execute(
        select(StudentProfile)
        .where(StudentProfile.id == profile_id)
        .options(
            selectinload(StudentProfile.user),
            selectinload(StudentProfile.skills).joinedload(StudentSkill.skill),
        )
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student profile not found")

    # Verify that authenticated caller owns this profile or is an ADMIN
    if user:
        verify_owner_or_admin(profile.user_id, user)

    update_dict = data.model_dump(exclude_unset=True)
    text_fields = {"full_name", "department", "year_of_study", "bio", "raw_project_experience", "interests", "project_interests"}
    for field, val in update_dict.items():
        if field in text_fields and isinstance(val, str):
            val = sanitize_text(val)
        setattr(profile, field, val)

    await db.commit()
    await db.refresh(profile)
    return _profile_to_response(profile)
