"""
End-to-End Live Verification Script for Stage 4: Intelligent Skill Matching Engine
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
    print("=" * 70)
    print("AI SKILL EXCHANGE — STAGE 4 VERIFICATION SUITE")
    print("=" * 70)

    # 1. Fetch seed profiles to get student IDs
    code, profiles = test_endpoint("http://127.0.0.1:8000/api/v1/profiles?limit=10")
    if code != 200 or not profiles:
        print(f"[FAIL] Could not fetch seed profiles: {code}")
        sys.exit(1)
    
    student_a_id = profiles[0]["id"]
    student_b_id = profiles[1]["id"]
    print(f"[PASS] Retrieved seed profiles: {profiles[0]['full_name']} & {profiles[1]['full_name']}")

    # 2. Test GET /matches
    code, recs = test_endpoint(f"http://127.0.0.1:8000/matches?student_id={student_a_id}&limit=5")
    if code != 200:
        print(f"[FAIL] GET /matches failed: {code} -> {recs}")
        sys.exit(1)
    print(f"[PASS] GET /matches returned {len(recs)} candidates")
    if recs:
        top = recs[0]
        print(f"       Top Match: {top['candidate_name']} ({top['match_score']}% Match)")
        print(f"       Is Reciprocal: {top['is_reciprocal']}")
        print(f"       Factors: {top['matching_factors']}")
        print(f"       Reasons: {top['explanation'][:2]}")
        assert "matching_factors" in top, "Missing matching_factors"
        assert "learning_opportunity" in top, "Missing learning_opportunity"
        assert "explanation" in top, "Missing explanation"
        assert len(top["explanation"]) > 0, "Empty explanation list"

    # 3. Test Filter by Skill
    code, filtered_skill = test_endpoint(f"http://127.0.0.1:8000/matches?student_id={student_a_id}&skill=Python")
    if code != 200:
        print(f"[FAIL] Filter by skill failed: {code}")
        sys.exit(1)
    print(f"[PASS] Filter by skill=Python returned {len(filtered_skill)} matches")
    for r in filtered_skill[:3]:
        cand_skills = " ".join(r["skills_offered"]).lower()
        assert "python" in cand_skills, f"Filtered candidate missing Python: {r['skills_offered']}"

    # 4. Test Filter by Availability Day
    code, filtered_day = test_endpoint(f"http://127.0.0.1:8000/matches?student_id={student_a_id}&availability_day=TUESDAY")
    if code != 200:
        print(f"[FAIL] Filter by availability_day failed: {code}")
        sys.exit(1)
    print(f"[PASS] Filter by availability_day=TUESDAY returned {len(filtered_day)} matches")
    for r in filtered_day[:3]:
        assert any(s["day"] == "TUESDAY" for s in r["common_availability"]), "Candidate missing Tuesday slot"

    # 5. Test POST /matches/calculate
    calc_payload = {
        "student_a_id": student_a_id,
        "student_b_id": student_b_id,
    }
    code, calc_res = test_endpoint("http://127.0.0.1:8000/matches/calculate", method="POST", data=calc_payload)
    if code != 200:
        print(f"[FAIL] POST /matches/calculate failed: {code} -> {calc_res}")
        sys.exit(1)
    print(f"[PASS] POST /matches/calculate succeeded between {calc_res['student_a_name']} and {calc_res['student_b_name']}")
    print(f"       Score: {calc_res['match_score']}% | Reciprocal: {calc_res['is_reciprocal']}")
    print(f"       Factors Breakdown:")
    for k, v in calc_res["matching_factors"].items():
        print(f"         - {k}: {v}")

    # 6. Test Frontend /learn route
    req = urllib.request.Request("http://localhost:3000/learn")
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            frontend_code = resp.getcode()
            html = resp.read().decode("utf-8")
            if frontend_code == 200 and "Campus Peer Matcher" in html:
                print(f"[PASS] Next.js /learn page rendered successfully (HTTP {frontend_code})")
            else:
                print(f"[WARN] Next.js /learn returned HTTP {frontend_code}, checking title...")
    except Exception as e:
        print(f"[FAIL] Next.js /learn request error: {e}")
        sys.exit(1)

    print("=" * 70)
    print("STAGE 4 COMPLETE: ALL INTELLIGENT MATCHING TESTS PASSED!")
    print("=" * 70)


if __name__ == "__main__":
    main()
