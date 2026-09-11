# AI Skill Exchange — Deployment & Operations Manual

This comprehensive guide details the deployment architectures, procedures, and configuration strategies for running AI Skill Exchange across:
1. **Local Development** (Zero-config, fast iteration)
2. **Offline Demo Mode** (PWA, IndexedDB, local heuristics/Ollama)
3. **Online Production Deployment** (Docker Compose, Next.js, FastAPI, PostgreSQL)

---

## 1. Architecture Modes Overview

```
                                    ┌────────────────────────────────────────────────────────┐
                                    │               DEPLOYMENT MODES MATRIX                  │
                                    └────────────────────────────────────────────────────────┘

┌───────────────────────────────┬───────────────────────────────┬───────────────────────────────┐
│       Local Development       │       Offline Demo Mode       │       Online Production       │
├───────────────────────────────┼───────────────────────────────┼───────────────────────────────┤
│ • Next.js (npm run dev :3000) │ • PWA Service Worker Cached   │ • Next.js Production (:3000)  │
│ • FastAPI Backend (uvicorn)   │ • IndexedDB Local Repositories│ • FastAPI Backend (:8000)     │
│ • SQLite (skill_exchange.db)  │ • Local heuristic fallback    │ • PostgreSQL 16 (docker-comp) │
│ • AI Provider: mock / local   │ • Ollama local AI (optional)  │ • Multi-stage Docker build    │
│ • Hot Reload Active           │ • Works without internet      │ • Health checks & RBAC active │
└───────────────────────────────┴───────────────────────────────┴───────────────────────────────┘
```

---

## 2. Option A: Local Development Setup

### Prerequisites
- Python 3.11+
- Node.js 18+ and npm 9+

### Step 1: Backend Setup
```bash
# Navigate to project root
cd ai-skill-exchange

# (Optional) Create Python virtual environment
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt

# Run migrations and seed sample campus dataset
python scripts/migrate_and_seed.py

# Launch FastAPI backend with hot reload
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
API Documentation will be available at `http://localhost:8000/docs`.

### Step 2: Frontend Setup
In a separate terminal window:
```bash
cd ai-skill-exchange/frontend

# Install dependencies
npm install

# Start Next.js development server
npm run dev
```
Open `http://localhost:3000` in your web browser.

---

## 3. Option B: Offline Demo Setup

The platform is designed to function seamlessly without internet connectivity during campus hackathon demonstrations.

### Architecture Highlights
- **Service Worker (`public/sw.js`)**: Automatically precaches static application shells, dashboard views, and SVG assets.
- **IndexedDB (`src/lib/offline/indexedDb.ts`)**: Persists all student profiles, skills, project concepts, and match queues on the client device.
- **Sync Queue Engine (`src/lib/sync/syncEngine.ts`)**: Batches offline mutations (session bookings, project creation, profile updates) and synchronizes with Last-Write-Wins (LWW) conflict resolution upon reconnection.
- **Offline AI Pipeline**: Local heuristic algorithms extract skills, calculate match synergies (0-100%), and optimize multidisciplinary teams directly in browser memory without external API calls.

### Launching Offline Demo
1. Start local servers as described in Section 2 (or run `docker compose up`).
2. Open `http://localhost:3000` in Chrome/Edge.
3. Open Developer Tools (F12) -> **Application** tab -> **Service Workers** (verify registered).
4. Select **Network** tab -> Check **Offline** (or disconnect Wi-Fi).
5. Notice the unobtrusive **OFFLINE MODE** status pill in the navbar.
6. Explore:
   - Browse cached student profiles (`/dashboard`, `/profile`).
   - Run AI Skill Analyzer (`/skill-analyzer`) with local heuristic extraction.
   - Run the 5-step Team Builder (`/team-builder`) with the interactive animated presentation mode.
   - Transfer skill credits offline; transactions queue safely in IndexedDB until online.

---

## 4. Option C: One-Command Production Docker Deployment

For containerized cloud deployment or evaluation environments:

