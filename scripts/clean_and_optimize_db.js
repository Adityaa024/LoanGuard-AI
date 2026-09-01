import { getDb } from '../src/db/index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'data', 'database.sqlite');

async function cleanAndOptimize() {
  console.log('[DB Clean] Opening database...');
  const db = await getDb();

  console.log('[DB Clean] Pruning old test batches...');
  // Keep only the most recent 10 upload batches
  await db.exec(`
    DELETE FROM upload_batches WHERE id NOT IN (
      SELECT id FROM upload_batches ORDER BY uploaded_at DESC LIMIT 10
    );
    DELETE FROM loans WHERE upload_batch_id IS NOT NULL AND upload_batch_id NOT IN (
      SELECT id FROM upload_batches
    );
    DELETE FROM exceptions WHERE loan_id NOT IN (
      SELECT loan_id FROM loans
    );
    DELETE FROM audit_logs WHERE id NOT IN (
      SELECT id FROM audit_logs ORDER BY seq DESC LIMIT 500
    );
  `);

  console.log('[DB Clean] Creating indexes for fast bounded lookups...');
  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_loans_upload_batch ON loans(upload_batch_id);
    CREATE INDEX IF NOT EXISTS idx_loans_loan_id ON loans(loan_id);
    CREATE INDEX IF NOT EXISTS idx_loans_verified ON loans(is_verified);
    CREATE INDEX IF NOT EXISTS idx_exceptions_loan ON exceptions(loan_id);
    CREATE INDEX IF NOT EXISTS idx_exceptions_severity ON exceptions(severity);
    CREATE INDEX IF NOT EXISTS idx_audit_loan ON audit_logs(loanId);
    PRAGMA cache_size = -4000;
    PRAGMA journal_mode = WAL;
    VACUUM;
  `);

  const stats = fs.statSync(DB_PATH);
  console.log(`[DB Clean] Vacuum completed. Optimized database size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
  process.exit(0);
}

cleanAndOptimize().catch(err => {
  console.error('[DB Clean] Error:', err);
  process.exit(1);
});
