# Architecture Note: Loan Data Verification Copilot

## 1. System Design & Overview
The Loan Data Verification Copilot is built as a full-stack web application designed to ingest, validate, and verify messy loan data. It utilizes a three-tier architecture:
- **Frontend (React + Vite + Tailwind CSS):** A single-page application providing role-based workflows for Data Operators, Exception Reviewers, and Data Consumers. It uses a modern, light-mode SaaS aesthetic. For data rendering, it utilizes **TanStack Table** for high-performance, client-side data grids.
- **Backend (Node.js + Express):** A monolithic API server handling business logic, the Warden Validation Engine (powered by **Zod**), file ingestion, and AI Copilot routing.
- **Database (SQLite):** A persistent, lightweight relational database storing loan records, exception metadata, and an immutable cryptographic audit log.

## 2. Data Model
The database is structured around four primary entities:
- **`upload_batches`**: Tracks the ingestion of CSV files (id, filename, uploaded_at).
- **`loans`**: The core entity storing loan attributes (loan_id, borrower_name, principal_balance, interest_rate, etc.). It transitions through statuses: `pending`, `has_exceptions`, `verified`.
- **`exceptions`**: Tracks validation failures tied to specific loans. It includes the failed rule, current value, severity, and resolution status.
- **`audit_logs`**: An append-only, cryptographic hash-chained ledger. Every action (ingestion, AI review, human resolution, verification) writes a row here containing a SHA-256 hash of the payload and the previous hash, ensuring non-repudiation.

## 3. API Design
The backend exposes RESTful endpoints grouped by role:
- **Ingestion (Operator):** `POST /api/upload` (multipart/form-data), `GET /api/uploads`.
- **Exceptions (Reviewer):** `GET /api/exceptions`, `PATCH /api/exceptions/:id` (for resolving/rejecting), `POST /api/ai-review` (triggers the LLM).
- **Consumer & Audit:** `GET /api/verified-loans`, `GET /api/audit/loan/:loanId` (fetches the hash-chain for a specific record).
- **Global:** `GET /api/summary` (provides portfolio-wide quality metrics).

## 4. Validation Engine (The Warden)
The Warden Engine is a synchronous, rule-based interceptor that evaluates every ingested record before it touches the database. 
It utilizes **Zod** to cryptographically enforce schema boundaries at runtime. It checks for:
- Required fields (e.g., missing Loan IDs).
- Type constraints (e.g., negative balances, invalid dates).
- Logical constraints (e.g., maturity date must be after origination date, current balance cannot exceed original principal).
If a record fails, the Warden flags the specific fields and writes them to the `exceptions` table, preventing the loan from reaching the `verified` state.

## 5. AI Feature (Review Assistant)
The AI Copilot is invoked on-demand via the Exception Reviewer dashboard. When an exception is selected, the frontend calls `POST /api/ai-review`.
The backend constructs a prompt containing the loan's context, the specific rule violation, and the raw data. It queries a deterministic LLM to:
1. Explain the likely cause of the data-entry error.
2. Suggest a corrected value.
3. Classify the confidence level.
**Crucially**, the AI is *advisory only*. The frontend explicitly forces the human reviewer to click "Accept", "Edit", or "Reject" on the AI's suggestion. The AI cannot silently mutate data, and its exact suggestion is logged in the audit trail.

## 6. Audit Trail & Traceability
To ensure the verified data is trusted by downstream consumers, every mutation is recorded in the `audit_logs` table.
- **Lineage:** We track a record from CSV ingestion to final verification.
- **Cryptographic Hashing:** Every audit log entry is hashed (`SHA-256(payload + previous_hash)`). This creates a blockchain-like ledger per loan. If the database is manually tampered with, the hash chain breaks, proving the data's integrity has been compromised.

## 7. Trade-offs & Limitations
- **SQLite:** Chosen for zero-setup portability, deterministic auditability, and embedded speed. In an enterprise cloud deployment, PostgreSQL or Amazon Aurora with read replicas would be utilized for multi-region scale.
- **Monolithic Single-Binary Service:** The React frontend is compiled and statically served directly by the Express backend. This enables single-command runnable zero-dependency evaluation, but can be split into microservices behind an API Gateway and CDN in distributed production topologies.
- **Stateless JWT Authentication:** Implemented via `POST /api/login` and enforced by `requireRole` middleware on sensitive endpoints (`/api/upload`, `/api/exceptions/:id`, `/api/export/verified-loans`), ensuring true backend access control alongside frontend persona switching.
