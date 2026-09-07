import pg from 'pg'

const { Pool } = pg
pg.types.setTypeParser(20, value => Number(value))

const schema = `
CREATE TABLE IF NOT EXISTS upload_batches (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  file_hash TEXT UNIQUE,
  uploaded_by TEXT NOT NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
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
  principal_balance DOUBLE PRECISION,
  interest_rate DOUBLE PRECISION,
  origination_date TEXT,
  maturity_date TEXT,
  loan_status TEXT,
  property_type TEXT,
  borrower_id TEXT,
  original_principal DOUBLE PRECISION,
  current_balance DOUBLE PRECISION,
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
  ai_confidence DOUBLE PRECISION,
  validation_status TEXT DEFAULT 'pending',
  is_verified INTEGER DEFAULT 0,
  verified_at TIMESTAMP,
  verified_hash TEXT
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
  resolved_at TIMESTAMP,
  resolved_by TEXT,
  resolution_note TEXT
);
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  seq INTEGER,
  "agentId" TEXT,
  "actionType" TEXT,
  "loanId" TEXT,
  "policyId" TEXT,
  rule TEXT,
  decision TEXT,
  escalated INTEGER,
  amount DOUBLE PRECISION,
  reason TEXT,
  authorizer TEXT,
  ts TIMESTAMP,
  "prevHash" TEXT,
  hash TEXT,
  details TEXT
);
CREATE TABLE IF NOT EXISTS document_manifest (
  id TEXT PRIMARY KEY,
  upload_batch_id TEXT,
  loan_id TEXT NOT NULL,
  document_type TEXT NOT NULL,
  document_status TEXT NOT NULL,
  uploaded_at TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS servicer_updates (
  id TEXT PRIMARY KEY,
  upload_batch_id TEXT,
  loan_id TEXT NOT NULL,
  current_balance DOUBLE PRECISION,
  payment_status TEXT,
  borrower_name TEXT,
  source_system TEXT,
  discrepancy_amount DOUBLE PRECISION DEFAULT 0,
  reconciliation_status TEXT DEFAULT 'pending',
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS import_reports (
  batch_id TEXT PRIMARY KEY,
  source_type TEXT NOT NULL,
  filename TEXT NOT NULL,
  total_rows INTEGER DEFAULT 0,
  clean_rows INTEGER DEFAULT 0,
  affected_rows INTEGER DEFAULT 0,
  failed_rows_json TEXT,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS ai_prompt_logs (
  id TEXT PRIMARY KEY,
  exception_id TEXT,
  loan_id TEXT,
  agent_id TEXT,
  model TEXT,
  system_prompt TEXT,
  user_prompt TEXT,
  raw_response TEXT,
  confidence DOUBLE PRECISION,
  suggested_value TEXT,
  latency_ms INTEGER,
  tokens_used INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS dynamic_rules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  severity TEXT DEFAULT 'high',
  rule_kind TEXT,
  field TEXT,
  operator TEXT,
  value TEXT,
  on_violation TEXT DEFAULT 'escalate',
  is_active INTEGER DEFAULT 1,
  created_by TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_exceptions_status ON exceptions(status);
CREATE INDEX IF NOT EXISTS idx_exceptions_status_sev ON exceptions(status, severity);
CREATE INDEX IF NOT EXISTS idx_exceptions_loan_id ON exceptions(loan_id);
CREATE INDEX IF NOT EXISTS idx_loans_loan_id ON loans(loan_id);
CREATE INDEX IF NOT EXISTS idx_loans_validation_status ON loans(validation_status);
CREATE INDEX IF NOT EXISTS idx_loans_upload_batch ON loans(upload_batch_id);
CREATE INDEX IF NOT EXISTS idx_audit_loan_id ON audit_logs("loanId");
CREATE INDEX IF NOT EXISTS idx_doc_manifest_loan_id ON document_manifest(loan_id);
CREATE INDEX IF NOT EXISTS idx_servicer_loan_id ON servicer_updates(loan_id);
CREATE INDEX IF NOT EXISTS idx_dynamic_rules_active ON dynamic_rules(is_active);
`

const quotedNames = ['agentId', 'actionType', 'loanId', 'policyId', 'prevHash']

function toPostgresSql(sql, params = []) {
  let query = sql
    .replace(/\bINSERT\s+OR\s+IGNORE\s+INTO\b/gi, 'INSERT INTO')
    .replace(/\bINSERT\s+OR\s+REPLACE\s+INTO\b/gi, 'INSERT INTO')

  for (const name of quotedNames) {
    query = query.replace(new RegExp(`(?<![\\\".])\\b${name}\\b`, 'g'), `"${name}"`)
  }

  let index = 0
  query = query.replace(/\?/g, () => `$${++index}`)
  const trimmed = query.trim().replace(/;\s*$/, '')

  if (/^INSERT\s+INTO/i.test(trimmed)) {
    const columnsMatch = trimmed.match(/^INSERT\s+INTO\s+[^()]+\(([^)]+)\)/i)
    if (columnsMatch && /INSERT\s+OR\s+IGNORE/i.test(sql)) {
      query = `${trimmed} ON CONFLICT DO NOTHING`
    } else if (columnsMatch && /INSERT\s+OR\s+REPLACE/i.test(sql)) {
      const columns = columnsMatch[1].split(',').map(column => column.trim())
      const updateColumns = columns.slice(1)
      if (updateColumns.length > 0) {
        query = `${trimmed} ON CONFLICT DO UPDATE SET ${updateColumns.map(column => `${column} = EXCLUDED.${column}`).join(', ')}`
      } else {
        query = `${trimmed} ON CONFLICT DO NOTHING`
      }
    }
  }

  return { query, params }
}

class PostgresDatabase {
  constructor(pool) {
    this.pool = pool
    this.client = null
  }

  async execute(sql, params = []) {
    const target = this.client || this.pool
    const normalized = toPostgresSql(sql, params)
    return target.query(normalized.query, normalized.params)
  }

  async get(sql, params = []) {
    const result = await this.execute(sql, params)
    return result.rows[0]
  }

  async all(sql, params = []) {
    const result = await this.execute(sql, params)
    return result.rows
  }

  async run(sql, params = []) {
    const result = await this.execute(sql, params)
    return { changes: result.rowCount }
  }

  async exec(sql) {
    if (/^\s*PRAGMA\b/i.test(sql)) return
    if (/^\s*BEGIN\b/i.test(sql)) {
      this.client = await this.pool.connect()
      await this.client.query('BEGIN')
      return
    }
    if (/^\s*COMMIT\b/i.test(sql) || /^\s*ROLLBACK\b/i.test(sql)) {
      if (!this.client) return
      try {
        await this.client.query(/^\s*COMMIT/i.test(sql) ? 'COMMIT' : 'ROLLBACK')
      } finally {
        this.client.release()
        this.client = null
      }
      return
    }
    for (const statement of sql.split(';').map(value => value.trim()).filter(Boolean)) {
      await this.execute(statement)
    }
  }

  async close() {
    if (this.client) {
      this.client.release()
      this.client = null
    }
    await this.pool.end()
  }
}

export async function openPostgres() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: Number(process.env.DB_POOL_MAX || 5),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    family: 4,
    ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false }
  })
  const db = new PostgresDatabase(pool)
  try {
    await db.exec(schema)
    return db
  } catch (error) {
    await pool.end().catch(() => {})
    throw error
  }
}
