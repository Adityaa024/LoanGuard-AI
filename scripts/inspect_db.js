import { getDb } from '../src/db/index.js';

async function main() {
  const db = await getDb();
  console.log('=== LOANS ===');
  console.log('Total loans:', (await db.get('SELECT count(*) as c FROM loans')).c);
  console.log('By validation_status:', await db.all('SELECT validation_status, count(*) as c FROM loans GROUP BY validation_status'));
  
  console.log('\n=== EXCEPTIONS ===');
  console.log('Total exceptions:', (await db.get('SELECT count(*) as c FROM exceptions')).c);
  console.log('By status:', await db.all('SELECT status, count(*) as c FROM exceptions GROUP BY status'));
  console.log('By severity (open):', await db.all('SELECT severity, count(*) as c FROM exceptions WHERE status = "open" GROUP BY severity'));
  console.log('Distinct loans with open exceptions:', (await db.get('SELECT count(DISTINCT loan_id) as c FROM exceptions WHERE status = "open"')).c);
  console.log('Distinct loans in exceptions (all):', (await db.get('SELECT count(DISTINCT loan_id) as c FROM exceptions')).c);
  
  console.log('\n=== BATCHES COUNT ===');
  console.log('Total batches:', (await db.get('SELECT count(*) as c FROM upload_batches')).c);
  console.log('Recent 5 batches:', await db.all('SELECT id, filename, uploaded_by, uploaded_at FROM upload_batches ORDER BY uploaded_at DESC LIMIT 5'));
  
  console.log('\n=== AUDIT LOGS ===');
  console.log('Audit log entries count:', (await db.get('SELECT count(*) as c FROM audit_logs')).c);
}

main().catch(console.error);
