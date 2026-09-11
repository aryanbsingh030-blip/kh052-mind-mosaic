"""
Campus Skill Intelligence Router (Stage 8)
Provides campus-level skill analytics, supply/demand indices, shortage detection,
category distribution, cross-department skill networks, and role-oriented insights.

STRICT PRIVACY GUARANTEE:
All responses are aggregated metrics. No student names, emails, student IDs,
or personal identifiers are exposed.
"""

from typing import List, Optional, Dict, Tuple
from collections import defaultdict
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, distinct, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.database import get_db
from app.models.enums import SkillDirection
from app.models.profile import StudentProfile
from app.models.skill import Skill, StudentSkill
from app.models.learning_goal import LearningGoal
from app.models.session import TeachingSession
from app.models.availability import Availability
from app.schemas.campus_intelligence import (
    CampusOverviewMetrics,
    SkillDemandSupplyItem,
    CategoryDistributionItem,
    SkillNetworkNode,
    SkillNetworkEdge,
    SkillNetworkResponse,
    NarrativeInsightItem,
    CampusFilterOptions,
    CampusIntelligenceResponse,
)

router = APIRouter(prefix="/v1/campus-insights", tags=["Campus Intelligence"])


def _apply_time_filter(created_at_col, time_period: Optional[str]):
    """Helper to return SQL condition based on time period."""
    if not time_period or time_period == "all_time":
        return None
    now = datetime.now(timezone.utc)
    if time_period == "past_30_days":
        cutoff = now - timedelta(days=30)
        return created_at_col >= cutoff
    elif time_period == "past_semester":
        cutoff = now - timedelta(days=120)
        return created_at_col >= cutoff
    elif time_period == "past_year":
        cutoff = now - timedelta(days=365)
        return created_at_col >= cutoff
    return None


@router.get("/filters", response_model=CampusFilterOptions)
async def get_filter_options(db: AsyncSession = Depends(get_db)):
    """Return available filter dimensions extracted from live campus data."""
    cats_res = await db.scalars(select(distinct(Skill.category)).order_by(Skill.category))
    depts_res = await db.scalars(select(distinct(StudentProfile.department)).order_by(StudentProfile.department))
    years_res = await db.scalars(select(distinct(StudentProfile.year_of_study)).order_by(StudentProfile.year_of_study))

    return CampusFilterOptions(
        categories=[c for c in cats_res.all() if c],
        departments=[d for d in depts_res.all() if d],
        years_of_study=[y for y in years_res.all() if y],
        time_periods=["all_time", "past_30_days", "past_semester", "past_year"],
    )


