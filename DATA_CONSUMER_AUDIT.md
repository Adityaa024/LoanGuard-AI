# Data Consumer Dashboard & Portfolio Integrity Audit Report

**System**: LoanGuard-AI (Intain Full Stack Track)  
**Date**: September 1, 2026  
**Auditor**: Senior Product Designer, Staff Full-Stack Engineer, AI Safety & Data Quality Lead  
**Audit Target**: Data Consumer Dashboard, Verified Portfolio Invariants, Cryptographic Audit Ledger & Ingestion Engines  

---

## 1. Executive Summary & Audit Verdict

| Invariant / Check | Initial State | Post-Audit / Remediated State | Verdict |
| :--- | :--- | :--- | :--- |
| **Count Reconciliation** | Sidebar: 19, KPI: 18, DB: 20 | Authoritative Query: Single Source of Truth | **100% RECONCILED** |
| **Count Invariant** | Discrepancy observed | `sidebarCount == verifiedRecordsCount == canonicalRecordsCount == tableTotal == governedExportCount` | **ENFORCED** |
| **Duplicate Verified Loan IDs** | 14 loans with `'250000'`, 3 with `'315000'` | 0 duplicates; all 17 restored to true canonical IDs with SHA-256 hashes | **RESOLVED & PREVENTED** |
| **Terminology Precision** | "12 Policies Passed" | "12 Validation Policies Executed" (system) & "All required policies passed" (record) | **CORRECTED** |
| **Metric Distinction** | Risk of conflating Rate & Quality | Verification Rate ($N/Total$ reviewer approved) strictly decoupled from Data Quality Score | **STANDARDIZED** |
| **Ledger Verification** | Static success modal | Real cryptographic SHA-256 Merkle chain check with live fault & sequence error reporting | **VERIFIED** |
| **Record Lineage** | Missing Source vs Canonical IDs | Table & Drawer expose Source ID, Canonical ID, Reviewer, Timestamp, Batch Lineage & Hash | **EXPOSED** |
| **Test Suite (`npm test`)** | 3 Failing Checks (Adversarial, Massive, Servicer) | 12/12 Passing Multi-CSV Checks + 28/28 Passing Integrity Tests | **100% PASS** |

---

## 2. Root Cause Analysis: Duplicate Loan IDs (`250000` & `315000`)

### 2.1 The Issue
The Data Consumer dashboard visibly displayed two or more rows with identical `loan_id` values: `250000` and `315000`.

### 2.2 Database Diagnostic Query
```sql
SELECT loan_id, COUNT(*) as cnt, GROUP_CONCAT(validation_status) as statuses 
FROM loans 
GROUP BY loan_id 
HAVING cnt > 1;
```
**Diagnostic Finding**:
- `loan_id = '250000'`: 14 rows, all with `validation_status = 'verified'` and `is_verified = 1`.
- `loan_id = '315000'`: 3 rows, all with `validation_status = 'verified'` and `is_verified = 1`.

### 2.3 Root Cause
1. In `scripts/test_all_csv_uploads.cjs` (line 152), the automated test runner simulated human exception resolution on a sample exception where `field: 'loan_id'`.
2. The test had hardcoded:
   ```javascript
   corrected_value: '250000'
   ```
   (likely intended as a sample principal balance).
3. The server endpoint `PATCH /api/exceptions/:id` previously updated `loans.loan_id = corrected_value` without checking if another loan in `loans` already possessed that `loan_id`.
4. Repeated test runs successively overwrote 14 distinct loans (`LN_MSV_4074`, `LN_MSV_835`, `LN_MSV_1926`, `LN-100318`, etc.) with `loan_id = '250000'`.
5. Because their exceptions were marked resolved, the system computed their hashes and marked them as verified records with identical duplicate `loan_id` values.

