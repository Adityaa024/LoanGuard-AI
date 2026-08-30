import path from 'node:path'
import fs from 'node:fs'
import crypto from 'node:crypto'
import multer from 'multer'
import jwt from 'jsonwebtoken'
import { JSDOM } from 'jsdom'
import createDOMPurify from 'dompurify'
import { buildSystem } from './system.js'
import { parse } from 'csv-parse/sync'
import { getDb } from './db/index.js'

const window = new JSDOM('').window
const DOMPurify = createDOMPurify(window)

const JWT_SECRET = process.env.JWT_SECRET || 'hive-super-secret-key-for-demo'

// Read users from data directory
const USERS = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', 'users.json'), 'utf8'))

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
  const { orchestrator, guard, audit, events, ledger } = sys

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
      const records = parse(req.file.buffer, { columns: true, skip_empty_lines: true })
      
      const db = await getDb()
      const batchId = `batch_${Date.now()}`
      await db.run(`INSERT INTO upload_batches (id, filename, uploaded_by) VALUES (?, ?, ?)`, [batchId, req.file.originalname, 'System Uploader'])
      
      let validCount = 0
      let exceptionCount = 0

      // Pre-load all existing loan_ids into a Set (1 query instead of N) to avoid N+1 problem
      const existingRows = await db.all(`SELECT loan_id FROM loans`)
      const existingLoanIds = new Set(existingRows.map(r => r.loan_id))
      // Also track loan_ids seen within this batch (for intra-file duplicates)
      const batchSeenIds = new Set()

      await db.run('BEGIN TRANSACTION')
      try {
        for (const row of records) {
          // Parse raw CSV strings to appropriate types
          const rawLoanId = (row.loan_id || row.LoanID || '').trim()
          const record = {
            loan_id: rawLoanId || `MISSING-${crypto.randomUUID().slice(0,8)}`,
            borrower_name: row.borrower_name || row.BorrowerName || '',
            property_state: row.property_state || row.PropertyState || '',
            principal_balance: parseFloat(row.principal_balance || row.PrincipalBalance || 0),
            interest_rate: parseFloat(row.interest_rate || row.InterestRate || 0),
            origination_date: row.origination_date || row.OriginationDate || '',
            maturity_date: row.maturity_date || row.MaturityDate || '',
          }

          const internalId = 'ln_' + crypto.randomUUID()

          // Cross-upload AND intra-file duplicate detection using in-memory Set (O(1))
          const isDuplicate = existingLoanIds.has(record.loan_id) || batchSeenIds.has(record.loan_id)
          batchSeenIds.add(record.loan_id)

          if (isDuplicate) {
            // Force escalate as duplicate
            exceptionCount++
            await db.run(`
              INSERT INTO loans (id, upload_batch_id, loan_id, borrower_name, property_state, principal_balance, interest_rate, origination_date, maturity_date, validation_status)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              internalId, batchId, record.loan_id, record.borrower_name, record.property_state, record.principal_balance, record.interest_rate, record.origination_date, record.maturity_date,
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

          // Validate via Warden
          const action = { type: 'ingest_loan_record', agentId: 'system-uploader', loanId: internalId, record }
          const { decision } = await orchestrator.dispatch(action)

          const isException = decision.decision === 'escalate' || decision.decision === 'deny'
          if (isException) exceptionCount++
          else validCount++

          // Save to DB
          await db.run(`
            INSERT INTO loans (id, upload_batch_id, loan_id, borrower_name, property_state, principal_balance, interest_rate, origination_date, maturity_date, validation_status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            internalId, batchId, record.loan_id, record.borrower_name, record.property_state, record.principal_balance, record.interest_rate, record.origination_date, record.maturity_date,
            isException ? 'has_exceptions' : 'valid'
          ])

          if (isException && decision.checks) {
            for (const check of decision.checks) {
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

  // ---- Summary API ----
  app.get('/api/summary', async (req, res) => {
    try {
      const db = await getDb()
      const totalLoans = (await db.get(`SELECT COUNT(*) as count FROM loans`)).count
      const validLoans = (await db.get(`SELECT COUNT(*) as count FROM loans WHERE validation_status = 'valid'`)).count
      const exceptionLoans = (await db.get(`SELECT COUNT(*) as count FROM loans WHERE validation_status = 'has_exceptions'`)).count
      const verifiedLoans = (await db.get(`SELECT COUNT(*) as count FROM loans WHERE validation_status = 'verified'`)).count
      const totalExceptions = (await db.get(`SELECT COUNT(*) as count FROM exceptions`)).count
      const openExceptions = (await db.get(`SELECT COUNT(*) as count FROM exceptions WHERE status = 'open'`)).count
      const uploadsCount = (await db.get(`SELECT COUNT(*) as count FROM upload_batches`)).count
      
      // Real severity breakdown from DB
      const criticalExceptions = (await db.get(`SELECT COUNT(*) as count FROM exceptions WHERE status = 'open' AND severity = 'critical'`)).count
      const highExceptions = (await db.get(`SELECT COUNT(*) as count FROM exceptions WHERE status = 'open' AND severity = 'high'`)).count
      const mediumExceptions = (await db.get(`SELECT COUNT(*) as count FROM exceptions WHERE status = 'open' AND severity = 'medium'`)).count
      const lowExceptions = (await db.get(`SELECT COUNT(*) as count FROM exceptions WHERE status = 'open' AND severity = 'low'`)).count
      
      const data_quality_score = totalLoans > 0 ? Math.round(((validLoans + verifiedLoans) / totalLoans) * 100) : 100
      
      res.json({ success: true, data: { total_loans: totalLoans, valid_loans: validLoans, exception_loans: exceptionLoans, verified_loans: verifiedLoans, total_exceptions: totalExceptions, open_exceptions: openExceptions, resolved_exceptions: totalExceptions - openExceptions, uploads_count: uploadsCount, data_quality_score, critical_exceptions: criticalExceptions, high_exceptions: highExceptions, medium_exceptions: mediumExceptions, low_exceptions: lowExceptions } })
    } catch (e) {
      res.status(500).json({ success: false, error: e.message })
    }
  })

  app.get('/api/uploads', async (req, res) => {
    try {
      const db = await getDb()
      const batches = await db.all(`
        SELECT u.*, 
               (SELECT COUNT(*) FROM loans WHERE upload_batch_id = u.id) as total_records,
               (SELECT COUNT(*) FROM loans WHERE upload_batch_id = u.id AND validation_status = 'has_exceptions') as exception_records
        FROM upload_batches u 
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
  app.get('/api/loans', handleGetLoans)
  app.get('/loans', handleGetLoans)

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
  app.get('/api/loans/:id', handleGetLoanById)
  app.get('/loans/:id', handleGetLoanById)

  const handleGetExceptions = async (req, res) => {
    const db = await getDb()
    const exc = await db.all(`SELECT e.*, l.loan_id as original_loan_id FROM exceptions e JOIN loans l ON e.loan_id = l.id WHERE e.status = 'open' ORDER BY e.id DESC`)
    res.json({ success: true, data: exc.map(e => ({...e, loan_id: e.original_loan_id})) })
  }
  app.get('/api/exceptions', handleGetExceptions)
  app.get('/exceptions', handleGetExceptions)

  const handleGetVerifiedLoans = async (req, res) => {
    const db = await getDb()
    const verified = await db.all(`SELECT * FROM loans WHERE validation_status = 'verified' ORDER BY verified_at DESC`)
    res.json({ success: true, data: verified })
  }
  app.get('/api/verified-loans', handleGetVerifiedLoans)
  app.get('/verified-loans', handleGetVerifiedLoans)

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
  app.get('/api/verified-loans/:id', handleGetVerifiedLoanById)
  app.get('/verified-loans/:id', handleGetVerifiedLoanById)

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
      res.set({ 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="verified_loans_export.csv"' })
      res.send(csv)
    } catch (e) {
      res.status(500).json({ success: false, error: e.message })
    }
  })

  const handleGetAuditForLoan = async (req, res) => {
    try {
      const entries = await audit.list()
      const loanEntries = entries.filter(e => e.loanId === req.params.loanId)
      res.json({ success: true, data: loanEntries })
    } catch (e) {
      res.status(500).json({ success: false, error: e.message })
    }
  }
  app.get('/api/audit/:loanId', handleGetAuditForLoan)
  app.get('/api/audit/loan/:loanId', handleGetAuditForLoan)
  app.get('/audit/:loanId', handleGetAuditForLoan)

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
        default:
          explanation = `An unknown exception occurred: ${exc.description}.`
          recommendation = `Manual review required.`
      }

      // Record AI intervention in Audit Log
      audit.append({
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

      res.json({ 
        success: true, 
        data: { 
          explanation, 
          suggested_value: suggestedValue, 
          confidence, 
          severity_assessment: severityAssessment, 
          recommendation 
        } 
      })
    } catch (e) {
      res.status(500).json({ success: false, error: e.message })
    }
  })

  // ---- Exception Resolution ----
  app.patch('/api/exceptions/:id', requireRole(['reviewer']), async (req, res) => {
    try {
      const { action, note, corrected_value } = req.body
      if (!['resolve', 'reject', 'override'].includes(action)) {
        return res.status(400).json({ success: false, error: 'Invalid action' })
      }

      // XSS Protection: Sanitize the raw HTML note payload before database storage
      const sanitizedNote = note ? DOMPurify.sanitize(note) : ''

      const db = await getDb()
      const exc = await db.get(`SELECT * FROM exceptions WHERE id = ?`, [req.params.id])
      if (!exc) return res.status(404).json({ success: false, error: 'Exception not found' })

      await db.run(`
        UPDATE exceptions 
        SET status = 'resolved', resolved_at = CURRENT_TIMESTAMP, resolved_by = ?, resolution_note = ?
        WHERE id = ?
      `, [req.user.name, sanitizedNote, req.params.id])

      // If resolving and a corrected value is provided, update the loan record
      if (action === 'resolve' && corrected_value !== undefined) {
        await db.run(`UPDATE loans SET ${exc.field} = ? WHERE id = ?`, [corrected_value, exc.loan_id])
      }

      // Record to audit log
      audit.append({
        agentId: 'human-reviewer',
        actionType: 'exception_resolution',
        loanId: exc.loan_id,
        policyId: exc.rule_id,
        rule: 'human_override',
        decision: action === 'resolve' ? 'allow' : 'deny',
        escalated: false,
        reason: note || `Exception ${action}d manually`,
        authorizer: 'Reviewer',
        ts: new Date().toISOString()
      })

      // Check if loan is now fully verified (no open exceptions)
      const openExc = await db.get(`SELECT COUNT(*) as count FROM exceptions WHERE loan_id = ? AND status = 'open'`, [exc.loan_id])
      if (openExc.count === 0) {
        // Hash it
        const crypto = await import('node:crypto')
        const hash = crypto.createHash('sha256').update(exc.loan_id + Date.now()).digest('hex')
        await db.run(`UPDATE loans SET validation_status = 'verified', is_verified = 1, verified_at = CURRENT_TIMESTAMP, verified_hash = ? WHERE id = ?`, [hash, exc.loan_id])
        
        audit.append({
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
