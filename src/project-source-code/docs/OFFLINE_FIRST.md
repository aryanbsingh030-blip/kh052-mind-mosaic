# Offline-First Architecture & Capabilities Guide

AI Skill Exchange is built with a resilient, **offline-first architecture** ensuring continuous university campus operation even when Wi-Fi is intermittent or completely disconnected.

---

## 1. Architecture Overview

```
┌────────────────────────────────────────────────────────┐
│               Frontend UI (Next.js / React)            │
└───────────────────────────┬────────────────────────────┘
                            │
              ┌─────────────▼─────────────┐
              │    Repository Pattern     │
              │  (Storage Abstraction)    │
              └───────┬─────────────┬─────┘
                      │             │
        Online Mode   │             │   Offline Fallback
                      ▼             ▼
          ┌──────────────┐       ┌────────────────────────┐
          │ FastAPI API  │       │  IndexedDB Data Layer  │
          │ & SQLite DB  │       │ (AISkillExchangeDB v1) │
          └──────────────┘       └───────────┬────────────┘
                                             │
                                 ┌───────────▼────────────┐
                                 │   Local Intelligence   │
                                 │ • Regex NLP Extractor  │
                                 │ • Local Match Engine   │
                                 │ • Local Team Generator │
                                 └────────────────────────┘
```

The application uses the **Repository Pattern** (`StudentRepository`, `SkillRepository`, `ProjectRepository`, `MatchRepository`, `TeamRepository`, `CreditRepository`) to decouple the user interface from network topology. The UI does not know or care whether data originates from the live backend or local browser storage.

---

## 2. Capabilities Matrix

| Feature | Offline Status | Engine Used Offline | What Happens When Reconnected |
|---|---|---|---|
| **View Student Profiles** | ✅ **Works 100%** | IndexedDB cache | Automatically refreshes with latest server updates |
| **Create & Edit Profile** | ✅ **Works 100%** | Saved locally in IndexedDB | Queued in `sync_queue` and flushed automatically |
| **Skill Extraction & Analysis** | ✅ **Works 100%** | Embedded Local Rule-Based NLP Engine | No sync needed; extracted skills saved to profile |
| **Create Projects** | ✅ **Works 100%** | Saved locally in IndexedDB | Queued in `sync_queue` and pushed to backend database |
| **Calculate Peer Matches** | ✅ **Works 100%** | Local Reciprocal Matching Algorithm | Re-indexes with remote candidate pool when online |
| **Generate Multidisciplinary Teams**| ✅ **Works 100%** | Local Heuristic Constraint Solver | Team structure stored locally, synced to database |
| **View Skill Credits & Ledger** | ✅ **Works 100%** | Cached Credit Ledger | Refreshes with central ledger updates |
| **Transfer Credits** | ✅ **Works 100%** | Local Balance Simulation & Balance Checks | Negative balance blocked; debit/credit synced to backend |
| **Main Campus Dashboard** | ✅ **Works 100%** | IndexedDB + Offline banner | Live campus stats re-synced |
| **Remote Cloud AI LLMs** | ⚠️ **Requires Internet** | Falls back to Embedded Local Analyzer | Remote Gemini/OpenAI endpoints re-enabled |
| **Live P2P Video Sessions** | ⚠️ **Requires Internet** | Meeting link saved for later | Connects to Jitsi/WebRTC room once network resumes |

---

## 3. Storage & Caching Layer

1. **Service Worker (`public/sw.js`)**:
   - Pre-caches core application shell (`/`, `/dashboard`, `/credits`, `/campus-insights`, `/learn`, `/skills`, `/projects/new`).
   - Implements **network-first with cache-fallback** for `/api/*` endpoints.
   - Provides an offline fallback response to prevent white screens or browser error pages.
2. **IndexedDB (`AISkillExchangeOfflineDB`)**:
   - Stores: `profiles`, `skills`, `student_skills`, `projects`, `teams`, `matches`, `credits`, `transactions`, `learning_goals`, `sync_queue`.
   - Pre-seeded with campus snapshot so first-time offline launches have complete data immediately.
3. **PWA Manifest (`public/manifest.json`)**:
   - Enables standalone desktop or mobile installability.

---

## 4. Local Intelligence Algorithms

When the network is unreachable, intelligence features do not shut down:
- **Offline NLP Skill Analyzer**: Uses canonical tokenization and regex keyword matching to identify technical competencies, estimating proficiency from contextual qualifiers (e.g. *expert*, *advanced*, *beginner*).
- **Offline Reciprocal Matching**: Evaluates mutual learning objectives between students $A$ and $B$, scoring complementarity, departmental alignment, and shared goals.
- **Offline Team Composer**: Iteratively selects candidates from the local profile store to satisfy project skill constraints, maximizing skill coverage and multidisciplinary balance.

---

## 5. Offline Indicator Design

When offline, the navigation bar renders an unobtrusive status pill:
```
[ ● OFFLINE MODE | 2 queued ]
```
Styled in calming amber/indigo tones with a soft pulse, signaling resilience and data safety rather than a fatal application error.
