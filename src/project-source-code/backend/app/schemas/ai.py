"""
AI Skill Analysis Schemas
"""

from typing import Any, List, Optional
from pydantic import BaseModel, Field, model_validator


class SkillAnalysisRequest(BaseModel):
    text: str = Field(
        ...,
        min_length=3,
        max_length=5000,
        description="Unstructured student experience narrative or project description.",
        examples=["I built a CNN model for plant disease classification using Python and TensorFlow. I deployed it with Flask."],
    )
    direction: Optional[str] = Field(
        default="TEACH",
        description="Intended direction for extracted skills (TEACH or LEARN).",
    )


class ExtractedSkillResponse(BaseModel):
    skill_id: Optional[str] = None
    skill_name: str
    skill_category: Optional[str] = None
    proficiency: str  # BEGINNER | INTERMEDIATE | ADVANCED | EXPERT
    confidence: float
    evidence: str
    source: str  # direct_mention | alias_resolved | hierarchy_inferred | semantic_match

    model_config = {"from_attributes": True}


class SkillAnalysisResponse(BaseModel):
    provider_used: str
    skills: List[ExtractedSkillResponse]
    raw_text: str
    processing_time_ms: float

    model_config = {"from_attributes": True}


# --- Stage 5: Project Intelligence Schemas ---

class ProjectAnalysisRequest(BaseModel):
    text: Optional[str] = Field(
        None,
        description="Natural language description of a project idea.",
        examples=["I want to build an AI-based crop disease detection application."],
    )
    description: Optional[str] = Field(
        None,
        description="Alternative field name for project description.",
    )
    title: Optional[str] = Field(None, description="Optional custom project title")
    student_id: Optional[str] = Field(None, description="Optional owner student ID to calculate missing skills against")

    @model_validator(mode="before")
    @classmethod
    def resolve_text_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            raw_text = data.get("text") or data.get("description")
            if not raw_text or not str(raw_text).strip():
                raise ValueError("Project description cannot be empty.")
            data["text"] = str(raw_text).strip()
        return data


class ProjectRequiredSkillItem(BaseModel):
    skill_id: Optional[str] = None
    skill_name: str
    skill_category: Optional[str] = None
    required_proficiency: str = "INTERMEDIATE"  # BEGINNER | INTERMEDIATE | ADVANCED | EXPERT
    importance: str = "MANDATORY"              # MANDATORY | PREFERRED
    importance_score: float = 0.8
    rationale: Optional[str] = None

    model_config = {"from_attributes": True}


class SuggestedTeamRoleItem(BaseModel):
    role_title: str
    description: str
    associated_skills: List[str] = []

    model_config = {"from_attributes": True}


class ProjectGraphNode(BaseModel):
    id: str
    label: str
    node_type: str  # project | domain | skill
    category: Optional[str] = None
    importance: str = "MANDATORY"
    centrality: float = 0.5

    model_config = {"from_attributes": True}


class ProjectGraphEdge(BaseModel):
    source: str
    target: str
    relation: str
    weight: float = 1.0

    model_config = {"from_attributes": True}


class ProjectSkillCluster(BaseModel):
    cluster_name: str
    skills: List[str] = []


class ProjectSkillGraphData(BaseModel):
    nodes: List[ProjectGraphNode] = []
    edges: List[ProjectGraphEdge] = []
    clusters: List[ProjectSkillCluster] = []


class ProjectAnalysisResponse(BaseModel):
    project_title: str
    project_summary: str
    domains: List[str]
    domain_label: str
    complexity: str
    suggested_team_size: int
    required_skills: List[ProjectRequiredSkillItem]
    suggested_roles: List[SuggestedTeamRoleItem]
    skill_graph: ProjectSkillGraphData
    missing_skills: List[str] = []
    raw_description: str
    provider_used: str
    processing_time_ms: float

    model_config = {"from_attributes": True}
