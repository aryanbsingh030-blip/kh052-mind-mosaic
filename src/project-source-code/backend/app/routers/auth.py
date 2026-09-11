"""
Authentication and User Registration Endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.core.security import hash_password, verify_password, create_access_token
from app.database import get_db
from app.models.activity import ActivityEvent
from app.models.credit import SkillCreditTransaction
from app.models.enums import ActivityEventType, CreditTransactionType, UserRole
from app.models.profile import StudentProfile
from app.models.user import User
from app.schemas.auth import UserRegister, UserLogin, TokenResponse, UserMeResponse

router = APIRouter(prefix="/v1/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(data: UserRegister, db: AsyncSession = Depends(get_db)):
    """Register a new student user and create their student profile."""
    # Check if user already exists
    existing = await db.execute(select(User).where(User.email == data.email.lower().strip()))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User with this email already exists",
        )

    # Create User
    new_user = User(
        email=data.email.lower().strip(),
        password_hash=hash_password(data.password),
        role=UserRole.STUDENT,
        is_active=True,
    )
    db.add(new_user)
    await db.flush()

    # Create Student Profile with initial 100 credits
    profile = StudentProfile(
        user_id=new_user.id,
        full_name=data.full_name,
        department=data.department,
        year_of_study=data.year_of_study,
        bio=data.bio,
        avatar_url=data.avatar_url,
        github_url=data.github_url,
        linkedin_url=data.linkedin_url,
        credit_balance=100,
    )
    db.add(profile)
    await db.flush()

    # Record initial credit grant transaction
    grant_tx = SkillCreditTransaction(
        from_student_id=None,
        to_student_id=profile.id,
        amount=100,
        transaction_type=CreditTransactionType.INITIAL_GRANT,
        description="Welcome bonus initial credits grant",
    )
    db.add(grant_tx)

    # Record activity event
    event = ActivityEvent(
        student_id=profile.id,
        event_type=ActivityEventType.PROFILE_CREATED,
        title="Student Profile Created",
        description=f"{data.full_name} joined the AI Skill Exchange.",
    )
    db.add(event)
    await db.commit()

    token = create_access_token({"sub": new_user.id, "email": new_user.email, "role": new_user.role.value})
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user_id=new_user.id,
        profile_id=profile.id,
        email=new_user.email,
        full_name=profile.full_name,
        role=new_user.role.value,
    )


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin, db: AsyncSession = Depends(get_db)):
    """Authenticate student user and return access token."""
    result = await db.execute(select(User).where(User.email == data.email.lower().strip()))
    user = result.scalar_one_or_none()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is disabled")

    # Get student profile
    prof_res = await db.execute(select(StudentProfile).where(StudentProfile.user_id == user.id))
    profile = prof_res.scalar_one_or_none()

    token = create_access_token({"sub": user.id, "email": user.email, "role": user.role.value})
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user_id=user.id,
        profile_id=profile.id if profile else None,
        email=user.email,
        full_name=profile.full_name if profile else None,
        role=user.role.value,
    )


@router.get("/me", response_model=UserMeResponse)
async def get_current_user_info(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get authenticated user credentials and student profile details."""
    prof_res = await db.execute(select(StudentProfile).where(StudentProfile.user_id == user.id))
    profile = prof_res.scalar_one_or_none()

    return UserMeResponse(
        id=user.id,
        email=user.email,
        is_active=user.is_active,
        role=user.role,
        created_at=user.created_at,
        profile_id=profile.id if profile else None,
        full_name=profile.full_name if profile else None,
        department=profile.department if profile else None,
        year_of_study=profile.year_of_study if profile else None,
        credit_balance=profile.credit_balance if profile else 0,
    )
