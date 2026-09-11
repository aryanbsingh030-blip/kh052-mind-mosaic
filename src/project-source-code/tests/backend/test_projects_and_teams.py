"""
Tests for Projects, Requirements, and Teams Endpoints
"""

import pytest


@pytest.mark.asyncio
async def test_project_and_team_lifecycle(client):
    """Create project with skill requirements, form team, and assign members."""
    # 1. Register owner student
    reg1 = await client.post("/api/v1/auth/register", json={
        "email": "lead@university.edu",
        "password": "Password123!",
        "full_name": "Project Lead",
        "department": "CS",
        "year_of_study": "Senior",
    })
    owner_id = reg1.json()["profile_id"]

    # Register member student
    reg2 = await client.post("/api/v1/auth/register", json={
        "email": "dev@university.edu",
        "password": "Password123!",
        "full_name": "Team Developer",
        "department": "CS",
        "year_of_study": "Junior",
    })
    member_id = reg2.json()["profile_id"]

    # 2. Create skill
    skill_res = await client.post("/api/v1/skills", json={
        "name": "Docker",
        "category": "DevOps",
        "description": "Container virtualization",
    })
    skill_id = skill_res.json()["id"]

    # 3. Create project with requirement
    proj_res = await client.post(
        f"/api/v1/projects?owner_id={owner_id}",
        json={
            "title": "Smart Campus IoT",
            "description": "Campus-wide distributed IoT node monitoring network.",
            "category": "IoT & Hardware",
            "max_members": 4,
            "requirements": [
                {
                    "skill_id": skill_id,
                    "required_proficiency": "INTERMEDIATE",
                    "importance": "MANDATORY",
                    "description": "Containerize data ingest pipeline.",
                }
            ],
        },
    )
    assert proj_res.status_code == 201
    proj_data = proj_res.json()
    proj_id = proj_data["id"]
    assert proj_data["title"] == "Smart Campus IoT"
    assert len(proj_data["skill_requirements"]) == 1

    # 4. Form team
    team_res = await client.post("/api/v1/teams", json={
        "project_id": proj_id,
        "name": "Core Ingestion Squad",
        "description": "Backend streaming team",
    })
    assert team_res.status_code == 201
    team_id = team_res.json()["id"]
    assert team_res.json()["name"] == "Core Ingestion Squad"

    # 5. Add member to team
    mem_res = await client.post(f"/api/v1/teams/{team_id}/members", json={
        "student_id": member_id,
        "role": "DEVELOPER",
    })
    assert mem_res.status_code == 201
    assert mem_res.json()["role"] == "DEVELOPER"
    assert mem_res.json()["student_name"] == "Team Developer"

    # 6. Verify project query now includes team and member
    get_proj = await client.get(f"/api/v1/projects/{proj_id}")
    assert get_proj.status_code == 200
    assert len(get_proj.json()["teams"]) == 1
    assert len(get_proj.json()["teams"][0]["members"]) == 1
