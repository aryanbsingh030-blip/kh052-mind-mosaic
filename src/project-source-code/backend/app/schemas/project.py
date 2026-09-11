"""
Project, Requirement, Team, and Member Schemas
"""

from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, Field

from app.models.enums import ProficiencyLevel, ProjectStatus, RequirementImportance, TeamRole, TeamStatus


class ProjectSkillRequirementBase(BaseModel):
    skill_id: Optional[str] = None
    skill_name: Optional[str] = None
    required_proficiency: ProficiencyLevel = ProficiencyLevel.INTERMEDIATE
    importance: RequirementImportance = RequirementImportance.MANDATORY
    description: Optional[str] = None


class ProjectSkillRequirementCreate(ProjectSkillRequirementBase):
    pass


class ProjectSkillRequirementResponse(ProjectSkillRequirementBase):
    id: str
    project_id: str
    skill_name: Optional[str] = None
    skill_category: Optional[str] = None

    model_config = {"from_attributes": True}


class ProjectCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: str = Field(..., min_length=10)
    category: str = Field(default="General", max_length=100)
    max_members: int = Field(default=4, ge=1, le=20)
    requirements: List[ProjectSkillRequirementCreate] = []


class ProjectUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, min_length=10)
    category: Optional[str] = Field(None, max_length=100)
    status: Optional[ProjectStatus] = None
    max_members: Optional[int] = Field(None, ge=1, le=20)


class TeamMemberAdd(BaseModel):
    student_id: str
    role: TeamRole = TeamRole.CONTRIBUTOR


class TeamMemberResponse(BaseModel):
    id: str
    team_id: str
    student_id: str
    student_name: Optional[str] = None
    department: Optional[str] = None
    role: TeamRole
    joined_at: datetime

    model_config = {"from_attributes": True}


class TeamCreate(BaseModel):
    project_id: str
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None


class TeamResponse(BaseModel):
    id: str
    project_id: str
    name: str
    description: Optional[str] = None
    status: TeamStatus
    formed_at: datetime
    members: List[TeamMemberResponse] = []

    model_config = {"from_attributes": True}


class ProjectResponse(BaseModel):
    id: str
    owner_id: str
    owner_name: Optional[str] = None
    title: str
    description: str
    category: str
    status: ProjectStatus
    max_members: int
    created_at: datetime
    updated_at: datetime
    skill_requirements: List[ProjectSkillRequirementResponse] = []
    teams: List[TeamResponse] = []

    model_config = {"from_attributes": True}