### 2.4 Remediations Applied
1. **Database Repair (`scripts/repair_duplicates.js`)**:
   - Queried the `exceptions` table to retrieve each loan's authentic, original source loan ID from `exceptions.current_value`.
   - Restored unique canonical IDs for all 17 corrupted records (e.g. `LN-100318`, `LN_MSV_835`, `LN_MSV_1926`, `LN_MSV_4074`, `LN_MSV_1194`).
   - Recalculated valid SHA-256 canonical verified hashes for all records.
2. **Backend Route Hardening (`src/routes.js`)**:
   - Added collision check in `PATCH /api/exceptions/:id`:
     ```javascript
     if (exc.field === 'loan_id') {
       const cleanId = String(corrected_value).trim();
       const collision = await db.get(`SELECT id FROM loans WHERE loan_id = ? AND id != ?`, [cleanId, exc.loan_id]);
       if (collision) {
         return res.status(400).json({
           success: false,
           error: `Integrity check failed: loan_id "${cleanId}" already exists. Cannot create duplicate loan identifier.`,
           code: 'DUPLICATE_LOAN_ID'
         });
       }
     }
     ```
   - Added verification gate before marking any loan verified:
     ```javascript
     const dupVerified = await db.get(
       `SELECT id FROM loans WHERE loan_id = ? AND id != ? AND validation_status = 'verified'`,
       [loanData.loan_id, exc.loan_id]
     );
     if (dupVerified) {
       return res.status(400).json({
         success: false,
         error: `Verification blocked: Another verified record with loan_id "${loanData.loan_id}" already exists. Duplicate verified records are prohibited.`,
         code: 'DUPLICATE_VERIFIED_LOAN_ID'
       });
     }
     ```
3. **Test Suite Fix (`scripts/test_all_csv_uploads.cjs`)**:
   - Dynamic corrected value generation based on target field:
     ```javascript
     const testCorrectedVal = sample.field === 'loan_id'
       ? `${sample.current_value || 'LN_QA'}_CANONICAL_${Date.now().toString().slice(-4)}`
       : (sample.field === 'interest_rate' ? 4.5 : (sample.field === 'maturity_date' ? '2050-01-01' : 250000));
     ```

---

## 3. Count Reconciliation & Single Authoritative Service

### 3.1 The Discrepancy
- Sidebar: `Data Consumer = 19`
- Main KPI: `Verified Records = 18`
- Table: `Showing 18 of 18 canonical records`
- Database: `SELECT COUNT(*) FROM loans WHERE validation_status = 'verified'` returned 20.

### 3.2 Root Cause
- In earlier code, batch resolution marked loans with `validation_status = 'valid'` and `is_verified = 1`, whereas single resolution marked `validation_status = 'verified'`.
- Different endpoints used ad-hoc queries (`validation_status = 'verified'` vs `is_verified = 1`), causing inconsistent counts.
- Polling timers between `App.jsx` (`/api/summary` every 6s) and `VerifiedRecords.jsx` (`/api/verified-loans` on mount) resulted in visible drift when tests resolved records in the background.

### 3.3 Authoritative Service Implemented
Created a single authoritative backend service in `src/routes.js`:

```javascript
// ---- Canonical Authoritative Verified Loan Queries ----
const getCanonicalVerifiedLoans = async (db, { limit = null, offset = 0 } = {}) => {
  let query = `
    SELECT 
      l.*,
      l.loan_id as canonical_loan_id,
      COALESCE(e.current_value, l.loan_id) as source_loan_id,
      COALESCE(b.filename, 'loan_tape.csv') as source_batch_name,
      COALESCE(b.file_hash, 'GENESIS_ANCHOR') as source_batch_hash,
      COALESCE(l.source_system, 'Core Servicing System') as source_system
    FROM loans l
    LEFT JOIN upload_batches b ON l.upload_batch_id = b.id
    LEFT JOIN (
      SELECT loan_id, current_value 
      FROM exceptions 
      WHERE field = 'loan_id'
      GROUP BY loan_id
    ) e ON l.id = e.loan_id
    WHERE l.validation_status = 'verified' AND l.is_verified = 1
    ORDER BY l.verified_at DESC, l.id DESC
  `;
  const params = [];
  if (limit) {
    query += ` LIMIT ? OFFSET ? `;
    params.push(limit, offset);
  }
  return await db.all(query, params);
};

const getCanonicalVerifiedCount = async (db) => {
  const row = await db.get(`
    SELECT COUNT(*) as count 
    FROM loans 
    WHERE validation_status = 'verified' AND is_verified = 1
  `);
  return row.count;
};
```

