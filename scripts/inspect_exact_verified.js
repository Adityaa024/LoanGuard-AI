import { getDb } from '../src/db/index.js';

async function main() {
  const db = await getDb();
  const v1 = await db.all("SELECT id, loan_id, borrower_name, principal_balance, validation_status, is_verified, verified_at, verified_by, verified_hash FROM loans WHERE validation_status = 'verified'");
  console.log('Count where validation_status = verified:', v1.length);
  console.table(v1);

  const v2 = await db.all("SELECT id, loan_id, borrower_name, principal_balance, validation_status, is_verified, verified_at, verified_by, verified_hash FROM loans WHERE is_verified = 1");
  console.log('Count where is_verified = 1:', v2.length);

  const v3 = await db.all("SELECT id, loan_id, borrower_name, principal_balance, validation_status, is_verified, verified_at, verified_by, verified_hash FROM loans WHERE validation_status = 'verified' AND is_verified = 1");
  console.log('Count where validation_status = verified AND is_verified = 1:', v3.length);
}

main().catch(console.error);
