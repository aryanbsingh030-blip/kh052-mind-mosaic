# AI Skill Exchange — Development Guide

This guide covers setup, database migrations, seeding, running the FastAPI backend, and running the automated test suites for **Stage 1: Database + Backend Foundation**.

---

## Architecture Overview

```
Frontend (Next.js)  <--->  Backend API (FastAPI)  <--->  Database (SQLite / PostgreSQL)
                                |
                         AI Engine Layer (Modular)
```

- **Backend Framework**: FastAPI (asynchronous ASGI)
- **Database ORM**: SQLAlchemy 2.0 (asyncio) + aiosqlite (local) / asyncpg (PostgreSQL)
- **Database Migrations**: Alembic
- **Authentication**: Salted PBKDF2-HMAC-SHA256 password hashing + PyJWT Bearer Tokens
- **Testing**: pytest + pytest-asyncio + httpx AsyncClient

---

## Prerequisites

- **Python**: 3.11+ (tested on Python 3.14)
- **pip**: 24.0+

---

## 1. Installation

From the project root (`ai-skill-exchange`):

```bash
# Install backend dependencies
pip install -r backend/requirements.txt -r ai/requirements.txt

# Install testing dependencies
pip install pytest pytest-asyncio httpx alembic pyjwt
```

---

## 2. Environment Configuration

Copy the example environment file:

```bash
cp .env.example .env
```

Default configuration connects to local SQLite:
```ini
DATABASE_URL=sqlite+aiosqlite:///./backend/skill_exchange.db
BACKEND_HOST=127.0.0.1
BACKEND_PORT=8000
AI_PROVIDER=mock
JWT_SECRET_KEY=skill-exchange-dev-secret-key-change-in-prod-99382104
```

---

## 3. Database Migrations

Apply Alembic migrations to create all database tables:

```bash
cd backend
alembic upgrade head
cd ..
```

To generate new migrations after modifying ORM models:
```bash
cd backend
alembic revision --autogenerate -m "describe_changes"
alembic upgrade head
cd ..
```

---

## 4. Seeding Development Data

The platform comes with rich, realistic campus seed data:
- **62 Skills** across 13 categories (Programming, AI/ML, Data Science, Web, Mobile, Cloud, Cybersecurity, UI/UX, DevOps, Business, Agriculture, Research, Communication) with parent-child hierarchies and aliases.
- **32 Realistic Students** across 11 university departments with declared teach/learn skills, learning goals, and availability.
- **4 Campus Collaborative Projects** with multi-disciplinary skill requirements.
- **Pre-computed Matches, Completed Sessions, and Credit Transactions**.

To seed the database:

```bash
python scripts/seed.py
```

> **Default Password for All Seeded Accounts**: `Password123!`

---

## 5. Running the Backend Server

Start the FastAPI development server:

```bash
cd backend
uvicorn app.main:app --reload --port 8000 --host 127.0.0.1
```

Or from the root directory:
```bash
uvicorn app.main:app --app-dir backend --reload --port 8000
```

Once running, navigate to:
- **Interactive Swagger UI**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc Documentation**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)
- **Health Check**: [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)

---

## 6. Live API Verification

To run an automated verification against the running server validating all 13 major API categories:

```bash
python scripts/verify_api.py
```

Expected output:
```
=================================================================
AI SKILL EXCHANGE -- LIVE API VERIFICATION
=================================================================
[1] Testing GET /api/health ...
[2] Testing GET / ...
[3] Testing GET /api/v1/skills ... (62 skills retrieved)
[4] Testing GET /api/v1/profiles ... (32 profiles retrieved)
[5] Testing POST /api/v1/auth/login ...
[6] Testing GET /api/v1/auth/me ...
[7] Testing GET /api/v1/skills/student-skills ...
[8] Testing GET /api/v1/learning-goals ...
[9] Testing GET /api/v1/projects ...
[10] Testing GET /api/v1/matches ...
[11] Testing GET /api/v1/credits/balance ...
[12] Testing GET /api/v1/sessions ...
[13] Testing GET /api/v1/activities/campus ...
=================================================================
ALL MAJOR ENDPOINTS TESTED AND VERIFIED SUCCESSFULLY!
=================================================================
```

