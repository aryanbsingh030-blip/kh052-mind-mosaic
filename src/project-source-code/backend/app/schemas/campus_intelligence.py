"""
Campus Skill Intelligence Schemas (Stage 8)
Defines aggregated, strictly anonymized models for campus skill analytics.
NO PII (names, emails, student IDs, avatars) is included in any model.
"""

from typing import List, Optional, Dict
from pydantic import BaseModel, Field


class CampusOverviewMetrics(BaseModel):
    """Aggregate campus-level skill health and activity metrics."""
    total_students: int = Field(..., description="Total active students evaluated")
    total_skills: int = Field(..., description="Total skills in taxonomy")
    total_teaching_capacity: int = Field(..., description="Total student skills offered to teach")
    total_learning_demand: int = Field(..., description="Total student skills requested to learn + learning goals")
    average_demand_index: float = Field(..., description="Campus-wide average demand index")
    critical_shortages_count: int = Field(..., description="Number of skills with critical shortages")
    high_demand_count: int = Field(..., description="Number of skills with high unmet demand")
    emerging_skills_count: int = Field(..., description="Number of emerging skills")
    campus_teaching_capacity_hours: float = Field(..., description="Estimated weekly campus teaching hours")


class SkillDemandSupplyItem(BaseModel):
    """Detailed supply, demand, and gap analytics for a single skill."""
    skill_id: str
    skill_name: str
    category: str
    learners_count: int = Field(..., description="Number of students wanting to learn this skill")
    teachers_count: int = Field(..., description="Number of students available to teach this skill")
    demand_index: float = Field(..., description="Demand ratio: learners / max(teachers, 1)")
    supply_index: float = Field(..., description="Supply percentage: teachers / total_students * 100")
    skill_gap_score: int = Field(..., description="Absolute deficit: max(0, learners - teachers)")
    gap_percentage: float = Field(..., description="Relative gap percentage: (learners - teachers) / max(learners + teachers, 1) * 100")
    status: str = Field(..., description="CRITICAL_SHORTAGE, HIGH_DEMAND, BALANCED, or OVERSUPPLIED")
    is_shortage: bool = Field(default=False)
    is_emerging: bool = Field(default=False)
    callout_text: str = Field(..., description="Anonymized human-readable insight, e.g. '37 students want to learn Machine Learning but only 8 students are available to teach it.'")


class CategoryDistributionItem(BaseModel):
    """Distribution of campus interest across skill categories."""
    category: str
    total_skills: int
    learners_count: int
    teachers_count: int
    demand_index: float
    learner_share_percentage: float
    teacher_share_percentage: float


class SkillNetworkNode(BaseModel):
    """Node in the campus skill relationship network."""
    id: str
    name: str
    category: str
    demand_index: float
    total_mentions: int
    size: int


class SkillNetworkEdge(BaseModel):
    """Edge indicating co-occurrence of skills studied or taught by identical student profiles."""
    source: str
    target: str
    source_name: str
    target_name: str
    weight: int
    category: str


class SkillNetworkResponse(BaseModel):
    """Anonymized campus skill correlation network."""
    nodes: List[SkillNetworkNode]
    edges: List[SkillNetworkEdge]
    total_clusters: int


class NarrativeInsightItem(BaseModel):
    """Role-tailored qualitative insight statement."""
    id: str
    type: str = Field(..., description="SHORTAGE_ALERT, EMERGING_TREND, CAPACITY_WARNING, or TEACHING_OPPORTUNITY")
    headline: str
    description: str
    metric_label: str
    metric_value: str
    target_audience: str = Field(..., description="STUDENT, FACULTY, ADMINISTRATOR, or ALL")
    action_recommendation: str


class CampusFilterOptions(BaseModel):
    """Available filter dimensions extracted from live campus data."""
    categories: List[str]
    departments: List[str]
    years_of_study: List[str]
    time_periods: List[str]


class CampusIntelligenceResponse(BaseModel):
    """Consolidated campus skill intelligence bundle."""
    overview: CampusOverviewMetrics
    top_demanded_skills: List[SkillDemandSupplyItem]
    top_supplied_skills: List[SkillDemandSupplyItem]
    skill_shortages: List[SkillDemandSupplyItem]
    emerging_skills: List[SkillDemandSupplyItem]
    category_distribution: List[CategoryDistributionItem]
    narrative_insights: List[NarrativeInsightItem]
    filter_options: CampusFilterOptions
