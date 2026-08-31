import sqlite3 from 'sqlite3'
import { open } from 'sqlite'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = path.join(__dirname, '..', '..', 'data', 'database.sqlite')

let dbInstance = null

export async function getDb() {
  if (dbInstance) return dbInstance

  // Ensure data directory exists
  const dataDir = path.dirname(DB_PATH)
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }

  dbInstance = await open({
    filename: DB_PATH,
    driver: sqlite3.Database
  })

  await dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS upload_batches (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      file_hash TEXT UNIQUE,
      uploaded_by TEXT NOT NULL,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'completed'
    );

    CREATE TABLE IF NOT EXISTS loans (
      id TEXT PRIMARY KEY,
      upload_batch_id TEXT,
      loan_id TEXT NOT NULL,
      borrower_name TEXT,
      property_address TEXT,
      property_city TEXT,
      property_state TEXT,
      property_zip TEXT,
      principal_balance REAL,
      interest_rate REAL,
      origination_date TEXT,
      maturity_date TEXT,
      loan_status TEXT,
      property_type TEXT,
      borrower_id TEXT,
      original_principal REAL,
      current_balance REAL,
      term_months INTEGER,
      loan_purpose TEXT,
      payment_status TEXT,
      days_past_due INTEGER,
      document_status TEXT,
      last_updated_at TEXT,
      source_system TEXT,
      verified_by TEXT,
      reviewer_decision TEXT,
      ai_recommendation TEXT,
      ai_suggested_value TEXT,
      ai_confidence REAL,
      validation_status TEXT DEFAULT 'pending',
      is_verified BOOLEAN DEFAULT 0,
      verified_at DATETIME,
      verified_hash TEXT,
      FOREIGN KEY(upload_batch_id) REFERENCES upload_batches(id)
    );

    CREATE TABLE IF NOT EXISTS exceptions (
      id TEXT PRIMARY KEY,
      loan_id TEXT NOT NULL,
      rule_id TEXT NOT NULL,
      rule_name TEXT NOT NULL,
      field TEXT NOT NULL,
      severity TEXT NOT NULL,
      description TEXT NOT NULL,
      current_value TEXT,
      status TEXT DEFAULT 'open',
      suggested_value TEXT,
      ai_explanation TEXT,
      resolved_at DATETIME,
      resolved_by TEXT,
      resolution_note TEXT,
      FOREIGN KEY(loan_id) REFERENCES loans(id)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      seq INTEGER,
      agentId TEXT,
      actionType TEXT,
      loanId TEXT,
      policyId TEXT,
      rule TEXT,
      decision TEXT,
      escalated BOOLEAN,
      amount REAL,
      reason TEXT,
      authorizer TEXT,
      ts DATETIME,
      prevHash TEXT,
      hash TEXT,
      details TEXT
    );
  `)

  // Run schema column migrations for existing SQLite databases
  const columns = await dbInstance.all(`PRAGMA table_info(loans)`)
  const colNames = new Set(columns.map(c => c.name))
  const newCols = [
    ['borrower_id', 'TEXT'],
    ['original_principal', 'REAL'],
    ['current_balance', 'REAL'],
    ['term_months', 'INTEGER'],
    ['loan_purpose', 'TEXT'],
    ['payment_status', 'TEXT'],
    ['days_past_due', 'INTEGER'],
    ['document_status', 'TEXT'],
    ['last_updated_at', 'TEXT'],
    ['source_system', 'TEXT'],
    ['verified_by', 'TEXT'],
    ['reviewer_decision', 'TEXT'],
    ['ai_recommendation', 'TEXT'],
    ['ai_suggested_value', 'TEXT'],
    ['ai_confidence', 'REAL']
  ]
  for (const [col, type] of newCols) {
    if (!colNames.has(col)) {
      try {
        await dbInstance.run(`ALTER TABLE loans ADD COLUMN ${col} ${type}`)
      } catch (err) {
        // column may already exist
      }
    }
  }

  // Performance optimization PRAGMAs & Indexes
  try {
    await dbInstance.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;
      PRAGMA cache_size = -64000;
      PRAGMA temp_store = MEMORY;

      CREATE INDEX IF NOT EXISTS idx_loans_upload_batch ON loans(upload_batch_id, validation_status);
      CREATE INDEX IF NOT EXISTS idx_loans_validation_status ON loans(validation_status);
      CREATE INDEX IF NOT EXISTS idx_loans_verified_at ON loans(verified_at DESC);
      CREATE INDEX IF NOT EXISTS idx_exceptions_status_sev ON exceptions(status, severity);
      CREATE INDEX IF NOT EXISTS idx_exceptions_loan_status ON exceptions(loan_id, status);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_loan ON audit_logs(loanId);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_seq ON audit_logs(seq);
      CREATE INDEX IF NOT EXISTS idx_upload_batches_time ON upload_batches(uploaded_at DESC);
    `)
  } catch (e) {
    // ignore index creation errors
  }

  return dbInstance
}
