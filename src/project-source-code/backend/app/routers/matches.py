"""
Skill Matches Endpoints — Stage 4 Intelligent Hybrid Matching Engine.
"""

from typing import List, Optional, Set

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from app.database import get_db
from app.models.activity import ActivityEvent
from app.models.enums import ActivityEventType, MatchStatus, SkillDirection, ProficiencyLevel
from app.models.learning_goal import LearningGoal
from app.models.match import SkillMatch
from app.models.profile import StudentProfile
from app.models.session import TeachingSession
from app.models.skill import Skill, StudentSkill
from app.schemas.match import (
    SkillMatchCreate,
    SkillMatchUpdateStatus,
    SkillMatchResponse,
    MatchRecommendation,
    MatchFactors,
    LearningOpportunity,
    CommonAvailabilitySlot,
    MatchCalculationRequest,
    MatchCalculationResponse,
)
from ai.matcher import IntelligentSkillMatcher

# Shared intelligent matcher instance
_intelligent_matcher = IntelligentSkillMatcher()

router = APIRouter(tags=["Skill Matches"])


def _match_to_response(m: SkillMatch) -> SkillMatchResponse:
    return SkillMatchResponse(
        id=m.id,
        learner_student_id=m.learner_student_id,
        learner_name=m.learner.full_name if m.learner else None,
        teacher_student_id=m.teacher_student_id,
        teacher_name=m.teacher.full_name if m.teacher else None,
        skill_id=m.skill_id,
        skill_name=m.skill.name if m.skill else None,
        match_score=m.match_score,
        match_reason=m.match_reason,
        status=m.status,
        created_at=m.created_at,
    )


def _student_to_matcher_dict(p: StudentProfile) -> dict:
    """Convert StudentProfile entity into normalized dictionary for IntelligentSkillMatcher."""
    goals = [
        {
            "skill_id": g.skill_id,
            "skill_name": g.skill.name if g.skill else None,
            "target_proficiency": g.target_proficiency.value if hasattr(g.target_proficiency, "value") else str(g.target_proficiency),
        }
        for g in p.learning_goals
    ]
    goal_names = {g["skill_name"] for g in goals if g.get("skill_name")}

    # Also include any LEARN student skills if not already in goals
    for s in p.skills:
        if s.direction == SkillDirection.LEARN and s.skill and s.skill.name not in goal_names:
            goals.append({
                "skill_id": s.skill_id,
                "skill_name": s.skill.name,
                "target_proficiency": s.proficiency_level.value if hasattr(s.proficiency_level, "value") else str(s.proficiency_level),
            })

    return {
        "id": p.id,
        "full_name": p.full_name,
        "department": p.department,
        "year_of_study": p.year_of_study,
        "avatar_url": p.avatar_url,
        "bio": p.bio or "",
        "raw_project_experience": p.raw_project_experience or "",
        "interests": p.interests or "",
        "project_interests": p.project_interests or "",
        "skills": [
            {
                "skill_id": s.skill_id,
                "skill_name": s.skill.name if s.skill else None,
                "direction": s.direction.value if hasattr(s.direction, "value") else str(s.direction),
                "proficiency_level": s.proficiency_level.value if hasattr(s.proficiency_level, "value") else str(s.proficiency_level),
                "years_experience": s.years_experience,
                "can_teach": (s.direction == SkillDirection.TEACH),
            }
            for s in p.skills
        ],
        "learning_goals": goals,
        "availabilities": [
            {
                "day_of_week": a.day_of_week.value if hasattr(a.day_of_week, "value") else str(a.day_of_week),
                "start_time": a.start_time,
                "end_time": a.end_time,
            }
            for a in p.availabilities if a.is_active
        ],
    }


