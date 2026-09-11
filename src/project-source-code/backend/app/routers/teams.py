"""
Teams and Team Members Endpoints
"""

from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload, joinedload

from app.database import get_db
from app.models.activity import ActivityEvent
from app.models.enums import ActivityEventType, TeamStatus
from app.models.profile import StudentProfile
from app.models.skill import StudentSkill
from app.models.learning_goal import LearningGoal
from app.models.project import Project, Team, TeamMember, ProjectSkillRequirement
from app.schemas.project import TeamCreate, TeamResponse, TeamMemberAdd, TeamMemberResponse
from app.schemas.team_builder import (
    TeamGenerateRequest,
    TeamGenerateResponse,
    ReplaceMemberRequest,
    ReplaceMemberResponse,
)
from ai.team_builder import AITeamBuilder

_team_builder = AITeamBuilder()

router = APIRouter(prefix="/v1/teams", tags=["Teams"])
direct_router = APIRouter(prefix="/teams", tags=["Teams"])


def _team_to_response(team: Team) -> TeamResponse:
    return TeamResponse(
        id=team.id,
        project_id=team.project_id,
        name=team.name,
        description=team.description,
        status=team.status,
        formed_at=team.formed_at,
        members=[
            TeamMemberResponse(
                id=m.id,
                team_id=m.team_id,
                student_id=m.student_id,
                student_name=m.student.full_name if m.student else None,
                department=m.student.department if m.student else None,
                role=m.role,
                joined_at=m.joined_at,
            )
            for m in team.members
        ],
    )


