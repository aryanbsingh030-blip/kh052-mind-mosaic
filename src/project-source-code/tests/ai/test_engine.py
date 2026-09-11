"""
Tests for the AI Skill Intelligence Engine.
"""

import sys
from pathlib import Path

# Ensure project root is in sys.path (two directories up from tests/ai)
project_root = str(Path(__file__).resolve().parents[2])
if project_root not in sys.path:
    sys.path.insert(0, project_root)

import pytest

from ai.engine import SkillIntelligenceEngine
from ai.providers.mock import MockLLMProvider, MockEmbeddingProvider
from ai.skill_graph import SkillGraph


@pytest.mark.asyncio
async def test_extract_skills_python():
    """Should extract Python from a skill description."""
    engine = SkillIntelligenceEngine()
    skills = await engine.extract_skills(
        "I have been programming in Python for 3 years and I'm quite proficient."
    )

    assert len(skills) >= 1
    skill_names = [s["name"].lower() for s in skills]
    assert "python" in skill_names


@pytest.mark.asyncio
async def test_extract_multiple_skills():
    """Should extract multiple skills from text."""
    engine = SkillIntelligenceEngine()
    skills = await engine.extract_skills(
        "I know Python and JavaScript well, and I'm learning React and machine learning."
    )

    assert len(skills) >= 3
    skill_names = [s["name"].lower() for s in skills]
    assert "python" in skill_names
    assert "javascript" in skill_names


@pytest.mark.asyncio
async def test_extract_skills_with_proficiency():
    """Should detect proficiency levels from context."""
    engine = SkillIntelligenceEngine()

    # Expert level
    skills = await engine.extract_skills(
        "I am an expert Python developer with extensive experience."
    )
    python_skill = [s for s in skills if s["name"].lower() == "python"]
    assert len(python_skill) == 1
    assert python_skill[0]["proficiency_level"] == 5

    # Beginner level
    skills = await engine.extract_skills(
        "I am a beginner learning JavaScript basics."
    )
    js_skill = [s for s in skills if s["name"].lower() == "javascript"]
    assert len(js_skill) == 1
    assert js_skill[0]["proficiency_level"] == 1


@pytest.mark.asyncio
async def test_match_complementary_skills():
    """Should match users with complementary teach/learn skills."""
    engine = SkillIntelligenceEngine()

    matches = await engine.match_skills(
        user_skills=[
            {"skill_name": "Python", "direction": "learn", "proficiency_level": 1},
        ],
        candidate_skills=[
            {
                "user_id": "u1",
                "user_name": "Teacher Alice",
                "skill_name": "Python",
                "direction": "teach",
                "proficiency_level": 5,
            },
            {
                "user_id": "u2",
                "user_name": "Learner Bob",
                "skill_name": "Python",
                "direction": "learn",
                "proficiency_level": 2,
            },
        ],
    )

    # Should match with Alice (teacher) but not Bob (also learning)
    assert len(matches) >= 1
    assert matches[0]["user_name"] == "Teacher Alice"


@pytest.mark.asyncio
async def test_embedding_similarity():
    """Should compute reasonable similarity scores."""
    engine = SkillIntelligenceEngine()

    # Similar texts should have high similarity
    high = await engine.compute_similarity(
        "Python programming language",
        "Python coding language",
    )

    # Different texts should have low similarity
    low = await engine.compute_similarity(
        "Python programming",
        "Watercolor painting art",
    )

    assert high > low


def test_skill_graph():
    """Should manage skill relationships."""
    graph = SkillGraph()

    if not graph.available:
        pytest.skip("NetworkX not available")

    graph.add_skill("Python", category="Programming")
    graph.add_skill("Django", category="Web")
    graph.add_relationship("Python", "Django", "prerequisite_of")

    related = graph.get_related_skills("Python")
    assert len(related) == 1
    assert related[0]["skill"] == "Django"

    stats = graph.get_stats()
    assert stats["total_skills"] == 2
    assert stats["total_relationships"] == 1
