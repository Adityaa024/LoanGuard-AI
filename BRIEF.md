# 📋 LoanGuard-AI — Executive Problem Brief

## Intain Full-Stack Engineering Challenge: Loan Data Verification Copilot

### 1. Problem Context
In private debt securitization, structured finance, and secondary loan trading, loan tape accuracy is critical. Raw loan tapes from originating servicers frequently contain formatting defects, mathematical inconsistencies, inverted date fields, and conflicting reports. Manual reconciliation is slow, error-prone, and leaves portfolios vulnerable to regulatory audit penalties.

### 2. LoanGuard-AI Objective
LoanGuard-AI is an end-to-end intelligent loan tape verification platform featuring:
1. **Automated Multi-Source Tape Ingestion:** Ingests raw CSV tapes, normalizes fields, and tracks ingestion lineage.
2. **Deterministic Policy & Schema Engine:** Enforces strict boundary rules (negative balances, usury rates, cross-date validity, state postal codes).
3. **AI Diagnostic Copilot:** Explains anomalies in plain language, proposes verified corrected values, and clusters recurring error patterns.
4. **Governed Human-in-the-Loop Workflow:** Enables reviewers to accept, override, or batch-resolve exceptions with cryptographic audit signatures.
5. **Tamper-Evident SHA-256 Audit Trail:** Maintains an unbroken cryptographic hash chain for institutional securitization audit readiness.

---

### 3. Core Modules Overview (A–H)

| Module | Core Functionality | Primary Persona |
| :--- | :--- | :--- |
| **Module A: Ingestion** | CSV parser, data normalization, batch metadata tracking, error row reporting | Data Operator |
| **Module B: Validation** | Multi-rule validation engine (Zod + LocalPolicyEngine), business policy enforcement | LocalPolicyEngine |
| **Module C: Exception Queue** | Filterable queue with severity classification, loan ID search, and bulk selection | Exception Reviewer |
| **Module D: AI Assistant** | Automated explanation, confidence scoring, suggested value repair, cluster summary | AI Copilot |
| **Module E: Resolution** | Governed override seam, XSS sanitization, whitelist validation, audit recording | Exception Reviewer |
| **Module F: Canonical Ledger** | Verified loan portfolio table, immutable record seals, query/export APIs | Data Consumer |
| **Module G: Dashboard** | Real-time Quality Score gauge, exception distribution charts, ingestion timeline | All Personas |
| **Module H: REST API** | Fully documented Express/Node.js API endpoints with JWT bearer authentication | Institutional Clients |
