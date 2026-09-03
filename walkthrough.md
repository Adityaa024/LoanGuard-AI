# 🎨 LoanGuard-AI — System Walkthrough & Feature Guide

**Platform:** LoanGuard-AI — Intelligent Loan Tape Continuous Verification Copilot  
**Architecture:** Multi-Persona Role-Based Workflow (Data Operator, Exception Reviewer, Data Consumer)  
**Security & Audit:** Tamper-Evident SHA-256 Hash Chain & Strict Zod Schema Enforcement  

---

## 1. 🌟 Multi-Persona Workspaces

LoanGuard-AI implements 3 distinct operational personas per the Intain Problem Statement:

### 🧑‍💼 Data Operator (`aditya.raj@gmail.com`)
- **Ingestion Studio:** Drag-and-drop raw CSV loan tape upload with real-time progress indicator.
- **Pre-set Benchmarks:** Quick-load buttons for Clean Tape (100% compliant), Adversarial Tape (multi-error torture test), and Large 3,000+ Tape.
- **Data Quality Score:** Real-time KPI widget tracking compliance percentage and open anomaly distribution.

### 👩‍💻 Exception Reviewer (`rajesh.menon@loanguard.ai`)
- **Exception Queue:** Split-screen table with quick severity filters (Critical, High, Medium, Low), multi-select bulk operations, and search.
- **AI Diagnostic Drawer:** Deep-learning and rule-based explanations for policy violations, suggested corrected values, confidence gauges, and 1-click apply.
- **Batch Resolution Toolbar:** One-click bulk resolution for recurring formatting issues (state codes, DPD offsets).

### 👨‍💼 Data Consumer (`ananya.iyer@loanguard.ai`)
- **Verified Portfolio Ledger:** Searchable, filterable canonical records with cryptographic integrity verification seals.
- **SHA-256 Audit Trail Modal:** Live sequence verification tracing every loan's ingestion, review, and authorization event.
- **Governed CSV/JSON Export:** Stream-download canonical verified loan tapes with digital authorization signatures.

---

## 2. 🔐 Architecture & Data Verification Pipeline

```
[Raw Loan Tape CSV]
        │
        ▼
[Module A: Ingestion & Normalization Engine]
        │
        ├──► [Module B: Zod Schema & LocalPolicyEngine (Warden)]
        │             │
        │             ├── [No Policy Violations] ──► [Canonical Verified Portfolio (Module F)]
        │             │                                           │
        │             └── [Policy Violations]                     ▼
        │                       │                     [Tamper-Evident SHA-256 Audit Chain]
        │                       ▼
        └──► [Module C: Exception Reviewer Queue]
                      │
                      ▼
        [Module D: AI Diagnostic Reviewer Copilot]
                      │
                      ▼ (Human-in-the-Loop Override / Approval)
        [Module E: Governed Exception Resolution]
```

---

## 3. 🚀 Quick Start & Local Execution

### 1. Install & Build
```bash
npm install
npm run build:web
```

### 2. Run Application
```bash
npm start
```
The server will boot on `http://localhost:8080` serving both the API backend and the built React frontend.

### 3. Run Automated Multi-CSV Test Suite
```bash
npm test
```
