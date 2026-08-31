# AI Development Log: LoanGuard-AI Copilot
**Compliance Document for Section 10 ("Agentic Coding Requirement")**

## 1. Overview & Tooling
During the engineering lifecycle of LoanGuard-AI, agentic AI coding assistants and LLM tools were integrated into the architecture, implementation, code review, red-team fuzz testing, and performance optimization workflows.

- **Primary Agentic Coding System:** Antigravity AI Assistant (Google DeepMind)
- **Base Foundation Models:** Gemini 2.0 / Claude 3.5 Sonnet / GPT-4o
- **IDE Environment:** Antigravity IDE (Pair Programming & Agentic Tool Invocation)
- **Runtime Inference Engine:** Rule-Based Expert System + Generative Diagnostic Explainer


---

## 2. Use Cases & Lifecycle Breakdown

| Phase | AI Role | Human Engineering Role | AI Code % |
| :--- | :--- | :--- | :--- |
| **System Architecture** | Proposed monolithic 3-tier structure & event-driven SSE pipeline | Evaluated latency trade-offs, selected SQLite with in-memory indexes | 75% |
| **Schema & Database** | Generated SQLite tables for `loans`, `exceptions`, `upload_batches`, `audit_logs` | Designed SHA-256 Merkle-like hash chaining and index constraints | 80% |
| **Policy Engine (Warden)** | Drafted 12 deterministic validation policies (`POL-BAL-001` to `POL-DUP-001`) | Calibrated financial threshold boundaries (e.g., max interest rate 25%) | 90% |
| **Frontend UI/UX** | Implemented React components, Lucide SVG design system, and tailwind utilities | Evaluated institutional aesthetics, color contrast, and micro-interactions | 85% |
| **Security & Auth** | Drafted JWT middleware and DOMPurify sanitization handlers | Audited token claims, cookie scopes, and RBAC endpoint matrix | 90% |
| **Adversarial QA Suite** | Generated 54 automated brutal attack vectors (`brutal_qa.js`) | Directed edge-case torture tests (CSV fuzzing, double submissions) | 90% |

**Overall AI-Generated Code Estimate:** **~85%**

---

## 3. Representative Prompt Evidence (5–10 Prompts)

### Prompt 1: Validation Engine Architecture
> *"Design a modular, synchronous rule-based validation engine in Node.js ('The Warden') that intercepts loan tape rows during CSV ingestion. It must evaluate required fields, positive balances, date validity (maturity > origination), state codes, and intra-batch duplicates, returning structured exceptions without crashing on null values."*

### Prompt 2: Cryptographic Hash Chaining
> *"Implement an immutable audit trail in SQLite where every ledger entry records seq, actionType, agentId, policyId, reason, timestamp, and a SHA-256 hash calculated as `SHA256(seq + actionType + agentId + policyId + prevHash + ts)`. Ensure hash chaining creates mathematical proof of non-repudiation."*

### Prompt 3: AI Copilot Explanation & Confidence Scoring
> *"Create an AI Copilot endpoint `POST /api/ai-review` that inspects exception violations, computes a deterministic confidence score based on error severity and servicer discrepancy, and suggests an exact corrected value without mutating the database."*

### Prompt 4: Real-World SaaS UI Overhaul
> *"Refactor the frontend into an institutional fintech SaaS style inspired by modern financial terminals (Linear/Stripe). Include dynamic KPI metric bars, animated CSV dropzones, side-by-side diff inspectors, severity badge tabs, and an in-browser SHA-256 validator."*

### Prompt 5: Advanced Grids and Validation (Phase 1 & 2 Roadmap)
> *"Replace native HTML tables with TanStack Table for high-performance sorting, filtering, and pagination. Additionally, replace manual string-parsing validation in the backend with Zod schema boundaries to cryptographically enforce type integrity on data ingestion."*

### Prompt 6: RBAC & Stateless JWT Authentication
> *"Implement JWT authentication with `POST /api/login` and an Express middleware `requireRole(['operator' | 'reviewer' | 'consumer'])`. Restrict `/api/upload` to operators, `/api/exceptions/:id` to reviewers, and `/api/export/verified-loans` to consumers."*

### Prompt 7: Adversarial Red-Team Fuzzing Suite
> *"Build an exhaustive automated QA script `brutal_qa.js` that tests 54 attack vectors: SQL injection in parameters, XSS scripts in reviewer notes, corrupted binary files, 5,000-row stress loads, and duplicate submission race conditions."*

---

## 4. Human Review Process & Verification

All AI-generated code was subjected to a four-stage human review process before promotion:
1. **Static Analysis & Linting:** Reviewing syntax, variable scopes, and dependency tree sanity.
2. **Security & Vulnerability Audit:** Inspecting inputs for injection vulnerabilities, unhandled null pointers, and missing role gates.
3. **Performance Profiling:** Measuring execution timing of large batch operations (e.g. 5,000-row ingestion).
4. **Automated Adversarial Execution:** Running `node brutal_qa.js` live against the running server to verify 100% test pass rate across 54 vectors.

---

## 5. Rejected AI Outputs & Corrections (Examples of Rejections)

### Rejection Example 1: N+1 Database Query Loop (Inefficiency)
- **AI Initial Output:** The AI generated a duplicate loan detection routine that executed `SELECT id FROM loans WHERE loan_id = ?` for every single row inside the ingestion loop.
- **Why Rejected:** On a 5,000-row loan tape, this resulted in 5,000 individual SQL roundtrips, causing the ingestion latency to exceed **36 seconds**.
- **Human Correction:** Replaced the per-row query loop with an in-memory `Set` lookup (`existingLoanIds`), preloaded in a single query before batch processing. Latency dropped to **<2.5 seconds** (a 14x speedup).

### Rejection Example 2: Unsanitized Stored XSS in Resolution Notes (Unsafe)
- **AI Initial Output:** The AI implemented `PATCH /api/exceptions/:id` by directly storing the user-supplied `note` string into SQLite without filtering.
- **Why Rejected:** Malicious payloads such as `<script>alert('XSS')</script>` or `<img src=x onerror=...>` were stored verbatim and rendered in reviewer dashboards.
- **Human Correction:** Integrated server-side HTML sanitization using `DOMPurify` + `JSDOM` to strip any executable markup before SQLite persistence.

### Rejection Example 3: Unhandled Primary Key Crash (Fatal Bug)
- **AI Initial Output:** The AI assumed CSV files would always contain a `loan_id`. When a malformed CSV with missing loan IDs was uploaded, SQLite threw an uncaught `NOT NULL constraint failed: loans.loan_id` error, crashing the Express server process.
- **Human Correction:** Added a preprocessing normalization layer that generates a non-colliding fallback UUID (`MISSING-<uuid>`) for blank entries, safely routing the record to the Exception Queue.

---

## 6. Lessons Learned & Engineering Synthesis
- **Where AI Excelled:** Rapid scaffolding of complex UI layouts, generating comprehensive test cases, drafting repetitive SQL schema migrations, and generating natural language explanations for financial discrepancies.
- **Where Human Judgment Was Essential:** Designing deterministic hash chaining algorithms, recognizing subtle race conditions in file uploads, preventing security bypasses in RBAC session headers, and optimizing database execution plans for scale.
