"""
Health check endpoint.

Provides system status including database connectivity and AI provider info.
"""

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db

router = APIRouter(tags=["Health"])


@router.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    """
    System health check.

    Returns status of:
    - API server
    - Database connection
    - AI provider configuration
    """
    settings = get_settings()

    # Test database connection
    db_status = "healthy"
    db_type = "sqlite" if settings.is_sqlite else "postgresql"
    try:
        await db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"error: {str(e)}"

    return {
        "status": "healthy",
        "version": settings.app_version,
        "database": {
            "status": db_status,
            "type": db_type,
        },
        "ai": {
            "provider": settings.ai_provider,
        },
    }