---

## 7. Running Automated Test Suites

Run the full pytest suite (both backend integration and AI engine unit tests):

```bash
pytest tests/ -v
```

To run only backend tests:
```bash
pytest tests/backend/ -v
```

To run only AI engine tests:
```bash
pytest tests/ai/ -v
```

---

## 8. API Endpoints Reference

### Authentication (`/api/v1/auth`)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/auth/register` | Register new student user, creates profile & grants 100 credits |
| POST | `/api/v1/auth/login` | Authenticate with email/password, returns JWT Bearer token |
| GET | `/api/v1/auth/me` | Fetch authenticated user details and profile |

### Student Profiles (`/api/v1/profiles`)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/profiles` | List student profiles with department filter and keyword search |
| GET | `/api/v1/profiles/me` | Get current logged in student profile |
| GET | `/api/v1/profiles/{id}` | Get detailed student profile with skills and credit balance |
| PUT | `/api/v1/profiles/{id}` | Update student bio, contact links, or year of study |

### Skills & Student Skills (`/api/v1/skills`)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/skills` | List canonical skills (category filter, search, parent-only) |
| POST | `/api/v1/skills` | Create canonical skill in taxonomy with optional parent hierarchy |
| GET | `/api/v1/skills/categories` | List all unique skill categories |
| GET | `/api/v1/skills/{id}` | Get skill details and child sub-skills |
| POST | `/api/v1/skills/student-skills` | Associate skill with student (TEACH or LEARN + proficiency) |
| GET | `/api/v1/skills/student-skills/{student_id}` | Get skills declared by student |
| PUT | `/api/v1/skills/student-skills/{id}` | Update declared skill proficiency or years of experience |
| DELETE | `/api/v1/skills/student-skills/{id}` | Remove skill from student profile |

### Learning Goals (`/api/v1/learning-goals`)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/learning-goals` | Set learning goal with target proficiency and target date |
| GET | `/api/v1/learning-goals/student/{student_id}` | List learning goals for student |
| PUT | `/api/v1/learning-goals/{id}` | Update goal target date or status (IN_PROGRESS, ACHIEVED) |
| DELETE | `/api/v1/learning-goals/{id}` | Delete learning goal |

### Projects & Teams (`/api/v1/projects`, `/api/v1/teams`)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/projects` | Create campus project with required/preferred skills |
| GET | `/api/v1/projects` | List projects with category, status, and keyword filtering |
| GET | `/api/v1/projects/{id}` | Get project details, skill requirements, and formed teams |
| PUT | `/api/v1/projects/{id}` | Update project description, title, or capacity |
| POST | `/api/v1/projects/{id}/requirements` | Add skill requirement to project |
| GET | `/api/v1/projects/{id}/requirements` | List requirements for a project |
| POST | `/api/v1/teams` | Form a team for a project |
| GET | `/api/v1/teams/project/{project_id}` | List teams under a project |
| GET | `/api/v1/teams/{id}` | Get team details and members |
| POST | `/api/v1/teams/{id}/members` | Add student to team with assigned role |
| DELETE | `/api/v1/teams/{id}/members/{id}` | Remove member from team |

### Skill Matches (`/api/v1/matches`)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/matches` | Create match pairing between learner and teacher |
| GET | `/api/v1/matches/student/{student_id}` | List matches for student (learner or teacher) |
| PUT | `/api/v1/matches/{id}/status` | Accept, decline, or complete a match |
| POST | `/api/v1/matches/generate/{student_id}` | Auto-generate complementary peer matches |

### Skill Credit Economy (`/api/v1/credits`)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/credits/transfer` | Transfer skill credits with atomic balance verification |
| GET | `/api/v1/credits/balance/{student_id}` | Get current balance, total earned, total spent |
| GET | `/api/v1/credits/transactions/{student_id}` | List incoming and outgoing credit transactions |

