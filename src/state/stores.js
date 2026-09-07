// In-memory state stores backing the engine and runtime.
// Synthetic, process-local; seeded on boot from data/.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA = path.resolve(__dirname, '..', '..', 'data')

// ---- Kill-switch: a global halt for all agent actions (RUBRIC 3) --------
export class KillSwitch {
  #engaged = false
  #at = null
  engage(reason = 'manual') {
    this.#engaged = true
    this.#at = new Date().toISOString()
    this.reason = reason
    return this.status()
  }
  reset() {
    this.#engaged = false
    this.#at = null
    this.reason = null
    return this.status()
  }
  get engaged() {
    return this.#engaged
  }
  status() {
    return { engaged: this.#engaged, at: this.#at, reason: this.reason ?? null }
  }
}

// ---- Ledger: the synthetic loan portfolio + per-loan contact history ----
export class Ledger {
  constructor(loans = []) {
    this.byId = new Map()
    for (const l of loans) {
      // defensive clone; ensure contactHistory array exists
      this.byId.set(l.loanId, { ...l, contactHistory: Array.isArray(l.contactHistory) ? [...l.contactHistory] : [] })
    }
    this.exceptions = [] // reconciliation mismatches routed here (RUBRIC 12)
    
    // Seed database asynchronously
    if (loans.length > 0) {
      this._syncToDb()
    }
  }

  async _syncToDb() {
    try {
      const { getDb } = await import('../db/index.js')
      const db = await getDb()
      const batchId = `batch_${Date.now()}`
      
      await db.run(`INSERT OR IGNORE INTO upload_batches (id, filename, uploaded_by) VALUES (?, ?, ?)`, 
        [batchId, 'seed_data.csv', 'system'])
        
      for (const [id, l] of this.byId.entries()) {
        await db.run(`
          INSERT OR IGNORE INTO loans (id, upload_batch_id, loan_id, borrower_name, principal_balance)
          VALUES (?, ?, ?, ?, ?)
        `, [id, batchId, l.loanId, l.borrowerName || 'Unknown', l.balance])
      }
    } catch (e) {
      console.error('Failed to sync ledger to db:', e)
    }
  }

  static fromSeed() {
    let loans = []
    try {
      loans = JSON.parse(fs.readFileSync(path.join(DATA, 'loans.json'), 'utf8'))
    } catch {
      loans = []
    }
    return new Ledger(loans)
  }

  get(loanId) {
    return this.byId.get(loanId) || null
  }

  count() {
    return this.byId.size
  }

  // Contacts within a rolling window (ms). Used by the frequency-cap rule.
  contactsWithin(loanId, windowMs, now) {
    const loan = this.get(loanId)
    if (!loan) return []
    const cutoff = now.getTime() - windowMs
    return loan.contactHistory.filter((ts) => new Date(ts).getTime() >= cutoff)
  }

  recordContact(loanId, ts) {
    const loan = this.get(loanId)
    if (loan) loan.contactHistory.push(ts)
  }

  recordException(entry) {
    this.exceptions.push(entry)
    
    // Async save
    import('../db/index.js').then(({ getDb }) => {
      getDb().then(db => {
        db.run(`
          INSERT INTO exceptions (id, loan_id, rule_id, rule_name, field, severity, description, current_value)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          'exc_' + Date.now() + Math.floor(Math.random()*1000), 
          entry.loanId || 'unknown',
          entry.ruleId || 'unknown',
          entry.ruleName || 'Unknown Rule',
          entry.field || 'unknown',
          entry.severity || 'medium',
          entry.description || 'Exception created',
          entry.currentValue || ''
        ]).catch(console.error)
      }).catch(console.error)
    }).catch(console.error)
  }

  // Apply a payment to a loan balance (only ever called after a governed allow).
  applyPayment(loanId, amount) {
    const loan = this.get(loanId)
    if (!loan) return null
    loan.balance = Math.round((loan.balance - amount) * 100) / 100
    
    // Async update
    import('../db/index.js').then(({ getDb }) => {
      getDb().then(db => {
        db.run(`UPDATE loans SET principal_balance = ? WHERE loan_id = ?`, [loan.balance, loanId]).catch(console.error)
      }).catch(console.error)
    }).catch(console.error)
    
    return loan.balance
  }
}
