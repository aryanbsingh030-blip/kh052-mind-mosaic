"""
Tests for Intelligent Skill Matching Engine

Validates:
1. Reciprocal matches (bi-directional complementary learning)
2. One-way matches (mentorship / credit-funded learning)
3. Poor matches (unrelated skills and interests)
4. Missing skills (no overlapping skills or empty goals)
5. Conflicting availability (schedule disjointness)
"""

import pytest
from ai.matcher import IntelligentSkillMatcher


@pytest.fixture
def matcher():
    return IntelligentSkillMatcher()


@pytest.mark.asyncio
async def test_reciprocal_match(matcher):
    """
    Reciprocal match:
    Student A wants Deep Learning, teaches React
    Student B wants React, teaches Deep Learning
    Both share availability on Tuesdays.
    """
    student_a = {
        "id": "student-a",
        "full_name": "Alice Chen",
        "department": "Computer Science",
        "year_of_study": "Junior",
        "bio": "Passionate full-stack developer focusing on web technologies and AI applications.",
        "raw_project_experience": "Built complex React and Next.js applications.",
        "interests": "Web Development, Artificial Intelligence",
        "project_interests": "AI Assistant, Web Tools",
        "skills": [
            {
                "skill_name": "React",
                "direction": "TEACH",
                "proficiency_level": "ADVANCED",
                "years_experience": 3.0,
                "can_teach": True,
            }
        ],
        "learning_goals": [
            {
                "skill_name": "Deep Learning",
                "target_proficiency": "INTERMEDIATE",
            }
        ],
        "availabilities": [
            {"day_of_week": "TUESDAY", "start_time": "14:00", "end_time": "17:00"}
        ],
    }

    student_b = {
        "id": "student-b",
        "full_name": "Bob Miller",
        "department": "Data Science",
        "year_of_study": "Senior",
        "bio": "Machine learning researcher specializing in neural networks and computer vision.",
        "raw_project_experience": "Trained CNN and transformer models with PyTorch.",
        "interests": "Deep Learning, Computer Vision, Web Development",
        "project_interests": "AI Web Platform",
        "skills": [
            {
                "skill_name": "Deep Learning",
                "direction": "TEACH",
                "proficiency_level": "ADVANCED",
                "years_experience": 2.5,
                "can_teach": True,
            }
        ],
        "learning_goals": [
            {
                "skill_name": "React",
                "target_proficiency": "INTERMEDIATE",
            }
        ],
        "availabilities": [
            {"day_of_week": "TUESDAY", "start_time": "15:00", "end_time": "18:00"}
        ],
    }

    result = await matcher.compute_match(student_a, student_b)

    assert result["is_reciprocal"] is True
    assert result["match_score"] >= 80, f"Expected high reciprocal score, got {result['match_score']}"
    assert result["matching_factors"]["reciprocity"] >= 80.0
    assert result["matching_factors"]["skill_compatibility"] >= 80.0
    assert result["matching_factors"]["availability_compatibility"] > 0

    # Validate explainability checkmarks
    exps = " ".join(result["explanation"])
    assert "reciprocal" in exps.lower()
    assert "React" in exps
    assert "Deep Learning" in exps
    assert len(result["learning_opportunity"]["you_learn"]) > 0
    assert len(result["learning_opportunity"]["they_learn"]) > 0


@pytest.mark.asyncio
async def test_one_way_match(matcher):
    """
    One-way match:
    Student A wants SQL, teaches Python
    Student B teaches SQL, wants Rust (A does not teach Rust)
    """
    student_a = {
        "id": "student-a",
        "full_name": "Charlie Day",
        "department": "Information Systems",
        "year_of_study": "Sophomore",
        "bio": "Building databases and learning query optimization.",
        "interests": "Databases, Data Science",
        "skills": [
            {
                "skill_name": "Python",
                "direction": "TEACH",
                "proficiency_level": "INTERMEDIATE",
                "years_experience": 1.0,
                "can_teach": True,
            }
        ],
        "learning_goals": [
            {
                "skill_name": "SQL & Relational Databases",
                "target_proficiency": "ADVANCED",
            }
        ],
        "availabilities": [
            {"day_of_week": "WEDNESDAY", "start_time": "10:00", "end_time": "13:00"}
        ],
    }

    student_b = {
        "id": "student-b",
        "full_name": "Diana Prince",
        "department": "Computer Science",
        "year_of_study": "Senior",
        "bio": "Database administrator and backend developer.",
        "interests": "Systems Programming, Performance",
        "skills": [
            {
                "skill_name": "SQL & Relational Databases",
                "direction": "TEACH",
                "proficiency_level": "EXPERT",
                "years_experience": 4.0,
                "can_teach": True,
            }
        ],
        "learning_goals": [
            {
                "skill_name": "Rust",
                "target_proficiency": "INTERMEDIATE",
            }
        ],
        "availabilities": [
            {"day_of_week": "WEDNESDAY", "start_time": "11:00", "end_time": "14:00"}
        ],
    }

    result = await matcher.compute_match(student_a, student_b)

    assert result["is_reciprocal"] is False
    # Solid one-way score for teacher expertise and matching skill
    assert 50 <= result["match_score"] <= 78, f"Score should be solid one-way, got {result['match_score']}"
    assert result["matching_factors"]["reciprocity"] < 50.0
    assert result["matching_factors"]["skill_compatibility"] > 50.0
    assert len(result["learning_opportunity"]["you_learn"]) == 1
    assert len(result["learning_opportunity"]["they_learn"]) == 0


