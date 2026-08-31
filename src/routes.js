import path from 'node:path'
import fs from 'node:fs'
import crypto from 'node:crypto'
import multer from 'multer'
import jwt from 'jsonwebtoken'
import { fileURLToPath } from 'node:url'
import { buildSystem } from './system.js'
import { parse } from 'csv-parse/sync'
import { getDb } from './db/index.js'

// Native robust XSS sanitization without heavy JSDOM/CJS dependencies
const DOMPurify = {
  sanitize: (str) => {
    if (typeof str !== 'string') return ''
    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/on\w+\s*=\s*(['"]).*?\1/gi, '')
      .replace(/on\w+\s*=\s*[^>\s]+/gi, '')
      .replace(/javascript\s*:/gi, '')
      .replace(/<[^>]*>/g, '')
      .trim()
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'hive-super-secret-key-for-demo'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const USERS_PATH = path.join(ROOT, 'data', 'users.json')

let USERS = [
  { id: "usr_001", name: "Aditya Raj", email: "aditya.raj@gmail.com", password: "password123", role: "operator", avatar: "AR" },
  { id: "usr_002", name: "Rajesh Menon", email: "rajesh.menon@loanguard.ai", password: "password123", role: "reviewer", avatar: "RM" },
  { id: "usr_003", name: "Ananya Iyer", email: "ananya.iyer@loanguard.ai", password: "password123", role: "consumer", avatar: "AI" }
]
try {
  if (fs.existsSync(USERS_PATH)) {
    USERS = JSON.parse(fs.readFileSync(USERS_PATH, 'utf8'))
  }
} catch (e) {
  console.warn('[routes] Could not read data/users.json, using built-in users:', e.message)
}

function requireRole(allowedRoles) {
  return (req, res, next) => {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Missing or invalid token' })
    }
    const token = authHeader.split(' ')[1]
    try {
      const decoded = jwt.verify(token, JWT_SECRET)
      if (!allowedRoles.includes(decoded.role)) {
        return res.status(403).json({ success: false, error: 'Forbidden: Insufficient role permissions' })
      }
      req.user = decoded
      next()
    } catch (err) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Invalid token' })
    }
  }
}

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 12 * 1024 * 1024 } })

