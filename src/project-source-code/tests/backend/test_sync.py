"""
Unit and Integration Tests for Stage 10: Online/Offline Synchronization
Validates batch sync processing, Last-Write-Wins (LWW) conflict resolution,
strict server-authoritative credit integrity, and session completion payouts.
"""

import pytest
import pytest_asyncio
import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from httpx import AsyncClient

from app.models.enums import UserRole, SessionStatus
from app.models.user import User
from app.models.profile import StudentProfile
from app.models.skill import Skill
from app.models.session import TeachingSession


@pytest_asyncio.fixture
async def seed_sync_test_data(db_session: AsyncSession):
    """Seed test students, skill, and session for sync testing."""
    # Teacher
    u1 = User(id=str(uuid.uuid4()), email="sync.teacher@uni.edu", password_hash="hash1", role=UserRole.STUDENT)
    db_session.add(u1)
    await db_session.flush()
    teacher = StudentProfile(
        id=str(uuid.uuid4()),
        user_id=u1.id,
        full_name="Sync Teacher",
        department="Computer Science",
        year_of_study="Senior",
        bio="Original Teacher Bio",
        credit_balance=100,
        updated_at=datetime.now(timezone.utc) - timedelta(hours=2),
    )
    db_session.add(teacher)

    # Learner
    u2 = User(id=str(uuid.uuid4()), email="sync.learner@uni.edu", password_hash="hash2", role=UserRole.STUDENT)
    db_session.add(u2)
    await db_session.flush()
    learner = StudentProfile(
        id=str(uuid.uuid4()),
        user_id=u2.id,
        full_name="Sync Learner",
        department="Data Science",
        year_of_study="Junior",
        bio="Original Learner Bio",
        credit_balance=50,
        updated_at=datetime.now(timezone.utc) - timedelta(hours=2),
    )
    db_session.add(learner)

    # Skill
    sk = Skill(id=str(uuid.uuid4()), name="Distributed Sync Systems", category="Computer Science")
    db_session.add(sk)
    await db_session.flush()

    # Session
    sess = TeachingSession(
        id=str(uuid.uuid4()),
        teacher_student_id=teacher.id,
        learner_student_id=learner.id,
        skill_id=sk.id,
        scheduled_at=datetime.now(timezone.utc) + timedelta(days=1),
        duration_minutes=60,
        credit_amount=20,
        status=SessionStatus.ACCEPTED,
    )
    db_session.add(sess)

    await db_session.commit()
    return {"teacher": teacher, "learner": learner, "skill": sk, "session": sess}


@pytest.mark.asyncio
async def test_sync_status_endpoint(client: AsyncClient):
    """Verify server status and supported operations list."""
    res = await client.get("/api/v1/sync/status")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ONLINE"
    assert "server_time" in data
    assert "CREATE_PROFILE" in data["supported_operations"]
    assert "CREDIT_TRANSACTION" in data["supported_operations"]


@pytest.mark.asyncio
async def test_sync_profile_lww_newer_wins(client: AsyncClient, seed_sync_test_data):
    """
    Test Last-Write-Wins: When client timestamp is newer than server's updated_at,
    the client's profile edit is accepted and saved.
    """
    teacher = seed_sync_test_data["teacher"]
    client_time = (datetime.now(timezone.utc) + timedelta(minutes=5)).isoformat()

    batch_payload = {
        "client_id": "test-client-123",
        "operations": [
            {
                "operation_id": "op-update-profile-1",
                "type": "UPDATE_PROFILE",
                "client_timestamp": client_time,
                "entity_id": teacher.id,
                "payload": {
                    "bio": "Updated Bio from Offline Session",
                    "department": "Advanced Computing",
                },
            }
        ],
    }

    res = await client.post("/api/v1/sync/batch", json=batch_payload)
    assert res.status_code == 200
    data = res.json()
    assert data["success_count"] == 1
    assert len(data["acknowledgements"]) == 1

    ack = data["acknowledgements"][0]
    assert ack["operation_id"] == "op-update-profile-1"
    assert ack["status"] == "SUCCESS"
    assert "Last-Write-Wins" in ack["message"]

    # Verify in DB via GET /api/v1/profiles/{id}
    prof_res = await client.get(f"/api/v1/profiles/{teacher.id}")
    assert prof_res.status_code == 200
    assert prof_res.json()["bio"] == "Updated Bio from Offline Session"
    assert prof_res.json()["department"] == "Advanced Computing"


@pytest.mark.asyncio
async def test_sync_profile_conflict_resolution_server_newer(client: AsyncClient, seed_sync_test_data):
    """
    Test Conflict Resolution: When server has a newer update than the offline client,
    server state is preserved (CONFLICT_RESOLVED).
    """
    teacher = seed_sync_test_data["teacher"]
    # Client timestamp is 10 hours in the past
    stale_client_time = (datetime.now(timezone.utc) - timedelta(hours=10)).isoformat()

    batch_payload = {
        "client_id": "test-client-123",
        "operations": [
            {
                "operation_id": "op-stale-profile-2",
                "type": "UPDATE_PROFILE",
                "client_timestamp": stale_client_time,
                "entity_id": teacher.id,
                "payload": {
                    "bio": "Stale offline edit that should not overwrite",
                },
            }
        ],
    }

    res = await client.post("/api/v1/sync/batch", json=batch_payload)
    assert res.status_code == 200
    data = res.json()
    assert data["conflict_count"] == 1

    ack = data["acknowledgements"][0]
    assert ack["status"] == "CONFLICT_RESOLVED"
    assert "Server state is newer" in ack["message"]
    assert ack["authoritative_state"]["bio"] == teacher.bio


