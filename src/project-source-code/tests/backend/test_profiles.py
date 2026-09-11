"""
Tests for Student Profile Endpoints
"""

import pytest


@pytest.mark.asyncio
async def test_list_and_filter_profiles(client):
    """List profiles and filter by department or search term."""
    # Register two students
    await client.post("/api/v1/auth/register", json={
        "email": "alice.cs@university.edu",
        "password": "Password123!",
        "full_name": "Alice Johnson",
        "department": "Computer Science",
        "year_of_study": "Junior",
        "bio": "Specializing in distributed databases",
    })
    await client.post("/api/v1/auth/register", json={
        "email": "bob.bio@university.edu",
        "password": "Password123!",
        "full_name": "Bob Smith",
        "department": "Biology",
        "year_of_study": "Sophomore",
        "bio": "Bioinformatics and genetics",
    })

    # List all
    all_res = await client.get("/api/v1/profiles")
    assert all_res.status_code == 200
    assert len(all_res.json()) >= 2

    # Filter by department
    cs_res = await client.get("/api/v1/profiles?department=Computer Science")
    assert cs_res.status_code == 200
    assert all(p["department"] == "Computer Science" for p in cs_res.json())

    # Search by keyword
    search_res = await client.get("/api/v1/profiles?search=Alice")
    assert search_res.status_code == 200
    assert any(p["full_name"] == "Alice Johnson" for p in search_res.json())


@pytest.mark.asyncio
async def test_get_and_update_profile(client):
    """Retrieve profile by ID and update fields."""
    reg = await client.post("/api/v1/auth/register", json={
        "email": "charlie.profile@university.edu",
        "password": "Password123!",
        "full_name": "Charlie Profile",
        "department": "Economics",
        "year_of_study": "Freshman",
    })
    profile_id = reg.json()["profile_id"]

    # Get profile
    get_res = await client.get(f"/api/v1/profiles/{profile_id}")
    assert get_res.status_code == 200
    assert get_res.json()["full_name"] == "Charlie Profile"
    assert get_res.json()["credit_balance"] == 100

    # Update profile
    up_res = await client.put(f"/api/v1/profiles/{profile_id}", json={
        "year_of_study": "Sophomore",
        "bio": "Updated economics and quantitative finance bio.",
        "github_url": "https://github.com/charlie-econ",
        "raw_project_experience": "I built a plant disease classifier using Python, CNN and Flask and deployed the model as a web application.",
        "interests": "Machine Learning, Agriculture Tech, Quant Finance",
        "project_interests": "Sustainable AI, Autonomous Drones, Microfinance Analytics",
    })
    assert up_res.status_code == 200
    assert up_res.json()["year_of_study"] == "Sophomore"
    assert up_res.json()["bio"] == "Updated economics and quantitative finance bio."
    assert up_res.json()["github_url"] == "https://github.com/charlie-econ"
    assert "plant disease classifier" in up_res.json()["raw_project_experience"]
    assert "Agriculture Tech" in up_res.json()["interests"]
    assert "Autonomous Drones" in up_res.json()["project_interests"]

