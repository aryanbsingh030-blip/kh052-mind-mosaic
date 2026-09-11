"""
AI Skill Exchange — Database Engine & Session Management

Creates the appropriate async engine for SQLite or PostgreSQL
based on the DATABASE_URL setting.
"""

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import get_settings

settings = get_settings()

# --- Engine Configuration ---
engine_kwargs = {}

if settings.is_sqlite:
    # SQLite-specific settings
    engine_kwargs["connect_args"] = {"check_same_thread": False}

engine = create_async_engine(
    settings.database_url,
    echo=False,
    **engine_kwargs,
)

# --- Session Factory ---
async_session = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


# --- Base Model ---
class Base(DeclarativeBase):
    """Base class for all SQLAlchemy ORM models."""
    pass


# --- Session Dependency ---
async def get_db() -> AsyncSession:
    """FastAPI dependency that provides a database session."""
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


# --- Table Management ---
async def create_tables():
    """Create all database tables. Called on application startup."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def drop_tables():
    """Drop all database tables. Use with caution."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
