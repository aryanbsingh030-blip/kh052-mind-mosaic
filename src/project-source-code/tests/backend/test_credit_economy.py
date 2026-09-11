"""
Unit and Integration Tests for Stage 7: Skill Credit Economy
"""

import pytest
from datetime import datetime, timezone, timedelta
from app.config import get_settings
from app.models.enums import CreditTransactionType, SessionStatus


@pytest.mark.asyncio
async def test_all_transaction_types_and_fields(client):
    """
    Every transaction must have: id, student, amount, type, reason, timestamp, related session.
    Must support: TEACHING_REWARD, LEARNING_COST, BONUS, ADMIN_ADJUSTMENT, REFUND.
    """
    # 1. Register test student
    reg = await client.post("/api/v1/auth/register", json={
        "email": "econ.student@university.edu",
        "password": "Password123!",
        "full_name": "Economy Student",
        "department": "Economics",
        "year_of_study": "Senior",
    })
    assert reg.status_code == 201
    student_id = reg.json()["profile_id"]

    # 2. Test BONUS transaction
    bonus_res = await client.post("/api/v1/credits/bonus", json={
        "student_id": student_id,
        "amount": 50,
        "reason": "Peer onboarding milestone bonus",
    })
    assert bonus_res.status_code == 201
    bonus_tx = bonus_res.json()
    assert bonus_tx["id"] is not None
    assert bonus_tx["student_id"] == student_id
    assert bonus_tx["amount"] == 50
    assert bonus_tx["type"] == CreditTransactionType.BONUS
    assert "Peer onboarding" in bonus_tx["reason"]
    assert bonus_tx["timestamp"] is not None

    # 3. Test ADMIN_ADJUSTMENT transaction (positive adjustment)
    admin_res = await client.post("/api/v1/credits/admin-adjust", json={
        "student_id": student_id,
        "amount": 20,
        "reason": "System incentive audit",
    })
    assert admin_res.status_code == 201
    admin_tx = admin_res.json()
    assert admin_tx["student_id"] == student_id
    assert admin_tx["amount"] == 20
    assert admin_tx["type"] == CreditTransactionType.ADMIN_ADJUSTMENT
    assert "System incentive audit" in admin_tx["reason"]
    assert admin_tx["timestamp"] is not None

    # 4. Check ledger contains both transactions with required fields
    ledger_res = await client.get(f"/api/v1/credits/ledger/{student_id}")
    assert ledger_res.status_code == 200
    ledger = ledger_res.json()
    assert len(ledger) >= 2

    for tx in ledger:
        assert "id" in tx
        assert "student_id" in tx
        assert "student_name" in tx
        assert "amount" in tx
        assert "type" in tx
        assert "reason" in tx
        assert "timestamp" in tx
        assert "session_id" in tx


@pytest.mark.asyncio
async def test_negative_balance_prevention(client):
    """Prevent negative balances unless explicitly configured by the system."""
    # Register student with initial 100 credits
    reg = await client.post("/api/v1/auth/register", json={
        "email": "poor.student@university.edu",
        "password": "Password123!",
        "full_name": "Penny Student",
        "department": "Music",
        "year_of_study": "Freshman",
    })
    student_id = reg.json()["profile_id"]

    recip = await client.post("/api/v1/auth/register", json={
        "email": "rich.student@university.edu",
        "password": "Password123!",
        "full_name": "Rich Student",
        "department": "Law",
        "year_of_study": "Junior",
    })
    recip_id = recip.json()["profile_id"]

    # Student has 100 credits. Attempting to transfer 150 must be blocked!
    fail_res = await client.post(
        f"/api/v1/credits/transfer?from_student_id={student_id}",
        json={
            "to_student_id": recip_id,
            "amount": 150,
            "reason": "Exceed balance test",
        },
    )
    assert fail_res.status_code == 400
    assert "Insufficient credit balance" in fail_res.json()["detail"]

    # Admin negative adjustment exceeding balance must also be blocked
    admin_fail = await client.post("/api/v1/credits/admin-adjust", json={
        "student_id": student_id,
        "amount": -200,
        "reason": "Large penalty",
    })
    assert admin_fail.status_code == 400
    assert "negative balance" in admin_fail.json()["detail"].lower()


