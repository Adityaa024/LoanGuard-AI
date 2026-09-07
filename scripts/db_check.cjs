const { getDb } = require('./src/db/index.js');
const crypto = require('crypto');

function sha256(s) { return crypto.createHash('sha256').update(s).digest('hex'); }
function canonical(obj) { const keys = Object.keys(obj).sort(); return JSON.stringify(obj, keys); }

async function run() {
  const db = await getDb();
  console.log("=== CHECKING AUDIT HASH CHAIN ===");
  const rows = await db.all(`SELECT * FROM audit_logs ORDER BY seq ASC`);
  
  if (rows.length === 0) {
    console.log("Audit log is empty.");
    return;
  }
  
  let prevHash = '0'.repeat(64);
  let valid = true;
  for (let e of rows) {
    if (e.prevHash !== prevHash) {
      console.log(`? CHAIN BROKEN at seq ${e.seq}: prevHash mismatch.`);
      valid = false;
      break;
    }
    const body = {
      seq: e.seq, agentId: e.agentId, actionType: e.actionType, loanId: e.loanId,
      policyId: e.policyId, rule: e.rule, decision: e.decision, escalated: !!e.escalated,
      amount: e.amount, reason: e.reason, authorizer: e.authorizer, ts: e.ts, prevHash: e.prevHash
    };
    body.id = sha256(canonical(body)).slice(0, 16);
    const recomputed = sha256(prevHash + canonical(body));
    
    if (recomputed !== e.hash) {
      console.log(`? CHAIN BROKEN at seq ${e.seq}: hash mismatch (record mutated!).`);
      valid = false;
      break;
    }
    prevHash = e.hash;
  }
  if (valid) console.log(`? HASH CHAIN INTACT across ${rows.length} records.`);
  
  console.log("\n=== CHECKING DB ATOMICITY ===");
  const missingAudit = await db.all(`
    SELECT l.id, l.loan_id FROM loans l
    LEFT JOIN audit_logs a ON l.id = a.loanId AND a.actionType = 'record_verified'
    WHERE l.validation_status = 'verified' AND a.id IS NULL
  `);
  if (missingAudit.length > 0) {
    console.log(`? FOUND ${missingAudit.length} VERIFIED LOANS WITH NO AUDIT TRAIL!`);
  } else {
    console.log(`? All verified loans have audit trails.`);
  }
  
  // Check duplicates handling
  const dups = await db.all(`SELECT loan_id, count(*) as c FROM loans GROUP BY loan_id HAVING c > 1`);
  if (dups.length > 0) {
    console.log(`? FOUND ${dups.length} DUPLICATE LOAN IDs IN DB!`);
  } else {
    console.log(`? No duplicate loan IDs found.`);
  }
}
run().catch(console.error);
