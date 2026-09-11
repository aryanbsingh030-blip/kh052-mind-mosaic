"""
Tests for Skill Matching and Credit Economy Endpoints
"""

import pytest


@pytest.mark.asyncio
async def test_match_generation_and_status(client):
    """Students with complementary skills are automatically matched."""
    # 1. Register teacher
    t_reg = await client.post("/api/v1/auth/register", json={
        "email": "teacher@university.edu",
        "password": "Password123!",
        "full_name": "Teacher Tim",
        "department": "CS",
        "year_of_study": "Senior",
    })
    teacher_id = t_reg.json()["profile_id"]

    # Register learner
    l_reg = await client.post("/api/v1/auth/register", json={
        "email": "learner2@university.edu",
        "password": "Password123!",
        "full_name": "Learner Lisa",
        "department": "Data Science",
        "year_of_study": "Freshman",
    })
    learner_id = l_reg.json()["profile_id"]

    # 2. Create skill
    skill_res = await client.post("/api/v1/skills", json={
        "name": "SQL & Relational",
        "category": "Data Science",
        "description": "Database queries and joins",
    })
    skill_id = skill_res.json()["id"]

    # 3. Teacher teaches skill
    await client.post(
        f"/api/v1/skills/student-skills?student_id={teacher_id}",
        json={
            "skill_id": skill_id,
            "direction": "TEACH",
            "proficiency_level": "EXPERT",
            "years_experience": 3.0,
        },
    )

    # 4. Learner wants to learn skill
    await client.post(
        f"/api/v1/skills/student-skills?student_id={learner_id}",
        json={
            "skill_id": skill_id,
            "direction": "LEARN",
            "proficiency_level": "BEGINNER",
        },
    )

    # 5. Generate matches for learner
    gen_res = await client.post(f"/api/v1/matches/generate/{learner_id}")
    assert gen_res.status_code == 200
    matches = gen_res.json()
    assert len(matches) >= 1
    match = matches[0]
    assert match["learner_student_id"] == learner_id
    assert match["teacher_student_id"] == teacher_id
    assert match["match_score"] > 0.7

    # 6. Update match status to ACCEPTED
    up_res = await client.put(f"/api/v1/matches/{match['id']}/status", json={"status": "ACCEPTED"})
    assert up_res.status_code == 200
    assert up_res.json()["status"] == "ACCEPTED"


@pytest.mark.asyncio
async def test_credit_transfer_and_balance(client):
    """Credit transfer updates sender and recipient balances and logs transaction."""
    # Register 2 students (both start with 100 credits)
    s1_res = await client.post("/api/v1/auth/register", json={
        "email": "sender@university.edu",
        "password": "Password123!",
        "full_name": "Credit Sender",
        "department": "Business",
        "year_of_study": "Junior",
    })
    s1_id = s1_res.json()["profile_id"]

    s2_res = await client.post("/api/v1/auth/register", json={
        "email": "recipient@university.edu",
        "password": "Password123!",
        "full_name": "Credit Recipient",
        "department": "Art",
        "year_of_study": "Sophomore",
    })
    s2_id = s2_res.json()["profile_id"]

    # Transfer 25 credits
    tx_res = await client.post(
        f"/api/v1/credits/transfer?from_student_id={s1_id}",
        json={
            "to_student_id": s2_id,
            "amount": 25,
            "description": "Tutoring peer review fee",
        },
    )
    assert tx_res.status_code == 201
    assert tx_res.json()["amount"] == 25

    # Check sender balance (100 - 25 = 75)
    s1_bal = await client.get(f"/api/v1/credits/balance/{s1_id}")
    assert s1_bal.status_code == 200
    assert s1_bal.json()["credit_balance"] == 75
    assert s1_bal.json()["total_spent"] == 25

    # Check recipient balance (100 + 25 = 125)
    s2_bal = await client.get(f"/api/v1/credits/balance/{s2_id}")
    assert s2_bal.status_code == 200
    assert s2_bal.json()["credit_balance"] == 125
    assert s2_bal.json()["total_earned"] == 25

    # Check insufficient balance rejection
    fail_res = await client.post(
        f"/api/v1/credits/transfer?from_student_id={s1_id}",
        json={
            "to_student_id": s2_id,
            "amount": 500,  # exceeds balance
        },
    )
    assert fail_res.status_code == 400


@pytest.mark.asyncio
async def test_teaching_session_lifecycle_and_credit_award(client):
    """Scheduling and completing a teaching session transfers credits to the teacher."""
    # Teacher & Learner
    t_res = await client.post("/api/v1/auth/register", json={
        "email": "sess.teacher@university.edu",
        "password": "Password123!",
        "full_name": "Session Teacher",
        "department": "CS",
        "year_of_study": "Senior",
    })
    teacher_id = t_res.json()["profile_id"]

    l_res = await client.post("/api/v1/auth/register", json={
        "email": "sess.learner@university.edu",
        "password": "Password123!",
        "full_name": "Session Learner",
        "department": "CS",
        "year_of_study": "Freshman",
    })
    learner_id = l_res.json()["profile_id"]

    skill_res = await client.post("/api/v1/skills", json={
        "name": "Async Python",
        "category": "Programming",
    })
    skill_id = skill_res.json()["id"]

    # Schedule session with 20 credit bounty
    sess_res = await client.post(
        f"/api/v1/sessions?teacher_id={teacher_id}",
        json={
            "learner_student_id": learner_id,
            "skill_id": skill_id,
            "scheduled_at": "2026-09-15T14:00:00Z",
            "duration_minutes": 60,
            "credit_amount": 20,
            "meeting_link": "https://meet.university.edu/test",
            "notes": "Introductory async concepts",
        },
    )
    assert sess_res.status_code == 201
    sess_id = sess_res.json()["id"]
    assert sess_res.json()["status"] == "SCHEDULED"

    # Mark session COMPLETED -> triggers automated credit transfer
    comp_res = await client.put(
        f"/api/v1/sessions/{sess_id}/status",
        json={"status": "COMPLETED"},
    )
    assert comp_res.status_code == 200
    assert comp_res.json()["status"] == "COMPLETED"

    # Verify teacher gained 20 credits (100 + 20 = 120)
    t_bal = await client.get(f"/api/v1/credits/balance/{teacher_id}")
    assert t_bal.json()["credit_balance"] == 120

    # Verify learner spent 20 credits (100 - 20 = 80)
    l_bal = await client.get(f"/api/v1/credits/balance/{learner_id}")
    assert l_bal.json()["credit_balance"] == 80

    # Learner submits reflection review
    log_res = await client.post(
        f"/api/v1/sessions/{sess_id}/learning-log",
        json={
            "rating": 5,
            "feedback": "Outstanding lesson!",
            "learned_summary": "Understood tasks and gathering futures.",
        },
    )
    assert log_res.status_code == 201
    assert log_res.json()["rating"] == 5
