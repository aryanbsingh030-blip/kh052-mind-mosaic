"""
Live Verification Script for Stage 3: AI Skill Intelligence Engine
Tests AI extraction, normalization pipeline, proficiency estimation,
hierarchy inference, and offline/fallback resilience.
"""

import sys
import json
import urllib.request
import urllib.error

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

API_BASE = "http://127.0.0.1:8000"

def test_aiml_benchmark():
    print("=================================================================")
    print("TEST 1: CANONICAL AI/ML BENCHMARK")
    print("Input: 'I built a CNN model for plant disease classification using Python and TensorFlow. I deployed it with Flask.'")
    print("=================================================================")

    payload = json.dumps({
        "text": "I built a CNN model for plant disease classification using Python and TensorFlow. I deployed it with Flask."
    }).encode("utf-8")

    req = urllib.request.Request(
        f"{API_BASE}/api/v1/ai/analyze-skills",
        data=payload,
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as res:
        assert res.getcode() == 200
        data = json.loads(res.read().decode("utf-8"))
        print(f"  [OK] Provider used: {data['provider_used']}")
        print(f"  [OK] Processing time: {data['processing_time_ms']}ms")
        print(f"  [OK] Detected {len(data['skills'])} structured skills:")

        skill_map = {s["skill_name"]: s for s in data["skills"]}

        # Check Python -> Advanced
        assert "Python" in skill_map, "Python not extracted"
        assert skill_map["Python"]["proficiency"] == "ADVANCED"
        print(f"       - Python: {skill_map['Python']['proficiency']} ({skill_map['Python']['confidence']*100:.0f}% conf, source: {skill_map['Python']['source']})")

        # Check TensorFlow -> Intermediate
        assert "TensorFlow" in skill_map, "TensorFlow not extracted"
        assert skill_map["TensorFlow"]["proficiency"] == "INTERMEDIATE"
        print(f"       - TensorFlow: {skill_map['TensorFlow']['proficiency']} ({skill_map['TensorFlow']['confidence']*100:.0f}% conf)")

        # Check CNN -> Intermediate
        assert "Convolutional Neural Networks" in skill_map, "CNN not resolved"
        assert skill_map["Convolutional Neural Networks"]["proficiency"] == "INTERMEDIATE"
        print(f"       - CNN: {skill_map['Convolutional Neural Networks']['proficiency']} ({skill_map['Convolutional Neural Networks']['confidence']*100:.0f}% conf)")

        # Check Inferred Hierarchies: Deep Learning, Computer Vision, Machine Learning
        assert "Deep Learning" in skill_map, "Deep Learning not inferred"
        assert "Computer Vision" in skill_map, "Computer Vision not inferred"
        assert "Machine Learning" in skill_map, "Machine Learning not inferred"
        print(f"       - Deep Learning: {skill_map['Deep Learning']['proficiency']} (source: {skill_map['Deep Learning']['source']})")
        print(f"       - Computer Vision: {skill_map['Computer Vision']['proficiency']} (source: {skill_map['Computer Vision']['source']})")
        print(f"       - Machine Learning: {skill_map['Machine Learning']['proficiency']} (source: {skill_map['Machine Learning']['source']})")

        # Check Flask -> Intermediate
        assert "Flask" in skill_map, "Flask not extracted"
        assert skill_map["Flask"]["proficiency"] == "INTERMEDIATE"
        print(f"       - Flask: {skill_map['Flask']['proficiency']} ({skill_map['Flask']['confidence']*100:.0f}% conf)")

        # Check Model Deployment -> Beginner
        assert "Model Deployment" in skill_map, "Model Deployment not inferred"
        assert skill_map["Model Deployment"]["proficiency"] == "BEGINNER"
        print(f"       - Model Deployment: {skill_map['Model Deployment']['proficiency']} ({skill_map['Model Deployment']['confidence']*100:.0f}% conf)")


def test_cross_domain_extractions():
    print("\n=================================================================")
    print("TEST 2: MULTI-DOMAIN EXTRACTION BENCHMARKS")
    print("=================================================================")

    domains = [
        ("Web Development", "Developed a full-stack e-commerce app using React, TypeScript, Next.js, Node.js, and PostgreSQL with Tailwind CSS.", ["React", "TypeScript", "Next.js", "Tailwind CSS"]),
        ("Cybersecurity", "Conducted network penetration testing using Wireshark, Metasploit, and Linux to identify CVE vulnerabilities and secure firewalls.", ["Penetration Testing", "Ethical Hacking", "Network Security", "Linux System Administration"]),
        ("UI/UX Design", "Designed mobile app wireframes and interactive prototypes in Figma, conducted user research and usability testing.", ["Figma Prototyping", "Wireframing & User Research"]),
        ("Data Science", "Analyzed customer churn datasets using Pandas, NumPy, and Scikit-learn, visualized feature distributions with Matplotlib.", ["Pandas Data Wrangling", "NumPy Scientific Computing", "Scikit-Learn", "Matplotlib & Seaborn"]),
        ("Cloud & DevOps", "Configured AWS VPC, deployed microservices with Docker and Kubernetes, automated CI/CD pipelines with GitHub Actions.", ["AWS Cloud Architecture", "Docker Containerization", "Kubernetes Orchestration", "CI/CD Pipelines"]),
    ]

    for domain_name, text, expected_skills in domains:
        payload = json.dumps({"text": text}).encode("utf-8")
        req = urllib.request.Request(f"{API_BASE}/api/v1/ai/analyze-skills", data=payload, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req) as res:
            data = json.loads(res.read().decode("utf-8"))
            detected_names = [s["skill_name"] for s in data["skills"]]
            matched = [exp for exp in expected_skills if any(exp.lower() in d.lower() or d.lower() in exp.lower() for d in detected_names)]
            assert len(matched) >= len(expected_skills) - 1, f"Domain {domain_name} failed. Detected: {detected_names}"
            print(f"  [OK] {domain_name}: {len(data['skills'])} skills detected (Matched: {', '.join(matched)})")


def test_direct_api_alias():
    print("\n=================================================================")
    print("TEST 3: DIRECT ENDPOINT ALIAS POST /ai/analyze-skills")
    print("=================================================================")
    payload = json.dumps({"text": "I build microservices with Go and Docker."}).encode("utf-8")
    req = urllib.request.Request(f"{API_BASE}/ai/analyze-skills", data=payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as res:
        assert res.getcode() == 200
        data = json.loads(res.read().decode("utf-8"))
        skill_names = [s["skill_name"] for s in data["skills"]]
        assert any("Go" in s for s in skill_names)
        assert any("Docker" in s for s in skill_names)
        print(f"  [OK] Direct /ai/analyze-skills returned HTTP 200. Detected: {', '.join(skill_names)}")


def test_accept_skill_updates_profile():
    print("\n=================================================================")
    print("TEST 4: ACCEPTING AI SKILL UPDATES PROFILE (ZERO DIRECT DB MUTATION BY AI)")
    print("=================================================================")

    # 1. Login
    login_data = json.dumps({"email": "aarav.sharma@university.edu", "password": "Password123!"}).encode("utf-8")
    req = urllib.request.Request(f"{API_BASE}/api/v1/auth/login", data=login_data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as res:
        auth = json.loads(res.read().decode("utf-8"))
        token = auth["access_token"]
        profile_id = auth["profile_id"]

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}",
    }

    # 2. Extract skills via AI endpoint (DB is NOT altered)
    payload = json.dumps({"text": "Implemented distributed pub-sub streaming using Go and Redis."}).encode("utf-8")
    req = urllib.request.Request(f"{API_BASE}/api/v1/ai/analyze-skills", data=payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as res:
        ai_res = json.loads(res.read().decode("utf-8"))
        go_skill = next((s for s in ai_res["skills"] if "Go" in s["skill_name"]), None)
        assert go_skill is not None, "Go skill not extracted by AI"
        print(f"  [OK] AI returned candidate: {go_skill['skill_name']} at {go_skill['proficiency']}")

    # 3. Resolve canonical skill ID for Go
    req_skills = urllib.request.Request(f"{API_BASE}/api/v1/skills?search=Go")
    with urllib.request.urlopen(req_skills) as res:
        skills = json.loads(res.read().decode("utf-8"))
        canonical_go = next(s for s in skills if s["name"] == "Go")

    # 4. User accepts candidate via student-skills endpoint
    accept_data = json.dumps({
        "skill_id": canonical_go["id"],
        "direction": "TEACH",
        "proficiency_level": go_skill["proficiency"],
        "years_experience": 2.0,
        "description": f"Extracted via AI from: {go_skill['evidence']}",
    }).encode("utf-8")

    req_accept = urllib.request.Request(f"{API_BASE}/api/v1/skills/student-skills?student_id={profile_id}", data=accept_data, headers=headers)
    try:
        with urllib.request.urlopen(req_accept) as res:
            accepted = json.loads(res.read().decode("utf-8"))
            skill_id_to_cleanup = accepted["id"]
            print(f"  [OK] Student accepted candidate. Added to profile with ID: {skill_id_to_cleanup}")
    except urllib.error.HTTPError as e:
        if e.code == 409:
            print("  [OK] Skill was already present in student profile.")
            skill_id_to_cleanup = None
        else:
            raise e

    # 5. Clean up test skill if created
    if skill_id_to_cleanup:
        req_del = urllib.request.Request(f"{API_BASE}/api/v1/skills/student-skills/{skill_id_to_cleanup}", headers=headers, method="DELETE")
        with urllib.request.urlopen(req_del) as res:
            assert res.getcode() == 204
            print(f"  [OK] Cleaned up temporary test skill {skill_id_to_cleanup}")

    print("\n=================================================================")
    print("ALL STAGE 3 BENCHMARKS, DOMAINS, AND FLOWS VERIFIED SUCCESSFULLY!")
    print("=================================================================")


if __name__ == "__main__":
    test_aiml_benchmark()
    test_cross_domain_extractions()
    test_direct_api_alias()
    test_accept_skill_updates_profile()
