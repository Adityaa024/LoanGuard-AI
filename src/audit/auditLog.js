// Append-only, hash-chained audit log with SQLite persistence.
import crypto from 'node:crypto'
import { getDb } from '../db/index.js'

function sha256(s) {
  return crypto.createHash('sha256').update(s).digest('hex')
}

function canonical(obj) {
  const keys = Object.keys(obj).sort()
  return JSON.stringify(obj, keys)
}

const GENESIS = '0'.repeat(64)

export class AuditLog {
  #entries = []

  append(fields) {
    const required = ['agentId', 'policyId', 'decision', 'authorizer', 'ts']
    for (const k of required) {
      if (fields[k] === undefined || fields[k] === null) {
        throw new Error(`audit.append: missing required field "${k}"`)
      }
    }

    const seq = this.#entries.length + 1
    const prevHash = this.#entries.length ? this.#entries[this.#entries.length - 1].hash : GENESIS

    const body = {
      seq,
      agentId: fields.agentId,
      actionType: fields.actionType ?? null,
      loanId: fields.loanId ?? null,
      policyId: fields.policyId,
      rule: fields.rule ?? null,
      decision: fields.decision,
      escalated: !!fields.escalated,
      amount: fields.amount ?? null,
      reason: fields.reason ?? null,
      authorizer: fields.authorizer,
      ts: fields.ts,
      prevHash,
    }
    body.id = sha256(canonical(body)).slice(0, 16)
    body.hash = sha256(prevHash + canonical(body))

    const frozen = Object.freeze({ ...body })
    this.#entries.push(frozen)
    
    // Async save to SQLite without blocking
    import('../db/index.js').then(({ getDb }) => {
      getDb().then(db => {
        db.run(`
          INSERT INTO audit_logs (id, seq, agentId, actionType, loanId, policyId, rule, decision, escalated, amount, reason, authorizer, ts, prevHash, hash, details)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          body.id, body.seq, body.agentId, body.actionType, body.loanId, body.policyId, body.rule, 
          body.decision, body.escalated, body.amount, body.reason, body.authorizer, body.ts, body.prevHash, body.hash,
          fields.details ? JSON.stringify(fields.details) : null
        ]).catch(console.error)
      }).catch(console.error)
    }).catch(console.error)

    return frozen
  }

  async list({ limit = null, sinceSeq = 0 } = {}) {
    const db = await getDb()
    let query = `SELECT * FROM audit_logs WHERE seq > ? ORDER BY seq ASC`
    const params = [sinceSeq]
    
    if (limit) {
      // For limit, we want the LAST N records.
      query = `
        SELECT * FROM (
          SELECT * FROM audit_logs WHERE seq > ? ORDER BY seq DESC LIMIT ?
        ) ORDER BY seq ASC
      `
      params.push(limit)
    }
    
    const rows = await db.all(query, params)
    return rows.map(r => {
      if (r.details) r.details = JSON.parse(r.details)
      return Object.freeze(r)
    })
  }

  async get(seq) {
    const db = await getDb()
    const row = await db.get(`SELECT * FROM audit_logs WHERE seq = ?`, [seq])
    if (row && row.details) row.details = JSON.parse(row.details)
    return row ? Object.freeze(row) : null
  }

  async size() {
    const db = await getDb()
    const row = await db.get(`SELECT COUNT(*) as count FROM audit_logs`)
    return row.count
  }

  mutate() { throw new Error('append-only: audit entries are immutable') }
  remove() { throw new Error('append-only: audit entries cannot be deleted') }
  delete() { throw new Error('append-only: audit entries cannot be deleted') }

  async verify() {
    const db = await getDb()
    const rows = await db.all(`SELECT * FROM audit_logs ORDER BY seq ASC`)
    let prevHash = GENESIS
    
    for (let i = 0; i < rows.length; i++) {
      const e = rows[i]
      if (e.prevHash !== prevHash) {
        return { valid: false, brokenAt: e.seq, reason: 'prevHash mismatch' }
      }
      
      const body = {
        seq: e.seq,
        agentId: e.agentId,
        actionType: e.actionType,
        loanId: e.loanId,
        policyId: e.policyId,
        rule: e.rule,
        decision: e.decision,
        escalated: !!e.escalated,
        amount: e.amount,
        reason: e.reason,
        authorizer: e.authorizer,
        ts: e.ts,
        prevHash: e.prevHash
      }
      body.id = sha256(canonical(body)).slice(0, 16)
      const recomputed = sha256(prevHash + canonical(body))
      
      if (recomputed !== e.hash) {
        return { valid: false, brokenAt: e.seq, reason: 'hash mismatch (entry altered)' }
      }
      prevHash = e.hash
    }
    return { valid: true, length: rows.length, head: prevHash }
  }
}
