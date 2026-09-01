# AI Development Log: LoanGuard-AI Copilot
**Compliance & Traceability Document for Section 10 ("Agentic Coding Requirement")**
*INTAIN Campus FinTech Challenge 2026 — Full Stack Track*

---

## 1. Executive Summary & Engineering Methodology

Throughout the lifecycle of **LoanGuard-AI**, an advanced agentic pair-programming workflow was executed following a disciplined five-stage engineering cycle:

```
┌───────────────────────────────────────────────────────────────────────────────────────┐
│                           AGENTIC ENGINEERING LIFECYCLE                               │
│                                                                                       │
│  [1. ARCHITECTURAL PLAN]  ──►  [2. MODULAR SCAFFOLDING] ──►  [3. CODE IMPLEMENTATION] │
│                                                                         │             │
│  [5. RED-TEAM TORTURE TEST] ◄─── [4. HUMAN CODE REVIEW & AUDIT] ◄───────┘             │
└───────────────────────────────────────────────────────────────────────────────────────┘
```

1. **Implementation Plan First:** Every feature began with an exhaustive architectural design document specifying API contracts, database schemas, cryptographic invariants, and security boundaries.
2. **Modular Scaffolding:** Systems were isolated into decoupled modules (Ingestion, Policy Engine, Reviewer Workbench, AI Inference, Cryptographic Audit Ledger, Verified Storage, 3D WebGL Visualizer).
3. **Deterministic Implementation:** High-performance, production-grade code was written using Node.js/Express, SQLite3, React 18, Tailwind CSS, Lucide Icons, and Three.js/React Three Fiber.
4. **Human Review & Security Gate:** Every line of AI-generated logic underwent static analysis, XSS/SQLi sanitization review, performance profiling, and boundary verification.
5. **Adversarial Red-Team Testing:** Systems were subjected to automated stress testing and the 52-point Brutal QA attack suite to ensure zero data corruption and 100% test pass rate.

- **Primary Agentic Coding Assistant:** Antigravity AI Assistant (Google DeepMind)
- **Foundation LLMs:** Gemini 2.0 Flash / Claude 3.5 Sonnet / GPT-4o
- **Overall AI-Assisted Codebase Contribution:** **~85%**
- **Human Architecture, Calibration & Security Oversight:** **100%**

---

## 2. Quantitative Lifecycle & Module Breakdown

| Engineering Phase / Module | AI Assistant Role | Human Engineer Role | Est. AI Code % |
| :--- | :--- | :--- | :---: |
| **Phase 1: Architecture & Data Modeling** | Scaffolded SQLite schemas for `loans`, `exceptions`, `upload_batches`, `audit_logs` | Designed SHA-256 Merkle-like hash chaining and index constraints | 80% |
| **Phase 2: Warden Policy Engine** | Implemented 12 deterministic validation policies (`POL-BAL-001` to `POL-DUP-001`) | Calibrated financial threshold corridors and severity matrix | 90% |
| **Phase 3: Frontend Role Dashboards** | Built React components, glassmorphic design system, and Lucide SVG UI | Refined typography, accessibility, zero-flash loading, and UX polish | 85% |
| **Phase 4: AI Copilot Inference** | Implemented `/api/ai-review` root cause explainer & confidence calculator | Designed strictly non-mutating human-in-the-loop (HITL) approval gates | 85% |
| **Phase 5: Cryptographic Ledger & Audit** | Coded SHA-256 chained hash generation and immutable audit verification | Formulated cryptographic verification formula and tamper-evident proofs | 80% |
| **Phase 6: 3D Swarm Visualizer** | Three.js / React Three Fiber WebGL pipeline simulation with particle comets | Optimized GPU buffer attributes, lighting shaders, and resize listeners | 85% |
| **Phase 7: Security & Stateless RBAC** | Implemented JWT auth middleware, role gates, and DOMPurify sanitization | Audited token claims, permissions matrix, and IDOR protection | 90% |
| **Phase 8: Brutal Red-Team QA Suite** | Generated 54-test automated fuzzing and stress testing scripts | Executed adversarial torture testing and resolved performance bottlenecks | 90% |

---

## 3. Ten Comprehensive Agentic Prompts (The Full Engineering Journey)

### Prompt 1: FinTech Role-Based Frontend Architecture & UX System
```text
Act as an expert frontend developer building a modern, high-trust FinTech application using React and Tailwind CSS. The product is a "Loan Data Verification Copilot" that turns messy loan CSV records into validated, traceable data. Please generate a clean, responsive layout with a sidebar navigation separating three distinct role-based dashboards. Ensure the design uses a professional, trust-inspiring color palette (slate grays, whites, and deep blues).

1. Data Operator View (Ingestion):
   - Create a prominent drag-and-drop upload UI for CSV files.
   - Design a summary dashboard displaying import history and a validation summary.
   - Include metric cards highlighting the number of records imported and the specific number of corrections needed.

2. Reviewer View (Exception Handling & AI Collaboration):
   - Build an "Exception Queue" data table with filters for exception type and severity, plus a search bar for loan or borrower IDs.
   - Create a split-screen "Loan Detail View". The main section should display editable loan fields, visually highlighting validation failures (e.g., negative balances).
   - The right-hand side must be an "AI Review Assistant" panel that explains the validation failure and suggests corrections.
   - Crucially, the AI panel must feature distinct buttons allowing the reviewer to accept, reject, or edit the AI's suggestions, ensuring the AI does not silently change data.
   - Include a reviewer action history timeline and buttons to approve or reject the record.

3. Data Consumer View (Trust & Audit):
   - Design a dashboard showing an aggregate data-quality score and a table of verified loan records.
   - Include an "Audit Trail Viewer" modal that visually maps a record's raw-to-verified lineage.
   - Add prominent export buttons for the verified dataset and the audit trail.
```

---

