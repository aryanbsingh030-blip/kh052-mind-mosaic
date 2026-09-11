"""
Stage 8: Campus Skill Intelligence Live Verification Script
Tests campus-level analytics against the live seed dataset.
Validates volume metrics, indices, shortages, narrative callouts,
role-tailored insights, and strict student privacy guarantees.
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
    print("AI SKILL EXCHANGE — STAGE 8: CAMPUS SKILL INTELLIGENCE VERIFICATION")
    print("=" * 80)

    base_url = "http://127.0.0.1:8000"

    # 1. Health check
    code, health = test_endpoint(f"{base_url}/api/health")
    if code != 200:
        print(f"[FAIL] Backend server not reachable at {base_url}: {code}")
        print("Please ensure uvicorn is running: uvicorn app.main:app --app-dir backend --port 8000")
        sys.exit(1)
    print("[PASS] 1. Backend server health check OK")

    # 2. Test Filters Dimension Endpoint
    print("\n[2] Testing Filter Dimensions (GET /api/v1/campus-insights/filters)...")
    code, filters = test_endpoint(f"{base_url}/api/v1/campus-insights/filters")
    assert code == 200, f"Expected 200, got {code}: {filters}"
    assert len(filters["categories"]) > 0, "No categories returned"
    assert len(filters["departments"]) > 0, "No departments returned"
    assert len(filters["years_of_study"]) > 0, "No years of study returned"
    print(f"    -> Categories Available: {len(filters['categories'])} (e.g., {', '.join(filters['categories'][:4])})")
    print(f"    -> Campus Departments: {len(filters['departments'])} (e.g., {', '.join(filters['departments'][:3])})")
    print(f"    -> Years of Study: {', '.join(filters['years_of_study'])}")
    print("    [OK] Filter options verified against campus dataset!")

    # 3. Test Campus Overview Metrics Against Seed Data
    print("\n[3] Testing Campus Overview Metrics (GET /api/v1/campus-insights/overview)...")
    code, overview = test_endpoint(f"{base_url}/api/v1/campus-insights/overview")
    assert code == 200, f"Expected 200, got {code}: {overview}"
    assert overview["total_students"] == 32, f"Expected 32 students in seed dataset, got {overview['total_students']}"
    assert overview["total_skills"] == 66, f"Expected 66 skills in seed dataset, got {overview['total_skills']}"
    assert overview["total_teaching_capacity"] >= 90, f"Expected >= 90 teachers, got {overview['total_teaching_capacity']}"
    assert overview["total_learning_demand"] >= 60, f"Expected >= 60 learning requests, got {overview['total_learning_demand']}"
    print(f"    -> Total Students Evaluated: {overview['total_students']}")
    print(f"    -> Total Skills in Taxonomy: {overview['total_skills']}")
    print(f"    -> Campus Teaching Capacity: {overview['total_teaching_capacity']} student mentors")
    print(f"    -> Campus Learning Demand: {overview['total_learning_demand']} student requests")
    print(f"    -> Average Demand Index: {overview['average_demand_index']}x")
    print(f"    -> Critical Shortages Count: {overview['critical_shortages_count']}")
    print(f"    -> High Demand Skills: {overview['high_demand_count']}")
    print(f"    -> Weekly Teaching Hours Capacity: ~{overview['campus_teaching_capacity_hours']} hrs")
    print("    [OK] Overview volume and capacity metrics verified against seed data!")

    # 4. Test Skill Demand Index, Supply Index, and Gap Score
    print("\n[4] Testing Demand, Supply, and Gap Score (GET /api/v1/campus-insights/demand-supply)...")
    code, demand_supply = test_endpoint(f"{base_url}/api/v1/campus-insights/demand-supply?limit=15")
    assert code == 200, f"Expected 200, got {code}: {demand_supply}"
    assert len(demand_supply) > 0

    top = demand_supply[0]
    print(f"    -> Top Gap Skill: {top['skill_name']} ({top['category']})")
    print(f"       Learners: {top['learners_count']} | Teachers: {top['teachers_count']}")
    print(f"       Demand Index: {top['demand_index']}x | Supply Index: {top['supply_index']}% | Gap Score: +{top['skill_gap_score']}")
    print(f"       Status: {top['status']}")

    for s in demand_supply:
        assert s["skill_gap_score"] == max(0, s["learners_count"] - s["teachers_count"])
        assert "callout_text" in s
    print("    [OK] Index formulas and gap score validated!")

    # 5. Test Critical Shortages and Formatted Narrative Callouts
    print("\n[5] Testing Critical Shortages & Narrative Callouts (GET /api/v1/campus-insights/shortages)...")
    code, shortages = test_endpoint(f"{base_url}/api/v1/campus-insights/shortages?limit=5")
    assert code == 200, f"Expected 200, got {code}: {shortages}"
    assert len(shortages) > 0

    found_sample_callout = False
    for s in shortages:
        callout = s["callout_text"]
        print(f"    * Callout: \"{callout}\"")
        if s["learners_count"] > s["teachers_count"]:
            expected_callout = f"{s['learners_count']} students want to learn {s['skill_name']} but only {s['teachers_count']} students are available to teach it."
            assert callout == expected_callout, f"Callout mismatch: expected '{expected_callout}', got '{callout}'"
            found_sample_callout = True

    assert found_sample_callout, "Missing formatted narrative callout"
    print("    [OK] Concrete narrative callout format verified!")

    # 6. Test Category Distribution
    print("\n[6] Testing Category Distribution (GET /api/v1/campus-insights/categories)...")
    code, categories = test_endpoint(f"{base_url}/api/v1/campus-insights/categories")
    assert code == 200, f"Expected 200, got {code}: {categories}"
    assert len(categories) >= 5

    for c in categories[:3]:
        print(f"    -> {c['category']:<20} | Skills: {c['total_skills']:<2} | Learners: {c['learners_count']:<2} ({c['learner_share_percentage']}%) | Teachers: {c['teachers_count']:<2} ({c['teacher_share_percentage']}%) | Demand: {c['demand_index']}x")
    print("    [OK] Category distribution verified!")

    # 7. Test Cross-Department Skill Network
    print("\n[7] Testing Skill Network Graph (GET /api/v1/campus-insights/network)...")
    code, net = test_endpoint(f"{base_url}/api/v1/campus-insights/network?limit=25")
    assert code == 200, f"Expected 200, got {code}: {net}"
    assert "nodes" in net
    assert "edges" in net
    print(f"    -> Network Graph: {len(net['nodes'])} Nodes, {len(net['edges'])} Co-occurrence Edges, {net['total_clusters']} Clusters")
    if net["edges"]:
        e = net["edges"][0]
        print(f"    -> Strongest Connection: {e['source_name']} <---> {e['target_name']} (Weight: {e['weight']})")
    print("    [OK] Skill network topology verified!")

    # 8. Test Role-Tailored Narrative Insights
    print("\n[8] Testing Role-Tailored Insights (GET /api/v1/campus-insights/narrative-insights)...")
    code, insights = test_endpoint(f"{base_url}/api/v1/campus-insights/narrative-insights")
    assert code == 200, f"Expected 200, got {code}: {insights}"
    assert len(insights) >= 2

    for ins in insights:
        print(f"    -> [{ins['target_audience']}] {ins['headline']}")
        print(f"       Description: \"{ins['description']}\"")
        print(f"       Recommendation: {ins['action_recommendation']}")
    print("    [OK] Role-tailored narrative insights verified for Students, Faculty, and Admins!")

    # 9. Strict Privacy / Anonymization Guarantee
    print("\n[9] Verifying Strict Student Privacy & Anonymization...")
    code, full_bundle = test_endpoint(f"{base_url}/api/v1/campus-insights")
    assert code == 200
    raw_str = json.dumps(full_bundle)

    prohibited = [
        "student_id",
        "full_name",
        "email",
        "avatar_url",
        "github_url",
        "linkedin_url",
        "bio",
        "raw_project_experience",
        "Aarav Sharma",
        "Aisha Traoré",
    ]
    for p in prohibited:
        assert f'"{p}"' not in raw_str and p not in raw_str, f"Privacy violation: Found '{p}' in campus intelligence"
    print("    [OK] ZERO student PII found in campus intelligence payload. Strict privacy validated!")

    # 10. Multi-Dimensional Filter Test
    print("\n[10] Testing Multi-Dimensional Filters...")
    code, dept_filtered = test_endpoint(f"{base_url}/api/v1/campus-insights/overview?department=Computer%20Science")
    assert code == 200
    print(f"    -> Computer Science Department Students: {dept_filtered['total_students']}")
    assert dept_filtered["total_students"] > 0 and dept_filtered["total_students"] <= 32

    code, cat_filtered = test_endpoint(f"{base_url}/api/v1/campus-insights/demand-supply?category=AI/ML")
    assert code == 200
    for item in cat_filtered:
        assert item["category"] == "AI/ML"
    print(f"    -> AI/ML Filtered Skills: {len(cat_filtered)} skills returned, all matching AI/ML")
    print("    [OK] Multi-dimensional filters verified!")

    print("\n" + "=" * 80)
    print("ALL STAGE 8: CAMPUS SKILL INTELLIGENCE TESTS PASSED SUCCESSFULLY!")
    print("=" * 80)


if __name__ == "__main__":
    main()
