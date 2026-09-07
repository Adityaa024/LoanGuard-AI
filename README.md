# 🏦 LoanGuard-AI — Intelligent Loan Tape Verification & Continuous Governance Copilot

> **Intain Campus FinTech Challenge 2026 — Full Stack Track**  
> An AI-Assisted, Cryptographically Governed Verification Console turning messy loan records into validated, traceable, trusted data.
>
> 🟢 **Live Demo Deployment:** [https://loanguard-ai-uql9.onrender.com](https://loanguard-ai-uql9.onrender.com)  
> 🎥 **5-Minute Competition Demo Video:** [`LoanGuard-AI_Intain_Final_5_Minute.mp4`](./LoanGuard-AI_Intain_Final_5_Minute.mp4) *(Runtime: 00:04:40 · Full HD 1080p)*

---

![LoanGuard-AI Banner](./docs/images/Gemini_Generated_Image_3i5aoo3i5aoo3i5a.png)

---

## 🌟 Executive Overview & Problem Context

Financial platforms and institutional investors depend heavily on loan-level data. However, raw loan tapes provided by originating servicers frequently arrive messy: contaminated with missing identifiers, inverted maturity timelines, usurious interest rates, mathematical inconsistencies, and cross-source reporting conflicts.

**LoanGuard-AI** is an enterprise-grade full-stack loan data verification console engineered to serve as an automated quality gatekeeper, diagnostic copilot, and tamper-evident audit ledger:

```text
┌────────────────────────────────┐      ┌────────────────────────────────┐      ┌────────────────────────────────┐
│      1. Ingestion & Gate       │ ---> │    2. AI Copilot Workbench     │ ---> │    3. Cryptographic Seal       │
│  Fast streaming CSV ingestion  │      │  Deep diagnostics, confidence  │      │  Immutable SHA-256 digital     │
│  & deterministic Zod policies  │      │  scoring & governed overrides  │      │  receipt & Merkle audit chain  │
└────────────────────────────────┘      └────────────────────────────────┘      └────────────────────────────────┘
```

1. **Deterministic Quality Gatekeeper:** Evaluates incoming loan tapes against 15 strict statutory and mathematical policy rules (`schema.js` Zod schemas + `policies.yaml` / `LocalPolicyEngine`) in high-speed streaming transactions (>2,500 records/sec).
2. **AI Diagnostic Copilot:** Explains violations in plain financial language, computes bounded statistical confidence scores (75%–95%), and proposes structured field repair candidates.
3. **Strict Human-in-the-Loop Governance:** AI suggestions remain strictly advisory and decoupled from database states until explicit human reviewer sign-off. All reviewer notes are sanitized with `DOMPurify` to prevent stored XSS.
4. **Tamper-Evident Cryptographic Ledger:** Every upload, rule violation, AI consultation, manual draft edit, approval, and export is linked sequentially via an append-only SHA-256 Merkle hash chain.
5. **Real-Time 3D Data Pipeline Visualizer:** Interactive WebGL/Three.js visualizer rendering live ingestion data streams, node processing states, and policy enforcement beams.

---

## 📸 Application Showcase & Visual Tour

### 1. Data Operator — Ingestion Studio & Quality Score
*Fast drag-and-drop CSV ingestion with pre-set test benchmarks, batch lineage tracking, and real-time compliance rate.*
![Data Operator Dashboard](./docs/images/screenshot_1.png)

---

### 2. Warden Validation Policy Engine (15 Deterministic Rules)
*Declarative policy catalog detailing mathematical invariants, date checks, interest corridors, and severity levels.*
![Warden Policy Catalog](./docs/images/screenshot_2.png)

---

### 3. Exception Reviewer — AI Copilot Workbench & Side-by-Side Diff
*Split-screen queue with keyboard navigation (`J`/`K`), root cause diagnostic explainer, repair suggestions, and 1-click apply.*
![Exception Reviewer Copilot](./docs/images/screenshot_3.png)

---

### 4. Data Consumer — Canonical Verified Portfolio
*Searchable, filterable ledger of verified loans with cryptographic SHA-256 digital seal badges and governed streaming CSV export.*
![Canonical Verified Portfolio](./docs/images/screenshot_4.png)

---

### 5. Cryptographic Proof & Tamper-Evident SHA-256 Lineage Modal
*Auditable sequential block ledger verifying the complete lifecycle of a loan from raw ingestion to reviewer sign-off.*
![Cryptographic Proof and Lineage](./docs/images/screenshot_5.png)

---

### 6. Exception Findings Breakdown
*Real-time donut chart visualizing portfolio exceptions categorized by Critical, High, Medium, and Low severity.*
![Exception Findings Breakdown](./docs/images/screenshot_6.png)

---

### 7. Policy Verification Engine Modal
*Interactive catalog detailing active statutory compliance rules enforcing mathematical invariants and data sanity.*
![Policy Verification Engine](./docs/images/screenshot_7.png)

---

### 8. AI Cluster Diagnostics Summary
*Executive briefing on portfolio-wide exception clusters with one-click batch auto-remediation plans.*
![AI Cluster Diagnostics Summary](./docs/images/screenshot_8.png)

---

### 9. AI Diagnostics Copilot Root Cause Explanation
*Detailed root-cause analysis for specific exceptions, offering deterministic repair suggestions and an immutable reviewer audit trail.*
![AI Diagnostics Copilot Root Cause Explanation](./docs/images/screenshot_9.png)

---

## 📋 Problem Statement Compliance Matrix (Modules A–H)

| Module | Name | Implementation Details | Primary Persona | Status |
| :--- | :--- | :--- | :--- | :---: |
| **Module A** | **Ingestion Engine** | Multipart CSV parser (`csv-parse`), dynamic header normalization, batch metadata tracking, error row isolation, supports empty/header-only files. | Data Operator | **✅ 100%** |
| **Module B** | **Validation Engine** | Two-tier validation (`schema.js` Zod schemas + `policies.yaml` business rules), 15 intentional defect interceptors. | System / Warden | **✅ 100%** |
| **Module C** | **Exception Queue** | Interactive workbench with severity filters (Critical, High, Medium, Low), search, keyboard navigation (`J`/`K`), bulk actions. | Exception Reviewer | **✅ 100%** |
| **Module D** | **AI Review Assistant** | 7 AI features: root cause explainer, confidence scoring, repair recommendation, cluster summary, conflict comparison, severity classification, rule generator. | Exception Reviewer | **✅ 100%** |
| **Module E** | **Governed Resolution** | Reviewer manual override seam, field-whitelisted SQL updates, server-side `DOMPurify` XSS protection, immutable audit chaining. | Exception Reviewer | **✅ 100%** |
| **Module F** | **Canonical Portfolio** | Searchable verified ledger with digital SHA-256 seal, state filtering, and governed streaming CSV/JSON exports. | Data Consumer | **✅ 100%** |
| **Module G** | **Dashboards & Visualizer** | Real-time compliance KPIs, exception severity breakdown, 3D WebGL pipeline visualizer (`Three.js` / `@react-three/fiber`), live SSE (`/events`). | All Personas | **✅ 100%** |
| **Module H** | **REST API Surface** | Express.js REST API with JWT role-based access control (`/api/upload`, `/api/exceptions`, `/api/loans`, `/api/audit/verify`, `/api/summary`) + bare canonical aliases. | All Clients | **✅ 100%** |

---

## 🏗️ Architecture & Technical Stack

### High-Level Architecture Diagram

```text
                               ┌──────────────────────────────────────────────┐
                               │            React 18 + Tailwind SPA           │
                               │ (Operator, Reviewer, Consumer, 3D Hive Views)│
                               └──────────────────────┬───────────────────────┘
                                                      │ JWT Authenticated HTTP & SSE
                                                      ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                          Express.js REST API Backend                                       │
├──────────────────────────────┬──────────────────────────────┬──────────────────────────────────────────────┤
│      Ingestion Module        │     Policy Engine (Warden)   │             AI Copilot Service               │
│  - csv-parse streaming       │  - Zod structural schemas    │  - Root cause diagnostic explanations        │
│  - Field normalizers         │  - YAML declarative rules    │  - Statistical confidence calculation        │
│  - Batch lineage tracking    │  - Dynamic rule compiler     │  - Cluster summaries & conflict resolution   │
├──────────────────────────────┴──────────────────────────────┴──────────────────────────────────────────────┤
│                                      Cryptographic & Security Layer                                        │
│  - SHA-256 Hash Chaining (GENESIS -> Block N)  |  DOMPurify XSS Sanitization  |  Field Whitelist Update   │
├────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                         Storage & Persistence Layer                                        │
│                        SQLite3 (`loans`, `exceptions`, `upload_batches`, `audit_logs`)                      │
└────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Core Technologies
- **Frontend:** React 18, Vite, Tailwind CSS, Framer Motion, Lucide Icons, Recharts, `@react-three/fiber` & Three.js (3D Visualizer).
- **Backend:** Node.js (ESM), Express.js, SQLite3 / `sqlite` (with WAL mode & indexed queries), Zod, `csv-parse`, `dompurify`, `jsonwebtoken`.
- **Cryptographic Assurance:** SHA-256 Merkle-like chain with canonical payload signatures `SHA256(canonical_loan_fields)`.
- **Live Streams:** Server-Sent Events (SSE) `/events` for zero-polling real-time updates across clients.

---

## 📂 Codebase Directory Map

```text
d:/intain/
├── src/                               # Backend Application Logic
│   ├── server.js                      # Express server entry point, static asset serving, port configuration
│   ├── routes.js                      # Central REST API routes & SSE event dispatchers
│   ├── system.js                      # System bootstrapper and dependency injection
│   ├── audit/                         # Cryptographic hash chain & audit ledger
│   │   └── auditLog.js                # SHA-256 sequential hashing & genesis verification
│   ├── db/                            # SQLite connection & database migrations
│   │   └── index.js                   # Table schema definitions, indices, and seed queries
│   ├── engine/                        # Validation & rule evaluation
│   │   ├── schema.js                  # Zod validation schemas for loan tapes & mutations
│   │   └── validator.js               # Multi-pass anomaly detector
│   ├── guard/                         # Access control & governance guards
│   │   ├── localPolicyEngine.js       # High-speed deterministic policy evaluator
│   │   ├── policyTypes.js             # Policy enum definitions & decision types
│   │   └── warden.js                  # Governance seam & kill-switch authorization
│   ├── llm/                           # AI Copilot engine & diagnostic providers
│   │   └── explainer.js               # Diagnostic generation, repair synthesis & clustering
│   ├── policy/                        # Policy compiler & dynamic rule engine
│   │   ├── author.js                  # Live policy authoring & hot-reload seam
│   │   ├── compiler.js                # Natural language to YAML policy compiler
│   │   └── engine.js                  # PolicyEngine runtime
│   └── events/                        # Server-Sent Events (SSE) broadcaster
│       └── broker.js                  # Pub/Sub event bus for live UI updates
│
├── web/                               # Modern React 18 Frontend
│   ├── index.html                     # SPA entry point with Google Fonts
│   ├── package.json                   # Web dependencies & Vite build scripts
│   ├── src/
│   │   ├── App.jsx                    # Root app shell, navigation, persona switching, modals
│   │   ├── main.jsx                   # React root mount, global JWT fetch interceptor
│   │   ├── ToastContext.jsx           # Global notification toast provider
│   │   ├── api.js                     # API client utilities and SSE hooks
│   │   ├── Hive3D.jsx                 # 3D WebGL pipeline visualizer (Three.js/Fiber)
│   │   ├── styles.css                 # Custom scrollbars, glassmorphism & utility classes
│   │   ├── design-system.css          # Design tokens, color palettes & badges
│   │   └── components/
│   │       ├── LoginView.jsx          # 1-Click persona launcher & JWT credentials login
│   │       ├── UploadView.jsx         # Ingestion studio, drag-drop, preset benchmarks, lineage
│   │       ├── ExceptionQueue.jsx     # Reviewer workbench, side-by-side diff, AI drawer, batch resolve
│   │       ├── VerifiedRecords.jsx    # Canonical portfolio ledger, SHA-256 digital seals, CSV export
│   │       └── Charts.jsx             # Portfolio distribution & severity analytics charts
│
├── docs/                              # Project Documentation & Screenshots
│   └── images/                        # High-resolution application screenshots (screenshot_1 to screenshot_9)
│
├── data/                              # Sample Loan Tapes & Fixtures
│   ├── loan_tape.csv                  # Clean baseline sample dataset (1,000 to 5,000 records)
│   ├── messy_loan_tape.csv            # Adversarial anomaly test dataset (15 defect types)
│   ├── large_messy_loan_tape.csv      # 3,000+ record scale benchmark dataset
│   ├── servicer_update.csv            # Cross-source secondary servicer tape
│   ├── document_manifest.csv          # Collateral document availability manifest
│   ├── validation_rules.json          # Default policy ruleset catalog
│   ├── users.json                     # Pre-configured demo user accounts
│   └── generate.js                    # Mock data generation & stress test synthesis script
│
├── scripts/                           # Automated Quality & Red-Team Audit Runners
│   ├── test_all_csv_uploads.cjs       # Complete multi-CSV automated verification runner
│   ├── master_brutal_audit_runner.cjs # Hostile penetration test suite (SQL injection, XSS, tamper tests)
│   └── clean_and_optimize_db.js       # SQLite VACUUM & index optimization utility
│
├── architecture_note.md               # Section 12 2-page System Architecture & Design Note
├── ai_development_log.md              # Section 10 Agentic Coding compliance log
├── qa_test_report.md                  # QA compliance report across all modules
├── QA_BRUTAL_AUDIT.md                 # Complete red-team test report & penetration results
├── walkthrough.md                     # Interactive UI feature walkthrough
├── BRIEF.md                           # Intain Problem Statement technical briefing
└── RUBRIC.md                          # 100-point Intain evaluation framework
```

---

## 🛡️ 15 Intentional Data Defects & Policy Rule Coverage (PS Section 7)

| # | Intentional Defect / Anomaly | Policy Rule ID | Severity | Enforced Condition | Resolution / AI Recommendation |
| :-: | :--- | :--- | :--- | :--- | :--- |
| **1** | Negative Principal Balance | `POL-BAL-001` | **CRITICAL** | `principal_balance < 0` | Rejection or balance sign correction |
| **2** | Usurious / Invalid Interest Rate | `POL-RATE-001` | **CRITICAL** | `interest_rate < 0` or `> 25%` | Rate cap clamping (e.g. 42% -> 4.2%) |
| **3** | Missing Borrower Identity | `POL-BOR-001` | **HIGH** | `borrower_name` empty or null | Identity vault lookup & manual remediation |
| **4** | Inverted Maturity Date | `POL-DATE-001` | **MEDIUM** | `maturity_date <= origination_date` | Term correction / date re-alignment |
| **5** | Non-Standard State Postal Code | `POL-STATE-001` | **LOW** | `property_state != /^[A-Z]{2}$/` | Automated batch uppercase normalization |
| **6** | Duplicate Loan Identifier | `POL-DUP-001` | **CRITICAL** | Duplicate `loan_id` across database | Primary key deduplication / isolation |
| **7** | Duplicate Borrower Composite | `POL-BORCMB-001` | **MEDIUM** | Duplicate `Name + Amount + Date` | Collateral deduplication check |
| **8** | Balance Exceeds Principal | `POL-BALCAP-001` | **HIGH** | `current_balance > principal_balance` | Loan restructuring verification |
| **9** | Closed Loan with Active Balance | `POL-CLOSED-001` | **HIGH** | `status == Closed` & `balance > 0` | Reset balance to 0.00 |
| **10**| Payment Status Mismatch | `POL-PAYST-001` | **MEDIUM** | `status == Current` & `DPD > 0` | Reconcile payment posting |
| **11**| Missing Statutory Document | `POL-DOC-001` | **LOW** | `document_status` missing | Reconcile against Document Manifest |
| **12**| Stale Un-serviced Record | `POL-TIME-001` | **LOW** | `last_updated_at > 90 days` | Trigger servicer sync |
| **13**| Cross-Source Servicer Conflict | `POL-CONFLICT-001` | **HIGH** | Primary vs Secondary delta | Remittance report reconciliation |
| **14**| Stored XSS Injection Payload | `POL-SEC-001` | **CRITICAL** | `<script>` in reviewer notes | Server-side `DOMPurify` HTML strip |
| **15**| Unhandled Null Column Values | `POL-GEN-001` | **MEDIUM** | Null in non-nullable column | Fallback UUID normalization |

---

## 🧠 All 7 AI Capabilities Matrix (PS Section 8 Module D)

| # | AI Feature | API Endpoint | Description |
| :-: | :--- | :--- | :--- |
| **1** | **Root-Cause Diagnostic Explainer** | `POST /api/ai-review` | Generates plain-language financial explanation of why the statutory rule triggered. |
| **2** | **Confidence Scoring Engine** | `POST /api/ai-review` | Computes statistical confidence level (75%–95%) based on error severity and history. |
| **3** | **Automated Repair Recommendation** | `POST /api/ai-review` | Proposes exact replacement value with 1-click apply into reviewer staging draft. |
| **4** | **Portfolio Cluster Summarizer** | `POST /api/ai/batch-summary` | Groups open portfolio exceptions into macro clusters with suggested batch remediations. |
| **5** | **Cross-Source Servicer Conflict Analyzer** | `POST /api/ai/compare-conflicts` | Compares baseline vs servicer tapes, flags balance/status deltas, and recommends authoritative source. |
| **6** | **Severity Classification Assistant** | `POST /api/ai/classify-severity` | Assesses potential financial exposure and classifies risk (Critical, High, Medium, Low). |
| **7** | **Natural Language Policy Compiler** | `POST /api/ai/generate-rule` | Compiles English policy rules (e.g. *"Block loans with rate > 18.5%"*) into structured YAML rules. |

> **Note on AI Governance & Offline Resilience:** For demo reliability and sub-millisecond execution, AI features execute via an offline deterministic copilot engine with prompt templates. Reviewers can optionally configure live Anthropic or Gemini cloud model API keys via environment variables.

---

## 👥 Built-In Personas & 1-Click Launchpad

The application features role-based access control (RBAC) with pre-seeded credentials and 1-click quick-login buttons on the login dashboard:

| Persona | Email | Password | Role | Responsibilities |
| :--- | :--- | :--- | :--- | :--- |
| **Aditya Raj** | `aditya.raj@gmail.com` | `password123` | `Data Operator` | Ingests loan tapes, inspects batch history, monitors portfolio quality score and failed rows. |
| **Rajesh Menon** | `rajesh.menon@loanguard.ai` | `password123` | `Exception Reviewer` | Investigates flagged anomalies, consults AI Copilot diagnostics, executes manual edits and verified approvals. |
| **Ananya Iyer** | `ananya.iyer@loanguard.ai` | `password123` | `Data Consumer` | Accesses canonical verified portfolios, inspects SHA-256 audit proofs, downloads governed exports. |

---

## 🚀 Quick Start: Run Locally in 2 Minutes

### Environment Variables (`.env`)
Create a `.env` file in the root directory (or use `.env.example`):
```env
PORT=8080                               # Application port (default: 8080)
JWT_SECRET=loanguard_secret_key_2026    # Secret key for JWT role tokens
NODE_ENV=production                     # Runtime environment
ANTHROPIC_API_KEY=                      # (Optional) Live Claude model key
GEMINI_API_KEY=                         # (Optional) Live Gemini model key
```

### 1. Installation & Web Build
```bash
# Clone repository
git clone https://github.com/Adityaa024/LoanGuard-AI.git
cd LoanGuard-AI

# Install backend dependencies
npm install

# Build frontend production bundle
npm run build:web
```

### 2. Start Application
```bash
npm start
# or for development mode:
npm run dev
```
Open **[http://localhost:8080](http://localhost:8080)** in your browser.

### 3. Run Automated Multi-CSV Test Suite
```bash
# Run backend multi-CSV ingestion tests
npm test

# Run the 39-point master security & penetration audit
node scripts/master_brutal_audit_runner.cjs

# Run mathematical reconciliation & invariant tests
node --test test/reconciliation_and_integrity.test.js
```

---

## 🎥 5-Minute Competition Demo Video (PS Section 15 Flow)

The competition video [`LoanGuard-AI_Intain_Final_5_Minute.mp4`](./LoanGuard-AI_Intain_Final_5_Minute.mp4) strictly executes the **Intain Section 15 Five-Minute Demo Flow** in **00:04:40** runtime:

| Time | Scene / Step | PS Flow Requirement | Implementation Shown in Video |
| :---: | :--- | :--- | :--- |
| **0:00 – 0:20** | **1. Operator Login** | Log in as Data Operator | Aditya Raj logs in via 1-click launchpad; arrives at Ingestion Studio. |
| **0:20 – 0:40** | **2. Tape Upload** | Upload a messy loan tape | Selects adversarial loan tape; initiates streaming ingestion pipeline. |
| **0:40 – 1:00** | **3. Validation Summary** | See import & validation summary | Reviews portfolio health score (88.4%), error breakdown, and batch stats. |
| **1:00 – 1:20** | **4. Failed Records** | Open records with validation failures | Clicks "Inspect Failed Rows" modal detailing exact rule codes and row numbers. |
| **1:20 – 1:40** | **5. Reviewer Login** | Log in as Reviewer | Switches to Rajesh Menon; opens priority-ranked Exception Workbench. |
| **1:40 – 2:05** | **6. AI Diagnosis** | Use AI to explain an exception | Selects loan anomaly; AI Copilot explains statutory failure and computes confidence. |
| **2:05 – 2:30** | **7. Human Control** | Accept, edit, or reject AI suggestion | AI suggestion applied to editable draft stage; reviewer edits note without touching DB. |
| **2:30 – 2:55** | **8. Approve / Reject** | Approve or reject loan records | Reviewer performs authenticated sign-off with audit justification. |
| **2:55 – 3:15** | **9. Verified Record** | Create verified loan records | Record transitions to Canonical Verified state; SHA-256 seal generated. |
| **3:15 – 3:35** | **10. Consumer Login**| Log in as Data Consumer | Switches to Ananya Iyer; enters downstream institutional investor workspace. |
| **3:35 – 4:00** | **11. Verified Dashboard**| View verified records dashboard | Inspects verified portfolio KPIs, state distributions, and data quality metrics. |
| **4:00 – 4:20** | **12. Audit Trail** | Inspect audit trail & cryptographic proof | Opens loan drawer; verifies unbroken SHA-256 Merkle chain block-by-block. |
| **4:20 – 4:35** | **13. Verified API** | Show API response for verified records | Navigates directly to `GET /api/verified-loans` displaying live clean JSON payload. |
| **4:35 – 4:40** | **14. Governance Log**| Show AI Development Log | Inspects [`ai_development_log.md`](./ai_development_log.md) covering agentic coding prompts & human oversight. |

---

## 📦 Sample Outputs & Governed Exports (PS Section 12 Deliverables)

Judges can inspect and export clean sample outputs directly from the platform:

1. **Canonical Verified Loan Export (CSV / JSON)**:
   - **Browser / UI**: Log in as Data Consumer → Click **"Export Verified Loans"** to stream clean canonical records.
   - **REST API Endpoint**: `GET http://localhost:8080/api/export/verified-loans` (CSV) or `GET http://localhost:8080/api/verified-loans` (JSON).
2. **Cryptographic Audit Trail Verification**:
   - **REST API Endpoint**: `GET http://localhost:8080/api/audit/verify` returns unbroken sequential block hashes `{ "valid": true, "chain_length": 7, "head_hash": "..." }`.
   - **Per-Loan Lineage**: `GET http://localhost:8080/api/audit/:loanId` returns chronological lifecycle events (ingestion, exception, AI review, human resolution, verification).

---

## 📡 REST API Reference (PS Section 8 Module H)

All endpoints support both standard REST `/api/...` paths and direct canonical root aliases `/...`:

| Method | Endpoint (and Canonical Alias) | Role | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/login` | Public | Authenticates user and returns JWT bearer token |
| `POST` | `/api/upload` | `operator` | Multipart CSV tape upload & real-time policy evaluation |
| `GET` | `/api/summary` *(or `/summary`)* | All | Real-time portfolio quality metrics & exception counts |
| `GET` | `/api/uploads` | All | Ingestion batch lineage and upload history |
| `GET` | `/api/loans` *(or `/loans`)* | All | Returns recent ingested loan records |
| `GET` | `/api/loans/:id` *(or `/loans/:id`)* | All | Returns single loan record by ID |
| `GET` | `/api/exceptions` *(or `/exceptions`)*| All | Returns all active open validation exceptions |
| `PATCH`| `/api/exceptions/:id` | `reviewer` | Governed human-in-the-loop exception resolution |
| `POST` | `/api/exceptions/batch-resolve` | `reviewer` | Multi-select batch exception resolution |
| `POST` | `/api/ai-review` | `reviewer` | AI Copilot single exception diagnosis & repair value |
| `POST` | `/api/ai/batch-summary` | All | Portfolio-wide AI anomaly cluster summary |
| `POST` | `/api/ai/compare-conflicts` | All | Cross-source primary vs secondary servicer reconciliation |
| `POST` | `/api/ai/classify-severity` | All | Dynamic financial exposure severity classification |
| `POST` | `/api/ai/generate-rule` | `reviewer` | Natural language compliance rule compiler |
| `GET` | `/api/verified-loans` *(or `/verified-loans`)*| Public | Canonical verified loan portfolio ledger |
| `GET` | `/api/verified-loans/:id` *(or `/verified-loans/:id`)*| Public | Single verified loan record by ID |
| `GET` | `/api/export/verified-loans` | `consumer` | Governed streaming CSV export |
| `GET` | `/api/audit/verify` | All | Cryptographic SHA-256 hash chain verification |
| `GET` | `/api/audit/:loanId` *(or `/audit/:loanId`)*| All | Complete chronological audit trail for a specific loan |
| `GET` | `/events` | All | Real-time Server-Sent Events (SSE) live activity stream |

---

## 🔒 Security, Integrity & Red-Team Audit

- **Cryptographic Hash Chain:** Continuous append-only SHA-256 block ledger with genesis block verification and tamper detection.
- **XSS & Injection Protection:** Strict server-side HTML entity sanitization with `DOMPurify` on all user-supplied note fields.
- **Field Mutation Whitelisting:** Reviewer overrides are restricted to whitelisted loan fields (`principal_balance`, `interest_rate`, `borrower_name`, `property_state`, `maturity_date`, `payment_status`, `days_past_due`, `document_status`).
- **Atomic Concurrency Protection:** Optimistic record-locking ensures simultaneous reviews do not cause race conditions.
- **Role-Based Authorization:** Signed JWT verification prevents unauthenticated mutations or unauthorized privilege escalation.

---

## 📚 Supplementary Documentation

- 🏛️ **[Architecture Note](./architecture_note.md):** 2-page system architecture, data models, validation engine, and engineering trade-offs (PS Section 12).
- 🤖 **[AI Development Log](./ai_development_log.md):** Section 10 Agentic Coding compliance log with prompt evidence, tool usage, and human review case studies.
- 🧪 **[QA Test Report](./qa_test_report.md):** Multi-CSV automated test execution report.
- 🔴 **[Brutal Red-Team Audit](./QA_BRUTAL_AUDIT.md):** Hostile security, fuzzing, and penetration test results.
- 📑 **[Problem Statement Gap Audit](./PS_GAP_AUDIT.md):** Capability mapping against Intain problem statement constraints.
- 🎨 **[QA UI/UX Review](./QA_UI_REVIEW.md):** Frontend aesthetics, responsiveness, and accessibility review.
- 🔍 **[Data Consumer Persona Audit](./DATA_CONSUMER_AUDIT.md):** Functional review covering cryptographic verification and exporting.
- 🎨 **[System Walkthrough](./walkthrough.md):** Visual UI tour and interactive user session guide.
- 📋 **[Executive Problem Brief](./BRIEF.md):** Intain Problem Statement technical briefing.
- 🏆 **[Evaluation Rubric](./RUBRIC.md):** 100-point Intain evaluation framework and scoring breakdown.
- ⚙️ **[System Orchestration](./ORCHESTRATION.md):** Ingestion, policy evaluation, and audit architecture.
- 📝 **[Engineering Notes](./NOTES.md):** Deterministic verification and cryptographic design principles.
