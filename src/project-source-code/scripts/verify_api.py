"""
Live API Verification Script for AI Skill Exchange
Hits the running FastAPI server at http://127.0.0.1:8000 and validates all major endpoints.
"""

import sys
from pathlib import Path

# Fix Windows console UTF-8
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

import httpx

BASE_URL = "http://127.0.0.1:8000"


def run_verification():
    print("=" * 65)
    print("AI SKILL EXCHANGE -- LIVE API VERIFICATION")
    print("=" * 65)

    client = httpx.Client(base_url=BASE_URL, timeout=10.0)

    # 1. Health
    print("\n[1] Testing GET /api/health ...")
    r = client.get("/api/health")
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    data = r.json()
    print(f"    Status: {data['status']}, Database: {data['database']['status']}, AI: {data['ai']['provider']}")

    # 2. Root
    print("\n[2] Testing GET / ...")
    r = client.get("/")
    assert r.status_code == 200
    print(f"    App: {r.json()['name']}, Docs at: {r.json()['docs']}")

    # 3. Skills Taxonomy
    print("\n[3] Testing GET /api/v1/skills ...")
    r = client.get("/api/v1/skills?limit=100")
    assert r.status_code == 200
    skills = r.json()
    print(f"    Retrieved {len(skills)} canonical skills.")
    assert len(skills) >= 50, f"Expected at least 50 skills, got {len(skills)}"
    sample_skill = skills[0]
    print(f"    Sample Skill: '{sample_skill['name']}' in category '{sample_skill['category']}'")

    # Categories
    r_cat = client.get("/api/v1/skills/categories")
    assert r_cat.status_code == 200
    cats = r_cat.json()
    print(f"    Categories ({len(cats)}): {', '.join(cats[:6])}...")

    # 4. Student Profiles
    print("\n[4] Testing GET /api/v1/profiles ...")
    r = client.get("/api/v1/profiles?limit=50")
    assert r.status_code == 200
    profiles = r.json()
    print(f"    Retrieved {len(profiles)} student profiles.")
    assert len(profiles) >= 30, f"Expected at least 30 student profiles, got {len(profiles)}"
    sample_student = profiles[0]
    print(f"    Sample Student: {sample_student['full_name']} ({sample_student['department']}), Credits: {sample_student['credit_balance']}")

    # 5. Auth Login
    print("\n[5] Testing POST /api/v1/auth/login ...")
    login_payload = {
        "email": "aarav.sharma@university.edu",
        "password": "Password123!",
    }
    r = client.post("/api/v1/auth/login", json=login_payload)
    assert r.status_code == 200, f"Login failed: {r.text}"
    token_data = r.json()
    token = token_data["access_token"]
    student_id = token_data["profile_id"]
    print(f"    Authenticated as {token_data['full_name']} (Role: {token_data['role']})")
    print(f"    Received Bearer token (length {len(token)})")

    # 6. Auth Me
    print("\n[6] Testing GET /api/v1/auth/me ...")
    r = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    me = r.json()
    print(f"    Current user: {me['email']}, Credits: {me['credit_balance']}")

    # 7. Student Skills
    print(f"\n[7] Testing GET /api/v1/skills/student-skills/{student_id} ...")
    r = client.get(f"/api/v1/skills/student-skills/{student_id}")
    assert r.status_code == 200
    s_skills = r.json()
    print(f"    Student has {len(s_skills)} declared skills.")
    for s in s_skills[:3]:
        print(f"      - {s['direction']} {s['skill_name']} ({s['proficiency_level']})")

    # 8. Learning Goals
    print(f"\n[8] Testing GET /api/v1/learning-goals/student/{student_id} ...")
    r = client.get(f"/api/v1/learning-goals/student/{student_id}")
    assert r.status_code == 200
    goals = r.json()
    print(f"    Student has {len(goals)} active learning goals.")
    for g in goals:
        print(f"      - Target: {g['skill_name']} ({g['target_proficiency']}) - Status: {g['status']}")

    # 9. Campus Projects
    print("\n[9] Testing GET /api/v1/projects ...")
    r = client.get("/api/v1/projects")
    assert r.status_code == 200
    projects = r.json()
    print(f"    Retrieved {len(projects)} campus collaborative projects.")
    for p in projects:
        print(f"      - [{p['category']}] {p['title']} (Reqs: {len(p['skill_requirements'])})")

    # 10. Skill Matches
    print(f"\n[10] Testing GET /api/v1/matches/student/{student_id} ...")
    r = client.get(f"/api/v1/matches/student/{student_id}")
    assert r.status_code == 200
    matches = r.json()
    print(f"    Student has {len(matches)} peer matches.")
    for m in matches:
        print(f"      - Match with {m['learner_name']} for {m['skill_name']} (Score: {m['match_score']}, Status: {m['status']})")

    # 11. Credit Economy Balance & Transactions
    print(f"\n[11] Testing GET /api/v1/credits/balance/{student_id} ...")
    r = client.get(f"/api/v1/credits/balance/{student_id}")
    assert r.status_code == 200
    bal = r.json()
    print(f"    Credit Balance: {bal['credit_balance']} (Earned: {bal['total_earned']}, Spent: {bal['total_spent']})")

    r_tx = client.get(f"/api/v1/credits/transactions/{student_id}")
    assert r_tx.status_code == 200
    txs = r_tx.json()
    print(f"    Transaction History ({len(txs)} records):")
    for tx in txs:
        print(f"      - [{tx['transaction_type']}] {tx['amount']} credits: {tx['description']}")

    # 12. Teaching Sessions
    print(f"\n[12] Testing GET /api/v1/sessions/student/{student_id} ...")
    r = client.get(f"/api/v1/sessions/student/{student_id}")
    assert r.status_code == 200
    sessions = r.json()
    print(f"    Student has {len(sessions)} teaching/learning sessions.")
    for s in sessions:
        print(f"      - {s['teacher_name']} -> {s['learner_name']} for {s['skill_name']} ({s['status']}, {s['credit_amount']} credits)")
        if s.get("learning_log"):
            print(f"        Review: {s['learning_log']['rating']}/5 stars: '{s['learning_log']['feedback']}'")

    # 13. Campus Activity Feed
    print("\n[13] Testing GET /api/v1/activities/campus ...")
    r = client.get("/api/v1/activities/campus?limit=5")
    assert r.status_code == 200
    activities = r.json()
    print(f"    Retrieved {len(activities)} recent campus activity events:")
    for a in activities:
        print(f"      - [{a['event_type']}] {a['title']} ({a['student_name']})")

    print("\n" + "=" * 65)
    print("ALL MAJOR ENDPOINTS TESTED AND VERIFIED SUCCESSFULLY!")
    print("=" * 65)


if __name__ == "__main__":
    try:
        run_verification()
    except Exception as e:
        print(f"\n[ERROR] Verification failed: {e}")
        sys.exit(1)
