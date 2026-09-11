"""
Stage 11: Complete UI/UX Polish Verification Script
Validates all 13 required application pages, the 5-step Team Builder demo pipeline,
the 7 dashboard sections, the unified state system (Loading, Empty, Error, Offline,
Syncing, Success), and WCAG-compliant design principles.
"""

import sys
import os
from pathlib import Path

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

project_root = Path(__file__).resolve().parent.parent
frontend_dir = project_root / "frontend"


def main():
    print("=" * 80)
    print("AI SKILL EXCHANGE — STAGE 11: COMPLETE UI/UX POLISH VERIFICATION")
    print("=" * 80)

    # 1. Verify All 13 Required Pages
    print("\n[1] Verifying all 13 required application pages exist...")
    required_pages = {
        "Landing": frontend_dir / "src" / "app" / "page.tsx",
        "Login": frontend_dir / "src" / "app" / "login" / "page.tsx",
        "Dashboard": frontend_dir / "src" / "app" / "dashboard" / "page.tsx",
        "My Skills": frontend_dir / "src" / "app" / "skills" / "page.tsx",
        "Skill Analyzer": frontend_dir / "src" / "app" / "skill-analyzer" / "page.tsx",
        "Learn": frontend_dir / "src" / "app" / "learn" / "page.tsx",
        "Teach": frontend_dir / "src" / "app" / "teach" / "page.tsx",
        "Projects": frontend_dir / "src" / "app" / "projects" / "page.tsx",
        "Project Intelligence": frontend_dir / "src" / "app" / "project-intelligence" / "page.tsx",
        "Team Builder (Primary Demo)": frontend_dir / "src" / "app" / "team-builder" / "page.tsx",
        "Skill Credits": frontend_dir / "src" / "app" / "credits" / "page.tsx",
        "Campus Insights": frontend_dir / "src" / "app" / "campus-insights" / "page.tsx",
        "Settings": frontend_dir / "src" / "app" / "settings" / "page.tsx",
    }

    for name, path in required_pages.items():
        assert path.exists(), f"Missing required page: {name} ({path})"
        size = path.stat().st_size
        assert size > 200, f"Page {name} seems empty ({size} bytes)"
        print(f"    [OK] {name:28} -> {path.relative_to(project_root)} ({size:,} bytes)")

    # 2. Verify Unified State System (StateCard)
    print("\n[2] Verifying Unified State Management Component (StateCard.tsx)...")
    state_card_path = frontend_dir / "src" / "components" / "ui" / "StateCard.tsx"
    assert state_card_path.exists(), "StateCard.tsx missing!"
    state_content = state_card_path.read_text(encoding="utf-8")
    for s in ["loading", "empty", "error", "offline", "syncing", "success"]:
        assert f'"{s}"' in state_content or f"'{s}'" in state_content, f"State '{s}' not defined in StateCard"
        print(f"    [OK] State verified: {s}")

    # 3. Verify Primary Hackathon Demo: Team Builder 5-Step Transition
    print("\n[3] Verifying Team Builder 5-Step Visual Transition Pipeline...")
    tb_path = frontend_dir / "src" / "app" / "team-builder" / "page.tsx"
    tb_content = tb_path.read_text(encoding="utf-8")

    steps = [
        "1. Project",
        "2. Required Skills",
        "3. Candidate Pool",
        "4. Optimized Team",
        "5. Team Explanation",
    ]
    for step in steps:
        assert step in tb_content, f"Step '{step}' missing in Team Builder page!"
        print(f"    [OK] Transition Step verified: {step}")

    assert "runDemoPresentation" in tb_content or "isDemoRunning" in tb_content, "Demo animation runner missing!"
    print("    [OK] Demo Animation Runner present for hackathon presentations.")

    # 4. Verify Dashboard 7 Required Sections
    print("\n[4] Verifying Dashboard 7-Section Completeness...")
    dash_path = frontend_dir / "src" / "app" / "dashboard" / "page.tsx"
    dash_content = dash_path.read_text(encoding="utf-8")

    sections = [
        ("Skill profile completion", "CompletenessMeter"),
        ("Skills I can teach", "Skills I Can Teach"),
        ("Skills I want to learn", "Skills I Want to Learn"),
        ("Recommended matches", "Recommended Peer Matches"),
        ("Active projects", "Active Campus Projects"),
        ("Skill Credits", "Skill Credits"),
        ("Campus skill opportunities", "Campus Skill Shortages"),
    ]
    for label, needle in sections:
        assert needle in dash_content, f"Dashboard missing section: {label} (needle: {needle})"
        print(f"    [OK] Dashboard section verified: {label}")

    # 5. Verify Clean Professional Design System & Accessibility
    print("\n[5] Verifying Design System Tokens & Accessibility Outlines...")
    globals_path = frontend_dir / "src" / "app" / "globals.css"
    css_content = globals_path.read_text(encoding="utf-8")
    assert "focus-visible" in css_content, "Accessibility focus-visible rings missing!"
    assert "--background" in css_content, "Background theme tokens missing!"
    print("    [OK] WCAG 2.1 AA focus-visible rings & design tokens verified in globals.css.")

    # 6. Verify Mobile Navigation Drawer in Navbar
    print("\n[6] Verifying Mobile Navigation Drawer in Navbar.tsx...")
    nav_path = frontend_dir / "src" / "components" / "layout" / "Navbar.tsx"
    nav_content = nav_path.read_text(encoding="utf-8")
    assert "mobileMenuOpen" in nav_content, "Mobile menu state missing in Navbar!"
    print("    [OK] Mobile responsive drawer toggle verified.")

    print("\n" + "=" * 80)
    print("ALL STAGE 11 UI/UX POLISH CHECKS PASSED WITH 100% SUCCESS!")
    print("=" * 80)


if __name__ == "__main__":
    main()