### Teaching & Learning Sessions (`/api/v1/sessions`)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/sessions` | Schedule peer teaching session with meeting link and notes |
| GET | `/api/v1/sessions/student/{student_id}` | List teaching and learning sessions for student |
| GET | `/api/v1/sessions/{id}` | Get session details and learning review log |
| PUT | `/api/v1/sessions/{id}/status` | Complete session (triggers automated credit reward transfer) |
| POST | `/api/v1/sessions/{id}/learning-log` | Learner submits rating and reflection notes |

### Student Availability (`/api/v1/availabilities`)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/availabilities` | Add recurring weekly availability time slot |
| GET | `/api/v1/availabilities/student/{student_id}` | List availability slots for student |
| DELETE | `/api/v1/availabilities/{id}` | Remove availability slot |

### Skill Assessments (`/api/v1/assessments`)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/assessments` | Record peer/mentor proficiency validation assessment |
| GET | `/api/v1/assessments/student/{student_id}` | List assessments recorded for student |

### Campus Activity Feed (`/api/v1/activities`)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/activities/campus` | Campus-wide audit and milestone activity stream |
| GET | `/api/v1/activities/student/{student_id}` | Activity feed for a specific student |

---

## 7. Stage 2: Student Profile System (Frontend Web App)

The presentation layer is built with **Next.js 16 (App Router), React, TypeScript, and Tailwind CSS** in the `frontend/` directory.

### Running the Frontend Locally
```bash
cd frontend
npm run dev -- --port 3000
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Key Frontend Routes
1. **`/dashboard`**: High-level student command center with:
   - Live Skill Credit balance pill and transaction overview
   - Profile Readiness meter with direct milestone deep-links
   - Teaching Capabilities card grid with proficiency badges
   - Active Learning Goals progress overview
   - Live Campus Activity stream
2. **`/profile`**: Complete student profile management:
   - Academic details (full name, department, year of study, headline bio)
   - **Natural Language Project Experience**: Free-form multi-line editor for describing past projects and builds in conversational English for future AI Skill Analyzer extraction
   - Technical and project interests tags
   - Weekly recurring availability schedule planner with day-of-week and time-slot selectors
3. **`/skills`**: Interactive dual-tab skills matrix:
   - **Skills I Can Teach** tab with experience years and application stories
   - **Skills I Want to Learn** tab
   - Modal drawer connecting to canonical campus taxonomy (62 skills across 13 categories)
   - Proficiency selector (`BEGINNER`, `INTERMEDIATE`, `ADVANCED`, `EXPERT`)
   - Skill card deletion and real-time updates
4. **`/learning-goals`**: Milestone and target proficiency manager:
   - Status filtering (`ALL`, `NOT_STARTED`, `IN_PROGRESS`, `ACHIEVED`)
   - Target proficiency benchmarks and deadline date pickers
   - One-click status progression (`Start`, `Mark Done`, `Reopen`)
   - Goal deletion with confirmation

### Instant Seed Student Switching
The navigation header includes an interactive student switcher dropdown. You can switch identities between any of the 32 seeded fictional university students (e.g. *Aarav Sharma*, *Elena Rostova*, *Marcus Vance*) with zero credential friction to test matching, teaching, and learning perspectives.

### Running Automated Stage 2 Verification
```bash
python scripts/verify_stage2.py
```
This tests all Next.js SSR routes on port 3000 and executes an end-to-end profile editing, skill adding/removing, learning goal progression, and availability scheduling workflow.

---

## 8. Stage 3: AI Skill Intelligence Engine

The Skill Intelligence Engine transforms unstructured conversational descriptions into structured, normalized skill records without directly modifying the database.

### Endpoints
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/ai/analyze-skills` | Analyze text narrative, returns normalized skills with confidence, proficiency, evidence, and source |
| POST | `/api/ai/analyze-skills` | Direct endpoint alias for `/api/v1/ai/analyze-skills` |

