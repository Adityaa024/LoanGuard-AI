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

  return dbInstance
}