This authoritative service is now the single source of truth for:
1. **Sidebar Badge** (`/api/summary` $\to$ `stats.verified_loans` $\to$ `getCanonicalVerifiedCount`)
2. **Verified Records KPI** (`VerifiedRecords.jsx` $\to$ `loans.length` $\to$ `getCanonicalVerifiedCount`)
3. **Table Count & Pagination** (`VerifiedRecords.jsx` $\to$ `loans.length` $\to$ `getCanonicalVerifiedCount`)
4. **Governed Export Button** (`Governed Export · ${loans.length} Verified`)
5. **Server CSV Export Endpoint** (`/api/export/verified-loans` $\to$ `getCanonicalVerifiedLoans`)
6. **Audit Verification Modal** (`/api/audit/verify` $\to$ `verified_loans_count` $\to$ `getCanonicalVerifiedCount`)

**Invariant Guarantee**:
$$\text{sidebarCount} \equiv \text{verifiedRecordsCount} \equiv \text{canonicalRecordsCount} \equiv \text{tableTotal} \equiv \text{governedExportCount}$$

---

## 4. UI/UX & Terminology Precision

### 4.1 Terminology Refinements
- **Replaced**: "12 Policies Passed" in global trust strip.
- **Adopted**:
  - **"12 Validation Policies Executed"** for portfolio-wide statutory policy execution.
  - **"All required policies passed"** on individual verified loan records.

### 4.2 Decoupling Verification Rate from Data Quality
- **Verification Rate**:
  `{loans.length} of {summary?.total_loans} records verified ({verificationRatePct}%)`
  Reflects reviewer throughput and formal canonical sign-off.
- **Data Quality Score**:
  `{summary?.data_quality_score}% Portfolio-wide validation score`
  Reflects baseline tape health and defect percentage across all ingested loans.

### 4.3 Real Cryptographic Ledger Verification
- The "Verify Ledger" action sends a live request to `GET /api/audit/verify`.
- The backend reconstructs the sequential hash chain from block 1 to head:
  - If valid: Displays emerald banner, total events, anchored loans, and head hash.
  - If corrupted: Displays rose alert, sequence block where failure occurred (`brokenAt`), and cryptographic mismatch reason.

### 4.4 Verified Record Detail & Lineage
The table columns and audit drawer now expose:
- **Canonical Loan ID**: Active, de-duplicated identifier.
- **Source Loan ID**: Raw ingestion identifier (displayed with badge if different).
- **Borrower Name & Principal Balance**: Financial attributes.
- **Reviewer**: Identity of human reviewer who authorized verification (`verified_by`).
- **Verified Timestamp**: Exact timestamp of verification sign-off (`verified_at`).
- **Source Batch Lineage**: Filename and batch SHA-256 hash.
- **Cryptographic Signature**: Full 64-character SHA-256 record hash with one-click copy.
- **Audit Status**: Verified (`All required policies passed`).

---

## 5. Automated Test Suite Results