@pytest.mark.asyncio
async def test_poor_match(matcher):
    """
    Poor match:
    Completely unrelated skills and domains (e.g. Cooking vs Quantum Physics)
    """
    student_a = {
        "id": "student-a",
        "full_name": "Evan Wright",
        "department": "Culinary Arts",
        "year_of_study": "Freshman",
        "bio": "French pastry baking and kitchen operations.",
        "interests": "Baking, Pastry, French Cuisine",
        "skills": [
            {
                "skill_name": "Pastry Arts",
                "direction": "TEACH",
                "proficiency_level": "ADVANCED",
                "can_teach": True,
            }
        ],
        "learning_goals": [
            {"skill_name": "Wine Pairing", "target_proficiency": "INTERMEDIATE"}
        ],
        "availabilities": [
            {"day_of_week": "FRIDAY", "start_time": "08:00", "end_time": "10:00"}
        ],
    }

    student_b = {
        "id": "student-b",
        "full_name": "Fiona Gallagher",
        "department": "Physics",
        "year_of_study": "PhD",
        "bio": "Quantum entanglement and superconducting qubits.",
        "interests": "Quantum Computing, Condensed Matter",
        "skills": [
            {
                "skill_name": "Quantum Mechanics",
                "direction": "TEACH",
                "proficiency_level": "EXPERT",
                "can_teach": True,
            }
        ],
        "learning_goals": [
            {"skill_name": "Qiskit Simulation", "target_proficiency": "ADVANCED"}
        ],
        "availabilities": [
            {"day_of_week": "MONDAY", "start_time": "14:00", "end_time": "16:00"}
        ],
    }

    result = await matcher.compute_match(student_a, student_b)

    assert result["is_reciprocal"] is False
    assert result["match_score"] <= 35, f"Expected poor match score <= 35, got {result['match_score']}"
    assert result["matching_factors"]["skill_compatibility"] == 0.0
    assert result["matching_factors"]["reciprocity"] == 0.0


@pytest.mark.asyncio
async def test_missing_skills(matcher):
    """
    Missing skills:
    Student has no declared learning goals or teaching skills
    """
    student_a = {
        "id": "student-a",
        "full_name": "Grace Hopper",
        "department": "Undeclared",
        "year_of_study": "Freshman",
        "bio": "New student exploring campus clubs.",
        "skills": [],
        "learning_goals": [],
        "availabilities": [],
    }

    student_b = {
        "id": "student-b",
        "full_name": "Harry Potter",
        "department": "CS",
        "year_of_study": "Senior",
        "bio": "Full-stack developer.",
        "skills": [
            {"skill_name": "Python", "direction": "TEACH", "proficiency_level": "ADVANCED", "can_teach": True}
        ],
        "learning_goals": [
            {"skill_name": "Docker", "target_proficiency": "INTERMEDIATE"}
        ],
        "availabilities": [],
    }

    result = await matcher.compute_match(student_a, student_b)

    assert result["match_score"] <= 30
    assert result["matching_factors"]["skill_compatibility"] == 0.0
    assert result["learning_opportunity"]["you_learn"] == []
    assert result["learning_opportunity"]["they_learn"] == []


@pytest.mark.asyncio
async def test_conflicting_availability(matcher):
    """
    Conflicting availability:
    Strong skill alignment, but completely disjoint schedules.
    """
    student_a = {
        "id": "student-a",
        "full_name": "Iris West",
        "department": "CS",
        "year_of_study": "Junior",
        "skills": [
            {"skill_name": "FastAPI", "direction": "TEACH", "proficiency_level": "ADVANCED", "can_teach": True}
        ],
        "learning_goals": [
            {"skill_name": "TypeScript", "target_proficiency": "INTERMEDIATE"}
        ],
        # Only available Monday mornings
        "availabilities": [
            {"day_of_week": "MONDAY", "start_time": "08:00", "end_time": "10:00"}
        ],
    }

    student_b = {
        "id": "student-b",
        "full_name": "Joe West",
        "department": "CS",
        "year_of_study": "Senior",
        "skills": [
            {"skill_name": "TypeScript", "direction": "TEACH", "proficiency_level": "EXPERT", "can_teach": True}
        ],
        "learning_goals": [
            {"skill_name": "FastAPI", "target_proficiency": "INTERMEDIATE"}
        ],
        # Only available Friday afternoons
        "availabilities": [
            {"day_of_week": "FRIDAY", "start_time": "15:00", "end_time": "18:00"}
        ],
    }

    result = await matcher.compute_match(student_a, student_b)

    assert result["matching_factors"]["availability_compatibility"] == 0.0
    assert result["common_availability"] == []
    exps = " ".join(result["explanation"])
    assert "conflicting availability" in exps.lower()