async def _calculate_skill_analytics(
    db: AsyncSession,
    category: Optional[str] = None,
    department: Optional[str] = None,
    year_of_study: Optional[str] = None,
    time_period: Optional[str] = None,
) -> Tuple[List[SkillDemandSupplyItem], int, int, int]:
    """
    Core analytics calculation engine returning list of SkillDemandSupplyItem,
    total students evaluated, total teachers count, and total learners count.
    """
    # 1. Base student profile query for filtering
    student_query = select(StudentProfile.id)
    if department:
        student_query = student_query.where(StudentProfile.department == department)
    if year_of_study:
        student_query = student_query.where(StudentProfile.year_of_study == year_of_study)
    
    student_ids_res = await db.scalars(student_query)
    eligible_student_ids = set(student_ids_res.all())
    total_students = len(eligible_student_ids) if eligible_student_ids else 0

    # 2. Fetch skills
    skill_query = select(Skill)
    if category:
        skill_query = skill_query.where(Skill.category == category)
    skills_res = await db.scalars(skill_query)
    all_skills = skills_res.all()

    # 3. Query StudentSkills
    ss_query = select(StudentSkill)
    time_cond = _apply_time_filter(StudentSkill.created_at, time_period)
    if time_cond is not None:
        ss_query = ss_query.where(time_cond)

    ss_res = await db.scalars(ss_query)
    student_skills = ss_res.all()

    # 4. Query LearningGoals (contribute to learner demand)
    lg_query = select(LearningGoal)
    lg_time = _apply_time_filter(LearningGoal.created_at, time_period)
    if lg_time is not None:
        lg_query = lg_query.where(lg_time)
    lg_res = await db.scalars(lg_query)
    learning_goals = lg_res.all()

    # 5. Aggregate by skill
    teachers_per_skill = defaultdict(set)
    learners_per_skill = defaultdict(set)
    freshman_sophomore_learners = defaultdict(set)

    # Need student year lookup if we want emerging skill detection
    student_years_res = await db.execute(select(StudentProfile.id, StudentProfile.year_of_study))
    student_years = {row[0]: row[1] for row in student_years_res.all()}

    for ss in student_skills:
        if eligible_student_ids and ss.student_id not in eligible_student_ids:
            continue
        if ss.direction == SkillDirection.TEACH:
            teachers_per_skill[ss.skill_id].add(ss.student_id)
        elif ss.direction == SkillDirection.LEARN:
            learners_per_skill[ss.skill_id].add(ss.student_id)
            if student_years.get(ss.student_id) in ["Freshman", "Sophomore"]:
                freshman_sophomore_learners[ss.skill_id].add(ss.student_id)

    for lg in learning_goals:
        if eligible_student_ids and lg.student_id not in eligible_student_ids:
            continue
        learners_per_skill[lg.skill_id].add(lg.student_id)
        if student_years.get(lg.student_id) in ["Freshman", "Sophomore"]:
            freshman_sophomore_learners[lg.skill_id].add(lg.student_id)

    total_teachers_count = sum(len(s) for s in teachers_per_skill.values())
    total_learners_count = sum(len(s) for s in learners_per_skill.values())

    # Build detailed items
    items: List[SkillDemandSupplyItem] = []
    effective_total_students = max(total_students, 1)

    for s in all_skills:
        teachers = len(teachers_per_skill.get(s.id, set()))
        learners = len(learners_per_skill.get(s.id, set()))

        # Demand Index: learners / max(teachers, 1)
        # If teachers == 0 and learners > 0, demand index is boosted by 2x learners
        if teachers == 0:
            demand_index = float(learners * 2.0) if learners > 0 else 0.0
        else:
            demand_index = round(float(learners) / float(teachers), 2)

        # Supply Index: percentage of campus offering to teach
        supply_index = round((float(teachers) / float(effective_total_students)) * 100.0, 1)

        # Skill Gap Score
        skill_gap_score = max(0, learners - teachers)
        total_interest = max(learners + teachers, 1)
        gap_percentage = round(((float(learners) - float(teachers)) / float(total_interest)) * 100.0, 1)

        # Status Classification
        if teachers == 0 and learners > 0:
            status = "CRITICAL_SHORTAGE"
            is_shortage = True
            is_emerging = learners <= 3 or len(freshman_sophomore_learners.get(s.id, set())) >= (learners * 0.5)
        elif demand_index >= 1.5 and learners > teachers:
            status = "HIGH_DEMAND"
            is_shortage = True
            is_emerging = False
        elif demand_index < 0.7 and teachers > learners:
            status = "OVERSUPPLIED"
            is_shortage = False
            is_emerging = False
        else:
            status = "BALANCED"
            is_shortage = False
            is_emerging = False

        # Emerging: newly requested, strong lower-year interest, or low current supply
        if not is_shortage and learners >= 2 and teachers <= 1:
            is_emerging = True

        # Callout Text (Strictly Anonymized Narrative Callout)
        if learners > teachers:
            callout_text = f"{learners} students want to learn {s.name} but only {teachers} students are available to teach it."
        elif teachers > learners and learners > 0:
            callout_text = f"{teachers} students are available to teach {s.name}, exceeding current learner demand of {learners}."
        elif learners == teachers and learners > 0:
            callout_text = f"{s.name} has balanced campus equilibrium with {teachers} teachers and {learners} learners."
        elif teachers > 0:
            callout_text = f"{teachers} students offer {s.name}, awaiting prospective learners."
        else:
            callout_text = f"{s.name} currently has no active learning or teaching requests."

        items.append(
            SkillDemandSupplyItem(
                skill_id=s.id,
                skill_name=s.name,
                category=s.category,
                learners_count=learners,
                teachers_count=teachers,
                demand_index=demand_index,
                supply_index=supply_index,
                skill_gap_score=skill_gap_score,
                gap_percentage=gap_percentage,
                status=status,
                is_shortage=is_shortage,
                is_emerging=is_emerging,
                callout_text=callout_text,
            )
        )

    return items, total_students, total_teachers_count, total_learners_count


