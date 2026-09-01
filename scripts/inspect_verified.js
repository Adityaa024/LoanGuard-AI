import { getDb } from '../src/db/index.js';

async function inspect() {
  const db = await getDb();
  const c1 = await db.get("SELECT COUNT(*) as c FROM loans WHERE validation_status = 'verified'");
  const c2 = await db.get("SELECT COUNT(*) as c FROM loans WHERE is_verified = 1");
  const c3 = await db.get("SELECT COUNT(DISTINCT loan_id) as c FROM loans WHERE validation_status = 'verified'");
  const c4 = await db.get("SELECT COUNT(DISTINCT loan_id) as c FROM loans WHERE is_verified = 1");
  
  console.log('COUNT(validation_status = verified):', c1.c);
  console.log('COUNT(is_verified = 1):', c2.c);
  console.log('DISTINCT loan_id (validation_status = verified):', c3.c);
  console.log('DISTINCT loan_id (is_verified = 1):', c4.c);

  const duplicates = await db.all(`
    SELECT loan_id, COUNT(*) as cnt 
    FROM loans 
    WHERE validation_status = 'verified' OR is_verified = 1 
    GROUP BY loan_id 
    HAVING cnt > 1
  `);
  console.log('Duplicate loan_ids among verified:', duplicates);

  const allVerified = await db.all(`
    SELECT id, loan_id, borrower_name, principal_balance, validation_status, is_verified, verified_at, verified_by, verified_hash
    FROM loans 
    WHERE validation_status = 'verified' OR is_verified = 1
    ORDER BY verified_at DESC
  `);
  console.log('Total verified rows returned:', allVerified.length);
  console.table(allVerified);
}

inspect().catch(console.error);
