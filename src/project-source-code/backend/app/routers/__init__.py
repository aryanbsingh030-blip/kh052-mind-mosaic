"""
Routers package exposing all FastAPI API route handlers.
"""

from app.routers import (
    health,
    auth,
    profiles,
    skills,
    learning_goals,
    projects,
    teams,
    matches,
    credits,
    sessions,
    availabilities,
    assessments,
    activities,
    campus_intelligence,
    sync,
    ai,
    demo,
)

__all__ = [
    "health",
    "auth",
    "profiles",
    "skills",
    "learning_goals",
    "projects",
    "teams",
    "matches",
    "credits",
    "sessions",
    "availabilities",
    "assessments",
    "activities",
    "campus_intelligence",
    "sync",
    "ai",
    "demo",
]