async def _get_recommendations(
    student_id: Optional[str],
    skill: Optional[str],
    proficiency: Optional[str],
    availability_day: Optional[str],
    project_interest: Optional[str],
    min_score: int,
    limit: int,
    db: AsyncSession,
) -> List[MatchRecommendation]:
    """Execute hybrid intelligent matching across campus students with filtering."""
    # 1. Fetch all student profiles with their relations
    profiles_query = await db.execute(
        select(StudentProfile).options(
            selectinload(StudentProfile.skills).joinedload(StudentSkill.skill),
            selectinload(StudentProfile.learning_goals).joinedload(LearningGoal.skill),
            selectinload(StudentProfile.availabilities),
        )
    )
    all_profiles = profiles_query.scalars().all()
    if not all_profiles:
        return []

    # 2. Determine target student
    target_student = None
    if student_id:
        target_student = next((p for p in all_profiles if p.id == student_id), None)
        if not target_student:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student profile not found")
    else:
        target_student = all_profiles[0]

    student_a_dict = _student_to_matcher_dict(target_student)

    # 3. Find previous session collaboration partners
    past_sessions_q = await db.execute(
        select(TeachingSession).where(
            or_(
                TeachingSession.teacher_student_id == target_student.id,
                TeachingSession.learner_student_id == target_student.id,
            )
        )
    )
    past_sessions = past_sessions_q.scalars().all()
    previous_partners: Set[str] = {
        s.learner_student_id if s.teacher_student_id == target_student.id else s.teacher_student_id
        for s in past_sessions
    }

    # 4. Score all other candidates
    recommendations: List[MatchRecommendation] = []
    candidates = [p for p in all_profiles if p.id != target_student.id]

    prof_rank = {
        "BEGINNER": 1,
        "INTERMEDIATE": 2,
        "ADVANCED": 3,
        "EXPERT": 4,
    }
    filter_prof_num = prof_rank.get(proficiency.upper(), 1) if proficiency else None

    for cand in candidates:
        cand_dict = _student_to_matcher_dict(cand)
        match_res = await _intelligent_matcher.compute_match(
            student_a=student_a_dict,
            student_b=cand_dict,
            previous_partners=previous_partners,
        )

        # Filters
        if match_res["match_score"] < min_score:
            continue

        # Filter by skill (candidate must offer this skill)
        if skill:
            s_lower = skill.strip().lower()
            cand_skills = [sk.lower() for sk in match_res["skills_offered"]]
            if not any(s_lower in cs or cs in s_lower for cs in cand_skills):
                continue

        # Filter by proficiency
        if filter_prof_num:
            # Candidate must have at least one teaching skill >= requested proficiency
            cand_teach_skills = [
                s for s in cand_dict.get("skills", [])
                if s.get("direction") == "TEACH"
            ]
            has_prof = any(
                prof_rank.get(s.get("proficiency_level", "BEGINNER"), 1) >= filter_prof_num
                for s in cand_teach_skills
            )
            if not has_prof:
                continue

        # Filter by availability day
        if availability_day:
            day_target = availability_day.strip().upper()
            has_day = any(
                slot["day"].upper() == day_target
                for slot in match_res["common_availability"]
            )
            if not has_day:
                continue

        # Filter by project interest keyword
        if project_interest:
            pi_target = project_interest.strip().lower()
            cand_pi = f"{cand.project_interests or ''} {cand.interests or ''}".lower()
            if pi_target not in cand_pi:
                continue

        recommendations.append(
            MatchRecommendation(
                candidate_id=match_res["candidate_id"],
                candidate_name=match_res["candidate_name"],
                candidate_department=match_res["candidate_department"],
                candidate_year=match_res["candidate_year"],
                candidate_avatar_url=match_res["candidate_avatar_url"],
                candidate_bio=match_res["candidate_bio"],
                match_score=match_res["match_score"],
                is_reciprocal=match_res["is_reciprocal"],
                matching_factors=MatchFactors(**match_res["matching_factors"]),
                learning_opportunity=LearningOpportunity(**match_res["learning_opportunity"]),
                explanation=match_res["explanation"],
                common_availability=[CommonAvailabilitySlot(**s) for s in match_res["common_availability"]],
                skills_offered=match_res["skills_offered"],
                skills_sought=match_res["skills_sought"],
            )
        )

    # Sort descending by match_score
    recommendations.sort(key=lambda r: r.match_score, reverse=True)
    return recommendations[:limit]


# --- Main Stage 4 Recommendations Endpoints ---

