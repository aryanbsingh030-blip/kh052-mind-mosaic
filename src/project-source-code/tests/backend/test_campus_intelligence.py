"""
Test Suite for Stage 8: Campus Skill Intelligence
Validates anonymized campus-level skill analytics, supply/demand indices,
skill shortages, narrative callouts, filter dimensions, and strict privacy preservation.
"""

import pytest
import pytest_asyncio
import uuid
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from httpx import AsyncClient

from app.models.enums import SkillDirection, ProficiencyLevel, GoalStatus, UserRole
from app.models.user import User
from app.models.profile import StudentProfile
from app.models.skill import Skill, StudentSkill
from app.models.learning_goal import LearningGoal


@pytest_asyncio.fixture
async def seed_test_campus(db_session: AsyncSession):
    """Seed structured test campus dataset with known departments, skills, and supply/demand gaps."""
    # 1. Create Users & StudentProfiles
    students_data = [
        ("Alice Chen", "alice.campus@uni.edu", "Computer Science", "Junior"),
        ("Bob Smith", "bob.campus@uni.edu", "Data Science", "Senior"),
        ("Carlos Diaz", "carlos.campus@uni.edu", "Human-Computer Interaction", "Sophomore"),
        ("Diana Prince", "diana.campus@uni.edu", "Computer Science", "Freshman"),
    ]
    profiles = []
    for name, email, dept, year in students_data:
        user = User(
            id=str(uuid.uuid4()),
            email=email,
            password_hash="hashed_pw_test",
            role=UserRole.STUDENT,
            is_active=True,
        )
        db_session.add(user)
        await db_session.flush()

        profile = StudentProfile(
            id=str(uuid.uuid4()),
            user_id=user.id,
            full_name=name,
            department=dept,
            year_of_study=year,
            credit_balance=100,
        )
        db_session.add(profile)
        profiles.append(profile)

    await db_session.flush()

    # 2. Create Skills across multiple categories
    skills_data = [
        ("Machine Learning", "AI/ML"),
        ("FastAPI", "Web Development"),
        ("AWS Cloud Architecture", "Cloud"),
        ("Data Visualization", "Data Science"),
        ("Quantum Computing", "Research"),
    ]
    skills = []
    for name, cat in skills_data:
        sk = Skill(
            id=str(uuid.uuid4()),
            name=name,
            category=cat,
            description=f"Skill entry for {name}",
        )
        db_session.add(sk)
        skills.append(sk)

    await db_session.flush()

    # 3. Create StudentSkills & LearningGoals to create specific shortages and supply
    # Skill 0: "Machine Learning" -> 3 learners, 1 teacher (Critical Shortage: gap = 2)
    # Teachers:
    db_session.add(StudentSkill(student_id=profiles[1].id, skill_id=skills[0].id, direction=SkillDirection.TEACH, proficiency_level=ProficiencyLevel.ADVANCED))
    # Learners:
    db_session.add(StudentSkill(student_id=profiles[0].id, skill_id=skills[0].id, direction=SkillDirection.LEARN, proficiency_level=ProficiencyLevel.BEGINNER))
    db_session.add(StudentSkill(student_id=profiles[2].id, skill_id=skills[0].id, direction=SkillDirection.LEARN, proficiency_level=ProficiencyLevel.BEGINNER))
    db_session.add(LearningGoal(student_id=profiles[3].id, skill_id=skills[0].id, target_proficiency=ProficiencyLevel.INTERMEDIATE, status=GoalStatus.IN_PROGRESS))

    # Skill 1: "FastAPI" -> 2 learners, 0 teachers (Critical Shortage: gap = 2)
    db_session.add(StudentSkill(student_id=profiles[0].id, skill_id=skills[1].id, direction=SkillDirection.LEARN, proficiency_level=ProficiencyLevel.BEGINNER))
    db_session.add(LearningGoal(student_id=profiles[2].id, skill_id=skills[1].id, target_proficiency=ProficiencyLevel.INTERMEDIATE, status=GoalStatus.NOT_STARTED))

    # Skill 2: "AWS Cloud Architecture" -> 2 teachers, 1 learner (Balanced / High supply)
    db_session.add(StudentSkill(student_id=profiles[0].id, skill_id=skills[2].id, direction=SkillDirection.TEACH, proficiency_level=ProficiencyLevel.INTERMEDIATE))
    db_session.add(StudentSkill(student_id=profiles[1].id, skill_id=skills[2].id, direction=SkillDirection.TEACH, proficiency_level=ProficiencyLevel.ADVANCED))
    db_session.add(StudentSkill(student_id=profiles[3].id, skill_id=skills[2].id, direction=SkillDirection.LEARN, proficiency_level=ProficiencyLevel.BEGINNER))

    # Skill 3: "Data Visualization" -> 1 teacher, 1 learner (Equilibrium)
    db_session.add(StudentSkill(student_id=profiles[1].id, skill_id=skills[3].id, direction=SkillDirection.TEACH, proficiency_level=ProficiencyLevel.ADVANCED))
    db_session.add(StudentSkill(student_id=profiles[2].id, skill_id=skills[3].id, direction=SkillDirection.LEARN, proficiency_level=ProficiencyLevel.BEGINNER))

    # Skill 4: "Quantum Computing" -> 1 learner (Freshman), 0 teachers (Emerging)
    db_session.add(StudentSkill(student_id=profiles[3].id, skill_id=skills[4].id, direction=SkillDirection.LEARN, proficiency_level=ProficiencyLevel.BEGINNER))

    await db_session.commit()
    return {"profiles": profiles, "skills": skills}


