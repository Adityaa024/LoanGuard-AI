# 🏦 LoanGuard-AI — Intelligent Loan Tape Securitization & Continuous Verification Copilot

> **Full-Stack Implementation for the Intain Loan Data Verification Challenge**  
> An AI-Assisted, Cryptographically Verified Governance Platform for Financial Loan Tapes.

---

## 🌟 Executive Overview & Problem Context

In private debt securitization, structured finance, and secondary loan trading, loan tape accuracy is paramount. Raw loan tapes from originating servicers frequently contain formatting defects, mathematical inconsistencies, inverted date fields, and conflicting reports.

**LoanGuard-AI** is an enterprise-grade full-stack verification platform that acts as an automated quality gatekeeper and diagnostic copilot:

```
┌────────────────────────┐      ┌─────────────────────────┐      ┌─────────────────────────┐
│ 1. Data Ingestion      │ ---> │ 2. AI Copilot Review    │ ---> │ 3. Cryptographic Seal   │
│ Ingest messy CSV tapes │      │ Explains errors & aids  │      │ Stamps an unbreakable   │
│ & catches anomalies    │      │ human decision makers   │      │ SHA-256 digital receipt │
└────────────────────────┘      └─────────────────────────┘      └─────────────────────────┘
```

1. **Deterministic Quality Gatekeeper:** Evaluates incoming loan tapes against strict financial policies (Zod schemas + `LocalPolicyEngine`) in under 2 seconds.
2. **AI Diagnostic Copilot:** Explains anomalies in plain language, computes confidence scores, and suggests verified field corrections.
3. **Strict Human-in-the-Loop Governance:** AI suggestions never directly mutate the database without explicit reviewer authorization.
4. **Tamper-Evident Cryptographic Ledger:** Every upload, AI diagnostic check, reviewer override, and export is chained with sequential SHA-256 hashes.

---

## 📋 Problem Statement Compliance Matrix (Modules A–H)

| Module | Name | Implementation Summary | Primary Persona |
| :--- | :--- | :--- | :--- |
| **Module A** | **Ingestion Engine** | Multipart CSV parser (`csv-parse`), header mapping, data normalization, batch metadata tracking, error row reporting. | Data Operator |
| **Module B** | **Validation Engine** | Two-tier validation (`schema.js` Zod schemas + `policies.yaml` business rules), 15 intentional defect interceptors. | System |
| **Module C** | **Exception Queue** | Interactive queue with severity badges (Critical, High, Medium, Low), loan ID search, rule filter, multi-select bulk operations. | Exception Reviewer |
| **Module D** | **AI Review Assistant** | 7 distinct AI capabilities: root cause explanation, confidence scoring, repair recommendation, cluster summary, conflict comparison, severity classification, rule generator. | Exception Reviewer |
| **Module E** | **Governed Resolution** | Reviewer manual override seam, field-whitelisted SQL updates, `DOMPurify` XSS protection, audit logging. | Exception Reviewer |
| **Module F** | **Canonical Portfolio** | Searchable verified ledger with digital SHA-256 seal, state filtering, and governed CSV/JSON streaming exports. | Data Consumer |
| **Module G** | **Dashboards & KPIs** | Real-time compliance score bar, exception distribution widgets, live Server-Sent Events (`/events`). | All Personas |
| **Module H** | **REST API Surface** | Express.js REST API with JWT role-based access control (`/api/upload`, `/api/exceptions`, `/api/loans`, `/api/audit/verify`, `/api/summary`). | All Clients |

---

## 🛡️ 15 Intentional Data Defects & Policy Rule Coverage

| # | Intentional Defect / Anomaly | Policy Rule ID | Severity | Enforced Condition | Resolution / AI Recommendation |
| :-: | :--- | :--- | :--- | :--- | :--- |
| **1** | Negative Principal Balance | `POL-BAL-001` | **CRITICAL** | `principal_balance < 0` | Rejection or balance inversion |
| **2** | Usurious / Invalid Interest Rate | `POL-RATE-001` | **CRITICAL** | `interest_rate < 0` or `> 25%` | Rate cap clamping (e.g. 42% -> 4.2%) |
| **3** | Missing Borrower Identity | `POL-BOR-001` | **HIGH** | `borrower_name` empty or null | Identity vault lookup & manual remediation |
| **4** | Inverted Maturity Date | `POL-DATE-001` | **MEDIUM** | `maturity_date <= origination_date` | Term correction / date re-alignment |
| **5** | Non-Standard State Postal Code | `POL-STATE-001` | **LOW** | `property_state != /^[A-Z]{2}$/` | Automated batch uppercase normalization |
| **6** | Duplicate Loan Identifier | `POL-DUP-001` | **CRITICAL** | Duplicate `loan_id` across database | Duplicate rejection / deduping |
| **7** | Duplicate Borrower Composite | `POL-BORCMB-001` | **MEDIUM** | Duplicate `Name + Amount + Date` | Collateral deduplication check |
| **8** | Balance Exceeds Principal | `POL-BALCAP-001` | **HIGH** | `current_balance > principal_balance` | Loan restructuring verification |
| **9** | Closed Loan with Active Balance | `POL-CLOSED-001` | **HIGH** | `status == Closed` & `balance > 0` | Reset balance to 0.00 |
| **10**| Payment Status Mismatch | `POL-PAYST-001` | **MEDIUM** | `status == Current` & `DPD > 0` | Reconcile payment posting |
| **11**| Missing Statutory Document | `POL-DOC-001` | **LOW** | `document_status` empty | Mark document available |
| **12**| Stale Un-serviced Record | `POL-STALE-001` | **LOW** | `last_updated_at > 90 days` | Trigger servicer sync |
| **13**| Cross-Source Servicer Conflict | `POL-XSRC-001` | **HIGH** | Primary vs Secondary delta | Remittance report reconciliation |
| **14**| Stored XSS Injection Payload | `POL-SEC-001` | **CRITICAL** | `<script>` in reviewer notes | Server-side `DOMPurify` HTML strip |
| **15**| Unhandled Null Column Values | `POL-NULL-001` | **MEDIUM** | Null in non-nullable column | Fallback UUID normalization |

