import requests
import json

payload = {
    "project_title": "AI-based Crop Disease Detection",
    "project_description": "Computer vision and deep learning platform for agricultural leaf pathology detection.",
    "team_size": 4,
    "required_skills": [
        {"skill_name": "Computer Vision", "importance": "high", "weight": 1.0},
        {"skill_name": "Deep Learning", "importance": "high", "weight": 1.0},
        {"skill_name": "Python", "importance": "high", "weight": 1.0},
        {"skill_name": "Frontend", "importance": "medium", "weight": 0.8},
        {"skill_name": "Backend", "importance": "medium", "weight": 0.8}
    ]
}

res = requests.post("http://127.0.0.1:8000/teams/generate", json=payload, timeout=10)
print("STATUS:", res.status_code)
if res.status_code != 200:
    print("RESPONSE ERROR:", res.text)
else:
    data = res.json()
    print("Candidates:", len(data.get("candidates", [])))
    top = data["candidates"][0]
    print("Score:", top["metrics"]["overall_score"])
    print("Coverage:", top["metrics"]["skill_coverage"])
    print("Members:")
    for m in top["members"]:
        print(f"  - {m['full_name']} | Role: {m['role']} | {m['rationale']}")
    
    # Now test replacement
    replace_req = {
        "project_title": payload["project_title"],
        "project_description": payload["project_description"],
        "required_skills": payload["required_skills"],
        "current_member_ids": [m["student_id"] for m in top["members"]],
        "member_id_to_replace": top["members"][0]["student_id"],
        "team_size": 4,
        "max_recommendations": 3,
    }
    r2 = requests.post("http://127.0.0.1:8000/teams/replace-member", json=replace_req, timeout=10)
    print("\nREPLACE STATUS:", r2.status_code)
    if r2.status_code == 200:
        rep_data = r2.json()
        print("Replacement candidates:", len(rep_data.get("recommendations", [])))
        for rec in rep_data.get("recommendations", []):
            print(f"  - {rec['full_name']} (Delta: {rec['score_delta']:+0.1f}%, New Score: {rec['projected_team_score']}%)")
            print(f"    Rationale: {rec['rationale']}")