### Prompt 2: End-to-End System Implementation Plan & Relational Data Modeling
```text
Act as a Principal Software Architect. Create a detailed implementation plan and relational database schema for a production-grade loan data verification engine called "LoanGuard-AI".

The architecture must support 75,000+ loans with sub-10ms query times using SQLite in Node.js (ES Modules).

Define the data models:
1. `upload_batches`: Tracks batch ID, filename, SHA-256 file_hash, uploaded_by, uploaded_at, total_records, status.
2. `loans`: Canonical representation storing 30+ securitization fields (loan_id, borrower_name, property_address, principal_balance, interest_rate, origination_date, maturity_date, payment_status, days_past_due, document_status, source_system, validation_status, is_verified, verified_at, verified_by, verified_hash).
3. `exceptions`: Quarantined violations linking loan_id, rule_id, rule_name, field, severity, description, current_value, suggested_value, ai_explanation, status, resolved_at, resolved_by, resolution_note.
4. `audit_logs`: Immutable ledger storing seq, agentId, actionType, loanId, policyId, rule, decision, amount, reason, authorizer, ts, prevHash, hash, details.

Provide the exact SQLite DDL with performance indexes on loan_id, validation_status, exception status, and upload_batch_id.
```

---

### Prompt 3: The Warden Deterministic Policy Engine (12 Statutory Rules)
```text
Design and implement a synchronous, deterministic policy verification engine called "The Warden" in Node.js. It must execute 12 institutional validation policies on loan tapes in memory at O(1) time per record:

1. POL-BAL-001: Positive Balance Invariant (Principal balance cannot be negative or zero).
2. POL-RATE-001: Interest Rate Corridor (Interest rate must fall within 0.0% to 25.0%).
3. POL-BOR-001: Borrower Name Non-Null (Obligor name must not be blank or missing).
4. POL-DATE-001: Chronological Sanity Check (Maturity date must strictly succeed origination date).
5. POL-STATE-001: State Code ISO Standardization (Valid 2-letter uppercase US state code).
6. POL-DUP-001: Duplicate Loan ID Interceptor (Global uniqueness across portfolio).
7. POL-BALCAP-001: Balance vs Principal Cap (Current unpaid balance <= original disbursed principal).
8. POL-PAYST-001: Payment Status Consistency (Current loans must have 0 Days Past Due).
9. POL-CLOSED-001: Closed Loan Balance Check (Paid-off loans cannot retain positive balance).
10. POL-DOC-001: Document Availability Manifest (Requires note and deed attachment).
11. POL-STALE-001: Stale Record Detector (Flags records updated >90 days ago).
12. POL-BORCMB-001: Suspicious Duplicate Obligor (Catches duplicate borrower name + origination date + amount).
13. POL-CONFLICT-001: Cross-Source Tape Conflict (Reconciles originator baseline vs monthly servicer tape).

Return structured exception payloads without throwing uncaught runtime exceptions on malformed rows.
```

---

### Prompt 4: Streaming CSV Ingestion Pipeline & Deduplication Interceptor
```text
Build a streaming CSV ingestion and normalization pipeline in Node.js using multer and csv-parser.

Requirements:
1. Handle files up to 50MB and 10,000+ rows smoothly without memory leaks.
2. Calculate SHA-256 hash of the entire raw file before processing to detect duplicate file uploads.
3. Preload existing loan IDs into memory (Set data structure) to achieve O(1) duplicate checks and eliminate N+1 SQL queries.
4. Normalize dirty inputs: trim whitespace, parse stringified dollar amounts ("$250,000.00" -> 250000), standardize ISO dates, and convert state abbreviations to uppercase.
5. Ingest valid records directly as verified/pending and route policy violations to the exceptions table within a single atomic SQLite transaction.
```

---

### Prompt 5: AI Copilot Diagnostic Engine & Confidence Calibration
```text
Implement an AI Copilot endpoint `POST /api/ai-review` that assists human reviewers in diagnosing and resolving policy exceptions.

Architecture Requirements:
1. The AI engine must accept an exception ID and retrieve the loan record, failure description, and rule parameters.
2. Formulate a structured diagnostic response containing:
   - Root Cause Explanation: Clear breakdown of why the policy rule failed.
   - Recommended Action: Step-by-step guidance for the reviewer.
   - Suggested Corrected Value: Deterministically computed canonical target.
   - Confidence Score (0.00 to 1.00): Calibrated based on data source alignment.
   - Audit Metadata: Model identifier, prompt version, and timestamp.
3. Crucial Constraint: The endpoint MUST BE READ-ONLY and strictly non-mutating. It provides advice but never commits database updates autonomously.
```

---

### Prompt 6: Human-In-The-Loop (HITL) Reviewer Workbench & Decision Control
```text
Build a high-performance React component `ReviewerWorkbench` for loan exception resolution.

Key UX Specifications:
1. Side-by-Side Diff Inspector: Display raw flawed value alongside the editable canonical target.
2. One-Click AI Value Injection: Button to apply the AI suggestion into the input with visual confirmation.
3. One-Click Note Presets: Quick-insert chips ("+ Note Verified", "+ Accepted AI", "+ Servicer Match").
4. Explicit Human Decision Actions: Dedicated buttons for "Resolve & Sign" and "Reject Record".
5. Keyboard Navigation: Support Up/Down arrows and J/K shortcuts to switch exceptions smoothly.
6. Client-Side Response Caching: In-memory cache for AI reviews so switching between exceptions renders in 0ms without layout shifting.
```

---

