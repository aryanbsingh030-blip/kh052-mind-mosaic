"""
Projects and Project Skill Requirements Endpoints
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, or_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload, joinedload

from app.database import get_db
from app.models.activity import ActivityEvent
from app.models.enums import ActivityEventType, ProjectStatus
from app.models.profile import StudentProfile
from app.models.project import Project, ProjectSkillRequirement, Team, TeamMember
from app.models.skill import Skill
from app.schemas.project import (
    ProjectCreate,
    ProjectUpdate,
    ProjectResponse,
    ProjectSkillRequirementCreate,
    ProjectSkillRequirementResponse,
    TeamResponse,
    TeamMemberResponse,
)

router = APIRouter(prefix="/v1/projects", tags=["Projects"])


def _project_to_response(project: Project) -> ProjectResponse:
    requirements = [
        ProjectSkillRequirementResponse(
            id=r.id,
            project_id=r.project_id,
            skill_id=r.skill_id,
            skill_name=r.skill.name if r.skill else None,
            skill_category=r.skill.category if r.skill else None,
            required_proficiency=r.required_proficiency,
            importance=r.importance,
            description=r.description,
        )
        for r in project.skill_requirements
    ]

    teams = [
        TeamResponse(
            id=t.id,
            project_id=t.project_id,
            name=t.name,
            description=t.description,
            status=t.status,
            formed_at=t.formed_at,
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
                for m in t.members
            ],
        )
        for t in project.teams
    ]

    return ProjectResponse(
        id=project.id,
        owner_id=project.owner_id,
        owner_name=project.owner.full_name if project.owner else None,
        title=project.title,
        description=project.description,
        category=project.category,
        status=project.status,
        max_members=project.max_members,
        created_at=project.created_at,
        updated_at=project.updated_at,
        skill_requirements=requirements,
        teams=teams,
    )


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    owner_id: str,
    data: ProjectCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new project and optionally add required skills."""
    owner = await db.get(StudentProfile, owner_id)
    if not owner:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Owner student profile not found")

    project = Project(
        owner_id=owner_id,
        title=data.title.strip(),
        description=data.description.strip(),
        category=data.category.strip(),
        max_members=data.max_members,
    )
    db.add(project)
    await db.flush()

    # Add requirements if provided
    for req in data.requirements:
        skill = None
        if req.skill_id:
            skill = await db.get(Skill, req.skill_id)
        if not skill and req.skill_name:
            res = await db.execute(select(Skill).where(func.lower(Skill.name) == req.skill_name.strip().lower()))
            skill = res.scalars().first()
            if not skill:
                skill = Skill(name=req.skill_name.strip(), category="General", description=f"Skill for project {project.title}")
                db.add(skill)
                await db.flush()

        if skill:
            r_record = ProjectSkillRequirement(
                project_id=project.id,
                skill_id=skill.id,
                required_proficiency=req.required_proficiency,
                importance=req.importance,
                description=req.description,
            )
            db.add(r_record)

    event = ActivityEvent(
        student_id=owner_id,
        event_type=ActivityEventType.PROJECT_CREATED,
        title=f"Project Created: {project.title}",
        description=f"Created in category {project.category}",
    )
    db.add(event)
    await db.commit()

    # Reload with relationships
    return await get_project_by_id(project.id, db)


@router.get("", response_model=List[ProjectResponse])
async def list_projects(
    category: Optional[str] = None,
    status_filter: Optional[ProjectStatus] = None,
    search: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """List projects with category, status, and keyword filtering."""
    query = (
        select(Project)
        .options(
            joinedload(Project.owner),
            selectinload(Project.skill_requirements).joinedload(ProjectSkillRequirement.skill),
            selectinload(Project.teams).selectinload(Team.members).joinedload(TeamMember.student),
        )
    )

    if category:
        query = query.where(Project.category == category)
    if status_filter:
        query = query.where(Project.status == status_filter)
    if search:
        term = f"%{search.strip()}%"
        query = query.where(or_(Project.title.ilike(term), Project.description.ilike(term)))

    query = query.order_by(Project.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    projects = result.scalars().all()

    return [_project_to_response(p) for p in projects]


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project_by_id(project_id: str, db: AsyncSession = Depends(get_db)):
    """Get project details including skill requirements and formed teams."""
    result = await db.execute(
        select(Project)
        .where(Project.id == project_id)
        .options(
            joinedload(Project.owner),
            selectinload(Project.skill_requirements).joinedload(ProjectSkillRequirement.skill),
            selectinload(Project.teams).selectinload(Team.members).joinedload(TeamMember.student),
        )
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    return _project_to_response(project)


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    data: ProjectUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update project status, title, description, or capacity."""
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    update_dict = data.model_dump(exclude_unset=True)
    for field, val in update_dict.items():
        setattr(project, field, val)

    await db.commit()
    return await get_project_by_id(project_id, db)


# --- Skill Requirement Endpoints ---

@router.post("/{project_id}/requirements", response_model=ProjectSkillRequirementResponse, status_code=status.HTTP_201_CREATED)
async def add_project_requirement(
    project_id: str,
    data: ProjectSkillRequirementCreate,
    db: AsyncSession = Depends(get_db),
):
    """Add a required or preferred skill requirement to a project."""
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    skill = await db.get(Skill, data.skill_id)
    if not skill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill not found")

    req = ProjectSkillRequirement(
        project_id=project_id,
        skill_id=data.skill_id,
        required_proficiency=data.required_proficiency,
        importance=data.importance,
        description=data.description,
    )
    db.add(req)
    await db.commit()
    await db.refresh(req)

    return ProjectSkillRequirementResponse(
        id=req.id,
        project_id=req.project_id,
        skill_id=req.skill_id,
        skill_name=skill.name,
        skill_category=skill.category,
        required_proficiency=req.required_proficiency,
        importance=req.importance,
        description=req.description,
    )


@router.get("/{project_id}/requirements", response_model=List[ProjectSkillRequirementResponse])
async def list_project_requirements(project_id: str, db: AsyncSession = Depends(get_db)):
    """List all skill requirements for a project."""
    result = await db.execute(
        select(ProjectSkillRequirement)
        .where(ProjectSkillRequirement.project_id == project_id)
        .options(joinedload(ProjectSkillRequirement.skill))
    )
    records = result.scalars().all()

    return [
        ProjectSkillRequirementResponse(
            id=r.id,
            project_id=r.project_id,
            skill_id=r.skill_id,
            skill_name=r.skill.name if r.skill else None,
            skill_category=r.skill.category if r.skill else None,
            required_proficiency=r.required_proficiency,
            importance=r.importance,
            description=r.description,
        )
        for r in records
    ]