```bash
# Launch full stack: PostgreSQL, FastAPI Backend, Next.js Frontend, Ollama (optional)
docker compose up -d --build
```

### Checking Services Health
```bash
docker compose ps
```

### Viewing Logs
```bash
# Backend logs
docker compose logs -f backend

# Frontend logs
docker compose logs -f frontend

# Database logs
docker compose logs -f postgres
```

### Automated Migration & Seeding in Docker
```bash
docker compose exec backend python /app/scripts/migrate_and_seed.py
```

### Stopping Services
```bash
docker compose down
# To wipe volumes and restart fresh:
docker compose down -v
```

---

## 5. AI Provider Configuration

The AI intelligence layer abstracts underlying model providers through the `AIProvider` factory:

### Supported Providers (`AI_PROVIDER` in `.env`)

1. **`AI_PROVIDER=mock`** (Default):
   - Fast, deterministic keyword heuristics.
   - Zero latency, zero cost, no external dependencies.
   - Ideal for continuous integration and automated test suites.

2. **`AI_PROVIDER=local`**:
   - Enhanced local taxonomy rule engine with fuzzy matching and confidence calibration.
   - Operates completely offline.

3. **`AI_PROVIDER=ollama`** (Campus Privacy-First Local LLM):
   - Communicates with a local or containerized Ollama instance.
   - Privacy guarantee: Student data never leaves the campus server.
   - Setup:
     ```bash
     # If running Ollama locally:
     ollama run llama3
     ```
     Set in `.env`:
     ```env
     AI_PROVIDER=ollama
     OLLAMA_BASE_URL=http://localhost:11434
     OLLAMA_MODEL=llama3
     ```

4. **`AI_PROVIDER=cloud`** (OpenAI / Anthropic / Gemini Compatible):
   - Connects to an external OpenAI-compatible inference endpoint.
   - Set in `.env`:
     ```env
     AI_PROVIDER=cloud
     LLM_API_KEY=sk-your-secure-api-key
     LLM_API_URL=https://api.openai.com/v1
     ```

---

## 6. Environment Variables Reference

| Variable | Default Value | Description |
|---|---|---|
| `APP_NAME` | `"AI Skill Exchange"` | Application display name. |
| `APP_VERSION` | `"0.1.0"` | Current software version tag. |
| `DATABASE_URL` | `sqlite+aiosqlite:///./skill_exchange.db` | Async SQLAlchemy database URI. Use `postgresql+asyncpg://...` for production. |
| `JWT_SECRET_KEY` | *(Set in .env)* | Cryptographic secret for signing Bearer access tokens. |
| `AI_PROVIDER` | `mock` | Active AI provider (`mock`, `local`, `ollama`, `cloud`). |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Endpoint for Ollama local inference server. |
| `OLLAMA_MODEL` | `llama3` | Targeted model name for Ollama. |
| `LLM_API_KEY` | *(Empty)* | API key when `AI_PROVIDER=cloud`. Never commit keys to git! |
| `CORS_ORIGINS` | `["http://localhost:3000"]` | Allowed CORS origins for browser security. |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Backend API URL accessible from client browser. |
| `ALLOW_NEGATIVE_BALANCE` | `false` | System config preventing debt in credit ledger. |
| `HIGH_DEMAND_THRESHOLD` | `1.5` | Ratio multiplier triggering high-demand skill incentives. |

---

## 7. Production Verification Checklist

Before deploying to production or presenting at a hackathon:

- [x] **Backend Test Suite**: All 52 backend tests pass (`pytest tests/backend -v`).
- [x] **Frontend Production Build**: `npm run build` succeeds without prerendering errors.
- [x] **Database Migration**: Schema up-to-date with `alembic upgrade head`.
- [x] **XSS & Injection Protection**: User strings sanitized with `sanitize_text()`.
- [x] **Rate Limiting Active**: 120 req/min standard, 20 req/min sensitive.
- [x] **AI Safety Invariants**: `AISafetyGatekeeper` prevents unauthorized state or credit modification.
- [x] **Offline Capabilities**: Service worker registered, IndexedDB operational.