@pytest.mark.asyncio
async def test_teaching_and_learning_session_lifecycle(client):
    """
    Sessions should have states: REQUESTED, ACCEPTED, COMPLETED, CANCELLED.
    Do not automatically award credits merely because a user clicks a button.
    Credits should be awarded after completion.
    """
    # Teacher & Learner
    t_res = await client.post("/api/v1/auth/register", json={
        "email": "teacher.flow@university.edu",
        "password": "Password123!",
        "full_name": "Professor Peer",
        "department": "CS",
        "year_of_study": "Senior",
    })
    teacher_id = t_res.json()["profile_id"]

    l_res = await client.post("/api/v1/auth/register", json={
        "email": "learner.flow@university.edu",
        "password": "Password123!",
        "full_name": "Curious Learner",
        "department": "Math",
        "year_of_study": "Sophomore",
    })
    learner_id = l_res.json()["profile_id"]

    skill_res = await client.post("/api/v1/skills", json={
        "name": "Distributed Systems",
        "category": "Cloud",
    })
    skill_id = skill_res.json()["id"]

    # 1. Learner requests session (State: REQUESTED)
    scheduled_time = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    req_res = await client.post(
        f"/api/v1/sessions/request?learner_id={learner_id}",
        json={
            "teacher_student_id": teacher_id,
            "skill_id": skill_id,
            "scheduled_at": scheduled_time,
            "duration_minutes": 60,
            "credit_amount": 30,
            "notes": "Need help understanding Raft consensus",
        },
    )
    assert req_res.status_code == 201
    session = req_res.json()
    sess_id = session["id"]
    assert session["status"] == SessionStatus.REQUESTED

    # VERIFY: No credits awarded merely on session creation!
    t_bal_before = await client.get(f"/api/v1/credits/balance/{teacher_id}")
    assert t_bal_before.json()["credit_balance"] == 100
    l_bal_before = await client.get(f"/api/v1/credits/balance/{learner_id}")
    assert l_bal_before.json()["credit_balance"] == 100

    # 2. Anti-Abuse check: Cannot complete session while in REQUESTED state!
    premature_res = await client.put(f"/api/v1/sessions/{sess_id}/complete")
    assert premature_res.status_code == 400
    assert "ACCEPTED" in premature_res.json()["detail"]

    # 3. Teacher accepts session (State: ACCEPTED)
    accept_res = await client.put(
        f"/api/v1/sessions/{sess_id}/accept",
        json={
            "meeting_link": "https://meet.jit.si/skill-exchange-consensus",
            "notes": "Prepared slides on Raft algorithm",
        },
    )
    assert accept_res.status_code == 200
    assert accept_res.json()["status"] == SessionStatus.ACCEPTED

    # VERIFY: Still NO credits awarded on accept!
    t_bal_mid = await client.get(f"/api/v1/credits/balance/{teacher_id}")
    assert t_bal_mid.json()["credit_balance"] == 100

    # 4. Complete session with verification notes (State: COMPLETED)
    comp_res = await client.put(
        f"/api/v1/sessions/{sess_id}/complete",
        json={
            "verification_notes": "Covered leader election and log replication in Raft.",
            "actual_duration_minutes": 60,
            "rating": 5,
            "learner_feedback": "Fantastic explanation of consensus!",
        },
    )
    assert comp_res.status_code == 200
    completed_session = comp_res.json()
    assert completed_session["status"] == SessionStatus.COMPLETED
    assert completed_session["completed_at"] is not None
    assert completed_session["verification_notes"] is not None

    # VERIFY: Credits ARE awarded AFTER completion!
    # Teacher earned 30 credits (100 + 30 = 130)
    t_bal_after = await client.get(f"/api/v1/credits/balance/{teacher_id}")
    assert t_bal_after.json()["credit_balance"] == 130
    assert t_bal_after.json()["total_earned"] == 30

    # Learner spent 30 credits (100 - 30 = 70)
    l_bal_after = await client.get(f"/api/v1/credits/balance/{learner_id}")
    assert l_bal_after.json()["credit_balance"] == 70
    assert l_bal_after.json()["total_spent"] == 30

    # Verify both transactions in ledger
    t_ledger = await client.get(f"/api/v1/credits/ledger/{teacher_id}")
    assert any(tx["type"] == CreditTransactionType.TEACHING_REWARD and tx["amount"] == 30 for tx in t_ledger.json())

    l_ledger = await client.get(f"/api/v1/credits/ledger/{learner_id}")
    assert any(tx["type"] == CreditTransactionType.LEARNING_COST and tx["amount"] == 30 for tx in l_ledger.json())

    # 5. Anti-abuse: Cannot complete session again (replay protection)
    replay_res = await client.put(f"/api/v1/sessions/{sess_id}/complete")
    assert replay_res.status_code == 400

    # 6. Anti-abuse: Cannot cancel a completed session
    cancel_fail = await client.put(f"/api/v1/sessions/{sess_id}/cancel", json={"reason": "Late cancel"})
    assert cancel_fail.status_code == 400