@pytest.mark.asyncio
async def test_sync_server_authoritative_credit_rejection_on_insufficient_funds(client: AsyncClient, seed_sync_test_data):
    """
    STRICT SERVER-AUTHORITATIVE TEST:
    An offline client attempting to transfer more credits than their actual server balance
    is firmly REJECTED. Clients cannot unilaterally forge credits.
    """
    learner = seed_sync_test_data["learner"]  # Balance: 50
    teacher = seed_sync_test_data["teacher"]

    batch_payload = {
        "client_id": "test-client-123",
        "operations": [
            {
                "operation_id": "op-fake-credit-3",
                "type": "CREDIT_TRANSACTION",
                "client_timestamp": datetime.now(timezone.utc).isoformat(),
                "payload": {
                    "from_student_id": learner.id,
                    "to_student_id": teacher.id,
                    "amount": 99999,  # Far exceeds 50
                    "description": "Attempted offline forged credit spend",
                },
            }
        ],
    }

    res = await client.post("/api/v1/sync/batch", json=batch_payload)
    assert res.status_code == 200
    data = res.json()
    assert data["rejected_count"] == 1

    ack = data["acknowledgements"][0]
    assert ack["status"] == "REJECTED"
    assert "Insufficient server credit balance" in ack["message"]
    assert ack["authoritative_state"]["credit_balance"] == 50


@pytest.mark.asyncio
async def test_sync_valid_credit_transaction(client: AsyncClient, seed_sync_test_data):
    """
    Verify valid offline credit transaction is executed authoritatively and ledger updated.
    """
    learner = seed_sync_test_data["learner"]  # Balance: 50
    teacher = seed_sync_test_data["teacher"]  # Balance: 100

    batch_payload = {
        "client_id": "test-client-123",
        "operations": [
            {
                "operation_id": "op-valid-credit-4",
                "type": "CREDIT_TRANSACTION",
                "client_timestamp": datetime.now(timezone.utc).isoformat(),
                "payload": {
                    "from_student_id": learner.id,
                    "to_student_id": teacher.id,
                    "amount": 25,
                    "description": "Valid peer transfer while offline",
                },
            }
        ],
    }

    res = await client.post("/api/v1/sync/batch", json=batch_payload)
    assert res.status_code == 200
    data = res.json()
    assert data["success_count"] == 1

    ack = data["acknowledgements"][0]
    assert ack["status"] == "SUCCESS"
    assert ack["authoritative_state"]["credit_balance"] == 25  # 50 - 25

    # Check updated balances
    bal_res = await client.get(f"/api/v1/credits/balance/{learner.id}")
    assert bal_res.json()["credit_balance"] == 25


@pytest.mark.asyncio
async def test_sync_project_creation(client: AsyncClient, seed_sync_test_data):
    """Verify offline project creation synchronizes and receives authoritative server ID."""
    teacher = seed_sync_test_data["teacher"]

    batch_payload = {
        "client_id": "test-client-123",
        "operations": [
            {
                "operation_id": "op-project-create-5",
                "type": "CREATE_PROJECT",
                "client_timestamp": datetime.now(timezone.utc).isoformat(),
                "payload": {
                    "owner_id": teacher.id,
                    "title": "Offline Brainstormed Project",
                    "description": "Designed fully in offline mode on campus library.",
                    "category": "Computer Science",
                    "max_members": 4,
                },
            }
        ],
    }

    res = await client.post("/api/v1/sync/batch", json=batch_payload)
    assert res.status_code == 200
    data = res.json()
    assert data["success_count"] == 1

    ack = data["acknowledgements"][0]
    assert ack["status"] == "SUCCESS"
    assert ack["entity_id"] is not None

    # Check project exists in database
    proj_res = await client.get(f"/api/v1/projects/{ack['entity_id']}")
    assert proj_res.status_code == 200
    assert proj_res.json()["title"] == "Offline Brainstormed Project"


@pytest.mark.asyncio
async def test_sync_session_completion_and_reward(client: AsyncClient, seed_sync_test_data):
    """
    Verify offline session completion verifies session state and triggers
    server-authoritative teaching reward credits.
    """
    sess = seed_sync_test_data["session"]
    teacher = seed_sync_test_data["teacher"]
    initial_teacher_bal = teacher.credit_balance

    batch_payload = {
        "client_id": "test-client-123",
        "operations": [
            {
                "operation_id": "op-sess-comp-6",
                "type": "COMPLETE_SESSION",
                "client_timestamp": datetime.now(timezone.utc).isoformat(),
                "entity_id": sess.id,
                "payload": {
                    "verification_notes": "Completed session held in campus library basement without internet.",
                },
            }
        ],
    }

    res = await client.post("/api/v1/sync/batch", json=batch_payload)
    assert res.status_code == 200
    data = res.json()
    assert data["success_count"] == 1

    ack = data["acknowledgements"][0]
    assert ack["status"] == "SUCCESS"

    # Teacher should have received +20 credits authoritatively
    bal_res = await client.get(f"/api/v1/credits/balance/{teacher.id}")
    assert bal_res.json()["credit_balance"] == initial_teacher_bal + 20
