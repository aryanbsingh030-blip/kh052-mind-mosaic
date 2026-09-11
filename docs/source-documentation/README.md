# AI Skill Exchange

> A campus-wide AI-powered platform that connects students based on complementary skills, learning goals, and project interests.

## What It Does

AI Skill Exchange goes beyond a simple student directory. It uses an **AI-powered Skill Intelligence Engine** to:

- **Extract skills** from natural-language descriptions
- **Match students** with complementary learning needs (learners ↔ teachers)
- **Build project teams** with balanced skill coverage
- **Maintain a credit economy** — earn credits by teaching, spend them learning
- **Analyze campus skill gaps** with real-time analytics

## Architecture

```
Frontend (Next.js)  →  Backend (FastAPI)  →  AI Engine (Python)
                                           ↕
                                        Database (SQLite / PostgreSQL)
```

| Layer | Technology |
|-------|------------|
| Frontend | Next.js, TypeScript, Tailwind CSS, shadcn/ui |
| Backend | Python, FastAPI |
| AI/ML | sentence-transformers, scikit-learn, NetworkX |
| Database | PostgreSQL (production) / SQLite (development) |

## Quick Start

See [DEVELOPMENT.md](./DEVELOPMENT.md) for full setup instructions.

```bash
# 1. Clone and setup
cd ai-skill-exchange
cp .env.example .env

# 2. Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# 3. Frontend
cd frontend
npm install
npm run dev
```

Then open:
- **Frontend**: http://localhost:3000
- **API Docs**: http://localhost:8000/docs

## Project Structure

```
ai-skill-exchange/
├── frontend/       # Next.js web application
├── backend/        # FastAPI REST API
├── ai/             # AI/ML Skill Intelligence Engine
├── database/       # Migrations and seed data
├── tests/          # Test suites
├── docs/           # Architecture documentation
└── scripts/        # Development utilities
```

## License

MIT
