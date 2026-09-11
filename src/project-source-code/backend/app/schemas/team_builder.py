"""
Pydantic Schemas for Stage 6: AI Project Team Builder
"""

from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field


class TeamGenerateRequest(BaseModel):
    project_id: Optional[str] = Field(None, description="Optional existing project ID in database")
    project_title: Optional[str] = Field(None, description="Project title")
    project_category: Optional[str] = Field(None, description="Project category / domain label")
    project_description: Optional[str] = Field(None, description="Project description")
    required_skills: Optional[List[Union[Dict[str, Any], str]]] = Field(
        default=None,
        description="List of required skills with importance and category",
    )
    team_size: int = Field(default=4, ge=2, le=8, description="Target team size")
    locked_student_ids: Optional[List[str]] = Field(
        default_factory=list,
        description="IDs of students who must be included in the team",
    )
    excluded_student_ids: Optional[List[str]] = Field(
        default_factory=list,
        description="IDs of students excluded from the team",
    )
    num_candidates: int = Field(default=3, ge=1, le=5, description="Number of candidate compositions to generate")


class CandidateMemberItem(BaseModel):
    student_id: str
    student_name: str
    department: str
    year_of_study: str
    avatar_url: Optional[str] = None
    skills_contributed: List[str] = []
    learning_goals_satisfied: List[str] = []
    role_assigned: str
    selection_reason: str

    model_config = {"from_attributes": True}


class TeamMetrics(BaseModel):
    overall_score: int = Field(..., ge=0, le=100, description="Weighted composite team fitness score (0-100%)")
    skill_coverage: int = Field(..., ge=0, le=100, description="Percentage of required skills covered (0-100%)")
    experience_balance: int = Field(..., ge=0, le=100, description="Distribution of seniority and experience (0-100%)")
    learning_synergy: int = Field(..., ge=0, le=100, description="Peer mentorship and reciprocal learning potential (0-100%)")
    compatibility: int = Field(..., ge=0, le=100, description="Interest and cross-disciplinary alignment (0-100%)")
    redundancy_score: int = Field(..., ge=0, le=100, description="Efficiency score penalizing duplicate skill overlap (0-100%)")
    availability_compatibility: int = Field(..., ge=0, le=100, description="Overlap in weekly meeting schedules (0-100%)")

    model_config = {"from_attributes": True}


class CandidateTeam(BaseModel):
    candidate_id: str
    strategy_name: str
    strategy_description: str
    metrics: TeamMetrics
    members: List[CandidateMemberItem]
    covered_skills: List[str] = []
    missing_skills: List[str] = []
    common_meeting_times: List[str] = []

    model_config = {"from_attributes": True}


class TeamGenerateResponse(BaseModel):
    project_id: Optional[str] = None
    project_title: str
    project_category: str
    required_skills: List[str] = []
    team_size: int
    candidate_teams: List[CandidateTeam] = []

    model_config = {"from_attributes": True}


class ReplaceMemberRequest(BaseModel):
    project_id: Optional[str] = None
    project_title: Optional[str] = None
    project_description: Optional[str] = None
    project_category: Optional[str] = None
    required_skills: Optional[List[Union[Dict[str, Any], str]]] = None
    current_team_student_ids: List[str] = Field(..., min_length=1)
    removed_student_id: str
    locked_student_ids: Optional[List[str]] = Field(default_factory=list)


class ReplacementCandidateItem(BaseModel):
    student_id: str
    student_name: str
    department: str
    year_of_study: str
    avatar_url: Optional[str] = None
    skills_restored: List[str] = []
    projected_overall_score: int
    projected_skill_coverage: int
    score_delta: int
    replacement_reason: str

    model_config = {"from_attributes": True}


class ReplaceMemberResponse(BaseModel):
    removed_student_name: str
    skills_lost: List[str] = []
    recalculated_coverage_before_replacement: int
    replacements: List[ReplacementCandidateItem] = []

    model_config = {"from_attributes": True}
