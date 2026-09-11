"""
Tests for Learning Goals Endpoints
"""

import pytest


@pytest.mark.asyncio
async def test_learning_goal_crud(client):
    """Create, list, update, and delete learning goals."""
    # Register student
    reg = await client.post("/api/v1/auth/register", json={
        "email": "learner@university.edu",
        "password": "Password123!",
        "full_name": "Active Learner",
        "department": "Robotics",
        "year_of_study": "Sophomore",
    })
    student_id = reg.json()["profile_id"]

    # Create skill
    skill_res = await client.post("/api/v1/skills", json={
        "name": "Reinforcement Learning",
        "category": "AI/ML",
        "description": "Agent training via rewards",
    })
    skill_id = skill_res.json()["id"]

    # Create goal
    goal_res = await client.post(
        f"/api/v1/learning-goals?student_id={student_id}",
        json={
            "skill_id": skill_id,
            "target_proficiency": "ADVANCED",
            "description": "Master Q-learning and PPO before finals.",
        },
    )
    assert goal_res.status_code == 201
    goal_id = goal_res.json()["id"]
    assert goal_res.json()["target_proficiency"] == "ADVANCED"
    assert goal_res.json()["status"] == "NOT_STARTED"

    # List goals
    list_res = await client.get(f"/api/v1/learning-goals/student/{student_id}")
    assert list_res.status_code == 200
    assert len(list_res.json()) == 1

    # Update goal
    up_res = await client.put(
        f"/api/v1/learning-goals/{goal_id}",
        json={
            "status": "ACHIEVED",
            "description": "Mastered PPO algorithm and submitted course project.",
        },
    )
    assert up_res.status_code == 200
    assert up_res.json()["status"] == "ACHIEVED"

    # Delete goal
    del_res = await client.delete(f"/api/v1/learning-goals/{goal_id}")
    assert del_res.status_code == 204
