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

    const prevSeq = this.#entries.length ? this.#entries[this.#entries.length - 1].seq : 0
    const prevHash = this.#entries.length ? this.#entries[this.#entries.length - 1].hash : GENESIS
    const seq = prevSeq + 1

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

    // Sync save to SQLite in background
    getDb().then(db => {
      db.run(`
        INSERT INTO audit_logs (id, seq, agentId, actionType, loanId, policyId, rule, decision, escalated, amount, reason, authorizer, ts, prevHash, hash, details)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        body.id, body.seq, body.agentId, body.actionType, body.loanId, body.policyId, body.rule, 
        body.decision, body.escalated ? 1 : 0, body.amount, body.reason, body.authorizer, body.ts, body.prevHash, body.hash,
        fields.details ? JSON.stringify(fields.details) : null
      ]).catch(() => {})
    }).catch(() => {})

    return frozen
  }

  async list({ limit = null, sinceSeq = 0 } = {}) {
    if (this.#entries.length > 0) {
      let filtered = this.#entries.filter(e => e.seq > sinceSeq)
      if (limit) filtered = filtered.slice(-limit)
      return filtered
    }
    const db = await getDb()
    let query = `SELECT * FROM audit_logs WHERE seq > ? ORDER BY seq ASC`
    const params = [sinceSeq]
    
    if (limit) {
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
    if (this.#entries.length > 0) {
      return this.#entries.find(e => e.seq === seq) || null
    }
    const db = await getDb()
    const row = await db.get(`SELECT * FROM audit_logs WHERE seq = ?`, [seq])
    if (row && row.details) row.details = JSON.parse(row.details)
    return row ? Object.freeze(row) : null
  }

  async size() {
    if (this.#entries.length > 0) {
      return this.#entries.length
    }
    const db = await getDb()
    const row = await db.get(`SELECT COUNT(*) as count FROM audit_logs`)
    return row.count
  }

  mutate() { throw new Error('append-only: audit entries are immutable') }
  remove() { throw new Error('append-only: audit entries cannot be deleted') }
  delete() { throw new Error('append-only: audit entries cannot be deleted') }

  async verify() {
    const list = this.#entries.length ? this.#entries : (await this.list())
    let prevHash = GENESIS
    
    for (let i = 0; i < list.length; i++) {
      const e = list[i]
      if (e.prevHash !== prevHash) {
        return { valid: false, brokenAt: e.seq, reason: 'prevHash mismatch' }
      }
      
      const body = {
        seq: e.seq,
        agentId: e.agentId,
        actionType: e.actionType ?? null,
        loanId: e.loanId ?? null,
        policyId: e.policyId,
        rule: e.rule ?? null,
        decision: e.decision,
        escalated: !!e.escalated,
        amount: e.amount ?? null,
        reason: e.reason ?? null,
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
    return { valid: true, length: list.length, head: prevHash }
  }
}
