"""
AI Skill Exchange — FastAPI Application

Main entry point for the backend API server.
"""

import sys
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Ensure project root and backend directory are in sys.path
backend_root = str(Path(__file__).resolve().parents[1])
project_root = str(Path(__file__).resolve().parents[2])
for path in [backend_root, project_root]:
    if path not in sys.path:
        sys.path.insert(0, path)

from app.config import get_settings
from app.database import create_tables
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


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan — runs on startup and shutdown."""
    await create_tables()
    print("[OK] Database tables verified")
    yield
    print("[OK] Application shutdown")


settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Campus-wide AI-powered Skill Intelligence & Peer Exchange Platform",
    lifespan=lifespan,
)

# --- CORS Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins if settings.cors_origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Register Routers (with clean /api prefix and backwards compatibility) ---
app.include_router(health.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(profiles.router, prefix="/api")
app.include_router(skills.router, prefix="/api")
app.include_router(learning_goals.router, prefix="/api")
app.include_router(projects.router, prefix="/api")
app.include_router(teams.router, prefix="/api")
app.include_router(teams.direct_router, prefix="/api")
app.include_router(matches.router, prefix="/api")
app.include_router(credits.router, prefix="/api")
app.include_router(sessions.router, prefix="/api")
app.include_router(availabilities.router, prefix="/api")
app.include_router(assessments.router, prefix="/api")
app.include_router(activities.router, prefix="/api")
app.include_router(campus_intelligence.router, prefix="/api")
app.include_router(sync.router, prefix="/api")
app.include_router(ai.router, prefix="/api")
app.include_router(demo.router, prefix="/api")

# Stage backwards-compatible root aliases for endpoints tested without /api prefix
app.include_router(matches.router)
app.include_router(ai.router)
app.include_router(demo.router)



@app.get("/")
async def root():
    """Root endpoint — redirects to API docs and health check."""
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "docs": "/docs",
        "health": "/api/health",
        "description": "Stage 1: Database & Backend Foundation Active",
    }
