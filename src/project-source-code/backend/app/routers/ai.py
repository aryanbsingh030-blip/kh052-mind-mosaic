"""
AI Skill Intelligence Router

Provides endpoints to transform unstructured text into structured skill intelligence.
CRITICAL CONSTRAINT: This endpoint never directly modifies the database.
All extracted skills are returned as recommendations for student review.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.skill import Skill, StudentSkill
from app.schemas.ai import (
    SkillAnalysisRequest,
    SkillAnalysisResponse,
    ExtractedSkillResponse,
    ProjectAnalysisRequest,
    ProjectAnalysisResponse,
)
from app.core.sanitizer import sanitize_prompt_input
from ai.guardrails import guardrails
from ai.engine import SkillIntelligenceEngine
from ai.project_analyzer import ProjectIntelligenceEngine

# Shared engine instances
_ai_engine = SkillIntelligenceEngine()
_project_engine = ProjectIntelligenceEngine()

router = APIRouter(tags=["AI Skill Intelligence"])


async def _run_skill_analysis(data: SkillAnalysisRequest, db: AsyncSession) -> SkillAnalysisResponse:
    if not data.text or not data.text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Experience description cannot be empty.",
        )

    # 1. Neutralize prompt injection attempts in input text
    safe_text = sanitize_prompt_input(data.text.strip())
    guardrails.verify_ai_invariants(safe_text)

    # 2. Fetch canonical skills from the database for normalization mapping
    skills_result = await db.execute(select(Skill))
    canonical_skills = [
        {
            "id": s.id,
            "name": s.name,
            "category": s.category,
        }
        for s in skills_result.scalars().all()
    ]

    # 3. Run normalization pipeline through AI engine
    result = await _ai_engine.analyze_skills(
        text=safe_text,
        canonical_taxonomy=canonical_skills,
    )

    # 4. Never trust raw LLM output: Validate and clamp through AI Guardrails
    guarded_skills = guardrails.validate_and_sanitize_extracted_skills(result["skills"])

    skill_responses = [
        ExtractedSkillResponse(
            skill_id=s.get("skill_id"),
            skill_name=s["skill_name"],
            skill_category=s.get("skill_category"),
            proficiency=s["proficiency"],
            confidence=s["confidence"],
            evidence=s.get("evidence", ""),
            source=s.get("source", "guarded_ai"),
        )
        for s in guarded_skills
    ]

    return SkillAnalysisResponse(
        provider_used=result["provider_used"],
        skills=skill_responses,
        raw_text=safe_text,
        processing_time_ms=result["processing_time_ms"],
    )


@router.post("/v1/ai/analyze-skills", response_model=SkillAnalysisResponse)
async def analyze_skills_v1(data: SkillAnalysisRequest, db: AsyncSession = Depends(get_db)):
    """Transform unstructured natural language text into structured skill intelligence."""
    return await _run_skill_analysis(data, db)


@router.post("/ai/analyze-skills", response_model=SkillAnalysisResponse)
async def analyze_skills_direct(data: SkillAnalysisRequest, db: AsyncSession = Depends(get_db)):
    """Direct alias endpoint for /ai/analyze-skills."""
    return await _run_skill_analysis(data, db)


async def _run_project_analysis(data: ProjectAnalysisRequest, db: AsyncSession) -> ProjectAnalysisResponse:
    target_text = (data.text or data.description or "").strip()
    if not target_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Project description cannot be empty.",
        )

    # 1. Fetch canonical skills from database
    skills_result = await db.execute(select(Skill))
    canonical_skills = [
        {
            "id": s.id,
            "name": s.name,
            "category": s.category,
            "aliases": s.aliases,
        }
        for s in skills_result.scalars().all()
    ]

    # 2. Fetch student skills if student_id provided
    owner_skills = None
    if data.student_id:
        student_skills_result = await db.execute(
            select(StudentSkill)
            .options(selectinload(StudentSkill.skill))
            .where(StudentSkill.student_id == data.student_id)
        )
        owner_skills = [
            {
                "skill_id": ss.skill_id,
                "skill_name": ss.skill.name if ss.skill else None,
                "proficiency": ss.proficiency_level.value if hasattr(ss.proficiency_level, "value") else str(ss.proficiency_level),
            }
            for ss in student_skills_result.scalars().all()
        ]

    # 3. Run project intelligence pipeline
    result = _project_engine.analyze_project(
        text=target_text,
        title=data.title,
        canonical_taxonomy=canonical_skills,
        owner_skills=owner_skills,
    )

    return ProjectAnalysisResponse.model_validate(result)


@router.post("/v1/ai/analyze-project", response_model=ProjectAnalysisResponse)
async def analyze_project_v1(data: ProjectAnalysisRequest, db: AsyncSession = Depends(get_db)):
    """Transform natural language project concept into structured technical intelligence."""
    return await _run_project_analysis(data, db)


@router.post("/ai/analyze-project", response_model=ProjectAnalysisResponse)
async def analyze_project_direct(data: ProjectAnalysisRequest, db: AsyncSession = Depends(get_db)):
    """Direct alias endpoint for /ai/analyze-project."""
    return await _run_project_analysis(data, db)