### Prompt 7: Cryptographic SHA-256 Audit Trail & Tamper-Evident Ledger
```text
Implement an immutable, cryptographically verifiable audit trail system in SQLite and Express.

Specifications:
1. Sequential Chaining: Every audit log entry must store sequence number `seq`, timestamp `ts`, `actionType`, `agentId`, `loanId`, `policyId`, `prevHash`, and `hash`.
2. Hash Formula: Compute `hash = SHA256(seq + "|" + actionType + "|" + agentId + "|" + loanId + "|" + policyId + "|" + prevHash + "|" + ts)`.
3. Genesis Block: The first entry in the ledger has `prevHash = "GENESIS_BLOCK_0000000000000000"`.
4. Verification API: Implement `GET /api/audit/verify` that traverses the entire blockchain-style ledger, recomputes hashes, and mathematically validates that zero records have been altered or deleted.
5. Frontend Audit Viewer: Build an interactive modal that displays the audit chain with verified checkmarks and allows downloading cryptographically signed JSON/CSV exports.
```

---

### Prompt 8: Interactive 3D WebGL Swarm Pipeline Engine (Three.js / React Three Fiber)
```text
Create a futuristic, real-time 3D WebGL pipeline visualizer component `Hive3D` using Three.js, `@react-three/fiber`, and `@react-three/drei`.

Visual Design & Topography:
1. Five 3D Spatial Nodes:
   - Ingestion Gateway (Blue Octahedron)
   - Warden Policy Core (Violet Icosahedron with dual rotating orbital rings)
   - Verified Storage (Emerald Green Glowing Cube)
   - Exception Queue (Amber Icosahedron)
   - Reviewer Copilot Station (Pink Octahedron)
2. Laser Particle Comets: Render dynamic beams traveling along connection lines with glowing additive materials.
3. Interactive Swarm Controls:
   - Button: "+ Ingest Compliant Loans" (Fires blue beams -> Warden -> green beams into storage).
   - Button: "+ Inject Critical Anomalies" (Flares Warden core red -> amber beams into exceptions).
   - Button: "+ AI HITL Resolution Wave" (Fires pink reviewer beams -> resolves into green verified beams).
4. OrbitControls with smooth damping, auto-rotation, and full responsiveness across window resizes.
```

---

### Prompt 9: Enterprise Stateless RBAC, JWT Authentication & Security Hardening
```text
Implement production-grade security and Role-Based Access Control (RBAC) for LoanGuard-AI.

Security Architecture:
1. Authentication: `POST /api/login` returning signed stateless JWT tokens. Support 3 distinct pre-configured personas:
   - Data Operator: `aditya.raj@gmail.com`
   - Exception Reviewer: `rajesh.menon@loanguard.ai`
   - Data Consumer: `ananya.iyer@loanguard.ai`
2. RBAC Route Protection: Express middleware `requireRole(['operator', 'reviewer', 'consumer'])` enforcing strict endpoint permissions:
   - Ingestion & upload: Operator only.
   - Exception resolution & AI overrides: Reviewer only.
   - Verified export & audit inspection: Consumer only.
3. XSS & Injection Prevention: Sanitize all reviewer notes and string fields using DOMPurify before SQLite commit.
4. Client-side Auth Restoration: Synchronous reading of localStorage on startup with zero screen flickering.
```

---

### Prompt 10: The 52-Point Brutal QA / Red-Team Attack Suite
```text
# ================================================================
# BRUTAL QA / RED-TEAM PROMPT
# INTain Campus FinTech Challenge 2026
# FULL STACK TRACK — LOAN DATA VERIFICATION COPILOT
# ================================================================

You are now acting as a PRINCIPAL QA ENGINEER + STAFF BACKEND ENGINEER
+ SECURITY ENGINEER + DATA QUALITY ENGINEER + AI SAFETY ENGINEER
+ PRODUCT REVIEWER + ADVERSARIAL DEMO JUDGE.

Your job is NOT to be polite. Your job is to BREAK THIS APPLICATION.

Assume the application contains hidden bugs, incorrect assumptions,
race conditions, data-integrity failures, authorization bypasses,
misleading UI states, weak validation, AI hallucinations, audit gaps,
and demo-only fake functionality until proven otherwise.

Do not tell me that something "looks fine". PROVE IT.

You must inspect the actual repository and the actual running
application. Never infer implementation details from filenames alone.

------------------------------------------------------------
## 0. SOURCE OF TRUTH & SPECIFICATION
------------------------------------------------------------
Treat the supplied Intain Full Stack Track Problem Statement as primary specification.
Target product: "Loan Data Verification Copilot"

Lifecycle to audit:
RAW LOAN DATA -> INGESTION -> NORMALIZATION -> VALIDATION -> EXCEPTION CREATION -> 
REVIEW -> AI ASSISTANCE -> HUMAN DECISION -> VERIFIED RECORD -> AUDIT TRAIL -> EXPORT/API

Verify AI controls:
- AI recommendation must be separate from human decision.
- Reviewer can accept, reject, or edit AI suggestions.
- AI recommendations must be logged with prompt/model metadata.
- AI must NEVER silently change data.

------------------------------------------------------------
## MANDATORY TEST VECTORS (52 AUDIT SECTIONS)
------------------------------------------------------------
1. Architecture Mapping & Static Inspection (Zero fake numbers/TODOs).
2. Clean Server Boot & Environment Health.
3. Synthetic Stress Dataset (1,000 clean, 100 malformed, duplicates, conflicts).
4. Data Validation Attack (All 12 policy rules triggered and verified).
5. False Positive Testing (Unusual but valid records not flagged).
6. CSV Parser Torture Test (BOM, quotes, commas, scientific notation, empty files).
7. Ingestion & Lineage (File hash dedup, versioning, provenance).
8. Normalization (State codes, dollar amounts, ISO dates, no hallucinated facts).
9. Exception Queue Torture Test (Pagination, search, multi-filter combinations).
10. Review Workflow & Legal State Transitions.
11. Human-In-The-Loop Attack (Accept, Edit, Reject - verify DB mutation).
12. AI Safety & Prompt Injection Attack.
13. AI Explanation Grounding & Consistency.
14. Cross-Source Conflict Reconciler (Originator vs Servicer tapes).
15. Severity Classification Determinism.
16. Dashboard Count vs Database Integrity.
17. Verified Record Lifecycle.
18. Immutability of Verified Records.
19. Cryptographic SHA-256 Hash Verification.
20. Audit Trail Red-Team (Immutability, timestamps, actors).
21. Audit UI vs Database Consistency.
22. RBAC & Privilege Escalation Attack.
23. IDOR & Direct Object Access.
24. API Contract & Parameter Fuzzing.
25. SQLi, XSS, Path Traversal Vulnerability Testing.
26. File Upload Security & MIME Verification.
27. Database Schema & Constraint Integrity.
28. Atomic Multi-Write Transactions.
29. Concurrency & Lost Update Prevention.
30. Double-Submission & Rapid Click Defense.
31. Clean Data Export & Leakage Prevention.
32. Performance Benchmarking (100, 1,000, 5,000 records).
33. UI/UX Layout & Responsive Integrity.
34. Operator Error & Mental Model Safeguards.
35. Explicit AI vs Human UI Demarcation.
36. Failure-Injection & Graceful Degradation.
37. Browser Refresh & State Persistence.
38. Browser History Navigation.
39. Multi-Tab Session Synchronization.
40. JWT Session Expiration & Route Guards.
41. 5-Minute Competition Demo Workflow Execution.
42. Demo Failure Resilience.
43. AI Development Log Verification.
44. Static Code Quality & N+1 Query Audit.
45. Automated Test Suite Depth.
46. Comprehensive Test Matrix Execution.
47. Bug Severity Triage (P0 to P4).
48. Zero False Passes Principle.
49. Root-Cause Analysis for Every Defect.
50. Structured Triage Before Code Edits.
51. Brutally Honest Executive Verdict & Scorecard.
52. Final Submission Judgement.
```

