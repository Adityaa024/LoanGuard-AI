# ⚙️ LoanGuard-AI — System Orchestration & Verification Pipeline

## Architecture Overview

LoanGuard-AI coordinates loan tape processing through three synchronized layers:

```
┌────────────────────────────────────────────────────────┐
│               PRESENTATION LAYER (Vite + React)        │
│  - Data Operator Hub      - Exception Reviewer Queue   │
│  - AI Diagnostic Drawer   - Verified Portfolio Ledger  │
└───────────────────────────┬────────────────────────────┘
                            │ (REST APIs + Server-Sent Events)
┌───────────────────────────▼────────────────────────────┐
│               APPLICATION CORE (Node.js/Express)       │
│  - Multer CSV Ingestion Engine                         │
│  - LocalPolicyEngine (Warden Multi-Policy Verifier)    │
│  - AI Diagnostic & Cluster Summarizer                  │
│  - JWT Role-Based Authorization Guard                  │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│               PERSISTENCE & GOVERNANCE LAYER           │
│  - SQLite Database (`loans`, `exceptions`, `batches`)  │
│  - SHA-256 Hash Chained Audit Log (`audit_logs`)       │
└────────────────────────────────────────────────────────┘
```

---

## Ingestion & Pipeline Orchestration Flow

1. **Ingest & Parse:** Raw loan tape uploaded via `POST /api/upload`. Multer streams CSV rows into `csv-parse`.
2. **Policy Evaluation:** Each row is checked against Zod schemas and `LocalPolicyEngine` rules.
3. **Branching Logic:**
   - **Compliant Rows:** Ingested with `validation_status = 'valid'`. If zero exceptions exist, immediately canonicalized.
   - **Non-Compliant Rows:** Inserted into `exceptions` with policy ID, severity, field name, and raw value.
4. **AI Copilot Diagnostics:** Exception Reviewers trigger `POST /api/ai-review` for automated diagnosis and suggested repair value.
5. **Governed Human Resolution:** Reviewer approves or corrects field via `PATCH /api/exceptions/:id` or `POST /api/exceptions/batch-resolve`.
6. **Canonical Verification:** Once all exceptions for a loan are cleared, a canonical SHA-256 hash seal is generated and the loan is moved to the Verified Portfolio (`validation_status = 'verified'`).
7. **Tamper-Evident Audit Trail:** Every upload, AI diagnostic check, manual override, and export is appended to the cryptographic audit chain.
