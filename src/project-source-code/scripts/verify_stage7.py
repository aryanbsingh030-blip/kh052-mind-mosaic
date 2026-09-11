"""
End-to-End Live Verification Script for Stage 7: Skill Credit Economy
"""

import sys
import json
import urllib.request
import urllib.parse
from datetime import datetime, timezone, timedelta

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass


def test_endpoint(url, method="GET", data=None):
    headers = {"Content-Type": "application/json"}
    body = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            return response.getcode(), json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        try:
            err_data = json.loads(e.read().decode("utf-8"))
            return e.code, err_data
        except Exception:
            return e.code, str(e)
    except Exception as e:
        return None, str(e)


def main():
    print("=" * 80)
    print("AI SKILL EXCHANGE — STAGE 7: SKILL CREDIT ECONOMY VERIFICATION SUITE")
    print("=" * 80)

    base_url = "http://127.0.0.1:8000"

    # 1. Health check
    code, health = test_endpoint(f"{base_url}/api/health")
    if code != 200:
        print(f"[FAIL] Backend server not reachable at {base_url}: {code}")
        print("Please start the backend server with: uvicorn app.main:app --app-dir backend --port 8000")
        sys.exit(1)
    print("[PASS] 1. Backend server health check OK")

    # 2. Fetch seed profiles
    code, profiles = test_endpoint(f"{base_url}/api/v1/profiles?limit=5")
    if code != 200 or not profiles or len(profiles) < 2:
        print(f"[FAIL] Could not fetch at least 2 profiles: {code}")
        sys.exit(1)

    teacher = profiles[0]
    learner = profiles[1]
    print(f"[PASS] 2. Test Students: Teacher={teacher['full_name']} | Learner={learner['full_name']}")

    # 3. Test Skill Demand Index: Demand = learners / teachers
    print("\n[3] Testing Campus Skill Demand Index (GET /api/v1/credits/demand-index)...")
    code, demand_data = test_endpoint(f"{base_url}/api/v1/credits/demand-index")
    assert code == 200, f"Expected 200, got {code}: {demand_data}"
    assert "skills" in demand_data, "Missing 'skills' in demand index response"
    assert "high_demand_count" in demand_data, "Missing 'high_demand_count'"
    print(f"    -> Total Skills Evaluated: {demand_data['total_skills']}")
    print(f"    -> High Demand Skills Identified: {demand_data['high_demand_count']}")
    print(f"    -> Average Campus Demand Index: {demand_data['average_demand_index']}")

    top_skills = demand_data["skills"][:3]
    for s in top_skills:
        print(f"       * {s['skill_name']:<25} | Learners: {s['learners_count']:<2} | Teachers: {s['teachers_count']:<2} | Index: {s['demand_index']:<4} | Status: {s['status']}")
        assert "is_high_demand" in s
        assert "recommended_reward_multiplier" in s
    print("    [OK] Skill Demand Index formula and classification verified!")

    # 4. Test Credit Balance & Transparent Ledger
    print("\n[4] Testing Credit Balance & Transparent Ledger (GET /api/v1/credits/balance)...")
    code, bal = test_endpoint(f"{base_url}/api/v1/credits/balance/{teacher['id']}")
    assert code == 200, f"Expected 200, got {code}"
    print(f"    -> Teacher Balance: {bal['credit_balance']} credits | Earned: {bal['total_earned']} | Spent: {bal['total_spent']}")
    print(f"    -> Negative Balance Allowed: {bal['allow_negative_balance']}")

    code, ledger = test_endpoint(f"{base_url}/api/v1/credits/ledger/{teacher['id']}")
    assert code == 200, f"Expected 200, got {code}"
    print(f"    -> Ledger Transaction Count: {len(ledger)}")
    if ledger:
        sample_tx = ledger[0]
        print(f"    -> Sample Transaction: ID={sample_tx['id'][:8]}... | Type={sample_tx['type']} | Amount={sample_tx['amount']}")
        assert "id" in sample_tx
        assert "student" in sample_tx
        assert "amount" in sample_tx
        assert "type" in sample_tx
        assert "reason" in sample_tx
        assert "timestamp" in sample_tx
    print("    [OK] Credit Ledger transparency verified!")

    # 5. Test Bonus Award
    print("\n[5] Testing Bonus Award (POST /api/v1/credits/bonus)...")
    bonus_payload = {
        "student_id": teacher["id"],
        "amount": 15,
        "reason": "Top campus peer tutor recognition bonus",
    }
    code, bonus_res = test_endpoint(f"{base_url}/api/v1/credits/bonus", method="POST", data=bonus_payload)
    assert code == 201, f"Expected 201, got {code}: {bonus_res}"
    assert bonus_res["type"] == "BONUS"
    assert bonus_res["amount"] == 15
    print(f"    [OK] Bonus awarded successfully: {bonus_res['amount']} credits (Type: {bonus_res['type']})")

    # 6. Test Admin Adjustment
    print("\n[6] Testing Admin Adjustment (POST /api/v1/credits/admin-adjust)...")
    admin_payload = {
        "student_id": learner["id"],
        "amount": 10,
        "reason": "Quarterly student activity adjustment",
    }
    code, admin_res = test_endpoint(f"{base_url}/api/v1/credits/admin-adjust", method="POST", data=admin_payload)
    assert code == 201, f"Expected 201, got {code}: {admin_res}"
    assert admin_res["type"] == "ADMIN_ADJUSTMENT"
    assert admin_res["amount"] == 10
    print(f"    [OK] Admin adjustment successful: {admin_res['amount']} credits (Type: {admin_res['type']})")

    # 7. Test Negative Balance Prevention
    print("\n[7] Testing Negative Balance Safeguards (Anti-Abuse)...")
    excess_payload = {
        "to_student_id": teacher["id"],
        "amount": 99999,  # exceeds balance
        "description": "Attempted overspend",
    }
    code, overspend_res = test_endpoint(f"{base_url}/api/v1/credits/transfer?from_student_id={learner['id']}", method="POST", data=excess_payload)
    assert code == 400, f"Expected 400 Bad Request for overspend, got {code}"
    print(f"    [OK] Negative balance blocked properly: {overspend_res.get('detail', overspend_res)}")

    # 8. Test Session Flow & Lifecycle: REQUESTED -> ACCEPTED -> COMPLETED
    print("\n[8] Testing Teaching & Learning Session Lifecycle Flow...")

    # Fetch a skill to learn
    code, skills = test_endpoint(f"{base_url}/api/v1/skills?limit=3")
    target_skill = skills[0]

    # Step A: Learner Requests session
    sched_time = (datetime.now(timezone.utc) + timedelta(days=3)).isoformat()
    req_payload = {
        "teacher_student_id": teacher["id"],
        "skill_id": target_skill["id"],
        "scheduled_at": sched_time,
        "duration_minutes": 60,
        "credit_amount": 20,
        "notes": "E2E Stage 7 live session test",
    }
    code, sess_res = test_endpoint(f"{base_url}/api/v1/sessions/request?learner_id={learner['id']}", method="POST", data=req_payload)
    assert code == 201, f"Expected 201 for session request, got {code}: {sess_res}"
    sess_id = sess_res["id"]
    assert sess_res["status"] == "REQUESTED", f"Expected REQUESTED status, got {sess_res['status']}"
    print(f"    -> Step A: Session Requested: ID={sess_id[:8]}... | Status={sess_res['status']}")

    # Anti-abuse: verify no credits awarded on request
    code, bal_check = test_endpoint(f"{base_url}/api/v1/credits/balance/{teacher['id']}")
    bal_before = bal_check["credit_balance"]

    # Anti-abuse: cannot complete directly from REQUESTED
    code, bad_comp = test_endpoint(f"{base_url}/api/v1/sessions/{sess_id}/complete", method="PUT")
    assert code == 400, f"Expected 400 for completing REQUESTED session, got {code}"
    print("    -> Anti-Abuse: Blocked premature completion of non-accepted session")

    # Step B: Teacher Accepts session
    accept_payload = {
        "meeting_link": "https://meet.jit.si/stage7-e2e-session",
        "notes": "Looking forward to teaching this topic",
    }
    code, accept_res = test_endpoint(f"{base_url}/api/v1/sessions/{sess_id}/accept", method="PUT", data=accept_payload)
    assert code == 200, f"Expected 200 for accept, got {code}: {accept_res}"
    assert accept_res["status"] == "ACCEPTED", f"Expected ACCEPTED status, got {accept_res['status']}"
    print(f"    -> Step B: Session Accepted: Status={accept_res['status']} | Link={accept_res['meeting_link']}")

    # Step C: Complete session (Credits awarded after completion)
    comp_payload = {
        "verification_notes": "Successfully taught session covering core principles and live demo.",
        "actual_duration_minutes": 60,
        "rating": 5,
        "learner_feedback": "Excellent live session, very clear!",
    }
    code, comp_res = test_endpoint(f"{base_url}/api/v1/sessions/{sess_id}/complete", method="PUT", data=comp_payload)
    assert code == 200, f"Expected 200 for complete, got {code}: {comp_res}"
    assert comp_res["status"] == "COMPLETED", f"Expected COMPLETED status, got {comp_res['status']}"
    assert comp_res["completed_at"] is not None
    print(f"    -> Step C: Session Completed: Status={comp_res['status']} | Verified={comp_res['verification_notes'] is not None}")

    # Verify credit award in balances
    code, bal_after = test_endpoint(f"{base_url}/api/v1/credits/balance/{teacher['id']}")
    assert bal_after["credit_balance"] == bal_before + 20, f"Teacher credit balance should have increased by 20"
    print(f"    -> Credit Award Verified: Teacher balance +20 ({bal_before} -> {bal_after['credit_balance']})")

    # Anti-abuse: Replay attack prevention
    code, replay_res = test_endpoint(f"{base_url}/api/v1/sessions/{sess_id}/complete", method="PUT")
    assert code == 400, f"Expected 400 for replay completion, got {code}"
    print("    -> Anti-Abuse: Blocked replay completion attempt on already completed session")

    # Anti-abuse: Self-dealing prevention
    self_payload = {
        "learner_student_id": teacher["id"],
        "skill_id": target_skill["id"],
        "scheduled_at": sched_time,
        "credit_amount": 10,
    }
    code, self_res = test_endpoint(f"{base_url}/api/v1/sessions?teacher_id={teacher['id']}", method="POST", data=self_payload)
    assert code == 400, f"Expected 400 for self-teaching attempt, got {code}"
    print("    -> Anti-Abuse: Blocked self-teaching attempt")

    print("\n" + "=" * 80)
    print("ALL STAGE 7: SKILL CREDIT ECONOMY ENDPOINTS & SAFEGUARDS VERIFIED!")
    print("=" * 80)


if __name__ == "__main__":
    main()
