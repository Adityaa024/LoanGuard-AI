# 🏛️ LoanGuard-AI — System Architecture & Forensic Specification

**Target Product:** LoanGuard-AI (Loan Tape Securitization & Continuous Verification Copilot)  
**Track:** Intain Campus FinTech Challenge 2026 (Full Stack Track)  
**Inspection Date:** August 31, 2026  
**Auditor:** Principal QA & Security Engineering Group  

---

## 1. System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               CLIENT PRESENTATION TIER                                 │
│  [React 18 + Vite SPA | Tailwind CSS | Framer Motion | Lucide Icons | Recharts]        │
│  ├── Data Operator Hub (UploadView.jsx)       ── Tape Ingestion & Lineage History       │
│  ├── Exception Reviewer (ExceptionQueue.jsx)   ── Diagnostic Drawer & Resolution Seam   │
│  ├── Data Consumer (VerifiedRecords.jsx)      ── Canonical Ledger & SHA-256 Trail       │
│  └── 3D Visualizer (Hive3D.jsx)               ── Real-Time WebGL Event Stream Canvas    │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
                                            │ HTTP / JSON REST APIs + Server-Sent Events (/events)
                                            │ Header: Authorization: Bearer <JWT_TOKEN>
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              APPLICATION SERVER & ROUTER                               │
│  [Node.js (>=20) + Express.js | src/server.js + src/routes.js]                         │
│  ├── Authentication & RBAC Guard: requireRole(['operator'|'reviewer'|'consumer'])      │
│  ├── Multipart File Ingestion: Multer Memory Storage (12MB ceiling)                    │
│  ├── Input Sanitizer: DOMPurify + JSDOM HTML Sanitization (Stored XSS Protection)      │
│  └── Live Event Dispatcher: Server-Sent Events (/events event-bus)                     │
└─────────────────────┬──────────────────────────────────────────────┬───────────────────┘
                      │                                              │
                      ▼                                              ▼
┌───────────────────────────────────────────────┐ ┌──────────────────────────────────────┐
│        POLICY ENGINE & VALIDATION TIER        │ │         AI COPILOT SUBSYSTEM         │
│  [src/guard/localPolicyEngine.js]             │ │  [src/routes.js + src/policy/author] │
│  ├── Zod Boundary Parser (src/guard/schema.js)│ │  ├── Single Diagnostic Explainer     │
│  ├── Invariant Evaluator (policies/policies)  │ │  ├── Statistical Confidence Engine   │
│  ├── Cross-Source Conflict Comparator         │ │  ├── Repair Value Recommender        │
│  ├── Intra-Batch / Cross-DB Deduplicator      │ │  ├── Portfolio Cluster Summarizer    │
│  └── Stale Record & Delinquency Detector      │ │  ├── Severity Risk Classifier        │
│                                               │ │  └── Natural-Language Policy Compiler│
└─────────────────────┬─────────────────────────┘ └──────────────────┬───────────────────┘
                      │                                              │
                      ▼                                              ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                            PERSISTENCE & AUDIT LEDGER TIER                             │
│  [SQLite Database Engine: sqlite3 + sqlite driver | data/database.sqlite]              │
│  ├── Table: loans             ── Raw + Normalized Loan Records & Verification Status   │
│  ├── Table: exceptions        ── Active & Resolved Anomaly Records with AI Context     │
│  ├── Table: upload_batches    ── File Metadata, Ingestion Provenance & Timestamps      │
│  └── Cryptographic Audit Log  ── [src/audit/auditLog.js]                               │
│      ├── Memory Queue + Persistent audit_logs Table                                    │
│      ├── Sequential Monotonic Counter (seq = 1, 2, 3...)                               │
│      └── Cryptographic SHA-256 Chaining: Hash = SHA256(prevHash + Canonical(Body))     │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Major Components & Source File Mapping