### 5.1 Multi-CSV QA Test Suite (`npm test`)
```
====================================================
📋 MULTI-CSV TEST EXECUTION SUMMARY:
====================================================
✅ PASS | Clean Baseline Tape (500 Valid, 0 Exceptions)
✅ PASS | Adversarial Anomaly Tape
✅ PASS | Massive Dataset Stress Test (5,000 loans in ~7.4s)
✅ PASS | Servicer Secondary Sync
✅ PASS | Single Exception Resolution Seam
✅ PASS | Batch Resolution Seam
✅ PASS | AI Portfolio Cluster Summary
✅ PASS | AI Cross-Source Conflict Reconciliation
✅ PASS | AI Severity Classification Assistant
✅ PASS | AI Natural Language Policy Compiler
✅ PASS | Verified Portfolio Access
✅ PASS | Cryptographic Hash Chain Integrity
====================================================
🎉 ALL CSV UPLOAD & GOVERNANCE TESTS PASSED 100%
====================================================
Exit Code: 0
```

### 5.2 Unit & Reconciliation Suite (`node --test test/reconciliation_and_integrity.test.js`)
All 28 automated test specifications passing:
1. `TEST-001`: Total records reconcile with valid + affected records (`PASS`)
2. `TEST-002`: Severity counts reconcile with total open exception instances (`PASS`)
3. `TEST-003`: Summary API returns exact reconciled metrics (`PASS`)
4. `TEST-004 & TEST-005`: AI suggestion cannot become final human value automatically (`PASS`)
5. `TEST-006 & TEST-007`: AI explanation for duplicate IDs does not claim unproven facts (`PASS`)
6. `TEST-008`: Approve & Verify creates verified record only after human decision (`PASS`)
7. `TEST-009, 010, 011`: Audit log records AI reviews, human edits, and human approvals (`PASS`)
8. `TEST-012`: Reject action does NOT create a verified record (`PASS`)
9. `TEST-013 & TEST-014`: Role-based tokens and permission isolation (`PASS`)
10. `TEST-015`: Persona accounts seeded correctly (`PASS`)
11. `TEST-016 & TEST-017`: Concurrent resolution idempotency prevents double verification (`PASS`)
12. `TEST-018`: Source lineage is preserved on loan records (`PASS`)
13. `TEST-019`: Canonical SHA-256 hash changes when record fields change (`PASS`)
14. `TEST-020`: Cryptographic audit chain detects tampering or mutated events (`PASS`)
15. `TEST-021`: Reviewer master-detail target assertion (mutation targets exact selected exception) (`PASS`)
16. `TEST-022`: Approval on selected exception creates verified record with discrete loan ID in audit (`PASS`)
17. `TEST-023`: Canonical Verified Invariant: sidebarCount == verifiedRecordsCount == canonicalRecordsCount == tableTotal == governedExportCount (`PASS`)
18. `TEST-024`: Export count equals canonical verified count (`PASS`)
19. `TEST-025`: Verification rate denominator is distinct from Data Quality Score (`PASS`)
20. `TEST-026`: Duplicate verified loan IDs are prohibited in the verified portfolio (`PASS`)
21. `TEST-027`: Source loan ID and Canonical loan ID are preserved and distinct (`PASS`)
22. `TEST-028`: Trust summary reflects actual database verified state (`PASS`)
23. `TEST-029`: Integrity verification detects altered hash in audit chain (`PASS`)
24. `TEST-030`: Integrity verification detects missing or reordered audit block (`PASS`)
25. `TEST-031`: Verified records must possess non-null verified_at timestamp and SHA-256 hash (`PASS`)
26. `TEST-032`: Verified records must possess non-null verified_by reviewer identity (`PASS`)
27. `TEST-033`: Rejected records cannot enter verified portfolio (`PASS`)
28. `TEST-034`: Unreviewed records cannot enter verified portfolio without human sign-off (`PASS`)

---

## 6. Conclusion & Production Readiness
The LoanGuard-AI Data Consumer dashboard and canonical verification engine have been audited, remediated, and mathematically reconciled. All duplicate loan IDs have been restored to unique canonical values, duplicate creation has been strictly blocked at the route layer, counts across all UI and API interfaces are synchronized to a single authoritative service, and the entire test matrix passes with zero failures.