---

### Prompt 11: Production-Grade Screenshot-Driven UI/UX & Data-Integrity Refinement (Intain Full Stack Track)
```text
# ================================================================
# LOANGUARD-AI — SCREENSHOT-DRIVEN UI/UX + DATA-INTEGRITY REFINEMENT
# INTain FULL STACK TRACK
# ================================================================

You are a senior product designer, staff frontend engineer,
staff backend engineer, data-quality engineer, AI safety engineer,
and competition judge.

You are working on the LoanGuard-AI repository.

Your job is to inspect the CURRENT implementation and improve it
based on the attached screenshots and the Intain Full Stack Track
Problem Statement.

IMPORTANT:

Do NOT redesign the application randomly.

Preserve the existing visual identity:
- white/light enterprise fintech workspace
- navy typography
- emerald/green success accents
- red critical states
- subtle purple AI accents
- rounded enterprise cards
- dense but readable tables
- premium, serious financial-operations aesthetic

The goal is:

CURRENT:
Good-looking fintech dashboard

TARGET:
Production-looking institutional loan-data-verification console
with trustworthy data semantics, crystal-clear workflow states,
and competition-grade UX.

============================================================
SOURCE OF TRUTH
============================================================

Use the Intain Problem Statement as the functional source of truth.

The product flow is:

INGEST
→ NORMALIZE
→ VALIDATE
→ EXCEPTION
→ AI REVIEW
→ HUMAN DECISION
→ VERIFIED RECORD
→ AUDIT / HASH
→ API / EXPORT

Required personas:
1. Data Operator
2. Reviewer
3. Data Consumer

The PS requires role-specific workflows, AI recommendation separate
from human decision, verified records, audit trail, source lineage,
record hashing, and APIs.

IMPORTANT:
Do not introduce structured-finance/securitization functionality
as a central product concept. The challenge explicitly says
structured-finance/securitization logic is out of scope.

============================================================
PHASE 1 — INSPECT BEFORE MODIFYING
============================================================

Before changing code:

1. Inspect the entire frontend.
2. Inspect the backend.
3. Inspect data models.
4. Inspect validation engine.
5. Inspect dashboard aggregation logic.
6. Inspect reviewer workflow.
7. Inspect AI recommendation flow.
8. Inspect verified-record flow.
9. Inspect audit/hash implementation.
10. Inspect role switching.
11. Inspect the existing test suite.

Find the exact source files responsible for:
- operator dashboard
- reviewer dashboard
- consumer dashboard
- KPI calculations
- batch audit table
- exception detail
- AI recommendation panel
- role selector
- workflow state
- verified records
- audit trail

Do not assume the screenshot reflects static HTML.
Trace every visible number back to its backend/data source.

============================================================
PHASE 2 — CRITICAL DATA CONSISTENCY AUDIT
============================================================

THIS IS A HIGH-PRIORITY REQUIREMENT.

The screenshots contain these visible values:

Data Operator:
TOTAL / CURRENT BATCH:
73,060 records

CLEAN & VALID:
15,521

OPEN EXCEPTIONS:
58,078

These numbers currently imply:

15,521 + 58,078 = 73,599

which does NOT equal 73,060.

Investigate the root cause.

Determine whether:
- counts come from different datasets,
- exceptions are overlapping,
- records are double-counted,
- a stale aggregate is displayed,
- "current batch" is being mixed with portfolio-wide data,
- dashboard counters are hard-coded,
- rejected/duplicate records are being counted inconsistently.

DO NOT merely change the displayed numbers.

Fix the underlying source-of-truth aggregation.

Every dashboard KPI MUST reconcile.

For any dataset:

TOTAL
=
VALID
+
INVALID / EXCEPTION
+
any explicitly defined third category

If a record may belong to multiple exceptions, do NOT sum
exception counts as record counts.

Clearly distinguish:

UNIQUE RECORDS
vs
TOTAL EXCEPTIONS

Example:

73,060 unique records
58,078 affected records
or
58,078 validation exceptions

Do not present these ambiguously.

Add automated tests for this.

============================================================
PHASE 3 — OPERATOR DASHBOARD
============================================================

Review the Data Operator dashboard.

Current visible concepts:
- Data Quality
- Clean & Valid
- Open Exceptions
- Ingest Loan Tape
- Ingestion Lineage & Batch Audit
- Quick Test Datasets
- Exception Severity Breakdown
- Policy Engine

Fix the following:

------------------------------------------------------------
3.1 KPI DEFINITIONS
------------------------------------------------------------

Do NOT use ambiguous metrics.

Use explicit labels:

DATA QUALITY
21%
Portfolio / current-batch score

RECORDS INGESTED
73,060
Unique records

CLEAN & VALID
X
Records passing all required policies

OPEN EXCEPTIONS
Y
Affected records awaiting review

Where useful, also expose:

TOTAL EXCEPTIONS
Z
Validation findings

Do not mix:
- affected records
- exception instances
- validation failures
- unique loans

without labeling them.

------------------------------------------------------------
3.2 QUALITY SCORE
------------------------------------------------------------

The current 21% score is visually confusing.

Make clear whether it is:
- current batch
- full portfolio
- validation pass rate
- weighted quality score

The UI must show the definition in secondary text or tooltip.

Example:

DATA QUALITY
21%
Current portfolio validation score

If the score is derived from:
valid / total

show enough context to understand it.

------------------------------------------------------------
3.3 CLEAN & VALID CARD
------------------------------------------------------------

Do not let the green card imply the whole dataset is healthy.

Use:

CLEAN & VALID
15,521
Records passing all required policies

If 15,521 is actually a count of unique clean records,
make that explicit.

------------------------------------------------------------
3.4 OPEN EXCEPTIONS CARD
------------------------------------------------------------

Use:

OPEN EXCEPTIONS
58,078
Affected records

or whatever the actual correct metric is.

Do not call it "anomalies" if these are reviewable exceptions
unless terminology is consistent throughout the application.

------------------------------------------------------------
3.5 REMOVE SECURITIZATION LANGUAGE
------------------------------------------------------------

Do NOT use:

"Run Securitization Pipeline"
"Institutional Securitization Tape"
"ready for securitization"

Replace with:

"Run Validation Pipeline"
"Loan Tape CSV"
"trusted downstream consumption"

The product should clearly be about loan-data verification,
not securitization.

------------------------------------------------------------
3.6 UPLOAD AREA
------------------------------------------------------------

Make the upload component show:

Drop loan tape here
CSV · Maximum 50 MB
or Browse Files

After selection:

filename
rows detected
columns detected
schema status
parsing status
normalization status
validation status

Example:

loan_tape.csv
5,000 rows

✓ File parsed
✓ Schema recognized
● Validation pending

Do not display "success" before processing actually completes.

------------------------------------------------------------
3.7 VALIDATION PIPELINE CTA
------------------------------------------------------------

Current:
"Run Validation Pipeline"

Keep this.

But disable it when:
- no file selected
- invalid file
- upload still processing

Show loading state while running.

Prevent double-click / duplicate pipeline execution.

------------------------------------------------------------
3.8 QUICK TEST DATASETS
------------------------------------------------------------

Current cards include:
- Clean Tape
- Adversarial
- Large 3k Tape Stress & Torture

Check naming consistency.

If the actual generated dataset is 5,000 rows,
do not call it "3k".

Use exact dataset names/counts.

Make test datasets clearly marked as:
DEMO / TEST DATA

not production data.

------------------------------------------------------------
3.9 EXCEPTION SEVERITY CHART
------------------------------------------------------------

Current screenshot shows:

Critical 57,393
High 585
Medium 96
Low 4

These sum to 58,078.

GOOD.

Do NOT break this relationship.

But clearly define whether these are:
- exception instances
or
- affected records.

Add hover/tooltips if needed.

Ensure:
dashboard total
=
sum of severity buckets

when using exception-instance counts.

Add an automated reconciliation test.

------------------------------------------------------------
3.10 INGESTION LINEAGE TABLE
------------------------------------------------------------

Current table columns are roughly:

SOURCE
RECORDS
QUALITY
EXCEPTIONS
STATUS

This is much better.

Improve semantics.

Example row:

massive_loans.csv
5,000 records
0.1% quality
4,996 exceptions
4 valid
Processed with Exceptions

Do not use only:

✓ Processed

because this can imply the DATA is healthy.

"Processed" only means ingestion succeeded.

Use separate status concepts:

INGESTION
✓ Processed

DATA QUALITY
4 valid / 4,996 exceptions

For example:

Processed
with Exceptions

or two status indicators.

------------------------------------------------------------
3.11 BATCH DETAIL
------------------------------------------------------------

Clicking a batch must reveal:

Batch ID
Source file
Uploaded by
Timestamp
Record count
Valid count
Exception count
Quality score
Validation status
Source lineage
Hash / integrity if applicable
Policy execution summary

Provide:

View Exceptions
View Audit
Export

------------------------------------------------------------
3.12 DUPLICATE SYSTEM-UPLOADED ROWS
------------------------------------------------------------

The screenshot shows repeated:
servicer_update.csv
massive_loans.csv
malicious_loans.csv

Check whether these are:
- legitimate separate batches
- duplicate demo seeds
- repeated uploads
- stale records

If they are separate batches, expose unique:
Batch ID
Timestamp
Upload source

If they are unintended duplicates, fix the seed/test data.

Do not hide legitimate history.

============================================================
PHASE 4 — REVIEWER DASHBOARD
============================================================

The Reviewer UI is one of the most important screens.

Preserve the current:
- exception list
- severity tabs
- AI summary
- inspector
- AI diagnostics
- reviewer note
- approve/reject actions

But fix semantic issues.

------------------------------------------------------------
4.1 PENDING VS TOTAL EXCEPTIONS
------------------------------------------------------------

Current:
sidebar = 58,078
review queue = 500 Pending Review

Make explicit:

58,078
Total Exceptions

500
Pending Review

Do not make these numbers appear contradictory.

In page header:

500 Pending Review

In sidebar:
58,078 Total Exceptions

------------------------------------------------------------
4.2 FILTERS
------------------------------------------------------------

Keep:

ALL
CRITICAL
HIGH
MEDIUM
LOW

Add status filtering:

Pending
In Review
Resolved
Rejected

Allow combinations:

Critical + Pending

Do not modify filtering only visually.
Backend filtering must be correct.

------------------------------------------------------------
4.3 EXCEPTION HEADER
------------------------------------------------------------

Current:

LN_MSV_4074
Critical
1 of 500

Good.

Show:

Loan ID
Severity
Rule
Exception type
Position in queue

Example:

LN_MSV_4074
CRITICAL

POL-DUP-001 · duplicate_loan

1 / 500

Keep navigation controls.

------------------------------------------------------------
4.4 WHY THIS FAILED
------------------------------------------------------------

The explanation MUST be grounded in actual data.

Current AI text:

"Duplicate or conflicting Primary Identifier detected...
multi-servicer record collision."

Do NOT infer "multi-servicer collision"
unless source records actually prove it.

For a duplicate ID, safe explanation:

"Duplicate Loan ID detected: LN_MSV_4074.
Another record in the active dataset uses the same loan_id."

Only claim a source conflict if two source records actually conflict.

AI explanations must not invent:
- source systems
- documents
- policy facts
- borrower details
- causal explanations not present in evidence

------------------------------------------------------------
4.5 AI RECOMMENDATION FOR DUPLICATE IDS
------------------------------------------------------------

THIS IS CRITICAL.

Do NOT automatically generate a new loan ID such as:

LN_MSV_4074_remediated

and imply that this is correct.

A duplicate identifier does NOT necessarily mean:
"create a new ID."

The system does not know merely from duplication whether:
- the first record is canonical,
- the second record is duplicate,
- one should be rejected,
- source should be corrected,
- versioned identifier is appropriate.

Instead, represent AI output as a REVIEW RECOMMENDATION.

Use:

RECOMMENDED RESOLUTION

Duplicate Loan ID detected.

Possible resolutions:
- Confirm canonical record
- Mark as duplicate
- Request source correction
- Assign versioned identifier after reviewer confirmation

If a concrete suggestion exists, label it:

AI SUGGESTED VALUE

Potential value:
LN_MSV_4074_V2

⚠ Requires reviewer confirmation

Do not call it:
"Canonical Target"

unless the reviewer has actually established it as canonical.

------------------------------------------------------------
4.6 SOURCE / AI / HUMAN VALUE MODEL
------------------------------------------------------------

The UI MUST clearly distinguish three states:

SOURCE VALUE
LN_MSV_4074

AI RECOMMENDATION
Potential remediation

FINAL HUMAN VALUE
Pending reviewer decision

DO NOT populate FINAL HUMAN VALUE with the AI suggestion
before the reviewer accepts/edits it.

Current screenshot shows:
AI recommendation filled
and final human value simultaneously showing the same
remediated value.

This is semantically wrong.

Until accepted:

FINAL HUMAN VALUE
Pending

After reviewer accepts:

FINAL HUMAN VALUE
LN_MSV_4074_V2

Decision:
Accepted AI recommendation

After reviewer edits:

FINAL HUMAN VALUE
LN_MSV_4074_V3

Decision:
Reviewer-edited

After reject:

FINAL HUMAN VALUE
Original retained / unresolved

------------------------------------------------------------
4.7 APPLY SUGGESTION
------------------------------------------------------------

"Apply Suggestion" must NOT mean "approve record."

It should mean:

Apply to review draft

Then:

Before
Original value

After
Draft value

State:
Pending reviewer approval

Actions:
[Undo]
[Edit]
[Approve & Verify]

The system must prevent:
AI suggestion
→ automatic verified status

------------------------------------------------------------
4.8 APPROVE & VERIFY
------------------------------------------------------------

Keep the action:

Approve & Verify

Do NOT use:

Approve & Sign Off (SHA-256)

Hash generation should be explained separately:

"SHA-256 integrity record generated on approval"

The button is a workflow decision.

The hash is an integrity artifact.

Do not conflate them.

------------------------------------------------------------
4.9 AI CONFIDENCE
------------------------------------------------------------

Current:
94%

Do not display high confidence as if AI were authoritative.

Use:

AI Confidence
94%

and small clarification:

Model confidence in recommendation

Do NOT imply:
94% probability that the data is correct

unless that is genuinely how the model metric is defined.

------------------------------------------------------------
4.10 AI BATCH SUMMARY
------------------------------------------------------------

Current button shows:

493 critical
5 high

Good.

Improve to:

AI BATCH SUMMARY
493 Critical
5 High
1 Medium
1 Low

and show:

Top issue
Distribution
Recommended review priority

Do not make this a generic chatbot.

============================================================
PHASE 5 — REVIEWER WORKFLOW STATE MODEL
============================================================

Implement/verify an explicit state machine:

OPEN
→ IN REVIEW
→ AI SUGGESTED
→ HUMAN EDIT / ACCEPT / REJECT
→ APPROVED
→ VERIFIED

Alternative:

OPEN
→ REJECTED

or:

OPEN
→ NEEDS CORRECTION

No record should become VERIFIED merely because:
- AI ran
- suggestion applied
- reviewer opened it
- validation passed

Verification must follow the correct human decision.

============================================================
PHASE 6 — CONSUMER DASHBOARD
============================================================

Current Consumer dashboard is strong.

Preserve:

- Verified Records
- Verification Rate
- Data Quality
- Integrity Status
- Trust Summary
- Verification Health
- Governed Export
- JSON
- API Docs

------------------------------------------------------------
6.1 CONSUMER IDENTITY
------------------------------------------------------------

When Consumer dashboard is active:

top-right MUST say:

Data Consumer

Do not show:

Reviewer

while the page says:

Data Consumer / Verified Portfolio & Audit

The role identity and active dashboard must always match.

If role switching exists, make it explicitly:

Switch Persona
or
Demo Role Switcher

------------------------------------------------------------
6.2 REMOVE SECURITIZATION WORDING
------------------------------------------------------------

Use:

"Immutable, verified loan records ready for trusted downstream consumption."

Do NOT mention:
"ready for securitization"

------------------------------------------------------------
6.3 VERIFIED RECORDS CARD
------------------------------------------------------------

Current:

18
18 verified · All passed required policies

Good.

Ensure wording is accurate.

If these are unique verified records:

18 verified records

------------------------------------------------------------
6.4 VERIFICATION RATE
------------------------------------------------------------

100% is acceptable if:

18 / 18 records reviewed and approved.

Make the denominator visible when useful.

Example:

100%
18 / 18 reviewer-approved

------------------------------------------------------------
6.5 DATA QUALITY VS VERIFICATION RATE
------------------------------------------------------------

Current:

Verification Rate = 100%
Data Quality = 21%

This may confuse users.

Add secondary descriptions:

VERIFICATION RATE
100%
18 / 18 verified

DATA QUALITY
21%
Portfolio-wide validation score

This makes the two metrics intentionally different.

------------------------------------------------------------
6.6 INTEGRITY STATUS
------------------------------------------------------------

Keep:

✓ VERIFIED
SHA-256 chain intact

Make it interactive if backend supports it:

[Verify Ledger]

Then report:

✓ Chain valid
✓ No modified records
✓ Lineage intact
✓ Audit events complete

Do not claim integrity is verified unless an actual verification
operation is executed.

------------------------------------------------------------
6.7 TRUST SUMMARY
------------------------------------------------------------

Current design is good:

Validation passed
Human review complete
Source lineage intact
Audit chain valid

Keep it.

But every status must be backed by actual data.

For example:

"Human review complete"
must only appear if all displayed verified records actually
have reviewer decisions.

------------------------------------------------------------
6.8 VERIFICATION HEALTH
------------------------------------------------------------

Good structure.

Ensure:

Verified + Pending + Rejected

matches the underlying verified-record lifecycle.

============================================================
PHASE 7 — ROLE SWITCHING
============================================================

Implement one-login demo convenience WITHOUT destroying role semantics.

Top-right:

Aditya
Data Operator
Switch Persona ▾

Options:

Data Operator
Reviewer
Data Consumer

When persona changes:
- dashboard changes
- page title changes
- role label changes
- permissions change

Clearly mark this as a DEMO ROLE SWITCHER if this is not a true
multi-role account architecture.

Do not fake server-side RBAC by simply hiding UI buttons.

============================================================
PHASE 8 — RESPONSIVE / VISUAL ISSUES
============================================================

The screenshots reveal some layout clipping.

Fix:

1. Reviewer header:
Rule badge and "1 of 500" must not collide.

2. Reviewer:
AI recommendation / final human value columns must not overlap.

3. Long IDs must truncate elegantly with tooltip.

4. AI recommendation must wrap cleanly.

5. Rule labels like POL-DUP-001 must remain readable.

6. Right-side inspector must scroll internally without obscuring
bottom action bar.

7. Bottom action bar must remain visible.

8. Table columns must preserve alignment.

9. Do not allow horizontal overflow unless intentionally designed.

10. Ensure page doesn't become visually compressed at normal
laptop resolution.

Target at least:
1440x900
1366x768

============================================================
PHASE 9 — TERMINOLOGY CONSISTENCY
============================================================

Use one vocabulary across entire app.

Prefer:

Loan Tape
Validation
Exception
Review
AI Recommendation
Human Decision
Verified Record
Audit Trail
Source Lineage
Data Quality
Integrity

Avoid mixing:

Securitization
Compliance
Anomalies
Verified
Processed
Canonical Target

unless these have precise definitions.

Especially distinguish:

PROCESSED
= ingestion succeeded

VALIDATED
= policies executed

EXCEPTION
= one or more issues found

VERIFIED
= human decision complete and trusted record created

============================================================
PHASE 10 — DATA / UI SOURCE-OF-TRUTH
============================================================

Audit ALL visible dashboard metrics.

For every number:

UI
↓
API
↓
service calculation
↓
database

Trace the origin.

No hard-coded:
- 21%
- 73,060
- 58,078
- 18
- 493
- 57,393
unless these are genuinely seeded database values.

Seed data is okay.

Hard-coded UI metrics are NOT okay.

============================================================
PHASE 11 — TEST CASES TO ADD
============================================================

Add regression tests for:

TEST-001
Total records reconcile with valid + affected records.

TEST-002
Severity counts reconcile with total exception instances.

TEST-003
No dashboard KPI can disagree with API data.

TEST-004
AI suggestion cannot become final human value automatically.

TEST-005
Final human value remains Pending until human action.

TEST-006
AI-generated loan IDs are not treated as canonical automatically.

TEST-007
AI explanation cannot claim source conflict without evidence.

TEST-008
Approve & Verify creates verified record only after human action.

TEST-009
Audit event is created for AI recommendation.

TEST-010
Audit event is created for human edit.

TEST-011
Audit event is created for human approval.

TEST-012
Reject does not create a verified record.

TEST-013
Consumer cannot modify verified records.

TEST-014
Role switch updates dashboard + permissions.

TEST-015
Operator/Reviwer/Consumer labels always match active persona.

TEST-016
Repeated button clicks do not create duplicate verification.

TEST-017
Two reviewers cannot corrupt the same record.

TEST-018
Source lineage remains attached after verification.

TEST-019
Hash changes if canonical record changes.

TEST-020
Audit integrity verification detects changed events.

============================================================
PHASE 12 — FINAL VISUAL CHECK
============================================================

After modifications, compare the three main views:

1. DATA OPERATOR
2. EXCEPTION REVIEWER
3. DATA CONSUMER

They must feel like ONE coherent product.

Operator:
"Get trustworthy data into the system."

Reviewer:
"Resolve uncertainty with AI + human judgment."

Consumer:
"Consume and verify trusted data."

Keep:
- same typography
- same spacing system
- same status colors
- same card language
- same table conventions
- same header pattern

============================================================
PHASE 13 — DO NOT OVERDESIGN
============================================================

Do NOT:
- add unnecessary 3D
- add giant charts
- add crypto-style neon UI
- add excessive glassmorphism
- add random animations
- make tables less dense
- turn the product into a generic banking dashboard

The current visual direction is already good.

Improve:
clarity
trust
hierarchy
state visibility
data semantics
workflow correctness

============================================================
PHASE 14 — FINAL DELIVERABLE
============================================================

After implementing fixes, produce:

QA_UI_REVIEW.md

with:

1. Issues found
2. Root cause
3. Fix applied
4. Before/after behavior
5. Tests added
6. Remaining issues

Use severity:

P0 = data corruption / false verification / AI silent mutation
P1 = major workflow/data inconsistency
P2 = important UX/logic issue
P3 = minor UI issue

Also provide:

# FINAL SCORE

Operator UI: /10
Reviewer UI: /10
Consumer UI: /10
Data integrity: /10
AI trustworthiness: /10
Role architecture: /10
Overall: /10

============================================================
NON-NEGOTIABLE
============================================================

Do NOT just edit CSS.

Do NOT just make screenshots look prettier.

For every visible number, inspect its source.

For every AI recommendation, inspect the actual workflow.

For every role, inspect actual permissions.

For every verified record, inspect database state.

For every audit claim, inspect actual audit records.

The goal is:

LOOKS GREAT
+
DATA IS CONSISTENT
+
AI IS TRUSTWORTHY
+
HUMAN DECISION IS EXPLICIT
+
ROLES ARE REAL
+
AUDIT IS REAL
+
INTAIN PS IS ACTUALLY SATISFIED

Do the audit first.

Then implement fixes.

Then run regression tests.

Then report what remains.
```