@pytest.mark.asyncio
async def test_campus_intelligence_anonymization_guarantee(client: AsyncClient, seed_test_campus):
    """
    STRICT PRIVACY TEST: Verify that campus intelligence endpoints NEVER expose
    private student information (names, emails, student IDs, bios, phone numbers, or avatars).
    """
    res = await client.get("/api/v1/campus-insights")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    data = res.json()

    raw_text = str(data)

    # Prohibited student identifiers / PII terms
    prohibited_keys = [
        "student_id",
        "full_name",
        "email",
        "avatar_url",
        "github_url",
        "linkedin_url",
        "bio",
        "raw_project_experience",
        "Alice Chen",
        "Bob Smith",
        "carlos.campus@uni.edu",
    ]
    for key in prohibited_keys:
        assert key not in raw_text, f"Privacy violation: Found forbidden PII '{key}' in campus intelligence response"

    # Overview check
    overview = data["overview"]
    assert "total_students" in overview
    assert overview["total_students"] == 4
    assert overview["total_skills"] == 5


@pytest.mark.asyncio
async def test_campus_overview_metrics(client: AsyncClient, seed_test_campus):
    """Test campus overview volume and capacity metrics."""
    res = await client.get("/api/v1/campus-insights/overview")
    assert res.status_code == 200
    overview = res.json()

    assert overview["total_students"] == 4
    assert overview["total_skills"] == 5
    assert overview["total_teaching_capacity"] >= 4
    assert overview["total_learning_demand"] >= 5
    assert overview["average_demand_index"] > 0.0
    assert overview["critical_shortages_count"] >= 1
    assert "emerging_skills_count" in overview


@pytest.mark.asyncio
async def test_skill_demand_supply_and_gap_score(client: AsyncClient, seed_test_campus):
    """
    Verify mathematical formulation of Demand Index, Supply Index,
    and Skill Gap Score across skills.
    """
    res = await client.get("/api/v1/campus-insights/demand-supply?limit=20")
    assert res.status_code == 200
    skills = res.json()
    assert len(skills) == 5

    ml_skill = next((s for s in skills if s["skill_name"] == "Machine Learning"), None)
    assert ml_skill is not None
    assert ml_skill["learners_count"] == 3
    assert ml_skill["teachers_count"] == 1
    assert ml_skill["demand_index"] == 3.0
    assert ml_skill["skill_gap_score"] == 2
    assert ml_skill["status"] in ["HIGH_DEMAND", "CRITICAL_SHORTAGE"]

    for s in skills:
        learners = s["learners_count"]
        teachers = s["teachers_count"]
        gap_score = s["skill_gap_score"]
        expected_gap = max(0, learners - teachers)
        assert gap_score == expected_gap
        assert s["status"] in ["CRITICAL_SHORTAGE", "HIGH_DEMAND", "BALANCED", "OVERSUPPLIED"]