### Architecture & Swappable Providers
1. **`AIProvider` Interface**:
   - `OnlineAIProvider`: Cloud LLMs via API key.
   - `LocalAIProvider`: Local Ollama / vLLM instances (`http://localhost:11434`).
   - `RuleBasedFallbackProvider`: Deterministic regex, multi-word n-gram scanning (1-4 grams), alias resolution table, context-based linguistic proficiency estimator, and hierarchy expansion DAG.
2. **Offline & Fallback Resilience**:
   - If internet is down, online cloud AI is unavailable, or local Ollama is offline, the system automatically falls back to `RuleBasedFallbackProvider` with 100% uptime and deterministic behavior.
3. **Skill Normalization Pipeline**:
   Raw text &rarr; Extraction &rarr; Canonical Normalization &rarr; Alias Resolution &rarr; Proficiency Estimation &rarr; Skill Hierarchy Mapping &rarr; Confidence Scoring.
4. **Zero-DB Direct Mutation**:
   The AI engine returns recommended candidate items. The user reviews and clicks **Accept** (or **Accept All**), which invokes validated profile endpoints.

### Running Stage 3 Verification
```bash
python scripts/verify_stage3.py
```
Validates the canonical Plant Disease Classifier benchmark, multi-domain tests (Web, Cybersecurity, UI/UX, Data Science, Cloud), direct API aliases, and simulated offline fallback operation.

---

## 9. Stage 5: Project Intelligence Engine & UI

The Project Intelligence Engine transforms natural language project proposals into structured engineering intelligence, required skills taxonomy, NetworkX topological skill graphs, personal gap analysis, and multi-disciplinary team roles.

### Endpoints
| Method | Endpoint | Description |
|---|---|---|
| POST | `/ai/analyze-project` | Primary endpoint: Analyzes natural language project description, returns Pydantic-validated technical intelligence |
| POST | `/api/v1/ai/analyze-project` | Versioned alias for project analysis |
| POST | `/api/ai/analyze-project` | Direct prefix alias for project analysis |

### Pipeline Stages
1. **Project Description**: Accepts raw natural language text or `description`.
2. **Project Understanding**: Infers project title, executive summary, architectural complexity (`INTERMEDIATE` / `ADVANCED`), and target team size.
3. **Domain Extraction**: Identifies primary application domains (e.g. `Agriculture + AI`, `Robotics & Autonomous`, `Blockchain & Web3`).
4. **Required Skill Extraction**: Extracts technical skills from domain packages and keyword mentions.
5. **Skill Normalization**: Deduplicates and maps skills to canonical taxonomy and alias lookup.
6. **Skill Hierarchy Expansion**: Adds foundational prerequisites via `SkillGraph` without over-expanding.
7. **Importance Scoring**: Calibrates `MANDATORY` vs `PREFERRED` importance levels with numerical weights.
8. **NetworkX Skill Graph**: Builds topological graph with Project Hub, Domain nodes, Skill nodes, and synergy edges; calculates NetworkX degree centrality.
9. **Personal Skill Gap Analysis**: Compares requirements against owner student profile to identify missing capabilities.
10. **Team Roles Synthesis**: Generates suggested multi-disciplinary roles with associated skills.

### Presentation UI (`/projects/new`)
- **Natural Language Input**: Free-form text input with pre-built sample inspiration prompts.
- **Executive Summary**: Title, domain badge, complexity gauge, and team size recommendation.
- **Visual NetworkX Skill Graph**: Interactive SVG graph with orbit rings, centrality-proportional node sizing, edge weights, and node inspection drawer.
- **Required Skills Manager**: Editable skill list with one-click `MANDATORY` &harr; `PREFERRED` toggles, skill removal, and add-skill drawer.
- **Personal Gap Analysis**: Real-time badge list of missing skills for the active user.
- **Suggested Team Roles**: Multi-disciplinary role breakdown.
- **Save Project**: Persists finalized project and skill requirements to the database via `POST /api/v1/projects`.

### Running Stage 5 Automated Tests & Verification
```bash
# Run unit & integration test suite (10+ diverse project scenarios)
pytest tests/ai/test_project_analyzer.py tests/backend/test_project_intelligence_endpoint.py -v

# Run live end-to-end verification
python scripts/verify_stage5.py
```