---

## 🧠 All 7 AI Capabilities Matrix

| # | AI Feature | API Endpoint | Description |
| :-: | :--- | :--- | :--- |
| **1** | **Root-Cause Diagnostic Explainer** | `POST /api/ai-review` | Generates plain-language financial explanation of why the rule triggered. |
| **2** | **Confidence Scoring Engine** | `POST /api/ai-review` | Computes statistical confidence level (75%–95%) based on error severity and servicer history. |
| **3** | **Automated Repair Recommendation** | `POST /api/ai-review` | Proposes exact replacement value with 1-click apply in the reviewer drawer. |
| **4** | **Portfolio Cluster Summarizer** | `POST /api/ai/batch-summary` | Groups open portfolio exceptions into macro clusters with suggested batch remediations. |
| **5** | **Cross-Source Servicer Conflict Analyzer** | `POST /api/ai/compare-conflicts` | Compares baseline vs servicer tapes, flags balance/status deltas, and recommends authoritative source. |
| **6** | **Severity Classification Assistant** | `POST /api/ai/classify-severity` | Assesses potential financial exposure and classifies risk (Critical, High, Medium, Low). |
| **7** | **Natural Language Policy Compiler** | `POST /api/ai/generate-rule` | Compiles English policy rules (e.g. *"Block loans with rate > 18.5%"*) into structured YAML rules. |

---

## 👥 Built-In Personas & 1-Click Launchpad

The application features role-based access control with pre-seeded credentials:

| Persona | Email | Password | Role | Responsibilities |
| :--- | :--- | :--- | :--- | :--- |
| **Aditya Raj** | `aditya.raj@gmail.com` | `password123` | `Data Operator` | Uploads loan tapes, inspects batch history, monitors portfolio quality score. |
| **Rajesh Menon** | `rajesh.menon@loanguard.ai` | `password123` | `Exception Reviewer` | Investigates flagged anomalies, consults AI Copilot diagnostics, executes batch overrides. |
| **Ananya Iyer** | `ananya.iyer@loanguard.ai` | `password123` | `Data Consumer` | Accesses canonical verified portfolios, inspects SHA-256 audit proofs, downloads governed exports. |

---

## ⚡ Quick Start: Run Locally in 2 Minutes

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
```
Open **[http://localhost:8080](http://localhost:8080)** in your browser.

### 3. Run Automated Multi-CSV Test Suite
```bash
npm test
# or
node scripts/test_all_csv_uploads.cjs
```

---

## 📡 REST API Reference

| Method | Endpoint | Role | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/login` | Public | Authenticates user and returns JWT bearer token |
| `POST` | `/api/upload` | `operator` | Multipart CSV tape upload & real-time policy evaluation |
| `GET` | `/api/summary` | All | Real-time portfolio quality metrics & exception counts |
| `GET` | `/api/uploads` | All | Ingestion batch lineage and upload history |
| `GET` | `/api/loans` | All | Returns recent ingested loan records |
| `GET` | `/api/loans/:id` | All | Returns single loan record by ID |
| `GET` | `/api/exceptions` | All | Returns all active open validation exceptions |
| `PATCH`| `/api/exceptions/:id` | `reviewer` | Governed human-in-the-loop exception resolution |
| `POST` | `/api/exceptions/batch-resolve` | `reviewer` | Multi-select batch exception resolution |
| `POST` | `/api/ai-review` | `reviewer` | AI Copilot single exception diagnosis & repair value |
| `POST` | `/api/ai/batch-summary` | All | Portfolio-wide AI anomaly cluster summary |
| `POST` | `/api/ai/compare-conflicts` | All | Cross-source primary vs secondary servicer reconciliation |
| `POST` | `/api/ai/classify-severity` | All | Dynamic financial exposure severity classification |
| `POST` | `/api/ai/generate-rule` | `reviewer` | Natural language compliance rule compiler |
| `GET` | `/api/verified-loans` | All | Canonical verified loan portfolio ledger |
| `GET` | `/api/export/verified-loans` | `consumer` | Governed streaming CSV export |
| `GET` | `/api/audit/verify` | All | Cryptographic SHA-256 hash chain verification |
| `GET` | `/api/audit/:loanId` | All | Retrieves complete audit trail for a specific loan record |
| `GET` | `/events` | All | Real-time Server-Sent Events (SSE) live activity stream |

---

## 📚 Supplementary Documentation

- 🧪 **[QA Test Report](./qa_test_report.md):** Complete multi-CSV automated test execution report.
- 🎨 **[System Walkthrough](./walkthrough.md):** Visual UI tour and interactive session guide.
- 🤖 **[AI Development Log](./ai_development_log.md):** Section 10 Agentic Coding compliance log with prompt evidence and human review case studies.
- 📋 **[Executive Problem Brief](./BRIEF.md):** Intain Problem Statement technical briefing.
- 🏆 **[Evaluation Rubric](./RUBRIC.md):** 100-point Intain evaluation framework and scoring breakdown.
- ⚙️ **[System Orchestration](./ORCHESTRATION.md):** Ingestion, policy evaluation, and audit architecture.
- 📝 **[Engineering Notes](./NOTES.md):** Deterministic verification and cryptographic design principles.
