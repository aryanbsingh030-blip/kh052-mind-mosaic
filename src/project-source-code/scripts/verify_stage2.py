"""
Verification script for Stage 2: Student Profile System
Tests both Next.js SSR routes on port 3000 and the profile workflow endpoints on port 8000.
"""

import sys
import urllib.request
import json
import uuid

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

API_BASE = "http://127.0.0.1:8000/api/v1"
FRONTEND_BASE = "http://localhost:3000"

def test_frontend_routes():
    print("=================================================================")
    print("STAGE 2: FRONTEND NEXT.JS ROUTE TESTING")
    print("=================================================================")
    routes = [
        "/dashboard",
        "/profile",
        "/skills",
        "/learning-goals",
    ]
    for r in routes:
        url = f"{FRONTEND_BASE}{r}"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=5) as res:
            code = res.getcode()
            html = res.read().decode("utf-8")
            assert code == 200, f"Route {r} failed with status {code}"
            assert "<html" in html or "<!DOCTYPE html>" in html, f"Route {r} did not return valid HTML"
            print(f"  [OK] {r} -> HTTP {code} (HTML length {len(html)} bytes)")

def test_student_profile_workflow():
    print("\n=================================================================")
    print("STAGE 2: BACKEND STUDENT PROFILE & SKILLS WORKFLOW TESTING")
    print("=================================================================")

    # 1. Login as seed student Aarav Sharma
    print("  [1] Authenticating as Aarav Sharma...")
    login_data = json.dumps({"email": "aarav.sharma@university.edu", "password": "Password123!"}).encode("utf-8")
    req = urllib.request.Request(f"{API_BASE}/auth/login", data=login_data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as res:
        auth = json.loads(res.read().decode("utf-8"))
        token = auth["access_token"]
        profile_id = auth["profile_id"]
        assert token and profile_id, "Auth failed"
        print(f"      Authenticated. Profile ID: {profile_id}")

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}",
    }

    # 2. Update profile with natural language project experience story & interests
    print("  [2] Updating profile with natural language project narrative & interests...")
    raw_story = "I built a plant disease classifier using Python, CNN and Flask and deployed the model as a web application with Docker."
    interests = "Distributed Systems, Autonomous Robotics, Precision Agriculture"
    project_interests = "AgroDrone Scouting, High-Throughput Peer Learning Networks"
    
    update_data = json.dumps({
        "raw_project_experience": raw_story,
        "interests": interests,
        "project_interests": project_interests,
        "bio": "CS senior specializing in distributed systems and AI computer vision.",
        "github_url": "https://github.com/aarav-sharma-campus",
    }).encode("utf-8")
    
    req = urllib.request.Request(f"{API_BASE}/profiles/{profile_id}", data=update_data, headers=headers, method="PUT")
    with urllib.request.urlopen(req) as res:
        prof = json.loads(res.read().decode("utf-8"))
        assert prof["raw_project_experience"] == raw_story, "Raw project experience not saved"
        assert prof["interests"] == interests, "Interests not saved"
        assert prof["project_interests"] == project_interests, "Project interests not saved"
        print("      Profile updated successfully.")
        print(f"      Stored raw story: '{prof['raw_project_experience'][:60]}...'")

    # 3. Add a teaching skill with proficiency and experience
    print("  [3] Declaring a new teaching capability...")
    # Find a skill (e.g. FastAPI)
    req = urllib.request.Request(f"{API_BASE}/skills?search=FastAPI")
    with urllib.request.urlopen(req) as res:
        skills = json.loads(res.read().decode("utf-8"))
        fastapi_skill = next((s for s in skills if s["name"] == "FastAPI"), None)
        assert fastapi_skill, "FastAPI skill not found in taxonomy"

    # Add FastAPI as TEACH
    skill_data = json.dumps({
        "skill_id": fastapi_skill["id"],
        "direction": "TEACH",
        "proficiency_level": "ADVANCED",
        "years_experience": 2.5,
        "description": "Architected high-throughput async microservices with Pydantic validation.",
    }).encode("utf-8")
    req = urllib.request.Request(f"{API_BASE}/skills/student-skills?student_id={profile_id}", data=skill_data, headers=headers)
    try:
        with urllib.request.urlopen(req) as res:
            declared_skill = json.loads(res.read().decode("utf-8"))
            skill_record_id = declared_skill["id"]
            print(f"      Added TEACH skill: {declared_skill['skill_name']} at {declared_skill['proficiency_level']}")
    except urllib.error.HTTPError as e:
        if e.code == 409:
            print("      FastAPI was already declared; querying existing...")
            req2 = urllib.request.Request(f"{API_BASE}/skills/student-skills/{profile_id}")
            with urllib.request.urlopen(req2) as res2:
                s_list = json.loads(res2.read().decode("utf-8"))
                declared_skill = next(s for s in s_list if s["skill_name"] == "FastAPI")
                skill_record_id = declared_skill["id"]
        else:
            raise e

    # 4. Set a learning goal
    print("  [4] Setting a new learning goal...")
    # Find Kubernetes
    req = urllib.request.Request(f"{API_BASE}/skills?search=Kubernetes")
    with urllib.request.urlopen(req) as res:
        k8s_skill = json.loads(res.read().decode("utf-8"))[0]

    goal_data = json.dumps({
        "skill_id": k8s_skill["id"],
        "target_proficiency": "EXPERT",
        "target_date": "2026-12-15",
        "description": "Master multi-cluster service meshes and automated pod horizontal scaling.",
    }).encode("utf-8")
    req = urllib.request.Request(f"{API_BASE}/learning-goals?student_id={profile_id}", data=goal_data, headers=headers)
    with urllib.request.urlopen(req) as res:
        created_goal = json.loads(res.read().decode("utf-8"))
        goal_id = created_goal["id"]
        assert created_goal["target_proficiency"] == "EXPERT"
        print(f"      Created goal for {created_goal['skill_name']} (Target: {created_goal['target_proficiency']})")

    # 5. Update goal status to ACHIEVED
    print("  [5] Updating goal status to ACHIEVED...")
    goal_update = json.dumps({"status": "ACHIEVED"}).encode("utf-8")
    req = urllib.request.Request(f"{API_BASE}/learning-goals/{goal_id}", data=goal_update, headers=headers, method="PUT")
    with urllib.request.urlopen(req) as res:
        up_goal = json.loads(res.read().decode("utf-8"))
        assert up_goal["status"] == "ACHIEVED"
        print("      Goal updated to ACHIEVED.")

    # 6. Add and remove availability slot
    print("  [6] Testing weekly availability scheduler...")
    slot_data = json.dumps({
        "day_of_week": "THURSDAY",
        "start_time": "15:00",
        "end_time": "17:00",
    }).encode("utf-8")
    req = urllib.request.Request(f"{API_BASE}/availabilities?student_id={profile_id}", data=slot_data, headers=headers)
    with urllib.request.urlopen(req) as res:
        slot = json.loads(res.read().decode("utf-8"))
        slot_id = slot["id"]
        print(f"      Added availability slot: {slot['day_of_week']} {slot['start_time']}-{slot['end_time']}")

    # Clean up test slot
    req_del = urllib.request.Request(f"{API_BASE}/availabilities/{slot_id}", headers=headers, method="DELETE")
    with urllib.request.urlopen(req_del) as res:
        assert res.getcode() == 204
        print("      Deleted availability slot successfully.")

    # 7. Remove declared skill
    print("  [7] Testing skill removal...")
    req_del_skill = urllib.request.Request(f"{API_BASE}/skills/student-skills/{skill_record_id}", headers=headers, method="DELETE")
    with urllib.request.urlopen(req_del_skill) as res:
        assert res.getcode() == 204
        print(f"      Removed declared skill record {skill_record_id}.")

    print("\n=================================================================")
    print("ALL STAGE 2 TESTS AND WORKFLOWS VERIFIED SUCCESSFULLY!")
    print("=================================================================")

if __name__ == "__main__":
    test_frontend_routes()
    test_student_profile_workflow()
