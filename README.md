# KH053-MIND MOSAIC - AI Skill Exchange

AI Skill Exchange is an offline-first, campus-wide platform that connects students through complementary skills, learning goals, availability, and project interests.

## Submission Contents

- `src/project-source-code/` - complete submitted application source: Next.js frontend, FastAPI backend, AI engine, tests, database seeds, original documentation, and developer scripts.
- `docs/` - judge-facing project documentation, architecture visual, workflow diagrams, and a copy of the source documentation.
- `screenshots/` - interface previews based on the implemented Dashboard and Team Builder components.
- `data/` - notes about included sample SQLite data and reproducible seed data.
- `requirements.txt` - combined backend and AI dependency entry point.

## Key Capabilities

- Extract structured skills from natural-language descriptions.
- Match peers with complementary teaching and learning needs.
- Assemble balanced project teams from skills, availability, and project requirements.
- Track a peer-learning credit economy and teaching sessions.
- Surface anonymized campus skill supply, demand, and opportunity insights.
- Continue core experience offline through local storage, SQLite, and configurable AI providers.

## Quick Start

```text
cd src/project-source-code
copy .env.example .env
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

In a second terminal:

```text
cd src/project-source-code/frontend
npm install
npm run dev
```

Open the web app at `http://localhost:3000` and API documentation at `http://localhost:8000/docs`.

## Notes for Evaluators

The original implementation documentation remains in `src/project-source-code/` and is mirrored selectively in `docs/source-documentation/`. `docs/project-documentation.pdf` is the concise judge-facing project overview. The source project intentionally excludes generated dependencies, build output, virtual environments, and caches.

## Team Name

This submission uses the required placeholder `KH052-TeamName`. Replace `mind mosaic` with the official team name before final portal submission if your hackathon requires it.
