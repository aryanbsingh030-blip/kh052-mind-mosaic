"""
Local Offline Development Launcher for AI Skill Exchange
Starts the backend and frontend in standalone offline-ready mode
with zero external internet dependencies.
"""

import sys
import os
import subprocess
import time
from pathlib import Path

def main():
    print("=" * 80)
    print("AI SKILL EXCHANGE — STANDALONE OFFLINE ENVIRONMENT LAUNCHER")
    print("=" * 80)

    project_root = Path(__file__).resolve().parent.parent
    backend_dir = project_root / "backend"
    frontend_dir = project_root / "frontend"
    db_file = project_root / "skill_exchange.db"

    # 1. Check local SQLite database
    print("\n[1] Checking local database status...")
    if db_file.exists():
        size_kb = db_file.stat().st_size / 1024
        print(f"    [OK] Local database ready: {db_file.name} ({size_kb:.1f} KB)")
    else:
        print("    [!] Local database not found. Creating and seeding tables locally...")
        sys.path.insert(0, str(backend_dir))
        from app.database import create_tables
        import asyncio
        asyncio.run(create_tables())
        print("    [OK] Database initialized successfully.")

    # 2. Configure Environment for Standalone Offline Execution
    print("\n[2] Configuring offline environment variables...")
    os.environ["AI_PROVIDER"] = "mock"
    os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{db_file}"
    os.environ["ALLOW_NEGATIVE_BALANCE"] = "false"
    os.environ["NODE_ENV"] = "development"
    print("    [OK] AI Provider set to local mock (no external LLM API calls required)")
    print(f"    [OK] Database set to local SQLite: {db_file.name}")
    print("    [OK] Negative balances strictly prohibited")

    # 3. Instruction for running standalone
    print("\n[3] Ready to run completely offline without internet connection!")
    print("    To start backend:")
    print("       python -m uvicorn app.main:app --app-dir backend --port 8000")
    print("    To start frontend:")
    print("       cd frontend && npm.cmd run dev")
    print("\n    IndexedDB and Service Worker will automatically cache campus data.")
    print("=" * 80)

if __name__ == "__main__":
    main()
