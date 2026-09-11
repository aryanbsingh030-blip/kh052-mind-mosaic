"""
Tests for Skills & StudentSkills Endpoints
"""

import pytest


@pytest.mark.asyncio
async def test_create_and_get_skill(client):
    """Create a canonical skill and fetch it."""
    payload = {
        "name": "Rust Programming",
        "category": "Programming",
        "description": "Systems language prioritizing memory safety.",
        "aliases": "rust, rustlang",
    }
    res = await client.post("/api/v1/skills", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["name"] == "Rust Programming"
    assert data["category"] == "Programming"

    skill_id = data["id"]
    get_res = await client.get(f"/api/v1/skills/{skill_id}")
    assert get_res.status_code == 200
    assert get_res.json()["name"] == "Rust Programming"


@pytest.mark.asyncio
async def test_skill_hierarchy(client):
    """Sub-skill links to parent skill correctly."""
    # Parent
    parent_res = await client.post("/api/v1/skills", json={
        "name": "Machine Learning",
        "category": "AI/ML",
        "description": "Statistical learning models.",
    })
    parent_id = parent_res.json()["id"]

    # Child
    child_res = await client.post("/api/v1/skills", json={
        "name": "Deep Learning",
        "category": "AI/ML",
        "description": "Neural networks.",
        "parent_skill_id": parent_id,
    })
    assert child_res.status_code == 201
    assert child_res.json()["parent_skill_id"] == parent_id

    # Check parent shows child
    get_parent = await client.get(f"/api/v1/skills/{parent_id}")
    sub_skills = get_parent.json()["sub_skills"]
    assert any(s["name"] == "Deep Learning" for s in sub_skills)


@pytest.mark.asyncio
async def test_student_skill_lifecycle(client):
    """Student can declare, list, update, and remove a skill."""
    # 1. Create student
    reg_res = await client.post("/api/v1/auth/register", json={
        "email": "skill.dev@university.edu",
        "password": "Password123!",
        "full_name": "Skill Dev",
        "department": "CS",
        "year_of_study": "Junior",
    })
    profile_id = reg_res.json()["profile_id"]

    # 2. Create skill
    skill_res = await client.post("/api/v1/skills", json={
        "name": "FastAPI Async",
        "category": "Web Development",
        "description": "Python async framework",
    })
    skill_id = skill_res.json()["id"]

    # 3. Add student skill
    add_res = await client.post(
        f"/api/v1/skills/student-skills?student_id={profile_id}",
        json={
            "skill_id": skill_id,
            "direction": "TEACH",
            "proficiency_level": "ADVANCED",
            "years_experience": 2.5,
            "description": "Built 5 async backend APIs.",
        },
    )
    assert add_res.status_code == 201
    ss_id = add_res.json()["id"]
    assert add_res.json()["direction"] == "TEACH"
    assert add_res.json()["proficiency_level"] == "ADVANCED"

    # 4. List student skills
    list_res = await client.get(f"/api/v1/skills/student-skills/{profile_id}")
    assert list_res.status_code == 200
    assert len(list_res.json()) == 1

    # 5. Update student skill
    update_res = await client.put(
        f"/api/v1/skills/student-skills/{ss_id}",
        json={
            "proficiency_level": "EXPERT",
            "years_experience": 3.5,
        },
    )
    assert update_res.status_code == 200
    assert update_res.json()["proficiency_level"] == "EXPERT"
    assert update_res.json()["years_experience"] == 3.5

    # 6. Delete student skill
    del_res = await client.delete(f"/api/v1/skills/student-skills/{ss_id}")
    assert del_res.status_code == 204

    # Verify deleted
    empty_list = await client.get(f"/api/v1/skills/student-skills/{profile_id}")
    assert len(empty_list.json()) == 0