export async function registerRoutes(app, { ROOT }) {
  // ---- Authentication ----
  app.post('/api/login', (req, res) => {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ success: false, error: 'Email and password are required' })
    
    const user = USERS.find(u => u.email === email && u.password === password)
    if (!user) return res.status(401).json({ success: false, error: 'Invalid credentials' })
    
    const token = jwt.sign({ id: user.id, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '8h' })
    res.json({ success: true, token, user })
  })
  const sys = buildSystem()
  const { orchestrator, guard, audit, events, ledger, backend } = sys
  const engine = backend

  // ---- Live event stream (SSE) ----
  app.get('/events', (req, res) => {
    res.set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    })
    res.flushHeaders?.()
    res.write(`event: hello\ndata: {"ok":true}\n\n`)
    for (const evt of events.recent(40)) res.write(`data: ${JSON.stringify(evt)}\n\n`)
    const unsub = events.subscribe((evt) => res.write(`data: ${JSON.stringify(evt)}\n\n`))
    const ping = setInterval(() => res.write(': ping\n\n'), 15000)
    req.on('close', () => { clearInterval(ping); unsub() })
  })

  // ---- CSV Upload & Validation Engine ----
  app.post('/api/upload', requireRole(['operator']), upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, error: 'no file' })
    try {
      const fileHash = crypto.createHash('sha256').update(req.file.buffer).digest('hex')
      const db = await getDb()

      // Idempotency check
      const existingBatch = await db.get(`SELECT id FROM upload_batches WHERE file_hash = ?`, [fileHash])
      if (existingBatch) {
        return res.status(409).json({ success: false, error: 'Duplicate file detected. This exact batch has already been ingested.', code: 'DUPLICATE_BATCH' })
      }

      const records = parse(req.file.buffer, { columns: true, skip_empty_lines: true })
      
      const batchId = `batch_${Date.now()}`
      await db.run(`INSERT INTO upload_batches (id, filename, file_hash, uploaded_by) VALUES (?, ?, ?, ?)`, [batchId, req.file.originalname, fileHash, 'System Uploader'])
      
      let validCount = 0
      let exceptionCount = 0

      // Pre-load all existing loans into a Map and Set (1 query instead of N) to avoid N+1 problem
      const existingRows = await db.all(`SELECT * FROM loans`)
      const existingLoanMap = new Map(existingRows.map(r => [r.loan_id, r]))
      const existingLoanIds = new Set(existingRows.map(r => r.loan_id))
      // Also track loan_ids seen within this batch (for intra-file duplicates)
      const batchSeenIds = new Set()
      const borrowerCombos = new Set()
      const isServicerTape = (req.file.originalname && req.file.originalname.toLowerCase().includes('servicer'))

      await db.run('BEGIN TRANSACTION')
      try {
        for (const row of records) {
          // Parse raw CSV strings to appropriate types
          const rawLoanId = (row.loan_id || row.LoanID || '').trim()
          const record = {
            loan_id: rawLoanId || `MISSING-${crypto.randomUUID().slice(0,8)}`,
            borrower_id: row.borrower_id || row.BorrowerID || '',
            borrower_name: row.borrower_name || row.BorrowerName || '',
            property_state: row.property_state || row.PropertyState || '',
            principal_balance: parseFloat(row.principal_balance || row.PrincipalBalance || 0),
            original_principal: parseFloat(row.original_principal || row.OriginalPrincipal || 0),
            current_balance: parseFloat(row.current_balance || row.CurrentBalance || 0),
            interest_rate: parseFloat(row.interest_rate || row.InterestRate || 0),
            origination_date: row.origination_date || row.OriginationDate || '',
            maturity_date: row.maturity_date || row.MaturityDate || '',
            term_months: parseInt(row.term_months || row.TermMonths || 0),
            loan_purpose: row.loan_purpose || row.LoanPurpose || '',
            payment_status: row.payment_status || row.PaymentStatus || '',
            days_past_due: parseInt(row.days_past_due || row.DaysPastDue || 0),
            document_status: row.document_status || row.DocumentStatus || '',
            loan_status: row.loan_status || row.LoanStatus || '',
            last_updated_at: row.last_updated_at || row.LastUpdatedAt || '',
            source_system: row.source_system || row.SourceSystem || (isServicerTape ? 'Servicer_A' : 'Origination_Tape'),
          }

          const internalId = 'ln_' + crypto.randomUUID()

          // If this is a secondary servicer tape update, it's not a hard duplicate; check for conflict
          const isServicerUpdate = isServicerTape || (record.source_system && record.source_system.toLowerCase().includes('servicer'))
          const isDuplicate = !isServicerUpdate && (existingLoanIds.has(record.loan_id) || batchSeenIds.has(record.loan_id))
          batchSeenIds.add(record.loan_id)

          if (isDuplicate) {
            // Force escalate as duplicate
            exceptionCount++
            await db.run(`
              INSERT INTO loans (id, upload_batch_id, loan_id, borrower_id, borrower_name, property_state, principal_balance, original_principal, current_balance, interest_rate, origination_date, maturity_date, term_months, loan_purpose, payment_status, days_past_due, document_status, loan_status, last_updated_at, source_system, validation_status)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              internalId, batchId, record.loan_id, record.borrower_id, record.borrower_name, record.property_state, record.principal_balance, record.original_principal, record.current_balance, record.interest_rate, record.origination_date, record.maturity_date, record.term_months, record.loan_purpose, record.payment_status, record.days_past_due, record.document_status, record.loan_status, record.last_updated_at, record.source_system,
              'has_exceptions'
            ])
            await db.run(`
              INSERT INTO exceptions (id, loan_id, rule_id, rule_name, field, severity, description, current_value)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              'exc_' + crypto.randomUUID(), internalId, 'POL-DUP-001', 'duplicate_loan', 'loan_id', 'critical', `Duplicate Loan ID detected: ${record.loan_id}`, record.loan_id
            ])
            continue
          }

          // Evaluate with the Policy Engine
          const evalResult = engine.evaluate(
            { type: 'ingest_loan_record', record },
            { existingLoanIds, batchSeenIds, borrowerCombos, existingLoanMap }
          )

          const isException = evalResult.decision === 'escalate' || evalResult.decision === 'deny'
          if (isException) exceptionCount++
          else validCount++

          // Save to DB
          await db.run(`
            INSERT INTO loans (id, upload_batch_id, loan_id, borrower_id, borrower_name, property_state, principal_balance, original_principal, current_balance, interest_rate, origination_date, maturity_date, term_months, loan_purpose, payment_status, days_past_due, document_status, loan_status, last_updated_at, source_system, validation_status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            internalId, batchId, record.loan_id, record.borrower_id, record.borrower_name, record.property_state, record.principal_balance, record.original_principal, record.current_balance, record.interest_rate, record.origination_date, record.maturity_date, record.term_months, record.loan_purpose, record.payment_status, record.days_past_due, record.document_status, record.loan_status, record.last_updated_at, record.source_system,
            isException ? 'has_exceptions' : 'valid'
          ])

          if (isException && Array.isArray(evalResult.checks) && evalResult.checks.length > 0) {
            for (const check of evalResult.checks) {
              await db.run(`
                INSERT INTO exceptions (id, loan_id, rule_id, rule_name, field, severity, description, current_value)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
              `, [
                'exc_' + crypto.randomUUID(), internalId, check.policyId, check.rule, check.field, check.severity, check.reason, String(record[check.field] || '')
              ])
            }
          }
        }
        await db.run('COMMIT')
      } catch (err) {
        await db.run('ROLLBACK')
        throw err
      }

      res.json({ success: true, batchId, recordsProcessed: records.length, validCount, exceptionCount })
    } catch (e) {
      res.status(500).json({ success: false, error: e.message })
    }
  })

  // ---- Summary API (High-Speed Single-Pass Aggregation) ----
  const handleSummary = async (req, res) => {
    try {
      const db = await getDb()
      const [loanStats, excStats, uploadStats] = await Promise.all([
        db.get(`
          SELECT 
            COUNT(CASE WHEN validation_status != 'pending' THEN 1 END) as total_loans,
            COUNT(CASE WHEN validation_status = 'valid' THEN 1 END) as valid_loans,
            COUNT(CASE WHEN validation_status = 'has_exceptions' THEN 1 END) as exception_loans,
            COUNT(CASE WHEN validation_status = 'verified' THEN 1 END) as verified_loans
          FROM loans
        `),
        db.get(`
          SELECT 
            COUNT(*) as total_exceptions,
            COUNT(CASE WHEN status = 'open' THEN 1 END) as open_exceptions,
            COUNT(CASE WHEN status = 'open' AND severity = 'critical' THEN 1 END) as critical_exceptions,
            COUNT(CASE WHEN status = 'open' AND severity = 'high' THEN 1 END) as high_exceptions,
            COUNT(CASE WHEN status = 'open' AND severity = 'medium' THEN 1 END) as medium_exceptions,
            COUNT(CASE WHEN status = 'open' AND severity = 'low' THEN 1 END) as low_exceptions
          FROM exceptions
        `),
        db.get(`SELECT COUNT(*) as count FROM upload_batches`)
      ])

      const totalLoans = loanStats?.total_loans || 0
      const validLoans = loanStats?.valid_loans || 0
      const exceptionLoans = loanStats?.exception_loans || 0
      const verifiedLoans = loanStats?.verified_loans || 0
      const totalExceptions = excStats?.total_exceptions || 0
      const openExceptions = excStats?.open_exceptions || 0
      const uploadsCount = uploadStats?.count || 0
      const criticalExceptions = excStats?.critical_exceptions || 0
      const highExceptions = excStats?.high_exceptions || 0
      const mediumExceptions = excStats?.medium_exceptions || 0
      const lowExceptions = excStats?.low_exceptions || 0
      
      const data_quality_score = totalLoans > 0 ? Math.round(((validLoans + verifiedLoans) / totalLoans) * 100) : 100
      
      res.json({
        success: true,
        data: {
          total_loans: totalLoans,
          valid_loans: validLoans,
          exception_loans: exceptionLoans,
          verified_loans: verifiedLoans,
          total_exceptions: totalExceptions,
          open_exceptions: openExceptions,
          resolved_exceptions: totalExceptions - openExceptions,
          uploads_count: uploadsCount,
          data_quality_score,
          critical_exceptions: criticalExceptions,
          high_exceptions: highExceptions,
          medium_exceptions: mediumExceptions,
          low_exceptions: lowExceptions
        }
      })
    } catch (e) {
      res.status(500).json({ success: false, error: e.message })
    }
  }
  app.get('/api/summary', handleSummary)
  app.get('/summary', handleSummary)

  app.get('/api/uploads', async (req, res) => {
    try {
      const db = await getDb()
      const batches = await db.all(`
        SELECT 
          u.*,
          COALESCE(l.total_records, 0) as total_records,
          COALESCE(l.exception_records, 0) as exception_records
        FROM upload_batches u
        LEFT JOIN (
          SELECT 
            upload_batch_id,
            COUNT(*) as total_records,
            COUNT(CASE WHEN validation_status = 'has_exceptions' THEN 1 END) as exception_records
          FROM loans
          WHERE upload_batch_id IS NOT NULL
          GROUP BY upload_batch_id
        ) l ON u.id = l.upload_batch_id
        ORDER BY u.uploaded_at DESC 
        LIMIT 50
      `)
      res.json({ success: true, data: batches })
    } catch (e) {
      res.status(500).json({ success: false, error: e.message })
    }
  })

  // ---- Fetch APIs (Module H Specification) ----
  const handleGetLoans = async (req, res) => {
    const db = await getDb()
    const loans = await db.all(`SELECT * FROM loans ORDER BY id DESC LIMIT 100`)
    res.json({ success: true, data: loans })
  }
  app.get('/api/loans', requireRole(['operator', 'reviewer', 'consumer']), handleGetLoans)
  app.get('/loans', requireRole(['operator', 'reviewer', 'consumer']), handleGetLoans)

  const handleGetLoanById = async (req, res) => {
    try {
      const db = await getDb()
      const loan = await db.get(`SELECT * FROM loans WHERE id = ? OR loan_id = ?`, [req.params.id, req.params.id])
      if (!loan) return res.status(404).json({ success: false, error: 'Loan record not found' })
      res.json({ success: true, data: loan })
    } catch (e) {
      res.status(500).json({ success: false, error: e.message })
    }
  }
  app.get('/api/loans/:id', requireRole(['operator', 'reviewer', 'consumer']), handleGetLoanById)
  app.get('/loans/:id', requireRole(['operator', 'reviewer', 'consumer']), handleGetLoanById)

  const handleGetExceptions = async (req, res) => {
    const db = await getDb()
    const exc = await db.all(`SELECT e.*, l.loan_id as original_loan_id FROM exceptions e JOIN loans l ON e.loan_id = l.id WHERE e.status = 'open' ORDER BY e.id DESC`)
    res.json({ success: true, data: exc.map(e => ({...e, loan_id: e.original_loan_id})) })
  }
  app.get('/api/exceptions', requireRole(['operator', 'reviewer', 'consumer']), handleGetExceptions)
  app.get('/exceptions', requireRole(['operator', 'reviewer', 'consumer']), handleGetExceptions)

  const handleGetVerifiedLoans = async (req, res) => {
    const db = await getDb()
    const verified = await db.all(`SELECT * FROM loans WHERE validation_status = 'verified' ORDER BY verified_at DESC`)
    res.json({ success: true, data: verified })
  }
  app.get('/api/verified-loans', requireRole(['operator', 'reviewer', 'consumer']), handleGetVerifiedLoans)
  app.get('/verified-loans', requireRole(['operator', 'reviewer', 'consumer']), handleGetVerifiedLoans)

  const handleGetVerifiedLoanById = async (req, res) => {
    try {
      const db = await getDb()
      const loan = await db.get(`SELECT * FROM loans WHERE (id = ? OR loan_id = ?) AND validation_status = 'verified'`, [req.params.id, req.params.id])
      if (!loan) return res.status(404).json({ success: false, error: 'Verified loan not found' })
      res.json({ success: true, data: loan })
    } catch (e) {
      res.status(500).json({ success: false, error: e.message })
    }
  }
  app.get('/api/verified-loans/:id', requireRole(['operator', 'reviewer', 'consumer']), handleGetVerifiedLoanById)
  app.get('/verified-loans/:id', requireRole(['operator', 'reviewer', 'consumer']), handleGetVerifiedLoanById)

  // Server-side CSV export for verified loans (auditable, controlled)
  app.get('/api/export/verified-loans', requireRole(['consumer']), async (req, res) => {
    try {
      const db = await getDb()
      const verified = await db.all(`SELECT * FROM loans WHERE validation_status = 'verified' ORDER BY verified_at DESC`)
      const headers = ['loan_id','borrower_name','property_state','principal_balance','interest_rate','origination_date','maturity_date','validation_status','is_verified','verified_at','verified_hash']
      const csvRows = [headers.join(',')]
      for (const row of verified) {
        csvRows.push(headers.map(h => JSON.stringify(row[h] ?? '')).join(','))
      }
      const csv = csvRows.join('\n')
      
      await audit.append({
        agentId: req.user.name,
        actionType: 'export_verified_loans',
        loanId: 'ALL',
        policyId: 'POL-EXPORT',
        rule: 'data_export',
        decision: 'allow',
        escalated: false,
        reason: `Exported ${verified.length} verified loans`,
        authorizer: req.user.name,
        ts: new Date().toISOString()
      })

      res.set({ 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="verified_loans_export.csv"' })
      res.send(csv)
    } catch (e) {
      res.status(500).json({ success: false, error: e.message })
    }
  })

  // Cryptographic audit chain verification
  const handleVerifyAudit = async (req, res) => {
    try {
      const result = await audit.verify()
      res.json({ success: true, ...result })
    } catch (e) {
      res.status(500).json({ success: false, error: e.message })
    }
  }
  app.get('/api/audit/verify', requireRole(['operator', 'reviewer', 'consumer']), handleVerifyAudit)
  app.get('/api/audit-verify', requireRole(['operator', 'reviewer', 'consumer']), handleVerifyAudit)

  const handleGetAuditForLoan = async (req, res) => {
    try {
      const entries = await audit.list()
      if (req.params.loanId === 'ALL') {
        return res.json({ success: true, data: entries })
      }
      const db = await getDb()
      const loan = await db.get(`SELECT id, loan_id FROM loans WHERE id = ? OR loan_id = ?`, [req.params.loanId, req.params.loanId])
      const targetIds = new Set([req.params.loanId])
      if (loan) {
        if (loan.id) targetIds.add(loan.id)
        if (loan.loan_id) targetIds.add(loan.loan_id)
      }
      const loanEntries = entries.filter(e => targetIds.has(e.loanId) || e.loanId === 'ALL')
      res.json({ success: true, data: loanEntries })
    } catch (e) {
      res.status(500).json({ success: false, error: e.message })
    }
  }
  app.get('/api/audit/:loanId', requireRole(['operator', 'reviewer', 'consumer']), handleGetAuditForLoan)
  app.get('/api/audit/loan/:loanId', requireRole(['operator', 'reviewer', 'consumer']), handleGetAuditForLoan)
  app.get('/audit/:loanId', requireRole(['operator', 'reviewer', 'consumer']), handleGetAuditForLoan)

  // ---- Copilot/AI API ----
  app.post('/api/ai-review', requireRole(['reviewer']), async (req, res) => {
    try {
      const { exception_id } = req.body
      if (!exception_id) return res.status(400).json({ success: false, error: 'exception_id required' })
      
      const db = await getDb()
      const exc = await db.get(`SELECT * FROM exceptions WHERE id = ?`, [exception_id])
      if (!exc) return res.status(404).json({ success: false, error: 'Exception not found' })
      
      let explanation = ''
      let suggestedValue = null
      let confidence = 0.95
      let recommendation = ''
      let severityAssessment = exc.severity
      
      switch(exc.rule_id) {
        case 'POL-BAL-001':
          explanation = `The principal balance for this record is negative (${exc.current_value}). A loan balance represents the amount owed and cannot be negative. This is likely a data entry error where a payment amount was incorrectly placed in the balance field, or a sign error.`
          suggestedValue = String(Math.abs(Number(exc.current_value)))
          recommendation = `Review the source documentation to confirm the balance. If this was a sign error, approve the suggested positive value.`
          break
        case 'POL-RATE-001':
          if (Number(exc.current_value) > 25) {
            explanation = `The interest rate is unusually high (${exc.current_value}%). While technically possible, rates above 25% are rare and often indicate a missing decimal point (e.g., 26.5 instead of 2.65).`
            suggestedValue = String(Number(exc.current_value) / 10)
            recommendation = `Verify the interest rate against the loan agreement. If it's a decimal error, accept the suggested value.`
          } else {
            explanation = `The interest rate is negative (${exc.current_value}%). Interest rates cannot be negative.`
            suggestedValue = String(Math.abs(Number(exc.current_value)))
            recommendation = `Correct the sign to a positive value.`
          }
          break
        case 'POL-BOR-001':
          explanation = `The borrower name is missing. This is a critical identifying field.`
          confidence = 0.4
          recommendation = `Consult the physical loan tape or origination system to locate the missing borrower name.`
          break
        case 'POL-DATE-001':
          explanation = `The maturity date is earlier than the origination date, which is chronologically impossible.`
          confidence = 0.7
          recommendation = `The dates were likely swapped or the years were mistyped. Please manually review the source document.`
          break
        case 'POL-STATE-001':
          explanation = `The property state is invalid ("${exc.current_value}"). It must be a valid 2-letter uppercase state code.`
          suggestedValue = exc.current_value.toUpperCase().slice(0,2)
          confidence = 0.8
          recommendation = `Convert the state code to the standard 2-letter abbreviation.`
          break
        case 'POL-CONFLICT-001':
          explanation = `Cross-source discrepancy detected between baseline loan tape and secondary servicer update (${exc.description}). Servicers often report asynchronous payoff events or payment timing lags.`
          confidence = 0.88
          suggestedValue = exc.current_value
          recommendation = `Reconcile the servicer remittance statement. If servicer update is recent, accept the servicer current balance.`
          break
        case 'POL-BALCAP-001':
          explanation = `Current loan balance exceeds the original principal balance, indicating negative amortization or uncapitalized delinquent interest without loan modification.`
          confidence = 0.85
          recommendation = `Verify loan restructuring agreement. If no modification exists, reset current balance to original principal.`
          break
        case 'POL-PAYST-001':
          explanation = `Payment status is marked 'Current' but Days Past Due is greater than zero, creating an inconsistent credit reporting profile.`
          confidence = 0.90
          suggestedValue = 'Delinquent'
          recommendation = `Align payment status to 'Delinquent' or reset Days Past Due to 0 if payment was posted.`
          break
        case 'POL-CLOSED-001':
          explanation = `Loan is marked 'Closed' but still reflects a positive remaining balance.`
          confidence = 0.95
          suggestedValue = '0'
          recommendation = `Set current balance to 0.00 for closed loan or reopen status if still active.`
          break
        case 'POL-DOC-001':
          explanation = `Required statutory document status is empty or unavailable in loan tape.`
          confidence = 0.75
          suggestedValue = 'Available'
          recommendation = `Check document repository vault and mark as Available if note is present.`
          break
        case 'POL-BORCMB-001':
          explanation = `Identical borrower name, loan amount, and origination date detected across multiple loan entries.`
          confidence = 0.80
          recommendation = `Inspect for accidental duplicate loan entry or verify if borrower took multiple distinct loans on the same date.`
          break
        default:
          explanation = `An exception occurred: ${exc.description}.`
          recommendation = `Manual review required.`
      }

      // Record AI intervention in Audit Log
      await audit.append({
        agentId: 'copilot',
        actionType: 'ai_review',
        loanId: exc.loan_id,
        policyId: exc.rule_id,
        rule: 'copilot',
        decision: 'allow', // Just an informational review, doesn't block
        escalated: false,
        reason: `AI Copilot reviewed exception: ${exc.description}`,
        authorizer: 'system',
        ts: new Date().toISOString()
      })

      // Store in DB
      await db.run(`UPDATE exceptions SET ai_explanation = ?, suggested_value = ? WHERE id = ?`, 
        [explanation, suggestedValue, exception_id])

      res.json({ 
        success: true, 
        data: { 
          explanation, 
          suggested_value: suggestedValue, 
          confidence, 
          severity_assessment: severityAssessment, 
          recommendation,
          model: 'LoanGuard-AI Copilot v1.0 (Rule-Based Diagnostic Engine)',
          prompt: `Analyze exception ${exc.rule_id} on field ${exc.field} with value "${exc.current_value}"`,
          timestamp: new Date().toISOString()
        } 
      })
    } catch (e) {
      res.status(500).json({ success: false, error: e.message })
    }
  })

  // ---- AI Validation Rule Synthesizer ----
  app.post('/api/ai/rules/generate', requireRole(['operator']), async (req, res) => {
    try {
      const { description } = req.body
      if (!description) return res.status(400).json({ success: false, error: 'Rule description required' })
      
      const descLower = description.toLowerCase()
      let field = 'interest_rate'
      let operator = 'lessThanOrEqual'
      let value = 10.0
      let errorMessage = 'Generated Rule Violation'
      let severity = 'medium'

      // Smart simulation for AI translation
      if (descLower.includes('state') || descLower.includes('ny')) {
        field = 'property_state'
        operator = 'in'
        value = ['NY', 'CA', 'TX']
        errorMessage = 'Invalid state location based on generated policy'
        severity = 'high'
      } else if (descLower.includes('balance') || descLower.includes('principal')) {
        field = 'current_balance'
        operator = 'lessThanOrEqual'
        value = 'original_principal'
        errorMessage = 'Balance discrepancy detected'
        severity = 'critical'
      } else if (descLower.includes('interest') || descLower.includes('rate')) {
        field = 'interest_rate'
        operator = 'lessThan'
        value = 15.0
        errorMessage = 'Interest rate exceeds policy limits'
        severity = 'high'
      } else {
        field = 'loan_status'
        operator = 'equals'
        value = 'Active'
      }

      const generatedRule = {
        id: `POL-AI-${Math.floor(Math.random() * 1000)}`,
        name: description.substring(0, 40) + (description.length > 40 ? '...' : ''),
        severity,
        eval: `(record) => record.${field} !== undefined`, // Placeholder for UI
        field,
        operator,
        value,
        errorMessage
      }

      // We could add this to our in-memory VALIDATION_RULES here, but for safety in the demo, we just return it to the frontend to review and "Activate".

      res.json({
        success: true,
        data: {
          rule: generatedRule,
          explanation: `The Copilot interpreted your request and mapped "${description}" to field "${field}" using operator "${operator}" against value "${Array.isArray(value) ? value.join(', ') : value}".`,
          model: 'LoanGuard-AI Rule Synthesizer v1.0',
          testCode: `test('should flag when ${field} fails condition', () => { ... })`
        }
      })
    } catch (e) {
      res.status(500).json({ success: false, error: e.message })
    }
  })

  // ---- AI Batch Summary API ----
  app.post('/api/ai/batch-summary', requireRole(['reviewer', 'operator', 'consumer']), async (req, res) => {
    try {
      const db = await getDb()
      const openExceptions = await db.all(`
        SELECT e.rule_id, e.rule_name, e.severity, e.field, count(*) as count 
        FROM exceptions e 
        WHERE e.status = 'open' 
        GROUP BY e.rule_id, e.severity
        ORDER BY count DESC
      `)

      const totalOpen = openExceptions.reduce((acc, curr) => acc + curr.count, 0)
      
      let summaryText = `Identified ${totalOpen} active exceptions across the current loan portfolio. `
      if (openExceptions.length > 0) {
        const topIssue = openExceptions[0]
        summaryText += `Primary cluster: ${topIssue.rule_name} (${topIssue.count} occurrences, severity: ${topIssue.severity}). `
      }
      summaryText += `Recommended remediation: Batch-approve formatting anomalies (state uppercase, decimal corrections) and escalate cross-source balance discrepancies to servicer verification teams.`

      res.json({
        success: true,
        data: {
          total_exceptions: totalOpen,
          cluster_breakdown: openExceptions,
          ai_summary: summaryText,
          suggested_batch_action: 'Batch-approve low/medium formatting exceptions first; manually inspect critical negative balances.'
        }
      })
    } catch (e) {
      res.status(500).json({ success: false, error: e.message })
    }
  })

  // ---- AI Cross-Source Conflict Reconciliation ----
  app.post('/api/ai/compare-conflicts', requireRole(['reviewer', 'operator', 'consumer']), async (req, res) => {
    try {
      const { loan_id, baseline_record, secondary_record } = req.body
      const db = await getDb()
      let primary = baseline_record
      let secondary = secondary_record

      if (loan_id && (!primary || !secondary)) {
        primary = await db.get(`SELECT * FROM loans WHERE loan_id = ? OR id = ?`, [loan_id, loan_id])
      }

      if (!primary && !secondary) {
        return res.status(400).json({ success: false, error: 'loan_id or baseline/secondary records required' })
      }

      const discrepancies = []
      const p = primary || {}
      const s = secondary || {}

      if (p.current_balance !== undefined && s.current_balance !== undefined && Number(p.current_balance) !== Number(s.current_balance)) {
        const delta = Math.abs(Number(p.current_balance) - Number(s.current_balance))
        discrepancies.push({
          field: 'current_balance',
          baseline_value: p.current_balance,
          secondary_value: s.current_balance,
          delta_amount: delta,
          risk_level: delta > 10000 ? 'CRITICAL' : 'HIGH',
          analysis: `Discrepancy of $${delta.toLocaleString()} detected between baseline loan record and servicer update tape.`
        })
      }

      if (p.payment_status && s.payment_status && p.payment_status.toLowerCase() !== s.payment_status.toLowerCase()) {
        discrepancies.push({
          field: 'payment_status',
          baseline_value: p.payment_status,
          secondary_value: s.payment_status,
          risk_level: 'HIGH',
          analysis: `Status conflict: Baseline reports "${p.payment_status}" while secondary servicer reports "${s.payment_status}".`
        })
      }

      if (p.interest_rate !== undefined && s.interest_rate !== undefined && Number(p.interest_rate) !== Number(s.interest_rate)) {
        discrepancies.push({
          field: 'interest_rate',
          baseline_value: p.interest_rate,
          secondary_value: s.interest_rate,
          risk_level: 'MEDIUM',
          analysis: `Interest rate mismatch: ${p.interest_rate}% vs ${s.interest_rate}%.`
        })
      }

      const recommendation = discrepancies.length === 0 
        ? 'Records are in mathematical harmony. No conflict detected.'
        : `Accept secondary servicer current balance if verified against month-end cutoff remittance report. Escalate payment status discrepancy to servicer reconciliation desk.`

      res.json({
        success: true,
        data: {
          loan_id: loan_id || p.loan_id || s.loan_id || 'UNKNOWN',
          has_conflicts: discrepancies.length > 0,
          conflict_count: discrepancies.length,
          discrepancies,
          confidence: discrepancies.length > 0 ? 0.92 : 1.0,
          recommendation,
          recommended_source: (s.last_updated_at && (!p.last_updated_at || s.last_updated_at > p.last_updated_at)) ? 'secondary_servicer' : 'primary_baseline',
          timestamp: new Date().toISOString()
        }
      })
    } catch (e) {
      res.status(500).json({ success: false, error: e.message })
    }
  })

  // ---- AI Severity Classification Engine ----
  app.post('/api/ai/classify-severity', requireRole(['reviewer', 'operator', 'consumer']), async (req, res) => {
    try {
      const { field, rule_id, current_value, principal_balance = 100000 } = req.body
      let severity = 'MEDIUM'
      let riskScore = 50
      let rationale = 'Standard compliance validation issue.'

      if (field === 'principal_balance' && Number(current_value) < 0) {
        severity = 'CRITICAL'
        riskScore = 98
        rationale = 'Negative principal creates immediate financial loss exposure and renders loan ineligible for securitization pool.'
      } else if (field === 'interest_rate' && (Number(current_value) < 0 || Number(current_value) > 25)) {
        severity = 'CRITICAL'
        riskScore = 92
        rationale = 'Usurious or negative interest violates federal regulatory compliance (TILA / CFPB lending thresholds).'
      } else if (field === 'borrower_name' && (!current_value || current_value.trim() === '')) {
        severity = 'HIGH'
        riskScore = 80
        rationale = 'Missing borrower identity prevents title perfection and credit bureau tracking.'
      } else if (field === 'maturity_date') {
        severity = 'MEDIUM'
        riskScore = 60
        rationale = 'Maturity date precedes origination date; indicates date formatting or term calculation transposition.'
      } else if (field === 'property_state') {
        severity = 'LOW'
        riskScore = 20
        rationale = 'Formatting defect (non-standard state code); safe for automated batch normalization without collateral risk.'
      }

      res.json({
        success: true,
        data: {
          field,
          rule_id: rule_id || 'POL-CUSTOM',
          classified_severity: severity,
          risk_score: riskScore,
          financial_exposure_estimate: severity === 'CRITICAL' ? principal_balance : 0,
          rationale,
          auto_remediable: severity === 'LOW',
          timestamp: new Date().toISOString()
        }
      })
    } catch (e) {
      res.status(500).json({ success: false, error: e.message })
    }
  })

  // ---- AI Plain-Language Rule Generator ----
  app.post('/api/ai/generate-rule', requireRole(['reviewer', 'operator']), async (req, res) => {
    try {
      const { prompt } = req.body
      if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({ success: false, error: 'prompt is required' })
      }

      const lower = prompt.toLowerCase()
      let ruleKind = 'custom_boundary'
      let ruleId = `POL-AI-${Date.now().toString(36).toUpperCase()}`
      let severity = 'high'
      let params = {}

      if (lower.includes('interest') && (lower.includes('max') || lower.includes('greater') || lower.includes('cap') || lower.includes('exceed') || lower.includes('above') || lower.includes('over'))) {
        ruleKind = 'max_interest_rate'
        const match = lower.match(/\d+(\.\d+)?/)
        const rate = match ? parseFloat(match[0]) : 20.0
        params = { max_rate: rate }
        ruleId = 'POL-RATE-CAP'
      } else if (lower.includes('balance') && (lower.includes('negative') || lower.includes('zero'))) {
        ruleKind = 'positive_principal_balance'
        params = { min_balance: 0.01 }
        severity = 'critical'
        ruleId = 'POL-BAL-POS'
      } else if (lower.includes('state') || lower.includes('postal')) {
        ruleKind = 'usps_state_code'
        params = { format: '^[A-Z]{2}$' }
        severity = 'low'
        ruleId = 'POL-STATE-CODE'
      } else if (lower.includes('dpd') || lower.includes('days past due')) {
        ruleKind = 'delinquency_threshold'
        const match = lower.match(/\d+/)
        params = { max_dpd: match ? parseInt(match[0]) : 90 }
        ruleId = 'POL-DPD-LIMIT'
      }

      const generatedRule = {
        id: ruleId,
        name: prompt.slice(0, 50),
        kind: ruleKind,
        description: `Auto-generated compliance boundary from: "${prompt}"`,
        severity,
        appliesTo: ['ingest_loan_record', 'update_loan_record'],
        params,
        onViolation: 'escalate',
        generated_at: new Date().toISOString()
      }

      res.json({
        success: true,
        data: {
          rule: generatedRule,
          confidence: 0.94,
          yaml_definition: `id: ${generatedRule.id}\nname: "${generatedRule.name}"\nseverity: ${generatedRule.severity}\nkind: ${generatedRule.kind}\nparams:\n${Object.entries(params).map(([k,v]) => `  ${k}: ${v}`).join('\n')}`,
          message: 'Rule successfully compiled and ready for governance review.'
        }
      })
    } catch (e) {
      res.status(500).json({ success: false, error: e.message })
    }
  })

  // ---- Batch Exception Resolution ----
  app.post('/api/exceptions/batch-resolve', requireRole(['reviewer']), async (req, res) => {
    try {
      const { exception_ids, action = 'resolve', note = 'Batch resolved by reviewer' } = req.body
      if (!Array.isArray(exception_ids) || exception_ids.length === 0) {
        return res.status(400).json({ success: false, error: 'exception_ids must be a non-empty array' })
      }

      const db = await getDb()
      const sanitizedNote = DOMPurify.sanitize(note)
      let resolvedCount = 0

      for (const id of exception_ids) {
        const exc = await db.get(`SELECT * FROM exceptions WHERE id = ? AND status = 'open'`, [id])
        if (!exc) continue

        await db.run(`
          UPDATE exceptions 
          SET status = 'resolved', resolved_at = CURRENT_TIMESTAMP, resolved_by = ?, resolution_note = ?
          WHERE id = ?
        `, [req.user.name, sanitizedNote, id])

        // Check if all exceptions for this loan are now resolved
        const remaining = await db.get(`SELECT count(*) as count FROM exceptions WHERE loan_id = ? AND status = 'open'`, [exc.loan_id])
        if (remaining.count === 0) {
          const loanRecord = await db.get(`SELECT * FROM loans WHERE id = ?`, [exc.loan_id])
          if (loanRecord) {
            const canonicalString = `${loanRecord.loan_id}|${loanRecord.borrower_name}|${loanRecord.principal_balance}|${loanRecord.interest_rate}|${loanRecord.origination_date}|${loanRecord.maturity_date}`
            const recordHash = crypto.createHash('sha256').update(canonicalString).digest('hex')
            await db.run(`
              UPDATE loans 
              SET validation_status = 'valid', is_verified = 1, verified_at = CURRENT_TIMESTAMP, 
                  verified_by = ?, reviewer_decision = 'batch_approved', verified_hash = ?
              WHERE id = ?
            `, [req.user.name, recordHash, exc.loan_id])
          }
        }

        await audit.append({
          agentId: 'human-reviewer',
          actionType: 'batch_exception_resolution',
          loanId: exc.loan_id,
          policyId: exc.rule_id,
          rule: exc.rule_name,
          decision: 'allow',
          escalated: false,
          reason: `Batch resolution (${action}): ${sanitizedNote}`,
          authorizer: 'human',
          ts: new Date().toISOString()
        })

        resolvedCount++
      }

      res.json({ success: true, count: resolvedCount, message: `Successfully resolved ${resolvedCount} exceptions in batch.` })
    } catch (e) {
      res.status(500).json({ success: false, error: e.message })
    }
  })

  // ---- Exception Resolution ----
  app.patch('/api/exceptions/:id', requireRole(['reviewer']), async (req, res) => {
    try {
      const { action, note, corrected_value } = req.body
      if (!['resolve', 'reject', 'override', 'request_correction'].includes(action)) {
        return res.status(400).json({ success: false, error: 'Invalid action' })
      }

      // XSS Protection: Sanitize the raw HTML note payload before database storage
      const sanitizedNote = note ? DOMPurify.sanitize(note) : ''

      const db = await getDb()
      const exc = await db.get(`SELECT * FROM exceptions WHERE id = ?`, [req.params.id])
      if (!exc) return res.status(404).json({ success: false, error: 'Exception not found' })
      if (exc.status !== 'open') return res.status(400).json({ success: false, error: 'Exception is already resolved' })

      const updateRes = await db.run(`
        UPDATE exceptions 
        SET status = 'resolved', resolved_at = CURRENT_TIMESTAMP, resolved_by = ?, resolution_note = ?
        WHERE id = ? AND status = 'open'
      `, [req.user.name, sanitizedNote, req.params.id])

      if (updateRes.changes === 0) {
        return res.status(400).json({ success: false, error: 'Exception is already resolved or being modified concurrently' })
      }

      // If resolving and a corrected value is provided, update the loan record
      if (action === 'resolve' && corrected_value !== undefined) {
        // Whitelist field to prevent SQL injection
        const allowedFields = ['loan_id', 'borrower_id', 'borrower_name', 'property_state', 'principal_balance', 'original_principal', 'current_balance', 'interest_rate', 'origination_date', 'maturity_date', 'term_months', 'loan_purpose', 'payment_status', 'days_past_due', 'document_status', 'loan_status', 'last_updated_at', 'source_system']
        if (allowedFields.includes(exc.field)) {
          await db.run(`UPDATE loans SET ${exc.field} = ?, reviewer_decision = ?, ai_recommendation = ? WHERE id = ?`, 
            [corrected_value, action, exc.ai_explanation || null, exc.loan_id])
        }
      } else {
        await db.run(`UPDATE loans SET reviewer_decision = ? WHERE id = ?`, [action, exc.loan_id])
      }

      // Record to audit log
      await audit.append({
        agentId: 'human-reviewer',
        actionType: 'exception_resolution',
        loanId: exc.loan_id,
        policyId: exc.rule_id,
        rule: 'human_override',
        decision: action === 'resolve' ? 'allow' : 'deny',
        escalated: false,
        reason: note || `Exception ${action}d manually`,
        authorizer: 'Reviewer',
        ts: new Date().toISOString(),
        details: action === 'resolve' && corrected_value !== undefined ? JSON.stringify({ field: exc.field, oldValue: exc.current_value, newValue: corrected_value }) : null
      })

      // Check if loan is now fully verified (no open exceptions)
      const openExc = await db.get(`SELECT COUNT(*) as count FROM exceptions WHERE loan_id = ? AND status = 'open'`, [exc.loan_id])
      if (openExc.count === 0) {
        // Hash it using full record content
        const loanData = await db.get(`SELECT * FROM loans WHERE id = ?`, [exc.loan_id])
        const crypto = await import('node:crypto')
        const hashPayload = JSON.stringify({
          loan_id: loanData.loan_id,
          borrower_name: loanData.borrower_name,
          principal_balance: loanData.principal_balance,
          interest_rate: loanData.interest_rate,
          origination_date: loanData.origination_date,
          maturity_date: loanData.maturity_date,
          verified_by: req.user.name,
          timestamp: Date.now()
        })
        const hash = crypto.createHash('sha256').update(hashPayload).digest('hex')
        await db.run(`UPDATE loans SET validation_status = 'verified', is_verified = 1, verified_at = CURRENT_TIMESTAMP, verified_hash = ?, verified_by = ? WHERE id = ?`, [hash, req.user.name, exc.loan_id])
        
        await audit.append({
          agentId: 'system',
          actionType: 'record_verified',
          loanId: exc.loan_id,
          policyId: 'POL-VERIFY',
          rule: 'verification',
          decision: 'allow',
          escalated: false,
          reason: `Record fully verified. Hash: ${hash}`,
          authorizer: 'system',
          ts: new Date().toISOString()
        })
      }

      res.json({ success: true })
    } catch (e) {
      res.status(500).json({ success: false, error: e.message })
    }
  })
}