@router.post("", response_model=TeamResponse, status_code=status.HTTP_201_CREATED)
async def create_team(data: TeamCreate, db: AsyncSession = Depends(get_db)):
    """Create a new team for a project."""
    project = await db.get(Project, data.project_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    team = Team(
        project_id=data.project_id,
        name=data.name.strip(),
        description=data.description,
        status=TeamStatus.FORMING,
        formed_at=datetime.now(timezone.utc),
    )
    db.add(team)
    await db.commit()
    await db.refresh(team)

    return _team_to_response(team)


@router.get("/project/{project_id}", response_model=List[TeamResponse])
async def list_teams_for_project(project_id: str, db: AsyncSession = Depends(get_db)):
    """List all teams associated with a project."""
    result = await db.execute(
        select(Team)
        .where(Team.project_id == project_id)
        .options(selectinload(Team.members).joinedload(TeamMember.student))
        .order_by(Team.formed_at.desc())
    )
    teams = result.scalars().all()
    return [_team_to_response(t) for t in teams]


@router.get("/{team_id}", response_model=TeamResponse)
async def get_team_by_id(team_id: str, db: AsyncSession = Depends(get_db)):
    """Get team details and members by ID."""
    result = await db.execute(
        select(Team)
        .where(Team.id == team_id)
        .options(selectinload(Team.members).joinedload(TeamMember.student))
    )
    team = result.scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
    return _team_to_response(team)


@router.post("/{team_id}/members", response_model=TeamMemberResponse, status_code=status.HTTP_201_CREATED)
async def add_team_member(
    team_id: str,
    data: TeamMemberAdd,
    db: AsyncSession = Depends(get_db),
):
    """Add a student member with an assigned role to a team."""
    team = await db.get(Team, team_id)
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")

    student = await db.get(StudentProfile, data.student_id)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student profile not found")

    # Check for duplicate membership
    existing = await db.execute(
        select(TeamMember).where(TeamMember.team_id == team_id, TeamMember.student_id == data.student_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Student is already a member of this team")

    member = TeamMember(
        team_id=team_id,
        student_id=data.student_id,
        role=data.role,
        joined_at=datetime.now(timezone.utc),
    )
    db.add(member)

    event = ActivityEvent(
        student_id=data.student_id,
        event_type=ActivityEventType.TEAM_FORMED,
        title=f"Joined Team: {team.name}",
        description=f"Role assigned: {data.role.value}",
    )
    db.add(event)
    await db.commit()
    await db.refresh(member)

    return TeamMemberResponse(
        id=member.id,
        team_id=member.team_id,
        student_id=member.student_id,
        student_name=student.full_name,
        department=student.department,
        role=member.role,
        joined_at=member.joined_at,
    )


@router.delete("/{team_id}/members/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_team_member(team_id: str, member_id: str, db: AsyncSession = Depends(get_db)):
    """Remove a student member from a team."""
    member = await db.get(TeamMember, member_id)
    if not member or member.team_id != team_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team member not found")

    await db.delete(member)
    await db.commit()
    return None


async def _fetch_candidate_students(db: AsyncSession) -> List[dict]:
    query = (
        select(StudentProfile)
        .options(
            selectinload(StudentProfile.skills).joinedload(StudentSkill.skill),
            selectinload(StudentProfile.learning_goals).joinedload(LearningGoal.skill),
            selectinload(StudentProfile.availabilities),
        )
    )
    result = await db.execute(query)
    students = result.scalars().all()
    student_dicts = []
    for s in students:
        student_dicts.append({
            "id": s.id,
            "full_name": s.full_name,
            "department": s.department,
            "year_of_study": s.year_of_study,
            "weekly_hours_available": s.weekly_hours_available or 10,
            "current_project_count": s.current_project_count or 0,
            "max_concurrent_projects": s.max_concurrent_projects or 3,
            "rating": float(s.rating or 4.5),
            "interests": s.interests or [],
            "skills": [
                {
                    "skill_id": ss.skill_id,
                    "skill_name": ss.skill.name if ss.skill else "",
                    "proficiency": ss.proficiency_level.value if hasattr(ss.proficiency_level, "value") else str(ss.proficiency_level),
                    "verified": ss.verified,
                }
                for ss in s.skills
            ],
            "learning_goals": [
                {
                    "skill_id": lg.skill_id,
                    "skill_name": lg.skill.name if lg.skill else "",
                    "priority": lg.priority.value if hasattr(lg.priority, "value") else str(lg.priority),
                }
                for lg in s.learning_goals
            ],
            "availabilities": [
                {
                    "day_of_week": a.day_of_week.value if hasattr(a.day_of_week, "value") else str(a.day_of_week),
                    "start_time": a.start_time.isoformat() if hasattr(a.start_time, "isoformat") else str(a.start_time),
                    "end_time": a.end_time.isoformat() if hasattr(a.end_time, "isoformat") else str(a.end_time),
                }
                for a in s.availabilities
            ],
        })
    return student_dicts


async def _resolve_project_details(data, db: AsyncSession):
    project_title = data.project_title or "Untitled Project"
    project_description = data.project_description or ""
    req_skills_list = [req.model_dump() for req in (data.required_skills or [])]

    if getattr(data, "project_id", None):
        result = await db.execute(
            select(Project)
            .where(Project.id == data.project_id)
            .options(
                selectinload(Project.required_skills).joinedload(ProjectSkillRequirement.skill)
            )
        )
        project = result.scalar_one_or_none()
        if not project and not req_skills_list:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
        if project:
            if not data.project_title:
                project_title = project.title
            if not data.project_description:
                project_description = project.description or ""
            if not req_skills_list:
                for req in project.required_skills:
                    req_skills_list.append({
                        "skill_id": req.skill_id,
                        "skill_name": req.skill.name if req.skill else "",
                        "min_proficiency": req.min_proficiency.value if hasattr(req.min_proficiency, "value") else str(req.min_proficiency),
                        "importance": req.importance.value if hasattr(req.importance, "value") else str(req.importance),
                        "weight": 1.0,
                    })

    return project_title, project_description, req_skills_list


async def _handle_generate_teams(data: TeamGenerateRequest, db: AsyncSession) -> TeamGenerateResponse:
    project_title, project_description, req_skills = await _resolve_project_details(data, db)
    students = await _fetch_candidate_students(db)

    if not students:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No active candidate students found in database")

    result = _team_builder.generate_teams(
        project={
            "id": data.project_id or "custom",
            "title": project_title,
            "description": project_description,
            "required_skills": req_skills,
        },
        candidate_students=students,
        team_size=data.team_size,
        locked_student_ids=data.locked_student_ids,
        excluded_student_ids=data.excluded_student_ids,
        strategy=data.strategy or "balanced",
        max_candidates=data.max_candidates,
    )

    return TeamGenerateResponse.model_validate(result)


async def _handle_replace_member(data: ReplaceMemberRequest, db: AsyncSession) -> ReplaceMemberResponse:
    project_title, project_description, req_skills = await _resolve_project_details(data, db)
    students = await _fetch_candidate_students(db)

    if not students:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No active candidate students found")

    result = _team_builder.recommend_replacements(
        project={
            "id": data.project_id or "custom",
            "title": project_title,
            "description": project_description,
            "required_skills": req_skills,
        },
        candidate_students=students,
        current_member_ids=data.current_member_ids,
        member_id_to_replace=data.member_id_to_replace,
        team_size=data.team_size,
        max_recommendations=data.max_recommendations,
    )

    return ReplaceMemberResponse.model_validate(result)


# Route definitions on /v1/teams
@router.post("/generate", response_model=TeamGenerateResponse)
async def generate_teams_v1(data: TeamGenerateRequest, db: AsyncSession = Depends(get_db)):
    """Generate balanced candidate teams for a project based on multi-objective scoring."""
    return await _handle_generate_teams(data, db)


@router.post("/replace-member", response_model=ReplaceMemberResponse)
async def replace_member_v1(data: ReplaceMemberRequest, db: AsyncSession = Depends(get_db)):
    """Dynamically recommend replacement teammates and calculate delta impact on team score."""
    return await _handle_replace_member(data, db)


# Direct route definitions on /teams
@direct_router.post("/generate", response_model=TeamGenerateResponse)
async def generate_teams_direct(data: TeamGenerateRequest, db: AsyncSession = Depends(get_db)):
    """Direct alias: POST /teams/generate"""
    return await _handle_generate_teams(data, db)


@direct_router.post("/replace-member", response_model=ReplaceMemberResponse)
async def replace_member_direct(data: ReplaceMemberRequest, db: AsyncSession = Depends(get_db)):
    """Direct alias: POST /teams/replace-member"""
    return await _handle_replace_member(data, db)