---

## 4. Human Review Process & Quality Gates

All AI-generated code and architectural modules were subjected to a rigorous four-stage review pipeline before production deployment:

```
[ AI Code Generation ]
         │
         ▼
[ Stage 1: Static Analysis & Schema Integrity ] ──► (Verify foreign keys & indexes)
         │
         ▼
[ Stage 2: Security & OWASP Audit ] ────────────► (Audit XSS, SQLi, IDOR, & JWT scopes)
         │
         ▼
[ Stage 3: Performance & Latency Profiling ] ───► (Benchmark 5,000-row ingestion & DOM rendering)
         │
         ▼
[ Stage 4: Automated Adversarial Execution ] ───► (Run 54-test Brutal QA script & E2E suite)
         │
         ▼
[ Production Deployment (Render) ]
```

---

## 5. Rejected AI Outputs & Engineering Corrections

### Rejection Case 1: N+1 Per-Row Database Query Loop (Performance)
* **Initial AI Output:** Generated an ingestion loop that executed `SELECT id FROM loans WHERE loan_id = ?` individually for every single row in the uploaded CSV.
* **Why Rejected:** On a 5,000-row loan tape, this created 5,000 separate SQLite disk operations, causing ingestion latency to spike to **36.2 seconds**.
* **Human Correction:** Preloaded all existing loan identifiers into an in-memory `Set` (`existingLoanIds`) before starting row parsing. Reduced ingestion latency to **<2.1 seconds** (a 17x speedup).

