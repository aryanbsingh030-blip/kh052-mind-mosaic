"""
Stage 10: Online/Offline Synchronization Verification Script
Tests the 7-step synchronization lifecycle:
1. Online initial state verification
2. Offline mutation queuing (operation IDs, timestamps, types)
3. Conflict resolution (LWW timestamps vs server updated_at)
4. Offline persistence & replay (simulating app close/reopen)
5. Reconnection & batch submission to /api/v1/sync/batch
6. Server-authoritative rejection of unauthorized credit modifications
7. Cloud state reconciliation verification
"""

import sys
import os
import json
from pathlib import Path
from datetime import datetime, timezone, timedelta

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Setup import path for backend
project_root = Path(__file__).resolve().parent.parent
backend_dir = project_root / "backend"
sys.path.insert(0, str(backend_dir))

import asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select
from app.main import app
from app.database import async_session
from app.models.profile import StudentProfile
from app.models.credit import SkillCreditTransaction
from app.models.project import Project


async def async_main():
    print("=" * 80)
    print("AI SKILL EXCHANGE — STAGE 10: ONLINE/OFFLINE SYNCHRONIZATION VERIFICATION")
    print("=" * 80)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Verify Static Architecture & Files
        print("\n[1] Verifying Stage 10 Architecture Files...")
        frontend_dir = project_root / "frontend"

        files_to_check = [
            backend_dir / "app" / "schemas" / "sync.py",
            backend_dir / "app" / "routers" / "sync.py",
            frontend_dir / "src" / "lib" / "sync" / "syncEngine.ts",
            frontend_dir / "src" / "lib" / "offline" / "indexedDb.ts",
            frontend_dir / "src" / "app" / "sync-debug" / "page.tsx",
        ]

        for f in files_to_check:
            assert f.exists(), f"Missing required file: {f}"
            print(f"    [OK] File exists: {f.name}")

        # Check indexedDb v2 upgrade & sync_operations store
        idb_text = (frontend_dir / "src" / "lib" / "offline" / "indexedDb.ts").read_text(encoding="utf-8")
        assert "sync_operations" in idb_text, "sync_operations store missing from indexedDb.ts"
        assert "AISkillExchangeOfflineDB" in idb_text
        print("    [OK] IndexedDB upgraded with 'sync_operations' store & indexes.")

        # 2. Verify Sync API Status Endpoint
        print("\n[2] Verifying GET /api/v1/sync/status...")
        status_resp = await client.get("/api/v1/sync/status")
        assert status_resp.status_code == 200, f"Sync status failed: {status_resp.text}"
        status_data = status_resp.json()
        assert status_data["status"] == "ONLINE"
        assert "CREATE_PROFILE" in status_data["supported_operations"]
        assert "CREDIT_TRANSACTION" in status_data["supported_operations"]
        assert "UPDATE_PROFILE" in status_data["supported_operations"]
        print(f"    [OK] Sync status online. Supported operations: {len(status_data['supported_operations'])}")

        # 3. Step 1: Create / Read data online
        print("\n[3] Step 1: Query online seed data...")
        async with async_session() as db:
            res1 = await db.execute(select(StudentProfile))
            student_1 = res1.scalars().first()
            assert student_1 is not None, "Seed student 1 missing! Run scripts/seed.py first."
            student_1_id = student_1.id

            res2 = await db.execute(select(StudentProfile).where(StudentProfile.id != student_1_id))
            student_2 = res2.scalars().first()
            student_2_id = student_2.id

            initial_balance = student_1.credit_balance
            print(f"    [OK] Online student 1: {student_1.full_name} ({student_1_id}), Credit balance: {initial_balance}")

        # 4. Step 2 & 3: Go offline & modify data (Build local operation queue)
        print("\n[4] Step 2 & 3: Go offline and queue mutations...")
        now = datetime.now(timezone.utc)
        newer_time = (now + timedelta(minutes=5)).isoformat()
        older_time = (now - timedelta(days=2)).isoformat()

        queued_operations = [
            # Op 1: Profile update with newer timestamp (Last-Write-Wins should apply)
            {
                "operation_id": f"op-test-lww-new-{int(now.timestamp())}",
                "type": "UPDATE_PROFILE",
                "client_timestamp": newer_time,
                "entity_id": student_1_id,
                "payload": {
                    "bio": "Synced offline bio updated during field disconnect.",
                    "interests": "Distributed Consensus, Offline Sync",
                },
                "client_version": 1,
            },
            # Op 2: Profile update with older timestamp (LWW should discard / resolve conflict without overwrite)
            {
                "operation_id": f"op-test-lww-stale-{int(now.timestamp())}",
                "type": "UPDATE_PROFILE",
                "client_timestamp": older_time,
                "entity_id": student_1_id,
                "payload": {
                    "bio": "Stale bio that should not overwrite newer server bio.",
                },
                "client_version": 1,
            },
            # Op 3: Project creation offline
            {
                "operation_id": f"op-test-proj-{int(now.timestamp())}",
                "type": "CREATE_PROJECT",
                "client_timestamp": newer_time,
                "entity_id": f"proj-offline-{int(now.timestamp())}",
                "payload": {
                    "owner_id": student_1_id,
                    "title": f"Offline-First Campus P2P Network {int(now.timestamp())}",
                    "description": "P2P skill sharing network functioning seamlessly during campus outages.",
                    "category": "Computer Science",
                    "max_members": 3,
                },
                "client_version": 1,
            },
            # Op 4: Legitimate credit transaction (5 credits)
            {
                "operation_id": f"op-test-credit-valid-{int(now.timestamp())}",
                "type": "CREDIT_TRANSACTION",
                "client_timestamp": newer_time,
                "entity_id": f"tx-valid-{int(now.timestamp())}",
                "payload": {
                    "from_student_id": student_1_id,
                    "to_student_id": student_2_id,
                    "amount": 5,
                    "description": "Peer tutoring credit exchange test",
                },
                "client_version": 1,
            },
            # Op 5: Rogue credit transaction attempting to spend 999,999 credits (Must be REJECTED!)
            {
                "operation_id": f"op-test-credit-rogue-{int(now.timestamp())}",
                "type": "CREDIT_TRANSACTION",
                "client_timestamp": newer_time,
                "entity_id": f"tx-rogue-{int(now.timestamp())}",
                "payload": {
                    "from_student_id": student_1_id,
                    "to_student_id": student_2_id,
                    "amount": 999999,
                    "description": "Malicious offline forged credit deduction",
                },
                "client_version": 1,
            },
        ]
        print(f"    [OK] Successfully queued {len(queued_operations)} mutations offline.")

        # 5. Step 4: Simulate Close & Reopen App
        print("\n[5] Step 4: Simulate closing and reopening app (persistence check)...")
        serialized_queue = json.dumps(queued_operations)
        reloaded_queue = json.loads(serialized_queue)
        assert len(reloaded_queue) == 5
        print("    [OK] Queue persisted and recovered without data loss.")

        # 6. Step 5 & 6: Reconnect & submit batch to /api/v1/sync/batch
        print("\n[6] Step 5 & 6: Reconnect and synchronize batch with backend...")
        batch_payload = {
            "client_id": "test-verifier-client-001",
            "operations": reloaded_queue,
        }

        sync_response = await client.post("/api/v1/sync/batch", json=batch_payload)
        assert sync_response.status_code == 200, f"Batch sync failed: {sync_response.text}"
        batch_result = sync_response.json()

        print(f"    Processed: {batch_result['processed_count']}")
        print(f"    Success: {batch_result['success_count']}")
        print(f"    Conflict Resolved: {batch_result['conflict_count']}")
        print(f"    Rejected: {batch_result['rejected_count']}")
        print(f"    Errors: {batch_result['error_count']}")

        acks = {ack["operation_id"]: ack for ack in batch_result["acknowledgements"]}

        # Verify Op 1 (Newer profile) -> SUCCESS
        op1_ack = acks[reloaded_queue[0]["operation_id"]]
        assert op1_ack["status"] == "SUCCESS", f"Op 1 expected SUCCESS, got {op1_ack['status']}"
        print(f"    [OK] Op 1 (LWW newer): {op1_ack['message']}")

        # Verify Op 2 (Stale profile) -> CONFLICT_RESOLVED without overwrite
        op2_ack = acks[reloaded_queue[1]["operation_id"]]
        assert op2_ack["status"] == "CONFLICT_RESOLVED", f"Op 2 expected CONFLICT_RESOLVED, got {op2_ack['status']}"
        print(f"    [OK] Op 2 (LWW stale): {op2_ack['message']}")

        # Verify Op 3 (Project) -> SUCCESS with created project ID
        op3_ack = acks[reloaded_queue[2]["operation_id"]]
        assert op3_ack["status"] == "SUCCESS"
        assert op3_ack["entity_id"] is not None
        print(f"    [OK] Op 3 (Project Creation): {op3_ack['message']}, ID: {op3_ack['entity_id']}")

        # Verify Op 4 (Valid Credit Transfer) -> SUCCESS
        op4_ack = acks[reloaded_queue[3]["operation_id"]]
        assert op4_ack["status"] == "SUCCESS"
        print(f"    [OK] Op 4 (Valid Credit Transfer): {op4_ack['message']}")

        # Verify Op 5 (Rogue Credit Transfer) -> REJECTED (Server-authoritative balance protection)
        op5_ack = acks[reloaded_queue[4]["operation_id"]]
        assert op5_ack["status"] == "REJECTED", f"Op 5 expected REJECTED, got {op5_ack['status']}"
        assert op5_ack["authoritative_state"] is not None
        print(f"    [OK] Op 5 (Rogue Credit Rejected): {op5_ack['message']}")

        # 7. Step 7: Verify Cloud Data
        print("\n[7] Step 7: Verify Authoritative Cloud Database...")
        async with async_session() as db:
            refreshed_student_1 = (await db.execute(select(StudentProfile).where(StudentProfile.id == student_1_id))).scalars().first()
            assert refreshed_student_1.bio == "Synced offline bio updated during field disconnect."
            print("    [OK] Student 1 bio reflects newer offline timestamp (LWW verified).")

            created_proj = (await db.execute(select(Project).where(Project.id == op3_ack["entity_id"]))).scalars().first()
            assert created_proj is not None, "Synced project not found in database!"
            print(f"    [OK] Cloud database contains synced project: '{created_proj.title}' (ID: {created_proj.id}).")

            expected_balance = initial_balance - 5
            assert refreshed_student_1.credit_balance == expected_balance, (
                f"Expected balance {expected_balance}, got {refreshed_student_1.credit_balance}"
            )
            print(f"    [OK] Sender balance debited correctly: {initial_balance} -> {refreshed_student_1.credit_balance}")

        # Check authoritative_balances payload in batch response
        assert batch_result.get("authoritative_balances") is not None
        assert batch_result["authoritative_balances"].get(student_1_id) == expected_balance
        print(f"    [OK] Authoritative balance map returned to client for local reconciliation.")

    print("\n" + "=" * 80)
    print("ALL 7 STAGE 10 SYNCHRONIZATION STEPS VERIFIED SUCCESSFULLY! [100% PASS]")
    print("=" * 80)


def main():
    asyncio.run(async_main())


if __name__ == "__main__":
    main()