@router.get("/overview", response_model=CampusOverviewMetrics)
async def get_campus_overview(
    category: Optional[str] = None,
    department: Optional[str] = None,
    year_of_study: Optional[str] = None,
    time_period: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """Return high-level anonymized campus skill health and volume metrics."""
    items, total_students, total_teachers, total_learners = await _calculate_skill_analytics(
        db, category, department, year_of_study, time_period
    )

    total_skills = len(items)
    avg_demand = round(sum(i.demand_index for i in items) / max(total_skills, 1), 2)
    critical_shortages = sum(1 for i in items if i.status == "CRITICAL_SHORTAGE")
    high_demand = sum(1 for i in items if i.status == "HIGH_DEMAND")
    emerging = sum(1 for i in items if i.is_emerging)

    # Estimate teaching capacity hours (e.g. teachers * 2.5 hours average availability)
    avail_count_res = await db.scalar(select(func.count(Availability.id)))
    teaching_hours = round(float(avail_count_res or (total_teachers * 2.0)), 1)

    return CampusOverviewMetrics(
        total_students=total_students,
        total_skills=total_skills,
        total_teaching_capacity=total_teachers,
        total_learning_demand=total_learners,
        average_demand_index=avg_demand,
        critical_shortages_count=critical_shortages,
        high_demand_count=high_demand,
        emerging_skills_count=emerging,
        campus_teaching_capacity_hours=teaching_hours,
    )


@router.get("/demand-supply", response_model=List[SkillDemandSupplyItem])
async def get_demand_supply(
    category: Optional[str] = None,
    department: Optional[str] = None,
    year_of_study: Optional[str] = None,
    time_period: Optional[str] = None,
    sort_by: str = Query("gap", enum=["gap", "demand", "supply", "learners", "teachers"]),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """List skills ranked by demand index, supply index, or gap score."""
    items, _, _, _ = await _calculate_skill_analytics(
        db, category, department, year_of_study, time_period
    )

    if sort_by == "gap":
        items.sort(key=lambda x: (x.skill_gap_score, x.demand_index), reverse=True)
    elif sort_by == "demand":
        items.sort(key=lambda x: (x.demand_index, x.learners_count), reverse=True)
    elif sort_by == "supply":
        items.sort(key=lambda x: (x.supply_index, x.teachers_count), reverse=True)
    elif sort_by == "learners":
        items.sort(key=lambda x: x.learners_count, reverse=True)
    elif sort_by == "teachers":
        items.sort(key=lambda x: x.teachers_count, reverse=True)

    return items[:limit]


@router.get("/shortages", response_model=List[SkillDemandSupplyItem])
async def get_skill_shortages(
    category: Optional[str] = None,
    department: Optional[str] = None,
    year_of_study: Optional[str] = None,
    time_period: Optional[str] = None,
    limit: int = Query(20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    """Return top critical skill shortages where learner demand exceeds peer teacher supply."""
    items, _, _, _ = await _calculate_skill_analytics(
        db, category, department, year_of_study, time_period
    )

    shortages = [i for i in items if i.is_shortage and i.learners_count > 0]
    shortages.sort(key=lambda x: (x.skill_gap_score, x.demand_index), reverse=True)
    return shortages[:limit]


@router.get("/emerging", response_model=List[SkillDemandSupplyItem])
async def get_emerging_skills(
    category: Optional[str] = None,
    department: Optional[str] = None,
    year_of_study: Optional[str] = None,
    time_period: Optional[str] = None,
    limit: int = Query(20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    """Return emerging skills with rising learner demand among early-year students."""
    items, _, _, _ = await _calculate_skill_analytics(
        db, category, department, year_of_study, time_period
    )

    emerging = [i for i in items if i.is_emerging]
    emerging.sort(key=lambda x: (x.learners_count, x.demand_index), reverse=True)
    return emerging[:limit]


@router.get("/categories", response_model=List[CategoryDistributionItem])
async def get_category_distribution(
    department: Optional[str] = None,
    year_of_study: Optional[str] = None,
    time_period: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """Return aggregate breakdown of skills and campus interest across categories."""
    items, _, total_teachers, total_learners = await _calculate_skill_analytics(
        db, None, department, year_of_study, time_period
    )

    cat_map = defaultdict(lambda: {"total_skills": 0, "learners": 0, "teachers": 0})
    for i in items:
        entry = cat_map[i.category]
        entry["total_skills"] += 1
        entry["learners"] += i.learners_count
        entry["teachers"] += i.teachers_count

    effective_learners = max(total_learners, 1)
    effective_teachers = max(total_teachers, 1)

    result: List[CategoryDistributionItem] = []
    for cat, data in sorted(cat_map.items(), key=lambda x: x[1]["learners"], reverse=True):
        demand_idx = round(float(data["learners"]) / float(max(data["teachers"], 1)), 2)
        learner_share = round((float(data["learners"]) / float(effective_learners)) * 100.0, 1)
        teacher_share = round((float(data["teachers"]) / float(effective_teachers)) * 100.0, 1)

        result.append(
            CategoryDistributionItem(
                category=cat,
                total_skills=data["total_skills"],
                learners_count=data["learners"],
                teachers_count=data["teachers"],
                demand_index=demand_idx,
                learner_share_percentage=learner_share,
                teacher_share_percentage=teacher_share,
            )
        )
    return result


@router.get("/network", response_model=SkillNetworkResponse)
async def get_skill_network(
    category: Optional[str] = None,
    limit: int = Query(30, ge=5, le=60),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate an anonymized skill correlation network indicating which skills
    frequently co-occur in the same student portfolios (either learned or taught).
    """
    # 1. Fetch active skills
    skill_query = select(Skill)
    if category:
        skill_query = skill_query.where(Skill.category == category)
    skills_res = await db.scalars(skill_query)
    skills = {s.id: s for s in skills_res.all()}

    # 2. Fetch student skills grouped by student
    ss_query = select(StudentSkill.student_id, StudentSkill.skill_id)
    ss_res = await db.execute(ss_query)

    student_skills_map = defaultdict(set)
    skill_mention_counts = defaultdict(int)
    for stu_id, sk_id in ss_res.all():
        if sk_id in skills:
            student_skills_map[stu_id].add(sk_id)
            skill_mention_counts[sk_id] += 1

    # Select top skills by mentions
    top_skill_ids = sorted(skill_mention_counts.keys(), key=lambda k: skill_mention_counts[k], reverse=True)[:limit]
    top_skill_set = set(top_skill_ids)

    # Compute co-occurrence weights
    pair_weights = defaultdict(int)
    for stu_id, skill_ids in student_skills_map.items():
        relevant = list(skill_ids.intersection(top_skill_set))
        for i in range(len(relevant)):
            for j in range(i + 1, len(relevant)):
                s1, s2 = sorted([relevant[i], relevant[j]])
                pair_weights[(s1, s2)] += 1

    # Build Nodes
    nodes: List[SkillNetworkNode] = []
    for sk_id in top_skill_ids:
        sk = skills[sk_id]
        mentions = skill_mention_counts[sk_id]
        nodes.append(
            SkillNetworkNode(
                id=sk.id,
                name=sk.name,
                category=sk.category,
                demand_index=1.0,
                total_mentions=mentions,
                size=min(max(mentions * 4, 12), 40),
            )
        )

    # Build Edges (filter out weak pairs)
    edges: List[SkillNetworkEdge] = []
    for (s1_id, s2_id), weight in sorted(pair_weights.items(), key=lambda x: x[1], reverse=True):
        if weight >= 1 and len(edges) < 60:
            s1 = skills[s1_id]
            s2 = skills[s2_id]
            edges.append(
                SkillNetworkEdge(
                    source=s1_id,
                    target=s2_id,
                    source_name=s1.name,
                    target_name=s2.name,
                    weight=weight,
                    category=s1.category,
                )
            )

    categories_count = len(set(n.category for n in nodes))
    return SkillNetworkResponse(
        nodes=nodes,
        edges=edges,
        total_clusters=categories_count,
    )


@router.get("/narrative-insights", response_model=List[NarrativeInsightItem])
async def get_narrative_insights(
    department: Optional[str] = None,
    year_of_study: Optional[str] = None,
    time_period: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Generate actionable, role-tailored qualitative insight statements for
    Students, Faculty, and Administrators.
    """
    items, total_students, total_teachers, total_learners = await _calculate_skill_analytics(
        db, None, department, year_of_study, time_period
    )

    shortages = [i for i in items if i.is_shortage and i.learners_count > 0]
    shortages.sort(key=lambda x: (x.skill_gap_score, x.demand_index), reverse=True)

    top_supplied = [i for i in items if i.teachers_count > 0]
    top_supplied.sort(key=lambda x: x.teachers_count, reverse=True)

    insights: List[NarrativeInsightItem] = []

    # 1. Critical Shortage Callout (For All / Faculty / Admin)
    if shortages:
        top_s = shortages[0]
        insights.append(
            NarrativeInsightItem(
                id="shortage-1",
                type="SHORTAGE_ALERT",
                headline=f"Critical Peer Shortage: {top_s.skill_name}",
                description=f"{top_s.learners_count} students want to learn {top_s.skill_name} but only {top_s.teachers_count} students are available to teach it.",
                metric_label="Demand vs Supply Gap",
                metric_value=f"+{top_s.skill_gap_score} student deficit",
                target_audience="FACULTY",
                action_recommendation=f"Host a campus guest lecture, departmental workshop, or teaching incentive drive for {top_s.skill_name}.",
            )
        )

    # 2. Teaching Opportunity (For Students)
    if len(shortages) >= 2:
        opp_s = shortages[1]
        insights.append(
            NarrativeInsightItem(
                id="opp-1",
                type="TEACHING_OPPORTUNITY",
                headline=f"High-Credit Teaching Opportunity in {opp_s.skill_name}",
                description=f"{opp_s.learners_count} peers are actively seeking mentors in {opp_s.skill_name} (Demand Index: {opp_s.demand_index}).",
                metric_label="Credit Multiplier",
                metric_value="1.5x Reward",
                target_audience="STUDENT",
                action_recommendation=f"List {opp_s.skill_name} in your teaching profile to earn premium skill credits rapidly.",
            )
        )

    # 3. Capacity & Health Warning (For Administrators)
    if total_learners > (total_teachers * 1.5):
        insights.append(
            NarrativeInsightItem(
                id="cap-1",
                type="CAPACITY_WARNING",
                headline="Campus Learning Demand Exceeds Teaching Capacity",
                description=f"Total learning requests ({total_learners}) significantly surpass verified peer teaching capacity ({total_teachers}).",
                metric_label="Campus Demand Ratio",
                metric_value=f"{round(float(total_learners) / max(total_teachers, 1), 2)}x",
                target_audience="ADMINISTRATOR",
                action_recommendation="Launch campus credit bonuses and peer tutoring rewards to activate latent student teaching potential.",
            )
        )
    else:
        insights.append(
            NarrativeInsightItem(
                id="cap-2",
                type="CAPACITY_WARNING",
                headline="Campus Peer Teaching Capacity is Active",
                description=f"{total_teachers} student teachers are ready across 21 departments supporting {total_learners} learning goals.",
                metric_label="Active Tutors",
                metric_value=f"{total_teachers} mentors",
                target_audience="ADMINISTRATOR",
                action_recommendation="Maintain weekly session cadence and recognize top peer contributors.",
            )
        )

    # 4. Emerging Skills Trend
    emerging = [i for i in items if i.is_emerging and i.learners_count > 0]
    if emerging:
        em = emerging[0]
        insights.append(
            NarrativeInsightItem(
                id="emerging-1",
                type="EMERGING_TREND",
                headline=f"Rising Interdisciplinary Interest in {em.skill_name}",
                description=f"{em.learners_count} students have recently set learning targets in {em.skill_name}, signaling an early cross-campus trend.",
                metric_label="Emerging Category",
                metric_value=em.category,
                target_audience="FACULTY",
                action_recommendation="Incorporate preliminary modules into next semester's elective curriculum offerings.",
            )
        )

    return insights


@router.get("", response_model=CampusIntelligenceResponse)
async def get_full_campus_intelligence(
    category: Optional[str] = None,
    department: Optional[str] = None,
    year_of_study: Optional[str] = None,
    time_period: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Consolidated campus intelligence endpoint returning full metrics bundle
    for streamlined frontend dashboard loading.
    """
    items, total_students, total_teachers, total_learners = await _calculate_skill_analytics(
        db, category, department, year_of_study, time_period
    )

    total_skills = len(items)
    avg_demand = round(sum(i.demand_index for i in items) / max(total_skills, 1), 2)
    critical_shortages = sum(1 for i in items if i.status == "CRITICAL_SHORTAGE")
    high_demand = sum(1 for i in items if i.status == "HIGH_DEMAND")
    emerging = sum(1 for i in items if i.is_emerging)

    avail_count_res = await db.scalar(select(func.count(Availability.id)))
    teaching_hours = round(float(avail_count_res or (total_teachers * 2.0)), 1)

    overview = CampusOverviewMetrics(
        total_students=total_students,
        total_skills=total_skills,
        total_teaching_capacity=total_teachers,
        total_learning_demand=total_learners,
        average_demand_index=avg_demand,
        critical_shortages_count=critical_shortages,
        high_demand_count=high_demand,
        emerging_skills_count=emerging,
        campus_teaching_capacity_hours=teaching_hours,
    )

    # Top demanded
    top_demanded = sorted(items, key=lambda x: (x.demand_index, x.learners_count), reverse=True)[:10]

    # Top supplied
    top_supplied = sorted(items, key=lambda x: (x.supply_index, x.teachers_count), reverse=True)[:10]

    # Shortages
    shortages = [i for i in items if i.is_shortage and i.learners_count > 0]
    shortages = sorted(shortages, key=lambda x: (x.skill_gap_score, x.demand_index), reverse=True)

    # Emerging
    emerging_skills = [i for i in items if i.is_emerging]
    emerging_skills = sorted(emerging_skills, key=lambda x: (x.learners_count, x.demand_index), reverse=True)[:10]

    # Categories
    categories = await get_category_distribution(department, year_of_study, time_period, db)

    # Narrative Insights
    narrative_insights = await get_narrative_insights(department, year_of_study, time_period, db)

    # Filters
    filters = await get_filter_options(db)

    return CampusIntelligenceResponse(
        overview=overview,
        top_demanded_skills=top_demanded,
        top_supplied_skills=top_supplied,
        skill_shortages=shortages[:15],
        emerging_skills=emerging_skills,
        category_distribution=categories,
        narrative_insights=narrative_insights,
        filter_options=filters,
    )
