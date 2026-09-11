"""
End-to-End Live Verification Script for Stage 5: Project Intelligence
"""

import sys
import json
import urllib.request
import urllib.parse

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
        with urllib.request.urlopen(req, timeout=10) as response:
            return response.getcode(), json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8")
    except Exception as e:
        return None, str(e)


def main():
    print("=" * 75)
    print("AI SKILL EXCHANGE — STAGE 5: PROJECT INTELLIGENCE VERIFICATION SUITE")
    print("=" * 75)

    base_url = "http://127.0.0.1:8000"

    # 1. Health check
    code, health = test_endpoint(f"{base_url}/api/health")
    if code != 200:
        print(f"[FAIL] Backend server not reachable at {base_url}: {code}")
        print("Please start the backend server with: uvicorn app.main:app --app-dir backend --port 8000")
        sys.exit(1)
    print("[PASS] Backend health check OK")

    # 2. Fetch seed profiles to test owner context
    code, profiles = test_endpoint(f"{base_url}/api/v1/profiles?limit=5")
    if code != 200 or not profiles:
        print(f"[FAIL] Could not fetch seed profiles: {code}")
        sys.exit(1)
    owner = profiles[0]
    print(f"[PASS] Retrieved student owner: {owner['full_name']} ({owner['department']})")

    # 3. Test primary endpoint: POST /ai/analyze-project with Canonical Benchmark
    print("\n[3] Testing POST /ai/analyze-project (Canonical Crop Disease Benchmark)...")
    payload = {
        "text": "I want to build an AI-based crop disease detection application.",
        "student_id": owner["id"],
    }
    code, res = test_endpoint(f"{base_url}/ai/analyze-project", method="POST", data=payload)
    if code != 200:
        print(f"[FAIL] POST /ai/analyze-project returned {code}: {res}")
        sys.exit(1)

    # Validate Domain
    print(f"    -> Project Title: {res['project_title']}")
    print(f"    -> Domain Label:  {res['domain_label']}")
    print(f"    -> Domains:       {res['domains']}")
    assert res["domain_label"] == "Agriculture + AI", f"Expected 'Agriculture + AI', got '{res['domain_label']}'"
    print("    [OK] Domain correctly identified as Agriculture + AI")

    # Validate Required Skills
    extracted_skills = res["required_skills"]
    skill_names = [s["skill_name"] for s in extracted_skills]
    importance_map = {s["skill_name"]: s["importance"] for s in extracted_skills}

    print(f"    -> Extracted Skills ({len(extracted_skills)}):")
    for s in extracted_skills:
        print(f"       * {s['skill_name']:<25} | {s['importance']:<10} | Score: {s['importance_score']:.2f} | Category: {s['skill_category']}")

    mandatory_expected = [
        "Computer Vision",
        "Deep Learning",
        "Python",
        "Machine Learning",
        "Agriculture",
        "Backend",
        "Frontend",
    ]
    preferred_expected = ["Model Deployment"]

    for sk in mandatory_expected:
        assert sk in skill_names, f"Missing expected mandatory skill: {sk}"
        assert importance_map[sk] == "MANDATORY", f"Skill {sk} should be MANDATORY, got {importance_map[sk]}"

    for sk in preferred_expected:
        assert sk in skill_names, f"Missing expected preferred skill: {sk}"
        assert importance_map[sk] == "PREFERRED", f"Skill {sk} should be PREFERRED, got {importance_map[sk]}"

    print("    [OK] All 8 required skills matched with correct importance levels!")

    # Validate NetworkX Graph
    graph = res["skill_graph"]
    print(f"    -> NetworkX Graph: {len(graph['nodes'])} Nodes, {len(graph['edges'])} Edges, {len(graph['clusters'])} Clusters")
    assert len(graph["nodes"]) >= 8, "Graph node count too low"
    assert len(graph["edges"]) >= 8, "Graph edge count too low"
    assert any(n["node_type"] == "project" for n in graph["nodes"]), "Hub node missing"
    assert any(n["node_type"] == "domain" for n in graph["nodes"]), "Domain nodes missing"
    assert any(n["node_type"] == "skill" for n in graph["nodes"]), "Skill nodes missing"
    print("    [OK] Topological NetworkX skill graph generated successfully!")

    # Validate Missing Skills Gap Analysis
    missing = res["missing_skills"]
    print(f"    -> Missing Skills for {owner['full_name']} ({len(missing)}): {missing}")
    assert isinstance(missing, list)
    print("    [OK] Personal skill gap analysis verified")

    # Validate Team Roles
    roles = res["suggested_roles"]
    print(f"    -> Suggested Roles ({len(roles)}):")
    for r in roles:
        print(f"       * {r['role_title']} -> Skills: {r['associated_skills']}")
    assert len(roles) >= 1
    print("    [OK] Multi-disciplinary team roles synthesized")

    # 4. Test Versioned Endpoint Alias: POST /api/v1/ai/analyze-project
    print("\n[4] Testing POST /api/v1/ai/analyze-project alias...")
    drone_payload = {
        "text": "Developing an autonomous drone system using visual SLAM, ROS, and onboard sensor telemetry for navigation in GPS-denied environments."
    }
    code, d_res = test_endpoint(f"{base_url}/api/v1/ai/analyze-project", method="POST", data=drone_payload)
    if code != 200:
        print(f"[FAIL] POST /api/v1/ai/analyze-project returned {code}: {d_res}")
        sys.exit(1)
    print(f"    -> Drone Project Title: {d_res['project_title']}")
    print(f"    -> Drone Domain Label:  {d_res['domain_label']}")
    assert "Robotics" in d_res["domain_label"] or "Robotics & Autonomous" in d_res["domains"]
    print("    [OK] Alias endpoint verified with Robotics domain")

    # 5. Test Project Persistence: Save Project with Required Skills
    print("\n[5] Testing Project Persistence via POST /api/v1/projects...")
    save_payload = {
        "title": res["project_title"],
        "description": res["raw_description"],
        "category": res["domain_label"],
        "max_members": res["suggested_team_size"],
        "requirements": [
            {
                "skill_name": s["skill_name"],
                "required_proficiency": s["required_proficiency"],
                "importance": s["importance"],
                "description": s["rationale"],
            }
            for s in res["required_skills"]
        ],
    }
    code, created = test_endpoint(f"{base_url}/api/v1/projects?owner_id={owner['id']}", method="POST", data=save_payload)
    if code != 201:
        print(f"[FAIL] POST /api/v1/projects failed: {code} -> {created}")
        sys.exit(1)
    print(f"    -> Created Project ID: {created['id']}")
    print(f"    -> Title:             {created['title']}")
    print(f"    -> Category:          {created['category']}")
    print(f"    -> Persisted Skills:  {len(created['skill_requirements'])} requirements linked")
    assert len(created["skill_requirements"]) >= 8
    print("    [OK] Project saved and persisted to database with skill requirements!")

    print("\n" + "=" * 75)
    print("ALL STAGE 5 VERIFICATION CHECKS PASSED SUCCESSFULLY!")
    print("=" * 75)


if __name__ == "__main__":
    main()
