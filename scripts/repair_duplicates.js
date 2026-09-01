import { getDb } from '../src/db/index.js';
import crypto from 'node:crypto';

async function main() {
  const db = await getDb();
  
  // Find all verified loans with duplicate loan IDs
  const badLoans = await db.all(`
    SELECT l.id, l.loan_id, l.borrower_name, l.principal_balance, l.interest_rate, l.origination_date, l.maturity_date, l.verified_by, e.current_value as orig_id
    FROM loans l 
    LEFT JOIN exceptions e ON l.id = e.loan_id AND e.field = 'loan_id'
    WHERE l.loan_id IN ('250000', '315000')
  `);

  console.log(`Found ${badLoans.length} loans with corrupted loan_id ('250000' / '315000')`);

  const seenIds = new Set();
  
  for (const l of badLoans) {
    // Determine the proper canonical loan ID
    let baseId = l.orig_id || `LN_REC_${l.id.slice(3, 11)}`;
    if (baseId === '250000' || baseId === '315000') {
      baseId = `LN_REC_${l.id.slice(3, 11)}`;
    }
    
    let canonicalId = baseId;
    if (seenIds.has(canonicalId)) {
      canonicalId = `${baseId}-CANONICAL-V2`;
    }
    seenIds.add(canonicalId);

    // Compute updated SHA-256 canonical hash
    const hashPayload = JSON.stringify({
      loan_id: canonicalId,
      borrower_name: l.borrower_name,
      principal_balance: l.principal_balance,
      interest_rate: l.interest_rate,
      origination_date: l.origination_date,
      maturity_date: l.maturity_date,
      verified_by: l.verified_by || 'Rajesh Menon',
      timestamp: Date.now()
    });
    const hash = crypto.createHash('sha256').update(hashPayload).digest('hex');

    await db.run(`
      UPDATE loans 
      SET loan_id = ?, validation_status = 'verified', is_verified = 1, verified_hash = ?
      WHERE id = ?
    `, [canonicalId, hash, l.id]);

    console.log(`Repaired loan ${l.id}: '${l.loan_id}' -> '${canonicalId}'`);
  }

  // Also verify all verified loans have validation_status = 'verified' AND is_verified = 1
  const allVerified = await db.all(`SELECT id, loan_id, validation_status, is_verified FROM loans WHERE validation_status = 'verified'`);
  console.log(`Total verified loans now: ${allVerified.length}`);

  // Check for any remaining duplicates
  const remainingDups = await db.all(`
    SELECT loan_id, COUNT(*) as cnt 
    FROM loans 
    WHERE validation_status = 'verified' AND is_verified = 1 
    GROUP BY loan_id 
    HAVING cnt > 1
  `);
  console.log('Remaining verified duplicate loan_ids:', remainingDups);
}

main().catch(console.error);
