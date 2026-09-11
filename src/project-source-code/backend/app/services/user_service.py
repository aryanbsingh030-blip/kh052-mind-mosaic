"""
User business logic service.

Separates database operations from route handlers for testability.
"""

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.credit import SkillCredit
from app.schemas.user import UserCreate, UserUpdate


class UserService:
    """Service layer for User operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_users(
        self, page: int = 1, page_size: int = 20
    ) -> tuple[list[User], int]:
        """List users with pagination."""
        # Count total
        count_result = await self.db.execute(select(func.count(User.id)))
        total = count_result.scalar_one()

        # Fetch page
        offset = (page - 1) * page_size
        result = await self.db.execute(
            select(User)
            .order_by(User.created_at.desc())
            .offset(offset)
            .limit(page_size)
        )
        users = list(result.scalars().all())

        return users, total

    async def get_user(self, user_id: str) -> User | None:
        """Get a user by ID."""
        result = await self.db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def get_user_by_email(self, email: str) -> User | None:
        """Get a user by email."""
        result = await self.db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def create_user(self, data: UserCreate) -> User:
        """Create a new user with an initial credit balance."""
        user = User(
            email=data.email,
            name=data.name,
            bio=data.bio,
            avatar_url=data.avatar_url,
            department=data.department,
            year=data.year,
        )
        self.db.add(user)
        await self.db.flush()

        # Create initial credit balance
        credit = SkillCredit(user_id=user.id, balance=100)
        self.db.add(credit)
        await self.db.flush()

        await self.db.refresh(user)
        return user

    async def update_user(self, user: User, data: UserUpdate) -> User:
        """Update user fields that are provided (non-None)."""
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(user, field, value)

        await self.db.flush()
        await self.db.refresh(user)
        return user
