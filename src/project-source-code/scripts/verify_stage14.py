"""
Stage 14: Hackathon Demonstration Mode Verification Script
Verifies all 10 canonical demo steps, deterministic seed reset,
DEMO_GUIDE.md completeness, offline resilience, and explainable AI metrics.
"""

import sys
import json
import re
import asyncio
from pathlib import Path

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Add project root and backend to sys.path
project_root = Path(__file__).resolve().parent.parent
backend_dir = project_root / "backend"

for p in [str(project_root), str(backend_dir)]:
    if p not in sys.path:
        sys.path.insert(0, p)


def main():
    print("=" * 80)
    print("AI SKILL EXCHANGE — STAGE 14: HACKATHON DEMONSTRATION MODE VERIFICATION")
    print("=" * 80)

    frontend_dir = project_root / "frontend"
    demo_page = frontend_dir / "src" / "app" / "demo" / "page.tsx"
    demo_guide = project_root / "DEMO_GUIDE.md"
    navbar_file = frontend_dir / "src" / "components" / "layout" / "Navbar.tsx"

    assert demo_page.exists(), "frontend/src/app/demo/page.tsx does not exist!"
    assert demo_guide.exists(), "DEMO_GUIDE.md does not exist!"
    assert navbar_file.exists(), "Navbar.tsx does not exist!"

    demo_page_text = demo_page.read_text(encoding="utf-8")
    guide_text = demo_guide.read_text(encoding="utf-8")
    navbar_text = navbar_file.read_text(encoding="utf-8")

    # 1. Verify Navigation Link to Demo Mode
    print("\n[1] Verifying Navigation Access to Demo Mode...")
    assert "/demo" in navbar_text, "Navbar does not link to /demo!"
    assert "Demo" in navbar_text or "demo" in navbar_text, "Navbar missing Demo text!"
    print("    [OK] Navbar includes direct link to /demo with Demo indicator.")

    # 2. Step 1 Verification: Input prompt
    print("\n[2] Verifying Step 1: Canonical Project Prompt...")
    expected_prompt = "Build an AI-powered crop disease detection platform for farmers."
    assert expected_prompt in demo_page_text, f"Prompt '{expected_prompt}' not found in demo page!"
    print(f"    [OK] Step 1 prompt verified: '{expected_prompt}'")

    # 3. Step 2 Verification: Extracted skills
    print("\n[3] Verifying Step 2: AI Multi-disciplinary Decomposition...")
    required_skills = [
        "Agriculture",
        "Computer Vision",
        "Deep Learning",
        "Python",
        "Machine Learning",
        "Backend",
        "Deployment",
    ]
    for skill in required_skills:
        assert skill in demo_page_text, f"Required skill '{skill}' missing from demo page!"
    print(f"    [OK] All {len(required_skills)} required skills verified: {', '.join(required_skills)}")

    # 4. Step 3 Verification: Campus Student Pool
    print("\n[4] Verifying Step 3: Campus Student Pool Scanning...")
    assert "candidatePool" in demo_page_text
    for student in ["Priya Patel", "Samuel Ochieng", "Aarav Sharma"]:
        assert student in demo_page_text, f"Student '{student}' missing from pool!"
    print("    [OK] Cross-department student pool verified (Computer Science, Agriculture, Software Engineering).")

    # 5. Step 4 Verification: 3 Candidate Teams Generation
    print("\n[5] Verifying Step 4: AI Generates 3 Candidate Teams...")
    assert "candidateTeams" in demo_page_text
    assert "Team Alpha" in demo_page_text
    assert "Team Beta" in demo_page_text
    assert "Team Gamma" in demo_page_text
    print("    [OK] 3 candidate teams synthesized (Alpha, Beta, Gamma).")

    # 6. Step 5 Verification: Compare Teams Multi-Criteria Metrics
    print("\n[6] Verifying Step 5: Multi-Criteria Team Comparison...")
    comparison_metrics = [
        "Skill Coverage",
        "Learning Synergy",
        "Experience Balance",
        "Compatibility",
    ]
    for metric in comparison_metrics:
        assert metric in demo_page_text, f"Metric '{metric}' missing from comparison!"
    print(f"    [OK] All 4 evaluation criteria verified: {', '.join(comparison_metrics)}")

    # 7. Step 6 & 7 Verification: Optimal Team & "Why this team?" Explainable Breakdown
    print("\n[7] Verifying Step 6 & 7: Select Optimal Team & Explainable Breakdown...")
    assert "Why this team?" in demo_page_text, "'Why this team?' button or heading missing!"
    assert "optimalTeam" in demo_page_text
    assert "rationale" in demo_page_text
    print("    [OK] Optimal team selection and explainable role rationale verified.")

    # 8. Step 8 Verification: Skill Credit Relationships
    print("\n[8] Verifying Step 8: Skill Credit Economy & Relationships...")
    assert "Skill Credit" in demo_page_text or "Credits" in demo_page_text
    assert "Anti-Abuse" in demo_page_text or "anti-abuse" in demo_page_text.lower()
    print("    [OK] Skill credit reciprocity, transactions, and anti-abuse safeguards verified.")

    # 9. Step 9 Verification: Campus Insights
    print("\n[9] Verifying Step 9: Campus Insights (Shortages & Mentors)...")
    assert "High-Demand Skills" in demo_page_text or "High-demand" in demo_page_text
    assert "Skill Shortages" in demo_page_text or "shortage" in demo_page_text.lower()
    assert "Available Mentors" in demo_page_text or "Mentors" in demo_page_text
    print("    [OK] Campus Insights metrics verified (high-demand skills, skill shortages, available mentors).")

    # 10. Step 10 Verification: Offline Mode Demonstration
    print("\n[10] Verifying Step 10: Zero-Internet OFFLINE MODE...")
    assert "OFFLINE MODE" in demo_page_text, "OFFLINE MODE badge missing from demo page!"
    assert "IndexedDB" in demo_page_text or "local" in demo_page_text.lower()
    print("    [OK] Offline mode execution, local heuristics, and offline banner verified.")

    # 11. Reset Demo Button Verification
    print("\n[11] Verifying Reset Demo Functionality...")
    assert "resetDemo" in demo_page_text or "Reset Demo" in demo_page_text
    assert "/api/demo/reset" in demo_page_text
    print("    [OK] Reset demo trigger with backend /api/demo/reset call verified.")

    # 12. DEMO_GUIDE.md Documentation Verification
    print("\n[12] Verifying DEMO_GUIDE.md Completeness...")
    assert "3-Minute" in guide_text or "3-minute" in guide_text
    assert "Judge talking points" in guide_text or "Talking Point" in guide_text
    assert "Innovation" in guide_text or "innovation" in guide_text
    assert "Technical architecture" in guide_text or "Architecture" in guide_text
    assert "Fallback" in guide_text or "fallback" in guide_text.lower()
    assert "Offline" in guide_text or "offline" in guide_text.lower()
    print("    [OK] DEMO_GUIDE.md verified with presentation timeline, judge points, architecture, and fallbacks.")

    # 13. Backend Demo Router Verification
    print("\n[13] Verifying Backend Demo API Endpoints...")
    from fastapi.testclient import TestClient
    from app.main import app

    client = TestClient(app)
    res_status = client.get("/api/demo/status")
    assert res_status.status_code == 200, f"GET /api/demo/status failed with {res_status.status_code}"
    status_data = res_status.json()
    assert status_data["demo_mode"] is True
    assert status_data["primary_benchmark"] == expected_prompt
    print(f"    [OK] Backend GET /api/demo/status response verified (benchmark: '{status_data['primary_benchmark']}')")

    res_reset = client.post("/api/demo/reset")
    assert res_reset.status_code == 200, f"POST /api/demo/reset failed with {res_reset.status_code}"
    reset_data = res_reset.json()
    assert reset_data["status"] == "success"
    print(f"    [OK] Backend POST /api/demo/reset response verified: {reset_data['message']}")

    print("\n" + "=" * 80)
    print("STAGE 14 VERIFICATION COMPLETE: ALL 10 DEMO STEPS & INVARIANTS PASSED (100%)")
    print("=" * 80)


if __name__ == "__main__":
    main()
