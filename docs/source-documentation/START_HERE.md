# AI Skill Exchange — Refined Submission Package

This folder combines the strongest source implementation from the supplied project archives into one clean, portable project.

## What is included
- `frontend/` — Next.js/TypeScript application source
- `backend/` — FastAPI backend, migrations, and backend requirements
- `ai/` — skill intelligence, matching, project analysis, team building, embeddings, and guardrails
- `tests/` — AI and backend test suites
- `scripts/` — seed, verification, demo, migration, and offline utilities
- `docs/` — architecture and offline-first documentation
- `DEMO_GUIDE.md` — hackathon demonstration flow
- `docker-compose.yml` — container setup
- `.env.example` — environment configuration template

## Clean-up performed
Generated caches, Python bytecode, frontend dependencies (`node_modules`), and the generated Next.js build (`.next`) were removed. These should be regenerated locally with the documented install/build commands.

## Recommended first steps
1. Read `README.md` and `DEMO_GUIDE.md`.
2. Copy `.env.example` to `.env` and configure required values.
3. Install backend and frontend dependencies using the project documentation.
4. Run the verification/test scripts before the final hackathon demo.
