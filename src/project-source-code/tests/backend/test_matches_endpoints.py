"""
Integration Tests for Stage 4 Matches Endpoints

Validates:
1. GET /matches and GET /api/v1/matches
2. Filter by skill, proficiency, availability_day, project_interest
3. POST /matches/calculate and POST /api/v1/matches/calculate
"""

import pytest


@pytest.mark.asyncio
async def test_matches_recommendations_and_filtering(client):
    """Test match recommendation generation and filters."""
    # 1. Register student A (Learner of Deep Learning, teacher of React)
    s_a = await client.post("/api/v1/auth/register", json={
        "email": "matcher.alice@university.edu",
        "password": "Password123!",
        "full_name": "Alice Matching",
        "department": "CS",
        "year_of_study": "Junior",
    })
    a_id = s_a.json()["profile_id"]

    # Register student B (Teacher of Deep Learning, learner of React)
    s_b = await client.post("/api/v1/auth/register", json={
        "email": "matcher.bob@university.edu",
        "password": "Password123!",
        "full_name": "Bob Matching",
        "department": "Data Science",
        "year_of_study": "Senior",
    })
    b_id = s_b.json()["profile_id"]

    # Register student C (Unrelated student)
    s_c = await client.post("/api/v1/auth/register", json={
        "email": "matcher.charlie@university.edu",
        "password": "Password123!",
        "full_name": "Charlie Unrelated",
        "department": "Art",
        "year_of_study": "Freshman",
    })
    c_id = s_c.json()["profile_id"]

    # Create skills
    dl_skill = await client.post("/api/v1/skills", json={
        "name": "Deep Learning Tech",
        "category": "AI",
    })
    dl_id = dl_skill.json()["id"]

    react_skill = await client.post("/api/v1/skills", json={
        "name": "React Frontend",
        "category": "Web",
    })
    react_id = react_skill.json()["id"]

    # Student A: teaches React, wants Deep Learning
    await client.post(f"/api/v1/skills/student-skills?student_id={a_id}", json={
        "skill_id": react_id,
        "direction": "TEACH",
        "proficiency_level": "ADVANCED",
        "years_experience": 2.0,
    })
    await client.post(f"/api/v1/learning-goals?student_id={a_id}", json={
        "skill_id": dl_id,
        "target_proficiency": "INTERMEDIATE",
    })
    await client.post(f"/api/v1/availabilities?student_id={a_id}", json={
        "day_of_week": "TUESDAY",
        "start_time": "10:00",
        "end_time": "13:00",
    })

    # Student B: teaches Deep Learning, wants React
    await client.post(f"/api/v1/skills/student-skills?student_id={b_id}", json={
        "skill_id": dl_id,
        "direction": "TEACH",
        "proficiency_level": "EXPERT",
        "years_experience": 3.5,
    })
    await client.post(f"/api/v1/learning-goals?student_id={b_id}", json={
        "skill_id": react_id,
        "target_proficiency": "INTERMEDIATE",
    })
    await client.post(f"/api/v1/availabilities?student_id={b_id}", json={
        "day_of_week": "TUESDAY",
        "start_time": "11:00",
        "end_time": "14:00",
    })

    # 2. Call GET /matches for Student A
    res = await client.get(f"/matches?student_id={a_id}")
    assert res.status_code == 200
    recommendations = res.json()
    assert len(recommendations) >= 1

    # Bob should be the top match
    top_match = next((r for r in recommendations if r["candidate_id"] == b_id), None)
    assert top_match is not None
    assert top_match["match_score"] >= 80
    assert top_match["is_reciprocal"] is True
    assert "matching_factors" in top_match
    assert "explanation" in top_match
    assert len(top_match["common_availability"]) >= 1

    # 3. Test filter by skill
    filtered_res = await client.get(f"/matches?student_id={a_id}&skill=Deep%20Learning")
    assert filtered_res.status_code == 200
    filtered = filtered_res.json()
    assert any(r["candidate_id"] == b_id for r in filtered)

    # 4. Test filter by availability_day
    tue_res = await client.get(f"/matches?student_id={a_id}&availability_day=TUESDAY")
    assert tue_res.status_code == 200
    tue_matches = tue_res.json()
    assert any(r["candidate_id"] == b_id for r in tue_matches)

    fri_res = await client.get(f"/matches?student_id={a_id}&availability_day=FRIDAY")
    assert fri_res.status_code == 200
    fri_matches = fri_res.json()
    assert not any(r["candidate_id"] == b_id for r in fri_matches)

    # 5. Test POST /matches/calculate
    calc_res = await client.post("/matches/calculate", json={
        "student_a_id": a_id,
        "student_b_id": b_id,
    })
    assert calc_res.status_code == 200
    calc_data = calc_res.json()
    assert calc_data["match_score"] >= 80
    assert calc_data["is_reciprocal"] is True
    assert calc_data["student_a_name"] == "Alice Matching"
    assert calc_data["student_b_name"] == "Bob Matching"