| Component | Source File | Responsibilities |
| :--- | :--- | :--- |
| **HTTP Server Entry** | [`src/server.js`](file:///d:/intain/src/server.js) | Express app initialization, static asset serving (`web/dist`), port binding (`:8080`), health check. |
| **Route Controller** | [`src/routes.js`](file:///d:/intain/src/routes.js) | JWT auth, Multer upload parsing, batch transaction control, CRUD endpoints, AI routing. |
| **Zod Schema Engine** | [`src/guard/schema.js`](file:///d:/intain/src/guard/schema.js) | Strict boundary definitions, mathematical type assertions, chronological sanity validations. |
| **Local Policy Engine** | [`src/guard/localPolicyEngine.js`](file:///d:/intain/src/guard/localPolicyEngine.js) | Financial policy evaluation (`POL-BAL-001` through `POL-XSRC-001`), deduplication, stale checks. |
| **Audit Ledger** | [`src/audit/auditLog.js`](file:///d:/intain/src/audit/auditLog.js) | Append-only tamper-evident SHA-256 hash chaining, in-memory caching, SQLite sync, chain verification. |
| **Database Connector** | [`src/db/index.js`](file:///d:/intain/src/db/index.js) | SQLite connection pooling, dynamic schema creation, non-destructive column migrations. |
| **Policy Definition** | [`policies/policies.yaml`](file:///d:/intain/policies/policies.yaml) | YAML definition of statutory financial corridors, thresholds, severity tiers, and escalation actions. |
| **Web Client SPA** | [`web/src/App.jsx`](file:///d:/intain/web/src/App.jsx) | React layout, RBAC tab router, global toast context, SSE event receiver, persona switcher. |
| **Operator Studio** | [`web/src/components/UploadView.jsx`](file:///d:/intain/web/src/components/UploadView.jsx) | CSV drag-and-drop, quick test presets, KPI metrics cards, lineage batch audit table, policy modal. |
| **Reviewer Queue** | [`web/src/components/ExceptionQueue.jsx`](file:///d:/intain/web/src/components/ExceptionQueue.jsx) | Exception table, severity filters, search, AI Copilot diagnostic drawer, 1-click apply, batch resolve. |
| **Consumer Ledger** | [`web/src/components/VerifiedRecords.jsx`](file:///d:/intain/web/src/components/VerifiedRecords.jsx) | Canonical portfolio grid, state filtering, digital SHA-256 proof modal, streaming CSV export. |

---

## 3. Data Flow & Ingestion Lifecycle

```
[Raw CSV File] 
      │ 
      ▼
[POST /api/upload] (Multipart/form-data with JWT 'operator' token)
      │
      ▼
[Multer Memory Buffer] ──► [csv-parse] ──► Array of Raw Row Objects
      │
      ▼
[Database Transaction (BEGIN TRANSACTION)]
      │
      ├── 1. Generate `upload_batch_id` (batch_<timestamp>) and insert into `upload_batches`
      ├── 2. Pre-load `existingLoanIds` and `existingLoanMap` into memory (O(1) lookups)
      │
      ├── 3. Iterate Each Row:
      │       ├── Normalize raw strings into typed numerical/date schema
      │       ├── Check Intra-Batch & Cross-DB Identifier Deduplication
      │       │     └── If duplicate: mark 'has_exceptions', record 'POL-DUP-001' exception
      │       │
      │       ├── Execute `engine.evaluate(action, context)`:
      │       │     ├── Zod Schema Parse (negative balance, rate cap, date sequence)
      │       │     ├── Composite Dedup (Name + Amount + Date)
      │       │     ├── Cross-Source Conflict (Baseline vs Servicer Update)
      │       │     └── Stale Record Check (>90 days old)
      │       │
      │       ├── If Violations Exist:
      │       │     ├── Insert loan into `loans` with `validation_status = 'has_exceptions'`
      │       │     └── Insert each check into `exceptions` (status: 'open')
      │       │
      │       └── If Zero Violations:
      │             └── Insert loan into `loans` with `validation_status = 'valid'`
      │
      ▼
[Database Transaction (COMMIT)] ──► Response { batchId, recordsProcessed, validCount, exceptionCount }
```

---

## 4. Workflow State Machine

```
                  ┌────────────────────┐
                  │    RAW CSV TAPE    │
                  └─────────┬──────────┘
                            │ (POST /api/upload)
                            ▼
              ┌───────────────────────────┐
              │   INGESTION & POLICY EVAL │
              └─────────────┬─────────────┘
                            │
              ┌─────────────┴─────────────┐
              │                           │
     [Passes All Rules]          [Violates Policy]
              │                           │
              ▼                           ▼
    ┌───────────────────┐       ┌───────────────────┐
    │ validation_status │       │ validation_status │
    │   = 'valid'       │       │ = 'has_exceptions'│
    └─────────┬─────────┘       └─────────┬─────────┘
              │                           │
              │                           ▼
              │                 ┌───────────────────┐
              │                 │ EXCEPTION QUEUE   │
              │                 │  (status: 'open') │
              │                 └─────────┬─────────┘
              │                           │
              │                           ├──► [AI Diagnostic Copilot Review]
              │                           │
              │                           ▼ (Human Decision: PATCH /api/exceptions/:id)
              │                 ┌───────────────────┐
              │                 │ Human Resolution  │
              │                 │ (Resolve / Reject)│
              │                 └─────────┬─────────┘
              │                           │
              │             [All Exceptions Resolved]
              │                           │
              └─────────────┬─────────────┘
                            │
                            ▼
                ┌───────────────────────┐
                │   CANONICAL SEALING   │
                │  - validation_status  │
                │    = 'verified'       │
                │  - is_verified = 1    │
                │  - Compute SHA-256    │
                │    Record Hash Seal   │
                └───────────┬───────────┘
                            │
                            ▼
                ┌───────────────────────┐
                │   AUDIT TRAIL LOGGED  │
                │ (Append SHA-256 Block)│
                └───────────────────────┘
```

---

## 5. Database Entities & Schema

### `loans` Table
- `id` (TEXT, PK): Internal UUID (`ln_<uuid>`).
- `upload_batch_id` (TEXT, FK -> `upload_batches.id`): Provenance batch identifier.
- `loan_id` (TEXT, NOT NULL): Primary external identifier.
- `borrower_name` (TEXT): Obligor legal name.
- `property_state` (TEXT): 2-letter uppercase USPS code.
- `principal_balance` (REAL): Current outstanding principal balance.
- `interest_rate` (REAL): Annual percentage rate.
- `origination_date` (TEXT): Loan inception date (`YYYY-MM-DD` or `MM/DD/YYYY`).
- `maturity_date` (TEXT): Final term expiration date.
- `validation_status` (TEXT): `'valid' | 'has_exceptions' | 'verified' | 'pending'`.
- `is_verified` (BOOLEAN): `1` if canonicalized and signed, `0` otherwise.
- `verified_at` (DATETIME): Timestamp of human sign-off.
- `verified_by` (TEXT): Name of authorizing reviewer.
- `verified_hash` (TEXT): SHA-256 digital signature of canonical string.

### `exceptions` Table
- `id` (TEXT, PK): Unique exception ID (`exc_<uuid>`).
- `loan_id` (TEXT, FK -> `loans.id`): Target internal loan reference.
- `rule_id` (TEXT): Statutory policy ID (`POL-BAL-001`, `POL-RATE-001`, etc.).
- `rule_name` (TEXT): Symbolic rule name (`negative_balance`, `invalid_dates`, etc.).
- `field` (TEXT): Target field name (`principal_balance`, `maturity_date`, etc.).
- `severity` (TEXT): `'critical' | 'high' | 'medium' | 'low'`.
- `description` (TEXT): Natural language violation explanation.
- `current_value` (TEXT): Raw corrupted value as ingested.
- `status` (TEXT): `'open' | 'resolved' | 'rejected'`.
- `suggested_value` (TEXT): AI proposed repair value.
- `ai_explanation` (TEXT): AI diagnostic explanation.
- `resolved_at` (DATETIME): Timestamp of resolution.
- `resolved_by` (TEXT): Reviewer identity.
- `resolution_note` (TEXT): DOMPurify-sanitized audit comment.

### `audit_logs` Table
- `id` (TEXT, PK): Unique audit block ID (16-char SHA-256 prefix).
- `seq` (INTEGER): Monotonically increasing sequence number (`1, 2, 3...`).
- `agentId` (TEXT): Actor identity (`system`, `human-reviewer`, `Aditya Raj`, `copilot`).
- `actionType` (TEXT): Action type (`upload`, `ai_review`, `exception_resolution`, `export_verified_loans`).
- `loanId` (TEXT): Affected loan identifier or `'ALL'`.
- `policyId` (TEXT): Applied policy identifier.
- `decision` (TEXT): `'allow' | 'escalate' | 'deny'`.
- `reason` (TEXT): Human or AI rationale.
- `authorizer` (TEXT): Authorizing entity.
- `ts` (DATETIME): ISO 8601 timestamp.
- `prevHash` (TEXT): Previous block SHA-256 hash (or `GENESIS` = `0000...`).
- `hash` (TEXT): Current block hash = `SHA256(prevHash + Canonical(Body))`.
- `details` (TEXT): JSON payload of field mutations.

---

## 6. Complete API Surface Map

| HTTP Method | Route Path | Authorized Roles | Handler Location | Description |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/login` | Public | [`src/routes.js:44`](file:///d:/intain/src/routes.js#L44) | Authenticates credentials and issues 8h JWT token. |
| `POST` | `/api/upload` | `operator` | [`src/routes.js:74`](file:///d:/intain/src/routes.js#L74) | Ingests multipart CSV, validates rules, commits batch. |
| `GET` | `/api/summary` | All Roles | [`src/routes.js:190`](file:///d:/intain/src/routes.js#L190) | Real-time portfolio compliance KPIs and anomaly counts. |
| `GET` | `/api/uploads` | All Roles | [`src/routes.js:215`](file:///d:/intain/src/routes.js#L215) | Batch provenance lineage and validation breakdown. |
| `GET` | `/api/loans` | All Roles | [`src/routes.js:233`](file:///d:/intain/src/routes.js#L233) | Retrieves paginated recent ingested loan records. |
| `GET` | `/api/loans/:id` | All Roles | [`src/routes.js:241`](file:///d:/intain/src/routes.js#L241) | Lookup single loan record by ID or loan_id. |
| `GET` | `/api/exceptions` | All Roles | [`src/routes.js:254`](file:///d:/intain/src/routes.js#L254) | Retrieves active open validation exceptions. |
| `GET` | `/api/verified-loans` | All Roles | [`src/routes.js:262`](file:///d:/intain/src/routes.js#L262) | Retrieves canonical verified loan records. |
| `GET` | `/api/verified-loans/:id`| All Roles | [`src/routes.js:270`](file:///d:/intain/src/routes.js#L270) | Lookup verified loan record by ID. |
| `GET` | `/api/export/verified-loans`| `consumer` | [`src/routes.js:284`](file:///d:/intain/src/routes.js#L284) | Streams canonical verified CSV with audit signature. |
| `GET` | `/api/audit/verify` | All Roles | [`src/routes.js:316`](file:///d:/intain/src/routes.js#L316) | Computes and validates unbroken SHA-256 hash chain. |
| `GET` | `/api/audit/:loanId` | All Roles | [`src/routes.js:327`](file:///d:/intain/src/routes.js#L327) | Retrieves audit events for a specific loan record. |
| `POST` | `/api/ai-review` | `reviewer` | [`src/routes.js:351`](file:///d:/intain/src/routes.js#L351) | Generates root-cause explanation and repair value. |
| `POST` | `/api/ai/batch-summary` | All Roles | [`src/routes.js:475`](file:///d:/intain/src/routes.js#L475) | Macro cluster analysis across open exceptions. |
| `POST` | `/api/ai/compare-conflicts`| All Roles | [`src/routes.js:509`](file:///d:/intain/src/routes.js#L509) | Cross-source primary vs secondary servicer reconciliation.|
| `POST` | `/api/ai/classify-severity`| All Roles | [`src/routes.js:579`](file:///d:/intain/src/routes.js#L579) | Computes financial loss risk severity tier. |
| `POST` | `/api/ai/generate-rule` | `reviewer`| [`src/routes.js:632`](file:///d:/intain/src/routes.js#L632) | Compiles natural-language policy into structured YAML. |
| `POST` | `/api/exceptions/batch-resolve`| `reviewer`| [`src/routes.js:696`](file:///d:/intain/src/routes.js#L696) | Multi-select batch exception resolution. |
| `PATCH`| `/api/exceptions/:id` | `reviewer` | [`src/routes.js:755`](file:///d:/intain/src/routes.js#L755) | Governed human override, sanitization, hash sealing. |
| `GET` | `/events` | All Roles | [`src/routes.js:59`](file:///d:/intain/src/routes.js#L59) | Server-Sent Events (SSE) live decision stream. |
