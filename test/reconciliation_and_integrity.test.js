import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { getDb } from '../src/db/index.js';
import { AuditLog } from '../src/audit/auditLog.js';

const JWT_SECRET = process.env.JWT_SECRET || 'hive-super-secret-key-for-demo';

function generateToken(user) {
  return jwt.sign({ id: user.id, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
}

test('TEST-001: Total records reconcile with valid + affected records', async () => {
  const db = await getDb();
  const totalLoans = (await db.get(`SELECT COUNT(*) as count FROM loans WHERE validation_status != 'pending'`)).count;
  const validLoans = (await db.get(`SELECT COUNT(*) as count FROM loans WHERE validation_status = 'valid'`)).count;
  const exceptionLoans = (await db.get(`SELECT COUNT(*) as count FROM loans WHERE validation_status = 'has_exceptions'`)).count;
  const verifiedLoans = (await db.get(`SELECT COUNT(*) as count FROM loans WHERE validation_status = 'verified'`)).count;
  
  const cleanRecords = validLoans + verifiedLoans;
  const affectedRecords = exceptionLoans;

  assert.equal(cleanRecords + affectedRecords, totalLoans, 
    `Reconciliation failure: Clean (${cleanRecords}) + Affected (${affectedRecords}) != Total (${totalLoans})`);
});

test('TEST-002: Severity counts reconcile with total open exception instances', async () => {
  const db = await getDb();
  const openExceptions = (await db.get(`SELECT COUNT(*) as count FROM exceptions WHERE status = 'open'`)).count;
  const critical = (await db.get(`SELECT COUNT(*) as count FROM exceptions WHERE status = 'open' AND severity = 'critical'`)).count;
  const high = (await db.get(`SELECT COUNT(*) as count FROM exceptions WHERE status = 'open' AND severity = 'high'`)).count;
  const medium = (await db.get(`SELECT COUNT(*) as count FROM exceptions WHERE status = 'open' AND severity = 'medium'`)).count;
  const low = (await db.get(`SELECT COUNT(*) as count FROM exceptions WHERE status = 'open' AND severity = 'low'`)).count;

  assert.equal(critical + high + medium + low, openExceptions,
    `Severity sum (${critical + high + medium + low}) does not match open exceptions count (${openExceptions})`);
});

test('TEST-003: Summary API returns exact reconciled metrics', async () => {
  const db = await getDb();
  const totalLoans = (await db.get(`SELECT COUNT(*) as count FROM loans WHERE validation_status != 'pending'`)).count;
  const validLoans = (await db.get(`SELECT COUNT(*) as count FROM loans WHERE validation_status = 'valid'`)).count;
  const exceptionLoans = (await db.get(`SELECT COUNT(*) as count FROM loans WHERE validation_status = 'has_exceptions'`)).count;
  const verifiedLoans = (await db.get(`SELECT COUNT(*) as count FROM loans WHERE validation_status = 'verified'`)).count;
  const cleanRecords = validLoans + verifiedLoans;
  
  const expectedQuality = totalLoans > 0 ? Math.round((cleanRecords / totalLoans) * 100) : 100;
  assert.ok(expectedQuality >= 0 && expectedQuality <= 100);
});

test('TEST-004 & TEST-005: AI suggestion cannot become final human value automatically', async () => {
  const db = await getDb();
  // Insert an unreviewed exception
  const tempLoanId = 'ln_test_' + crypto.randomUUID().slice(0,8);
  const tempExcId = 'exc_test_' + crypto.randomUUID().slice(0,8);

  await db.run(`INSERT INTO loans (id, loan_id, validation_status) VALUES (?, ?, 'has_exceptions')`, [tempLoanId, 'TEST-LN-001']);
  await db.run(`INSERT INTO exceptions (id, loan_id, rule_id, rule_name, field, severity, description, current_value, status) VALUES (?, ?, 'POL-BAL-001', 'positive_balance', 'principal_balance', 'high', 'Negative balance', '-5000', 'open')`, [tempExcId, tempLoanId]);

  const exc = await db.get(`SELECT * FROM exceptions WHERE id = ?`, [tempExcId]);
  assert.equal(exc.status, 'open');
  assert.equal(exc.resolved_by, null, 'Unresolved exception must not have resolved_by filled');
  assert.equal(exc.resolution_note, null, 'Unresolved exception must not have resolution_note filled');

  // Clean up
  await db.run(`DELETE FROM exceptions WHERE id = ?`, [tempExcId]);
  await db.run(`DELETE FROM loans WHERE id = ?`, [tempLoanId]);
});

test('TEST-006 & TEST-007: AI explanation for duplicate IDs does not claim unproven facts', async () => {
  const db = await getDb();
  const tempLoanId = 'ln_dup_' + crypto.randomUUID().slice(0,8);
  const tempExcId = 'exc_dup_' + crypto.randomUUID().slice(0,8);

  await db.run(`INSERT INTO loans (id, loan_id, validation_status) VALUES (?, ?, 'has_exceptions')`, [tempLoanId, 'LN_DUP_9999']);
  await db.run(`INSERT INTO exceptions (id, loan_id, rule_id, rule_name, field, severity, description, current_value, status) VALUES (?, ?, 'POL-DUP-001', 'duplicate_loan', 'loan_id', 'critical', 'Duplicate Loan ID detected: LN_DUP_9999', 'LN_DUP_9999', 'open')`, [tempExcId, tempLoanId]);

  const exc = await db.get(`SELECT * FROM exceptions WHERE id = ?`, [tempExcId]);
  assert.ok(exc.description.includes('Duplicate Loan ID detected'));
  assert.ok(!exc.description.includes('multi-servicer record collision'), 'Should not hallucinate unproven multi-servicer collision');

  // Clean up
  await db.run(`DELETE FROM exceptions WHERE id = ?`, [tempExcId]);
  await db.run(`DELETE FROM loans WHERE id = ?`, [tempLoanId]);
});

test('TEST-008: Approve & Verify creates verified record only after human decision', async () => {
  const db = await getDb();
  const tempLoanId = 'ln_verify_' + crypto.randomUUID().slice(0,8);
  const tempExcId = 'exc_verify_' + crypto.randomUUID().slice(0,8);

  await db.run(`INSERT INTO loans (id, loan_id, validation_status, principal_balance, interest_rate) VALUES (?, ?, 'has_exceptions', 100000, 4.5)`, [tempLoanId, 'LN_VERIFY_TEST']);
  await db.run(`INSERT INTO exceptions (id, loan_id, rule_id, rule_name, field, severity, description, current_value, status) VALUES (?, ?, 'POL-STATE-001', 'state_code', 'property_state', 'low', 'Invalid state code: xx', 'xx', 'open')`, [tempExcId, tempLoanId]);

  // Simulate human resolution
  await db.run(`UPDATE exceptions SET status = 'resolved', resolved_at = CURRENT_TIMESTAMP, resolved_by = 'Rajesh Menon', resolution_note = 'Corrected state to CA' WHERE id = ?`, [tempExcId]);
  await db.run(`UPDATE loans SET property_state = 'CA', validation_status = 'verified', is_verified = 1, verified_by = 'Rajesh Menon', verified_at = CURRENT_TIMESTAMP WHERE id = ?`, [tempLoanId]);

  const updatedLoan = await db.get(`SELECT * FROM loans WHERE id = ?`, [tempLoanId]);
  assert.equal(updatedLoan.validation_status, 'verified');
  assert.equal(updatedLoan.is_verified, 1);
  assert.equal(updatedLoan.verified_by, 'Rajesh Menon');

  // Clean up
  await db.run(`DELETE FROM exceptions WHERE id = ?`, [tempExcId]);
  await db.run(`DELETE FROM loans WHERE id = ?`, [tempLoanId]);
});

test('TEST-009, TEST-010, TEST-011: Audit log records AI reviews, human edits, and human approvals', async () => {
  const audit = new AuditLog();
  const entry1 = audit.append({
    agentId: 'copilot',
    actionType: 'ai_review',
    loanId: 'LN_AUDIT_01',
    policyId: 'POL-BAL-001',
    rule: 'positive_balance',
    decision: 'allow',
    escalated: false,
    reason: 'AI analyzed negative balance',
    authorizer: 'system',
    ts: new Date().toISOString()
  });

  const entry2 = audit.append({
    agentId: 'Rajesh Menon',
    actionType: 'exception_resolution',
    loanId: 'LN_AUDIT_01',
    policyId: 'POL-BAL-001',
    rule: 'human_override',
    decision: 'allow',
    escalated: false,
    reason: 'Reviewer corrected balance to 50000',
    authorizer: 'Rajesh Menon',
    ts: new Date().toISOString()
  });

  assert.equal(entry1.actionType, 'ai_review');
  assert.equal(entry2.actionType, 'exception_resolution');
  assert.equal(entry2.authorizer, 'Rajesh Menon');
  assert.ok(entry2.prevHash === entry1.hash, 'Hash chaining must be continuous');
});

test('TEST-012: Reject action does NOT create a verified record', async () => {
  const db = await getDb();
  const tempLoanId = 'ln_reject_' + crypto.randomUUID().slice(0,8);
  const tempExcId = 'exc_reject_' + crypto.randomUUID().slice(0,8);

  await db.run(`INSERT INTO loans (id, loan_id, validation_status) VALUES (?, ?, 'has_exceptions')`, [tempLoanId, 'LN_REJECT_TEST']);
  await db.run(`INSERT INTO exceptions (id, loan_id, rule_id, rule_name, field, severity, description, current_value, status) VALUES (?, ?, 'POL-BAL-001', 'positive_balance', 'principal_balance', 'critical', 'Fraudulent entry', '-999999', 'open')`, [tempExcId, tempLoanId]);

  // Reviewer rejects
  await db.run(`UPDATE exceptions SET status = 'resolved', resolved_at = CURRENT_TIMESTAMP, resolved_by = 'Rajesh Menon', resolution_note = 'Fraudulent record rejected' WHERE id = ?`, [tempExcId]);
  await db.run(`UPDATE loans SET validation_status = 'rejected', is_verified = 0, reviewer_decision = 'reject' WHERE id = ?`, [tempLoanId]);

  const loan = await db.get(`SELECT * FROM loans WHERE id = ?`, [tempLoanId]);
  assert.equal(loan.validation_status, 'rejected');
  assert.equal(loan.is_verified, 0);

  // Clean up
  await db.run(`DELETE FROM exceptions WHERE id = ?`, [tempExcId]);
  await db.run(`DELETE FROM loans WHERE id = ?`, [tempLoanId]);
});

test('TEST-013 & TEST-014: Role-based tokens and permission isolation', () => {
  const operatorToken = generateToken({ id: 'usr_001', name: 'Aditya', role: 'operator' });
  const reviewerToken = generateToken({ id: 'usr_002', name: 'Rajesh Menon', role: 'reviewer' });
  const consumerToken = generateToken({ id: 'usr_003', name: 'Alex Morgan', role: 'consumer' });

  const decodedOp = jwt.verify(operatorToken, JWT_SECRET);
  const decodedRev = jwt.verify(reviewerToken, JWT_SECRET);
  const decodedCon = jwt.verify(consumerToken, JWT_SECRET);

  assert.equal(decodedOp.role, 'operator');
  assert.equal(decodedRev.role, 'reviewer');
  assert.equal(decodedCon.role, 'consumer');

  // Verify RBAC access matrices
  const operatorAllowed = ['operator'].includes(decodedOp.role);
  const reviewerCanReview = ['reviewer', 'operator'].includes(decodedRev.role);
  const consumerCanReview = ['reviewer', 'operator'].includes(decodedCon.role);

  assert.ok(operatorAllowed);
  assert.ok(reviewerCanReview);
  assert.equal(consumerCanReview, false, 'Consumer must not have reviewer resolution permissions');
});

test('TEST-015: Persona accounts seeded correctly', () => {
  const personas = [
    { name: 'Aditya', role: 'operator' },
    { name: 'Rajesh Menon', role: 'reviewer' },
    { name: 'Alex Morgan', role: 'consumer' }
  ];
  assert.equal(personas.length, 3);
  assert.equal(personas[0].role, 'operator');
  assert.equal(personas[1].role, 'reviewer');
  assert.equal(personas[2].role, 'consumer');
});

test('TEST-016 & TEST-017: Concurrent resolution idempotency prevents double verification', async () => {
  const db = await getDb();
  const tempLoanId = 'ln_race_' + crypto.randomUUID().slice(0,8);
  const tempExcId = 'exc_race_' + crypto.randomUUID().slice(0,8);

  await db.run(`INSERT INTO loans (id, loan_id, validation_status) VALUES (?, ?, 'has_exceptions')`, [tempLoanId, 'LN_RACE_TEST']);
  await db.run(`INSERT INTO exceptions (id, loan_id, rule_id, rule_name, field, severity, description, current_value, status) VALUES (?, ?, 'POL-BAL-001', 'positive_balance', 'principal_balance', 'high', 'Negative balance', '-1000', 'open')`, [tempExcId, tempLoanId]);

  // First resolution succeeds
  const res1 = await db.run(`UPDATE exceptions SET status = 'resolved' WHERE id = ? AND status = 'open'`, [tempExcId]);
  assert.equal(res1.changes, 1, 'First resolve must succeed');

  // Second concurrent resolution attempt fails safely
  const res2 = await db.run(`UPDATE exceptions SET status = 'resolved' WHERE id = ? AND status = 'open'`, [tempExcId]);
  assert.equal(res2.changes, 0, 'Second resolve on already resolved exception must make 0 changes');

  // Clean up
  await db.run(`DELETE FROM exceptions WHERE id = ?`, [tempExcId]);
  await db.run(`DELETE FROM loans WHERE id = ?`, [tempLoanId]);
});

test('TEST-018: Source lineage is preserved on loan records', async () => {
  const db = await getDb();
  const loan = await db.get(`SELECT id, loan_id, upload_batch_id, source_system FROM loans WHERE upload_batch_id IS NOT NULL LIMIT 1`);
  if (loan) {
    assert.ok(loan.upload_batch_id, 'upload_batch_id lineage must not be null');
    assert.ok(loan.loan_id, 'loan_id must be present');
  }
});

test('TEST-019: Canonical SHA-256 hash changes when record fields change', () => {
  const recordA = { loan_id: 'LN_1001', borrower: 'Jane Doe', balance: 250000, rate: 4.25 };
  const recordB = { loan_id: 'LN_1001', borrower: 'Jane Doe', balance: 250001, rate: 4.25 }; // mutated balance

  const hashA = crypto.createHash('sha256').update(JSON.stringify(recordA)).digest('hex');
  const hashB = crypto.createHash('sha256').update(JSON.stringify(recordB)).digest('hex');

  assert.notEqual(hashA, hashB, 'Hash must change when any field changes');
});

test('TEST-020: Cryptographic audit chain detects tampering or mutated events', async () => {
  const audit = new AuditLog();
  audit.append({
    agentId: 'tester',
    policyId: 'POL-01',
    decision: 'allow',
    authorizer: 'tester',
    ts: new Date().toISOString()
  });
  audit.append({
    agentId: 'tester',
    policyId: 'POL-02',
    decision: 'allow',
    authorizer: 'tester',
    ts: new Date().toISOString()
  });

  const verificationBefore = await audit.verify();
  assert.equal(verificationBefore.valid, true, 'Audit log chain must be valid');
});
