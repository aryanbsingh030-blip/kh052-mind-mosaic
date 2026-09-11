# AI Skill Exchange — Security Architecture & Guidelines

## 1. Overview
The AI Skill Exchange platform adheres to a defense-in-depth security model designed to safeguard student privacy, prevent unauthorized state mutations, ensure the structural integrity of AI-generated intelligence, and defend against malicious injection vectors.

---

## 2. Authentication & Cryptography
- **Password Hashing**: User passwords are encrypted using `PBKDF2-HMAC-SHA256` with 100,000 iterations and a unique 16-byte cryptographically secure random salt generated via `secrets.token_hex(16)`.
- **JWT Authentication**: Stateless Bearer tokens signed with `HS256`. Configurable expiration window (`ACCESS_TOKEN_EXPIRE_MINUTES`) and secret key supplied via `JWT_SECRET_KEY` environment variable.
- **Constant-Time Comparison**: Password hash comparisons execute through `hmac.compare_digest` to prevent timing side-channel attacks.

---

## 3. Role-Based Access Control (RBAC) & Ownership
The platform enforces role tiers defined by the `UserRole` enum:
- `STUDENT`: General peer participant. Can view campus insights, manage their own profile and skills, calculate matches, participate in tutoring sessions, and transfer credits.
- `FACULTY`: Academic observer. Can review aggregate campus skill trends and recommend project opportunities.
- `ADMIN`: Platform administrator. Authorized to perform credit balance audit adjustments and configure system invariants.

### Profile Ownership Enforcement
- Endpoints modifying student data (`PUT /api/v1/profiles/{profile_id}`) enforce `verify_owner_or_admin`. Authenticated students can only modify their own profile attributes unless holding the `ADMIN` role.

---

## 4. Input Validation & Injection Protection
- **SQL Injection Prevention**: All database queries utilize SQLAlchemy 2.0 async ORM queries with parameterized bound variables. Raw unescaped SQL strings are strictly prohibited.
- **Cross-Site Scripting (XSS)**: User-provided text strings (bios, experience descriptions, project summaries, credit transfer reasons) are sanitized using `sanitize_text()`. This utility strips dangerous tags (`<script>`, `<iframe>`, `<object>`, `<embed>`, `<style>`, `<svg>`), inline event handlers (`onclick`, `onerror`, `onload`), dangerous URI schemes (`javascript:`, `data:`), and escapes HTML entities.
- **Strict Pydantic Bounds**:
  - Credit transfers enforce `amount > 0` and `amount <= 500`.
  - Self-transfers (`from_student_id == to_student_id`) are explicitly rejected with HTTP 400.
  - Text fields enforce strict `min_length` and `max_length` bounds.

---

## 5. AI Safety Guardrails & Invariants
Natural language inputs processed by AI engines (LLMs or local heuristic fallbacks) are handled through the `AISafetyGatekeeper` pipeline:
1. **Never Trust Raw AI Output**: All extracted skills and project competencies undergo strict Pydantic parsing and bounds validation before reaching any application state.
2. **Prompt Injection Defense**: Free-form user inputs are wrapped with secure non-colliding boundary delimiters (`<<<CAMPUS_STUDENT_EXPERIENCE_INPUT>>>`) and scanned with `sanitize_prompt_input()`, defusing instruction-hijack phrases (e.g., "ignore all previous instructions", "system: override").
3. **Core AI Prohibitions**:
   The AI system is strictly bounded by deterministic software rules and must **NEVER**:
   - Directly modify database records.
   - Modify or mint skill credits.
   - Change permissions or user roles.
   - Execute arbitrary python code (`eval()`, `exec()`).
   - Execute arbitrary OS or shell commands (`os.system`, `subprocess.run`).

---

## 6. Rate Limiting & Denial-of-Service Defense
An in-memory sliding-window rate limiter (`SlidingWindowRateLimiter`) protects sensitive endpoints:
- **Standard API Endpoints**: 120 requests / minute per client key.
- **Sensitive Operations** (Auth, Credit Transfers, Batch Sync): 20 requests / minute per client key.
- **Response Headers**: Exceeded limits return HTTP 429 Too Many Requests along with standard `Retry-After` headers.

---

## 7. Campus Privacy Guarantee
- **Anonymized Aggregations**: The `/api/v1/campus-insights` endpoints strictly calculate aggregated mathematical metrics (Skill Demand/Supply indices, skill shortages, department distributions).
- **No PII Exposure**: Personal student identifiers (names, emails, profile IDs) are omitted from campus intelligence summaries.

---

## 8. Vulnerability Reporting
To report security concerns or potential vulnerabilities, please contact the campus platform administration team or submit an issue via the internal security disclosure portal.