@pytest.mark.asyncio
async def test_narrative_callout_format(client: AsyncClient, seed_test_campus):
    """
    Test human-readable narrative callouts matching the prompt requirement:
    '37 students want to learn Machine Learning but only 8 students are available to teach it.'
    """
    res = await client.get("/api/v1/campus-insights/shortages?limit=10")
    assert res.status_code == 200
    shortages = res.json()
    assert len(shortages) > 0

    found_narrative = False
    for s in shortages:
        callout = s["callout_text"]
        if s["learners_count"] > s["teachers_count"]:
            expected_snippet = f"{s['learners_count']} students want to learn {s['skill_name']} but only {s['teachers_count']} students are available to teach it."
            assert callout == expected_snippet, f"Callout mismatch: expected '{expected_snippet}', got '{callout}'"
            found_narrative = True

    assert found_narrative, "Did not find expected shortage callout text in shortages endpoint"


@pytest.mark.asyncio
async def test_campus_filter_dimensions(client: AsyncClient, seed_test_campus):
    """Test multi-dimensional filtering by category, department, and time period."""
    # 1. Fetch available filter options
    filters_res = await client.get("/api/v1/campus-insights/filters")
    assert filters_res.status_code == 200
    filters = filters_res.json()
    assert "AI/ML" in filters["categories"]
    assert "Computer Science" in filters["departments"]
    assert "Junior" in filters["years_of_study"]
    assert len(filters["time_periods"]) == 4

    # 2. Filter demand-supply by category
    filtered_res = await client.get("/api/v1/campus-insights/demand-supply?category=AI/ML")
    assert filtered_res.status_code == 200
    filtered_skills = filtered_res.json()
    assert len(filtered_skills) == 1
    assert filtered_skills[0]["skill_name"] == "Machine Learning"

    # 3. Filter overview by department
    dept_res = await client.get("/api/v1/campus-insights/overview?department=Computer Science")
    assert dept_res.status_code == 200
    dept_overview = dept_res.json()
    assert dept_overview["total_students"] == 2  # Alice and Diana


@pytest.mark.asyncio
async def test_category_distribution_and_skill_network(client: AsyncClient, seed_test_campus):
    """Test category distribution analytics and cross-department skill network graph."""
    # Test categories endpoint
    cat_res = await client.get("/api/v1/campus-insights/categories")
    assert cat_res.status_code == 200
    categories = cat_res.json()
    assert len(categories) >= 3
    cat_names = [c["category"] for c in categories]
    assert "AI/ML" in cat_names
    assert "Web Development" in cat_names

    # Test network endpoint
    net_res = await client.get("/api/v1/campus-insights/network?limit=25")
    assert net_res.status_code == 200
    network = net_res.json()
    assert "nodes" in network
    assert "edges" in network
    assert len(network["nodes"]) > 0


@pytest.mark.asyncio
async def test_narrative_role_insights(client: AsyncClient, seed_test_campus):
    """Test narrative insights tailored for Students, Faculty, and Administrators."""
    res = await client.get("/api/v1/campus-insights/narrative-insights")
    assert res.status_code == 200
    insights = res.json()
    assert len(insights) >= 2

    audiences = set(i["target_audience"] for i in insights)
    assert any(a in ["STUDENT", "FACULTY", "ADMINISTRATOR", "ALL"] for a in audiences)

    for item in insights:
        assert "headline" in item
        assert "description" in item
        assert "action_recommendation" in item
        assert item["type"] in ["SHORTAGE_ALERT", "EMERGING_TREND", "CAPACITY_WARNING", "TEACHING_OPPORTUNITY"]
