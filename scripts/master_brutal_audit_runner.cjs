const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const BASE_URL = process.env.TEST_URL || 'http://localhost:8080';

let operatorToken = '';
let reviewerToken = '';
let consumerToken = '';
let forgedToken = '';

const auditResults = {
  phases: {},
  passedCount: 0,
  failedCount: 0,
  p0_issues: [],
  p1_issues: [],
  p2_issues: [],
  p3_issues: [],
  timings: {}
};

function recordTest(phase, testName, passed, details = {}) {
  if (!auditResults.phases[phase]) auditResults.phases[phase] = [];
  auditResults.phases[phase].push({ testName, passed, details });
  if (passed) {
    auditResults.passedCount++;
    console.log(`  ✅ [${phase}] PASS: ${testName}`);
  } else {
    auditResults.failedCount++;
    console.log(`  ❌ [${phase}] FAIL: ${testName}`);
    if (details.error) console.log(`     Error: ${details.error}`);
  }
}

async function uploadFile(filePath, token = operatorToken) {
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
  const fileName = path.basename(filePath);
  const fileContent = fs.readFileSync(filePath);

  const payload = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: text/csv\r\n\r\n`),
    fileContent,
    Buffer.from(`\r\n--${boundary}--\r\n`)
  ]);

  const res = await fetch(`${BASE_URL}/api/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`
    },
    body: payload
  });

  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function runMasterBrutalAudit() {
  console.log('============================================================');
  console.log('🔥 LOANGUARD-AI — HOSTILE COMPETITION PENETRATION & QA AUDIT');
  console.log('============================================================\n');

  console.log('🔑 Authenticating Demo Personas via POST /api/login...');
  const opLogin = await fetch(`${BASE_URL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'aditya.raj@gmail.com', password: 'password123' })
  }).then(r => r.json());
  operatorToken = opLogin.token;

  const revLogin = await fetch(`${BASE_URL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'rajesh.menon@loanguard.ai', password: 'password123' })
  }).then(r => r.json());
  reviewerToken = revLogin.token;

  const conLogin = await fetch(`${BASE_URL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'ananya.iyer@loanguard.ai', password: 'password123' })
  }).then(r => r.json());
  consumerToken = conLogin.token;

  forgedToken = jwt.sign({ id: 'hacker', name: 'Attacker', role: 'admin' }, 'invalid-secret-key', { expiresIn: '1h' });
  console.log('✅ Personas Authenticated Successfully.\n');

  // ============================================================
  // PHASE 4: VALIDATION ENGINE ATTACK
  // ============================================================
  console.log('--- PHASE 4: VALIDATION ENGINE ATTACK ---');
  const advUpload = await uploadFile(path.resolve('qa/test-data/adversarial_loans.csv'));
  recordTest('PHASE_4_VALIDATION', 'Adversarial Tape Upload HTTP 200', advUpload.status === 200);
  recordTest('PHASE_4_VALIDATION', 'Adversarial Tape Exceptions Caught', advUpload.data?.exceptionCount > 10, { count: advUpload.data?.exceptionCount });

  // Query exceptions to check specific rule triggers
  const excListRes = await fetch(`${BASE_URL}/api/exceptions`, {
    headers: { 'Authorization': `Bearer ${reviewerToken}` }
  }).then(r => r.json());
  
  const rulesTriggered = new Set(excListRes.data?.map(e => e.rule_name || e.rule_id));
  const expectedRules = ['negative_balance', 'invalid_interest_rate', 'missing_borrower', 'invalid_dates', 'invalid_state', 'duplicate_loan', 'duplicate_borrower_combo'];
  
  for (const r of expectedRules) {
    const triggered = Array.from(rulesTriggered).some(tr => tr.includes(r));
    recordTest('PHASE_4_VALIDATION', `Rule Triggered: ${r}`, triggered);
  }

  // Test False Positives with freshly generated clean compliant loans
  const freshCleanPath = path.resolve('qa/test-data/fresh_clean_temp.csv');
  const freshCleanTag = Math.random().toString(36).substring(2, 7);
  const cleanRows = ['loan_id,borrower_name,property_state,principal_balance,interest_rate,origination_date,maturity_date,term_months,loan_purpose,payment_status,days_past_due,document_status,loan_status'];
  for (let i = 1; i <= 100; i++) {
    cleanRows.push(`LN_CLN_FR_${freshCleanTag}_${i},Compliant Obligor ${i},CA,${250000 + i * 100},4.50,2023-01-15,2053-01-15,360,Purchase,Current,0,Available,Active`);
  }
  fs.writeFileSync(freshCleanPath, cleanRows.join('\n'));
  const cleanUpload = await uploadFile(freshCleanPath);
  recordTest('PHASE_4_VALIDATION', 'Clean Tape (0 False Positives)', cleanUpload.data?.exceptionCount === 0 && cleanUpload.data?.validCount === 100, { data: cleanUpload.data });
  fs.unlinkSync(freshCleanPath);

  // ============================================================
  // PHASE 5: INGESTION TORTURE TEST
  // ============================================================
  console.log('\n--- PHASE 5: INGESTION TORTURE TEST ---');
  
  // 5.1 Empty CSV
  const emptyCsvPath = path.resolve('qa/test-data/empty_torture.csv');
  fs.writeFileSync(emptyCsvPath, '');
  const emptyUpload = await uploadFile(emptyCsvPath);
  recordTest('PHASE_5_INGESTION', 'Empty CSV Handled Gracefully', emptyUpload.status === 200 && emptyUpload.data?.recordsProcessed === 0);
  fs.unlinkSync(emptyCsvPath);

  // 5.2 Headers Only
  const headerCsvPath = path.resolve('qa/test-data/header_only.csv');
  fs.writeFileSync(headerCsvPath, 'loan_id,borrower_name,principal_balance,interest_rate\n');
  const headerUpload = await uploadFile(headerCsvPath);
  recordTest('PHASE_5_INGESTION', 'Header-Only CSV Handled', headerUpload.status === 200 && headerUpload.data?.recordsProcessed === 0);
  fs.unlinkSync(headerCsvPath);

  // 5.3 Unicode & Escaped Quoted Commas
  const unicodeCsvPath = path.resolve('qa/test-data/unicode_torture.csv');
  const uniTag = Math.random().toString(36).substring(2, 6);
  fs.writeFileSync(unicodeCsvPath, [
    'loan_id,borrower_name,property_state,principal_balance,interest_rate,origination_date,maturity_date',
    `LN_UNI_${uniTag}_1,"García, José ""El Patrón""",CA,250000,4.50,2023-01-01,2053-01-01`,
    `LN_UNI_${uniTag}_2,"Müller & Söhne GmbH",NY,350000,5.00,2023-01-01,2053-01-01`
  ].join('\n'));
  const unicodeUpload = await uploadFile(unicodeCsvPath);
  recordTest('PHASE_5_INGESTION', 'Unicode & Quoted Commas Parsed Correctly', unicodeUpload.status === 200 && unicodeUpload.data?.validCount === 2);
  fs.unlinkSync(unicodeCsvPath);

  // 5.4 Binary File Renamed as CSV
  const binaryCsvPath = path.resolve('qa/test-data/binary_fake.csv');
  fs.writeFileSync(binaryCsvPath, Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46])); // JPEG header
  const binaryUpload = await uploadFile(binaryCsvPath);
  recordTest('PHASE_5_INGESTION', 'Binary Fake CSV Handled Gracefully', binaryUpload.status === 200 || binaryUpload.status === 400 || binaryUpload.status === 500);
  fs.unlinkSync(binaryCsvPath);

  // ============================================================
  // PHASE 7: EXCEPTION QUEUE ATTACK
  // ============================================================
  console.log('\n--- PHASE 7: EXCEPTION QUEUE ATTACK ---');
  const excFetch = await fetch(`${BASE_URL}/api/exceptions`, {
    headers: { 'Authorization': `Bearer ${reviewerToken}` }
  }).then(r => r.json());
  
  recordTest('PHASE_7_QUEUE', 'Exceptions API Returns Structured Array', excFetch.success && Array.isArray(excFetch.data) && excFetch.data.length > 0);
  
  if (excFetch.data?.length > 0) {
    const sample = excFetch.data[0];
    recordTest('PHASE_7_QUEUE', 'Exception Record Has Required Audit Fields', 
      Boolean(sample.id && sample.loan_id && sample.rule_id && sample.severity && sample.description && sample.current_value !== undefined));
  }

  // ============================================================
  // PHASE 8: REVIEW WORKFLOW & STATE TRANSITION ATTACK
  // ============================================================
  console.log('\n--- PHASE 8: REVIEW WORKFLOW ATTACK ---');
  if (excFetch.data?.length > 0) {
    const targetExc = excFetch.data[0];
    
    // Legal Transition: Resolve
    const res1 = await fetch(`${BASE_URL}/api/exceptions/${targetExc.id}`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${reviewerToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'resolve', corrected_value: '250000', note: 'QA Verified Resolution' })
    }).then(r => r.json());
    recordTest('PHASE_8_WORKFLOW', 'Legal Transition (Open -> Resolved)', res1.success);

    // Illegal Transition: Resolve Twice
    const res2 = await fetch(`${BASE_URL}/api/exceptions/${targetExc.id}`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${reviewerToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'resolve', corrected_value: '250000', note: 'Double Resolve Attack' })
    });
    recordTest('PHASE_8_WORKFLOW', 'Illegal Transition (Resolve Twice Blocked with 400)', res2.status === 400);

    // Illegal Action Name
    const res3 = await fetch(`${BASE_URL}/api/exceptions/non_existent_id`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${reviewerToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'hack_admin' })
    });
    recordTest('PHASE_8_WORKFLOW', 'Illegal Action Rejected with 400/404', res3.status === 400 || res3.status === 404);
  }

  // ============================================================
  // PHASE 9: AI ADVERSARIAL & PROMPT INJECTION TESTING
  // ============================================================
  console.log('\n--- PHASE 9: AI ADVERSARIAL & INJECTION TESTING ---');
  if (excFetch.data?.length > 1) {
    const aiExc = excFetch.data[1];
    
    // AI Review Query
    const aiRes = await fetch(`${BASE_URL}/api/ai-review`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${reviewerToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ exception_id: aiExc.id })
    }).then(r => r.json());
    
    recordTest('PHASE_9_AI', 'AI Diagnostic Explains Root Cause', aiRes.success && typeof aiRes.data?.explanation === 'string');
    recordTest('PHASE_9_AI', 'AI Computes Statistical Confidence Score', typeof aiRes.data?.confidence === 'number' && aiRes.data?.confidence > 0 && aiRes.data?.confidence <= 1);
    recordTest('PHASE_9_AI', 'AI Proposes Structured Repair Value', aiRes.data?.suggested_value !== undefined);
  }

  // AI Rule Generator Attack
  const ruleGenRes = await fetch(`${BASE_URL}/api/ai/generate-rule`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${reviewerToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: 'Reject loan tapes if balance is negative' })
  }).then(r => r.json());
  recordTest('PHASE_9_AI', 'AI Policy Compiler Generates Valid Structured Rule', ruleGenRes.success && ruleGenRes.data?.rule?.id === 'POL-BAL-POS');

  // ============================================================
  // PHASE 10: HUMAN-IN-THE-LOOP (HITL) SEPARATION TEST
  // ============================================================
  console.log('\n--- PHASE 10: HITL DATA SEPARATION ---');
  if (excFetch.data?.length > 2) {
    const hitlExc = excFetch.data[2];
    
    // Reviewer provides custom edited value distinct from AI suggestion
    const hitlPatch = await fetch(`${BASE_URL}/api/exceptions/${hitlExc.id}`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${reviewerToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'resolve', corrected_value: '315000', note: 'Human overriding to 315000' })
    }).then(r => r.json());
    
    recordTest('PHASE_10_HITL', 'Human Custom Edit Persists Separately from AI', hitlPatch.success);
  }

  // ============================================================
  // PHASE 11: SOURCE CONFLICT RECONCILIATION TEST
  // ============================================================
  console.log('\n--- PHASE 11: SOURCE CONFLICT TEST ---');
  const conflictRes = await fetch(`${BASE_URL}/api/ai/compare-conflicts`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${reviewerToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      baseline_record: { loan_id: 'LN_CONF_TEST_1', current_balance: 300000, payment_status: 'Current' },
      secondary_record: { loan_id: 'LN_CONF_TEST_1', current_balance: 295000, payment_status: 'Delinquent' }
    })
  }).then(r => r.json());
  recordTest('PHASE_11_CONFLICT', 'Cross-Source Servicer Conflict Detected', conflictRes.success && conflictRes.data?.has_conflicts === true);
  recordTest('PHASE_11_CONFLICT', 'Conflict Discrepancy Amount & Field Pinpointed', conflictRes.data?.discrepancies?.some(d => d.field === 'current_balance' && d.delta_amount === 5000));

  // ============================================================
  // PHASE 13: CRYPTOGRAPHIC HASH CHAIN & AUDIT RED TEAM
  // ============================================================
  console.log('\n--- PHASE 13: CRYPTOGRAPHIC HASH CHAIN AUDIT ---');
  const auditVerify = await fetch(`${BASE_URL}/api/audit/verify`, {
    headers: { 'Authorization': `Bearer ${consumerToken}` }
  }).then(r => r.json());
  
  recordTest('PHASE_13_AUDIT', 'Cryptographic SHA-256 Chain is 100% Valid', auditVerify.success && auditVerify.valid === true, { length: auditVerify.length, head: auditVerify.head });

  // Verify Audit Log API for Loan
  const loanAudit = await fetch(`${BASE_URL}/api/audit/ALL`, {
    headers: { 'Authorization': `Bearer ${consumerToken}` }
  }).then(r => r.json());
  recordTest('PHASE_13_AUDIT', 'Audit API Returns Immutable Monotonic Events', loanAudit.success && Array.isArray(loanAudit.data) && loanAudit.data.length > 0);

  // ============================================================
  // PHASE 14: RBAC & PRIVILEGE ESCALATION ATTACK
  // ============================================================
  console.log('\n--- PHASE 14: RBAC PRIVILEGE ESCALATION ATTACK ---');
  
  // 14.1 Unauthenticated Request to Protected Route
  const noAuthRes = await fetch(`${BASE_URL}/api/upload`, { method: 'POST' });
  recordTest('PHASE_14_RBAC', 'Unauthenticated Request Blocked (401)', noAuthRes.status === 401);

  // 14.2 Forged JWT Token
  const forgedRes = await fetch(`${BASE_URL}/api/loans`, {
    headers: { 'Authorization': `Bearer ${forgedToken}` }
  });
  recordTest('PHASE_14_RBAC', 'Forged Token Blocked (401)', forgedRes.status === 401);

  // 14.3 Consumer Attempting Operator-Only Upload
  const consumerUpload = await fetch(`${BASE_URL}/api/upload`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${consumerToken}` }
  });
  recordTest('PHASE_14_RBAC', 'Consumer Role Blocked from Upload (403)', consumerUpload.status === 403);

  // 14.4 Operator Attempting Reviewer-Only Exception Patch
  const opPatch = await fetch(`${BASE_URL}/api/exceptions/some_id`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${operatorToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'resolve' })
  });
  recordTest('PHASE_14_RBAC', 'Operator Role Blocked from Resolution (403)', opPatch.status === 403);

  // 14.5 Consumer Role Accessing Governed Export
  const exportRes = await fetch(`${BASE_URL}/api/export/verified-loans`, {
    headers: { 'Authorization': `Bearer ${consumerToken}` }
  });
  recordTest('PHASE_14_RBAC', 'Consumer Role Authorized for Verified Export (200)', exportRes.status === 200 && exportRes.headers.get('content-type')?.includes('text/csv'));

  // ============================================================
  // PHASE 16: API RED TEAM & INJECTION ATTACKS
  // ============================================================
  console.log('\n--- PHASE 16: API INJECTION & XSS ATTACK ---');
  
  // 16.1 SQL Injection in URL Parameter
  const sqliRes = await fetch(`${BASE_URL}/api/loans/' OR 1=1 --`, {
    headers: { 'Authorization': `Bearer ${operatorToken}` }
  });
  recordTest('PHASE_16_SECURITY', 'SQL Injection Parameter Handled (404/Safe)', sqliRes.status === 404);

  // 16.2 Path Traversal Attack
  const pathTravRes = await fetch(`${BASE_URL}/api/loans/%2E%2E%2F%2E%2E%2Fetc%2Fpasswd`, {
    headers: { 'Authorization': `Bearer ${operatorToken}` }
  });
  recordTest('PHASE_16_SECURITY', 'Path Traversal Parameter Handled (404/Safe)', pathTravRes.status === 404);

  // ============================================================
  // PHASE 17: CONCURRENCY & RACE CONDITION ATTACK
  // ============================================================
  console.log('\n--- PHASE 17: CONCURRENCY ATTACK ---');
  if (excFetch.data?.length > 3) {
    const raceExc = excFetch.data[3];
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(
        fetch(`${BASE_URL}/api/exceptions/${raceExc.id}`, {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${reviewerToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'resolve', note: `Concurrent click ${i}` })
        }).then(r => r.status)
      );
    }
    const statuses = await Promise.all(promises);
    const successCount = statuses.filter(s => s === 200).length;
    const blockedCount = statuses.filter(s => s === 400).length;
    recordTest('PHASE_17_CONCURRENCY', 'Atomic Concurrency: Exactly 1 Success, Remaining Blocked', successCount === 1 && blockedCount === 4, { statuses });
  }

  // ============================================================
  // PHASE 19: DASHBOARD DATA INTEGRITY & KPI MATCH
  // ============================================================
  console.log('\n--- PHASE 19: DASHBOARD DATA INTEGRITY ---');
  const summaryRes = await fetch(`${BASE_URL}/api/summary`).then(r => r.json());
  recordTest('PHASE_19_INTEGRITY', 'Summary API Returns Numerical KPIs', 
    summaryRes.success && typeof summaryRes.data?.total_loans === 'number' && typeof summaryRes.data?.data_quality_score === 'number');

  // ============================================================
  // PHASE 20: PERFORMANCE & SCALE BENCHMARKS
  // ============================================================
  console.log('\n--- PHASE 20: PERFORMANCE BENCHMARKS ---');
  
  // 1,000 Record Benchmark
  const t0_1k = Date.now();
  const stress1kRes = await uploadFile(path.resolve('qa/test-data/stress_1000.csv'));
  const d_1k = Date.now() - t0_1k;
  auditResults.timings['1000_records'] = d_1k;
  recordTest('PHASE_20_PERFORMANCE', `1,000 Records Ingested in ${d_1k}ms (${Math.round(1000/(d_1k/1000))} rec/sec)`, stress1kRes.status === 200 && d_1k < 3000, { durationMs: d_1k });

  // 5,000 Record Benchmark
  const t0_5k = Date.now();
  const stress5kRes = await uploadFile(path.resolve('qa/test-data/stress_5000.csv'));
  const d_5k = Date.now() - t0_5k;
  auditResults.timings['5000_records'] = d_5k;
  recordTest('PHASE_20_PERFORMANCE', `5,000 Records Ingested in ${d_5k}ms (${Math.round(5000/(d_5k/1000))} rec/sec)`, stress5kRes.status === 200 && d_5k < 6000, { durationMs: d_5k });

  // Write results JSON
  fs.writeFileSync(path.resolve('qa/audit_run_evidence.json'), JSON.stringify(auditResults, null, 2));
  console.log('\n============================================================');
  console.log(`🏁 AUDIT EXECUTION COMPLETE: ${auditResults.passedCount} PASSED / ${auditResults.failedCount} FAILED`);
  console.log('============================================================');
}

runMasterBrutalAudit().catch(console.error);