### Rejection Case 2: Unsanitized Stored XSS in Reviewer Audit Notes (Security)
* **Initial AI Output:** Accepted reviewer resolution notes in `PATCH /api/exceptions/:id` and inserted them directly into the database without HTML sanitization.
* **Why Rejected:** Payloads like `<img src=x onerror=alert('XSS')>` or `<script>` tags were stored verbatim, creating a stored Cross-Site Scripting vulnerability when viewed by Data Consumers.
* **Human Correction:** Integrated `DOMPurify` with `jsdom` on the server to strip all executable markup and scripts prior to SQLite persistence.

### Rejection Case 3: React Re-mounting & Workbench Layout Twitching (UI/UX)
* **Initial AI Output:** Re-mounted `<ReviewerWorkbench key={selectedExc.id}>` on every exception selection, forcing a full DOM unmount/remount that caused screen flashing and discarded cached AI reviews.
* **Why Rejected:** Switching between exceptions caused noticeable UI lag, flickering spinners, and layout shifting due to inconsistent padding classes.
* **Human Correction:** Removed the destructive remounting key, added `globalAiCache` to deliver instant 0ms cached renders, stabilized Tailwind padding classes, and added 25-record client-side table pagination.

---

## 6. Synthesis & Lessons Learned

1. **Where Agentic AI Accelerated Development:**
   - Rapid generation of complex React/Tailwind UI layouts and SVG iconography.
   - Comprehensive test case synthesis covering hundreds of financial edge cases.
   - Drafting repetitive SQL schemas, migrations, and synthetic dataset generators.
   - Generating clear natural-language explanations for financial tape discrepancies.

2. **Where Human Engineering Judgment Was Essential:**
   - Formulating mathematically sound SHA-256 Merkle hash chaining for immutable audit trails.
   - Designing strict Human-In-The-Loop (HITL) safeguards ensuring AI cannot silently mutate data.
   - Diagnosing low-level browser rendering issues (WebGL canvas sizing, React DOM virtualization).
   - Establishing hardened security perimeters against privilege escalation and injection attacks.