@pytest.mark.asyncio
async def test_session_cancellation_flow(client):
    """Sessions in REQUESTED or ACCEPTED state can be CANCELLED."""
    t_res = await client.post("/api/v1/auth/register", json={
        "email": "t.cancel@university.edu",
        "password": "Password123!",
        "full_name": "Teacher Cancel",
        "department": "CS",
        "year_of_study": "Junior",
    })
    teacher_id = t_res.json()["profile_id"]

    l_res = await client.post("/api/v1/auth/register", json={
        "email": "l.cancel@university.edu",
        "password": "Password123!",
        "full_name": "Learner Cancel",
        "department": "CS",
        "year_of_study": "Freshman",
    })
    learner_id = l_res.json()["profile_id"]

    skill_res = await client.post("/api/v1/skills", json={
        "name": "Docker Basics",
        "category": "DevOps",
    })
    skill_id = skill_res.json()["id"]

    req_res = await client.post(
        f"/api/v1/sessions/request?learner_id={learner_id}",
        json={
            "teacher_student_id": teacher_id,
            "skill_id": skill_id,
            "scheduled_at": (datetime.now(timezone.utc) + timedelta(days=2)).isoformat(),
            "duration_minutes": 45,
            "credit_amount": 15,
        },
    )
    sess_id = req_res.json()["id"]

    # Cancel session
    cancel_res = await client.put(
        f"/api/v1/sessions/{sess_id}/cancel",
        json={"reason": "Schedule conflict with exam"},
    )
    assert cancel_res.status_code == 200
    assert cancel_res.json()["status"] == SessionStatus.CANCELLED

    # Balances remain untouched
    t_bal = await client.get(f"/api/v1/credits/balance/{teacher_id}")
    assert t_bal.json()["credit_balance"] == 100


@pytest.mark.asyncio
async def test_anti_abuse_self_teaching_and_velocity(client):
    """Cannot teach oneself; cannot exceed velocity limit."""
    student_res = await client.post("/api/v1/auth/register", json={
        "email": "solo.student@university.edu",
        "password": "Password123!",
        "full_name": "Solo Student",
        "department": "CS",
        "year_of_study": "Senior",
    })
    s_id = student_res.json()["profile_id"]

    skill_res = await client.post("/api/v1/skills", json={
        "name": "Self Reflection",
        "category": "Philosophy",
    })
    sk_id = skill_res.json()["id"]

    # Attempt self-teaching
    self_res = await client.post(
        f"/api/v1/sessions?teacher_id={s_id}",
        json={
            "learner_student_id": s_id,
            "skill_id": sk_id,
            "scheduled_at": datetime.now(timezone.utc).isoformat(),
            "credit_amount": 10,
        },
    )
    assert self_res.status_code == 400
    assert "same student" in self_res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_skill_demand_index_calculation(client):
    """
    Demand = number of learners requesting skill / number of available teachers.
    Use this to identify high-demand skills.
    """
    # 1. Register teacher
    t_res = await client.post("/api/v1/auth/register", json={
        "email": "demand.teacher@university.edu",
        "password": "Password123!",
        "full_name": "Teacher Tara",
        "department": "AI",
        "year_of_study": "Senior",
    })
    t_id = t_res.json()["profile_id"]

    # 2. Register 3 learners
    learner_ids = []
    for i in range(3):
        res = await client.post("/api/v1/auth/register", json={
            "email": f"demand.learner{i}@university.edu",
            "password": "Password123!",
            "full_name": f"Learner {i}",
            "department": "AI",
            "year_of_study": "Freshman",
        })
        learner_ids.append(res.json()["profile_id"])

    # 3. Create high demand skill
    sk_res = await client.post("/api/v1/skills", json={
        "name": "Deep Reinforcement Learning",
        "category": "AI/ML",
    })
    skill_id = sk_res.json()["id"]

    # 1 Teacher declares TEACH
    await client.post(f"/api/v1/skills/student-skills?student_id={t_id}", json={
        "skill_id": skill_id,
        "direction": "TEACH",
        "proficiency_level": "EXPERT",
    })

    # 3 Learners declare LEARN
    for lid in learner_ids:
        await client.post(f"/api/v1/skills/student-skills?student_id={lid}", json={
            "skill_id": skill_id,
            "direction": "LEARN",
            "proficiency_level": "BEGINNER",
        })

    # 4. Fetch Demand Index
    di_res = await client.get("/api/v1/credits/demand-index")
    assert di_res.status_code == 200
    data = di_res.json()
    assert "skills" in data
    assert data["total_skills"] > 0

    # Locate the target skill
    target_item = next((s for s in data["skills"] if s["skill_id"] == skill_id), None)
    assert target_item is not None
    assert target_item["teachers_count"] == 1
    assert target_item["learners_count"] == 3
    assert target_item["demand_index"] == 3.0  # 3 / 1 = 3.0
    assert target_item["is_high_demand"] is True
    assert target_item["status"] == "HIGH_DEMAND"
    assert target_item["recommended_reward_multiplier"] == 1.5
