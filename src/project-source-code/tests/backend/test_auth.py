"""
Tests for Authentication & Registration Endpoints
"""

import pytest


@pytest.mark.asyncio
async def test_register_student_user(client):
    """Registering a new student creates user, profile, and grants 100 credits."""
    payload = {
        "email": "test.student@university.edu",
        "password": "Password123!",
        "full_name": "Test Student",
        "department": "Computer Science",
        "year_of_study": "Junior",
        "bio": "Passionate about algorithms and web dev.",
    }
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201

    data = response.json()
    assert data["email"] == "test.student@university.edu"
    assert data["full_name"] == "Test Student"
    assert data["role"] == "STUDENT"
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["profile_id"] is not None


@pytest.mark.asyncio
async def test_register_duplicate_email(client):
    """Duplicate email registration should return 409 Conflict."""
    payload = {
        "email": "duplicate@university.edu",
        "password": "Password123!",
        "full_name": "Original Student",
        "department": "Data Science",
        "year_of_study": "Senior",
    }
    res1 = await client.post("/api/v1/auth/register", json=payload)
    assert res1.status_code == 201

    res2 = await client.post("/api/v1/auth/register", json=payload)
    assert res2.status_code == 409


@pytest.mark.asyncio
async def test_login_success(client):
    """User can log in with valid credentials and receive token."""
    reg_payload = {
        "email": "login.test@university.edu",
        "password": "SecretPassword123!",
        "full_name": "Login User",
        "department": "Engineering",
        "year_of_study": "Freshman",
    }
    await client.post("/api/v1/auth/register", json=reg_payload)

    login_res = await client.post("/api/v1/auth/login", json={
        "email": "login.test@university.edu",
        "password": "SecretPassword123!",
    })
    assert login_res.status_code == 200
    data = login_res.json()
    assert "access_token" in data
    assert data["email"] == "login.test@university.edu"


@pytest.mark.asyncio
async def test_login_invalid_password(client):
    """Invalid password returns 401 Unauthorized."""
    reg_payload = {
        "email": "wrongpwd@university.edu",
        "password": "CorrectPassword123!",
        "full_name": "User",
        "department": "Art",
        "year_of_study": "Junior",
    }
    await client.post("/api/v1/auth/register", json=reg_payload)

    login_res = await client.post("/api/v1/auth/login", json={
        "email": "wrongpwd@university.edu",
        "password": "WrongPassword!",
    })
    assert login_res.status_code == 401


@pytest.mark.asyncio
async def test_get_current_user_me(client):
    """Authenticated user can fetch profile details with Bearer token."""
    reg_payload = {
        "email": "me.test@university.edu",
        "password": "Password123!",
        "full_name": "Me Student",
        "department": "Biology",
        "year_of_study": "Senior",
    }
    res = await client.post("/api/v1/auth/register", json=reg_payload)
    token = res.json()["access_token"]

    me_res = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    data = me_res.json()
    assert data["email"] == "me.test@university.edu"
    assert data["full_name"] == "Me Student"
    assert data["credit_balance"] == 100