@router.get("/v1/matches", response_model=List[MatchRecommendation])
async def get_matches_v1(
    student_id: Optional[str] = Query(None, description="Target student profile ID"),
    skill: Optional[str] = Query(None, description="Filter candidates offering this skill"),
    proficiency: Optional[str] = Query(None, description="Minimum teacher proficiency"),
    availability_day: Optional[str] = Query(None, description="Day of week with overlapping availability"),
    project_interest: Optional[str] = Query(None, description="Filter by project interest keyword"),
    min_score: int = Query(5, description="Minimum match score (0-100)"),
    limit: int = Query(20, description="Max results"),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve intelligent hybrid skill match recommendations with explainability."""
    return await _get_recommendations(student_id, skill, proficiency, availability_day, project_interest, min_score, limit, db)


@router.get("/matches", response_model=List[MatchRecommendation])
async def get_matches_root(
    student_id: Optional[str] = Query(None, description="Target student profile ID"),
    skill: Optional[str] = Query(None, description="Filter candidates offering this skill"),
    proficiency: Optional[str] = Query(None, description="Minimum teacher proficiency"),
    availability_day: Optional[str] = Query(None, description="Day of week with overlapping availability"),
    project_interest: Optional[str] = Query(None, description="Filter by project interest keyword"),
    min_score: int = Query(5, description="Minimum match score (0-100)"),
    limit: int = Query(20, description="Max results"),
    db: AsyncSession = Depends(get_db),
):
    """Direct alias endpoint for /matches."""
    return await _get_recommendations(student_id, skill, proficiency, availability_day, project_interest, min_score, limit, db)


# --- Match Calculation Endpoints ---

async def _calculate_pair_match(data: MatchCalculationRequest, db: AsyncSession) -> MatchCalculationResponse:
    s_a = await db.get(
        StudentProfile,
        data.student_a_id,
        options=[
            selectinload(StudentProfile.skills).joinedload(StudentSkill.skill),
            selectinload(StudentProfile.learning_goals).joinedload(LearningGoal.skill),
            selectinload(StudentProfile.availabilities),
        ],
    )
    if not s_a:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student A not found")

    s_b = await db.get(
        StudentProfile,
        data.student_b_id,
        options=[
            selectinload(StudentProfile.skills).joinedload(StudentSkill.skill),
            selectinload(StudentProfile.learning_goals).joinedload(LearningGoal.skill),
            selectinload(StudentProfile.availabilities),
        ],
    )
    if not s_b:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student B not found")

    # Past sessions
    past_sessions_q = await db.execute(
        select(TeachingSession).where(
            or_(
                TeachingSession.teacher_student_id == s_a.id,
                TeachingSession.learner_student_id == s_a.id,
            )
        )
    )
    previous_partners = {
        s.learner_student_id if s.teacher_student_id == s_a.id else s.teacher_student_id
        for s in past_sessions_q.scalars().all()
    }

    match_res = await _intelligent_matcher.compute_match(
        student_a=_student_to_matcher_dict(s_a),
        student_b=_student_to_matcher_dict(s_b),
        previous_partners=previous_partners,
    )

    return MatchCalculationResponse(
        student_a_id=s_a.id,
        student_a_name=s_a.full_name,
        student_b_id=s_b.id,
        student_b_name=s_b.full_name,
        match_score=match_res["match_score"],
        is_reciprocal=match_res["is_reciprocal"],
        matching_factors=MatchFactors(**match_res["matching_factors"]),
        learning_opportunity=LearningOpportunity(**match_res["learning_opportunity"]),
        explanation=match_res["explanation"],
        common_availability=[CommonAvailabilitySlot(**s) for s in match_res["common_availability"]],
    )


@router.post("/v1/matches/calculate", response_model=MatchCalculationResponse)
async def calculate_match_v1(data: MatchCalculationRequest, db: AsyncSession = Depends(get_db)):
    """Calculate multi-factor match score and explainability breakdown between two students."""
    return await _calculate_pair_match(data, db)


@router.post("/matches/calculate", response_model=MatchCalculationResponse)
async def calculate_match_root(data: MatchCalculationRequest, db: AsyncSession = Depends(get_db)):
    """Direct alias endpoint for /matches/calculate."""
    return await _calculate_pair_match(data, db)


# --- Existing Match Management Endpoints ---

@router.post("/v1/matches/record", response_model=SkillMatchResponse, status_code=status.HTTP_201_CREATED)
async def create_match(data: SkillMatchCreate, db: AsyncSession = Depends(get_db)):
    """Create a new skill match between a learner and a teacher."""
    learner = await db.get(StudentProfile, data.learner_student_id)
    if not learner:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Learner student profile not found")

    teacher = await db.get(StudentProfile, data.teacher_student_id)
    if not teacher:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Teacher student profile not found")

    skill = await db.get(Skill, data.skill_id)
    if not skill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill not found")

    existing = await db.execute(
        select(SkillMatch).where(
            SkillMatch.learner_student_id == data.learner_student_id,
            SkillMatch.teacher_student_id == data.teacher_student_id,
            SkillMatch.skill_id == data.skill_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Match already exists for these students and skill")

    match = SkillMatch(
        learner_student_id=data.learner_student_id,
        teacher_student_id=data.teacher_student_id,
        skill_id=data.skill_id,
        match_score=data.match_score,
        match_reason=data.match_reason,
        status=MatchStatus.PROPOSED,
    )
    db.add(match)

    event = ActivityEvent(
        student_id=data.learner_student_id,
        event_type=ActivityEventType.MATCH_GENERATED,
        title=f"Matched for {skill.name}",
        description=f"Teacher candidate: {teacher.full_name} ({int(data.match_score * 100)}% match)",
    )
    db.add(event)
    await db.commit()

    return await get_match_by_id(match.id, db)


@router.get("/v1/matches/student/{student_id}", response_model=List[SkillMatchResponse])
async def list_matches_for_student(student_id: str, db: AsyncSession = Depends(get_db)):
    """List all proposed, accepted, and active matches for a student."""
    result = await db.execute(
        select(SkillMatch)
        .where(or_(SkillMatch.learner_student_id == student_id, SkillMatch.teacher_student_id == student_id))
        .options(
            joinedload(SkillMatch.learner),
            joinedload(SkillMatch.teacher),
            joinedload(SkillMatch.skill),
        )
        .order_by(SkillMatch.match_score.desc())
    )
    matches = result.scalars().all()
    return [_match_to_response(m) for m in matches]


@router.get("/v1/matches/{match_id}", response_model=SkillMatchResponse)
async def get_match_by_id(match_id: str, db: AsyncSession = Depends(get_db)):
    """Get single match details by ID."""
    result = await db.execute(
        select(SkillMatch)
        .where(SkillMatch.id == match_id)
        .options(
            joinedload(SkillMatch.learner),
            joinedload(SkillMatch.teacher),
            joinedload(SkillMatch.skill),
        )
    )
    match = result.scalar_one_or_none()
    if not match:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill match not found")
    return _match_to_response(match)


@router.put("/v1/matches/{match_id}/status", response_model=SkillMatchResponse)
async def update_match_status(
    match_id: str,
    data: SkillMatchUpdateStatus,
    db: AsyncSession = Depends(get_db),
):
    """Accept, decline, or mark completed a skill exchange match."""
    result = await db.execute(
        select(SkillMatch)
        .where(SkillMatch.id == match_id)
        .options(
            joinedload(SkillMatch.learner),
            joinedload(SkillMatch.teacher),
            joinedload(SkillMatch.skill),
        )
    )
    match = result.scalar_one_or_none()
    if not match:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill match not found")

    match.status = data.status
    await db.commit()
    await db.refresh(match)
    return _match_to_response(match)


@router.post("/v1/matches/generate/{student_id}", response_model=List[SkillMatchResponse])
async def generate_matches_for_student(student_id: str, db: AsyncSession = Depends(get_db)):
    """Legacy endpoint: Generate and persist SkillMatch records based on complementary needs."""
    student = await db.get(StudentProfile, student_id)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student profile not found")

    learn_skills_query = await db.execute(
        select(StudentSkill).where(
            StudentSkill.student_id == student_id,
            StudentSkill.direction == SkillDirection.LEARN,
        ).options(joinedload(StudentSkill.skill))
    )
    learn_skills = learn_skills_query.scalars().all()
    if not learn_skills:
        return []

    created_matches = []
    for ls in learn_skills:
        teachers_query = await db.execute(
            select(StudentSkill).where(
                StudentSkill.skill_id == ls.skill_id,
                StudentSkill.student_id != student_id,
                StudentSkill.direction == SkillDirection.TEACH,
            ).options(joinedload(StudentSkill.student), joinedload(StudentSkill.skill))
        )
        teachers = teachers_query.scalars().all()

        for t in teachers:
            existing = await db.execute(
                select(SkillMatch).where(
                    SkillMatch.learner_student_id == student_id,
                    SkillMatch.teacher_student_id == t.student_id,
                    SkillMatch.skill_id == ls.skill_id,
                )
            )
            if existing.scalar_one_or_none():
                continue

            prof_weights = {
                ProficiencyLevel.BEGINNER: 1,
                ProficiencyLevel.INTERMEDIATE: 2,
                ProficiencyLevel.ADVANCED: 3,
                ProficiencyLevel.EXPERT: 4,
            }
            teacher_weight = prof_weights.get(t.proficiency_level, 2)

            score = round(min(0.98, 0.65 + (teacher_weight * 0.08) + (min(t.years_experience, 5) * 0.02)), 2)
            reason = (
                f"{student.full_name} wants to learn {ls.skill.name} ({ls.proficiency_level.value}). "
                f"{t.student.full_name} ({t.student.department}) is a verified teacher with "
                f"{t.proficiency_level.value} proficiency and {t.years_experience} years of experience."
            )

            new_match = SkillMatch(
                learner_student_id=student_id,
                teacher_student_id=t.student_id,
                skill_id=ls.skill_id,
                match_score=score,
                match_reason=reason,
                status=MatchStatus.PROPOSED,
            )
            db.add(new_match)
            created_matches.append(new_match)

    if created_matches:
        await db.commit()

    return await list_matches_for_student(student_id, db)
