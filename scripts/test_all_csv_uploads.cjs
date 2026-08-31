const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:8080';

async function runQaTests() {
  console.log('====================================================');
  console.log('🧪 LOANGUARD-AI — MULTI-CSV INGESTION & QUALITY TEST');
  console.log('====================================================\n');

  // 1. Authenticate Personas
  console.log('🔑 Authenticating Demo Personas...');
  const operatorRes = await fetch(`${BASE_URL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'aditya.raj@gmail.com', password: 'password123' })
  }).then(r => r.json());
  
  if (!operatorRes.token) {
    throw new Error('Operator authentication failed: ' + JSON.stringify(operatorRes));
  }
  const operatorToken = operatorRes.token;
  console.log('✅ Operator Authenticated: Aditya Raj (Data Operator)');

  const reviewerRes = await fetch(`${BASE_URL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'rajesh.menon@loanguard.ai', password: 'password123' })
  }).then(r => r.json());
  const reviewerToken = reviewerRes.token;
  console.log('✅ Reviewer Authenticated: Rajesh Menon (Exception Reviewer)');

  const consumerRes = await fetch(`${BASE_URL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'ananya.iyer@loanguard.ai', password: 'password123' })
  }).then(r => r.json());
  const consumerToken = consumerRes.token;
  console.log('✅ Consumer Authenticated: Ananya Iyer (Data Consumer)\n');

  // Helper upload function
  async function uploadCsv(filePath, label) {
    console.log(`📁 [TEST] Uploading ${label}: ${filePath}`);
    const content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath);

    // Create multipart form-data boundary
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    let body = '';
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n`;
    body += `Content-Type: text/csv\r\n\r\n`;
    body += content;
    body += `\r\n--${boundary}--\r\n`;

    const res = await fetch(`${BASE_URL}/api/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${operatorToken}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      },
      body: Buffer.from(body, 'utf-8')
    });

    const data = await res.json();
    if (!res.ok) console.log('   Error details:', data);
    return { status: res.status, data };
  }

  const results = [];

  // TEST 1: Clean Tape Upload (Generate fresh 1,000 clean non-colliding loans)
  const cleanTag = Math.random().toString(36).substring(2, 7);
  const cleanCsv = ['loan_id,borrower_name,property_state,principal_balance,interest_rate,origination_date,maturity_date'];
  for (let i = 1; i <= 500; i++) {
    cleanCsv.push(`LN_CLN_${cleanTag}_${i},Clean Borrower ${i},CA,${250000 + i * 100},4.50,2024-01-01,2054-01-01`);
  }
  const cleanTempPath = path.resolve(`data/qa/clean_tape_fresh_${cleanTag}.csv`);
  fs.writeFileSync(cleanTempPath, cleanCsv.join('\n'));

  const t1 = await uploadCsv(cleanTempPath, 'Clean Baseline Tape (100% compliant)');
  console.log(`   Result: HTTP ${t1.status} | Processed: ${t1.data.recordsProcessed || 0} | Valid: ${t1.data.validCount || 0} | Exceptions: ${t1.data.exceptionCount || 0}`);
  const passed = t1.status === 200 && t1.data.success && t1.data.validCount === 500 && t1.data.exceptionCount === 0;
  results.push({ name: 'Clean Baseline Tape (500 Valid, 0 Exceptions)', passed, details: t1.data });
  console.log(`   Status: ${passed ? '✅ PASS' : '❌ FAIL'}\n`);
  try { fs.unlinkSync(cleanTempPath); } catch {}

  // TEST 2: Malicious / Adversarial Tape Upload
  const malPath = path.resolve('data/qa/malicious_loans.csv');
  if (fs.existsSync(malPath)) {
    const t2 = await uploadCsv(malPath, 'Adversarial Anomaly Tape (Multi-Policy Violations)');
    console.log(`   Result: HTTP ${t2.status} | Processed: ${t2.data.recordsProcessed || 0} | Exceptions Caught: ${t2.data.exceptionCount || 0}`);
    const passed = t2.status === 200 && t2.data.exceptionCount > 0;
    results.push({ name: 'Adversarial Anomaly Tape', passed, details: t2.data });
    console.log(`   Status: ${passed ? '✅ PASS' : '❌ FAIL'}\n`);
  }

  // TEST 3: Massive Tape Stress Test
  const massivePath = path.resolve('data/qa/massive_loans.csv');
  if (fs.existsSync(massivePath)) {
    const startTime = Date.now();
    const t3 = await uploadCsv(massivePath, 'Massive 5,000 Loan Stress Tape');
    const elapsed = Date.now() - startTime;
    console.log(`   Result: HTTP ${t3.status} | Processed: ${t3.data.recordsProcessed || 0} in ${elapsed}ms (${Math.round((t3.data.recordsProcessed || 0)/(elapsed/1000))} rec/sec)`);
    const passed = t3.status === 200 && t3.data.recordsProcessed > 0;
    results.push({ name: 'Massive Dataset Stress Test', passed, elapsedMs: elapsed, details: t3.data });
    console.log(`   Status: ${passed ? '✅ PASS' : '❌ FAIL'}\n`);
  }

  // TEST 4: Servicer Update / Secondary Sync Tape
  const servicerPath = path.resolve('data/servicer_update.csv');
  if (fs.existsSync(servicerPath)) {
    const t4 = await uploadCsv(servicerPath, 'Servicer Update Secondary Tape');
    console.log(`   Result: HTTP ${t4.status} | Processed: ${t4.data.recordsProcessed || 0}`);
    const passed = t4.status === 200;
    results.push({ name: 'Servicer Secondary Sync', passed, details: t4.data });
    console.log(`   Status: ${passed ? '✅ PASS' : '❌ FAIL'}\n`);
  }

  // TEST 5: Verify Exceptions & Resolution Seam
  console.log('🔍 [TEST] Reviewing Exception Queue with Rajesh Menon Token...');
  const excRes = await fetch(`${BASE_URL}/api/exceptions`, {
    headers: { 'Authorization': `Bearer ${reviewerToken}` }
  }).then(r => r.json());

  console.log(`   Total Open Exceptions in Queue: ${excRes.data ? excRes.data.length : 0}`);
  if (excRes.data && excRes.data.length > 0) {
    const sample = excRes.data[0];
    console.log(`   Sample Exception: Loan [${sample.loan_id}] - Rule [${sample.rule_name || sample.rule_id}] - Severity [${sample.severity}]`);
    console.log(`   Reason: ${sample.description || sample.reason}`);

    // AI Review of the exception
    const aiRes = await fetch(`${BASE_URL}/api/ai-review`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${reviewerToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ exception_id: sample.id })
    }).then(r => r.json());
    console.log(`   AI Diagnostic Explanation: "${aiRes.data?.explanation || 'N/A'}" (Confidence: ${Math.round((aiRes.data?.confidence || 0)*100)}%)`);

    // Single Exception Resolution
    const resolveRes = await fetch(`${BASE_URL}/api/exceptions/${sample.id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${reviewerToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'resolve',
        corrected_value: '250000',
        note: 'Corrected via automated multi-CSV QA verification'
      })
    }).then(r => r.json());
    console.log(`   Exception Resolution Status: ${resolveRes.success ? '✅ Successfully Resolved' : '❌ Failed'}`);
    results.push({ name: 'Single Exception Resolution Seam', passed: resolveRes.success });

    // Batch Resolution Test
    if (excRes.data.length > 3) {
      const batchIds = excRes.data.slice(1, 4).map(e => e.id);
      const batchRes = await fetch(`${BASE_URL}/api/exceptions/batch-resolve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${reviewerToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          exception_ids: batchIds,
          action: 'resolve',
          note: 'Batch approved standard format anomalies'
        })
      }).then(r => r.json());
      console.log(`   Batch Resolution Status: ${batchRes.success ? `✅ Successfully Resolved ${batchRes.count} exceptions in batch` : '❌ Failed'}`);
      results.push({ name: 'Batch Resolution Seam', passed: batchRes.success && batchRes.count === 3 });
    }
  }

  // TEST 6: Advanced AI Capabilities Matrix (All 7 PS Features)
  console.log('\n🧠 [TEST] Executing All 7 AI Capabilities Matrix...');
  
  // AI Capability 4: Portfolio Batch Cluster Summary
  const batchAiRes = await fetch(`${BASE_URL}/api/ai/batch-summary`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${reviewerToken}`, 'Content-Type': 'application/json' }
  }).then(r => r.json());
  console.log(`   [AI 4/7] Batch Summary: ${batchAiRes.data?.total_exceptions} exceptions clustered | Top issue identified: ${batchAiRes.data?.cluster_breakdown?.[0]?.rule_name || 'N/A'}`);
  results.push({ name: 'AI Portfolio Cluster Summary', passed: batchAiRes.success && Array.isArray(batchAiRes.data?.cluster_breakdown) });

  // AI Capability 5: Cross-Source Servicer Conflict Comparison
  const conflictAiRes = await fetch(`${BASE_URL}/api/ai/compare-conflicts`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${reviewerToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      baseline_record: { loan_id: 'LN-CONF-01', current_balance: 245000, payment_status: 'Current', interest_rate: 4.5 },
      secondary_record: { loan_id: 'LN-CONF-01', current_balance: 241200, payment_status: 'Delinquent', interest_rate: 4.5, last_updated_at: '2026-08-30' }
    })
  }).then(r => r.json());
  console.log(`   [AI 5/7] Conflict Analyzer: Detected ${conflictAiRes.data?.conflict_count} discrepancies ($${conflictAiRes.data?.discrepancies?.[0]?.delta_amount} balance delta)`);
  results.push({ name: 'AI Cross-Source Conflict Reconciliation', passed: conflictAiRes.success && conflictAiRes.data?.has_conflicts });

  // AI Capability 6: Severity Classification Assistant
  const severityAiRes = await fetch(`${BASE_URL}/api/ai/classify-severity`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${reviewerToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ field: 'principal_balance', current_value: -150000, principal_balance: 150000 })
  }).then(r => r.json());
  console.log(`   [AI 6/7] Severity Classifier: Classified as [${severityAiRes.data?.classified_severity}] (Risk Score: ${severityAiRes.data?.risk_score}/100)`);
  results.push({ name: 'AI Severity Classification Assistant', passed: severityAiRes.success && severityAiRes.data?.classified_severity === 'CRITICAL' });

  // AI Capability 7: Natural Language Policy Rule Generator
  const ruleGenAiRes = await fetch(`${BASE_URL}/api/ai/generate-rule`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${reviewerToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: 'Block loan tapes where interest rate exceeds 18.5%' })
  }).then(r => r.json());
  console.log(`   [AI 7/7] Rule Generator: Compiled "${ruleGenAiRes.data?.rule?.name}" -> Rule ID: ${ruleGenAiRes.data?.rule?.id} (Max Rate: ${ruleGenAiRes.data?.rule?.params?.max_rate}%)`);
  results.push({ name: 'AI Natural Language Policy Compiler', passed: ruleGenAiRes.success && ruleGenAiRes.data?.rule?.id === 'POL-RATE-CAP' });

  // TEST 7: Verify Canonical Portfolio with Ananya Iyer Token
  console.log('\n📊 [TEST] Inspecting Verified Portfolio with Ananya Iyer Token...');
  const loansRes = await fetch(`${BASE_URL}/api/loans?limit=5`, {
    headers: { 'Authorization': `Bearer ${consumerToken}` }
  }).then(r => r.json());
  console.log(`   Canonical Records Retrieved: ${loansRes.data ? loansRes.data.length : 0}`);
  results.push({ name: 'Verified Portfolio Access', passed: loansRes.success && Array.isArray(loansRes.data) });

  // TEST 7: Cryptographic Hash Chain Verification
  console.log('\n🔐 [TEST] Verifying Cryptographic Audit Hash Chain...');
  const auditRes = await fetch(`${BASE_URL}/api/audit/verify`, {
    headers: { 'Authorization': `Bearer ${consumerToken}` }
  }).then(r => r.json());
  console.log(`   Hash Chain Integrity: ${auditRes.valid ? '✅ VALID (Unbroken SHA-256 Chain)' : '❌ BROKEN'}`);
  console.log(`   Chain Length: ${auditRes.length} blocks | Head Hash: ${auditRes.head || 'GENESIS'}`);
  results.push({ name: 'Cryptographic Hash Chain Integrity', passed: auditRes.valid });

  // Summary Report
  console.log('\n====================================================');
  console.log('📋 MULTI-CSV TEST EXECUTION SUMMARY:');
  console.log('====================================================');
  let allPass = true;
  results.forEach(r => {
    console.log(`${r.passed ? '✅ PASS' : '❌ FAIL'} | ${r.name}`);
    if (!r.passed) allPass = false;
  });
  console.log('====================================================');
  console.log(allPass ? '🎉 ALL CSV UPLOAD & GOVERNANCE TESTS PASSED 100%' : '⚠️ SOME TESTS REPORTED ANOMALIES');
  console.log('====================================================\n');
}

runQaTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
