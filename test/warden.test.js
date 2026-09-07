// Warden core tests — RUBRIC rules 2,3,4,5,6,7,8,9,10,11,12 at the engine/guard/audit level.
// (Rules 1, 13, 14 are exercised by orchestrator + HTTP tests.)

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { LocalPolicyEngine } from '../src/guard/localPolicyEngine.js'
import { Guard, DECISION } from '../src/guard/guard.js'
import { AuditLog } from '../src/audit/auditLog.js'
import { EventBus } from '../src/events/bus.js'
import { KillSwitch, Ledger } from '../src/state/stores.js'

function makeGuard({ ledger } = {}) {
  const backend = new LocalPolicyEngine()
  const audit = new AuditLog()
  const events = new EventBus()
  const killSwitch = new KillSwitch()
  const led = ledger || new Ledger([
    { loanId: 'LN-T1', accountId: '400000009999', borrower: 'Test Borrower', minPayment: 100, balance: 1000, contactHistory: [] },
  ])
  const guard = new Guard({ backend, killSwitch, ledger: led, audit, events })
  return { guard, audit, events, killSwitch, ledger: led, backend }
}

// In-hours, in-window Date (Friday 12:00 in America/Mexico_City = 18:00Z).
const FRIDAY_NOON_MX = new Date('2026-06-12T18:00:00Z')

test('RUBRIC 2 — decisions are complete {allow|deny|escalate} with a policyId, and logged', async () => {
  const { guard, audit } = makeGuard()
  const d = await guard.authorize(
    { type: 'outreach', agentId: 'collector-01', loanId: 'LN-T1', text: 'Hola, recordatorio amable de pago.' },
    { now: FRIDAY_NOON_MX }
  )
  assert.ok([DECISION.ALLOW, DECISION.DENY, DECISION.ESCALATE].includes(d.decision))
  assert.ok(d.policyId, 'decision has a policyId')
  assert.equal(d.decision, DECISION.ALLOW)
  assert.equal(audit.size(), 1, 'decision was logged')
})

test('RUBRIC 3 — kill-switch halts all actions immediately', async () => {
  const { guard, killSwitch } = makeGuard()
  killSwitch.engage('test')
  const d = await guard.authorize(
    { type: 'risk_score', agentId: 'collector-01', loanId: 'LN-T1' },
    { now: FRIDAY_NOON_MX }
  )
  assert.equal(d.decision, DECISION.DENY)
  assert.equal(d.rule, 'kill_switch')
})

test('RUBRIC 4 — over-scope action is denied AND escalated', async () => {
  const { guard } = makeGuard()
  // collector-01 is junior, scopeLimit 5000. A 40k transfer is over scope.
  const d = await guard.authorize(
    { type: 'transfer', agentId: 'collector-01', loanId: 'LN-T1', amount: 40000 },
    { now: FRIDAY_NOON_MX }
  )
  assert.equal(d.decision, DECISION.DENY)
  assert.equal(d.escalated, true)
  assert.equal(d.policyId, 'POL-SCOPE-001')
})

test('RUBRIC 4 — within-scope transfer is allowed', async () => {
  const { guard } = makeGuard()
  const d = await guard.authorize(
    { type: 'transfer', agentId: 'servicer-02', loanId: 'LN-T1', amount: 40000 }, // lead, 100k scope
    { now: FRIDAY_NOON_MX }
  )
  assert.equal(d.decision, DECISION.ALLOW)
})

test('RUBRIC 5 — 3rd contact within 7 days is blocked', async () => {
  const now = FRIDAY_NOON_MX
  const recent = new Date(now.getTime() - 2 * 86400000).toISOString()
  const ledger = new Ledger([
    { loanId: 'LN-F', accountId: '400000001111', minPayment: 100, balance: 1000, contactHistory: [recent, recent] },
  ])
  const { guard } = makeGuard({ ledger })
  const d = await guard.authorize(
    { type: 'outreach', agentId: 'collector-01', loanId: 'LN-F', text: 'Recordatorio de pago.' },
    { now }
  )
  assert.equal(d.decision, DECISION.DENY)
  assert.equal(d.policyId, 'POL-FREQ-001')
})

test('RUBRIC 6 — off-hours / Sunday contact is blocked', async () => {
  const { guard } = makeGuard()
  // 05:00Z = 23:00 MX (Sat Jun 13) → off hours.
  const offHours = new Date('2026-06-14T05:00:00Z')
  const d1 = await guard.authorize(
    { type: 'outreach', agentId: 'collector-01', loanId: 'LN-T1', text: 'Hola.' },
    { now: offHours }
  )
  assert.equal(d1.decision, DECISION.DENY)
  assert.equal(d1.policyId, 'POL-HOURS-001')

  // Sunday noon MX (18:00Z Sun Jun 14) → weekday not allowed.
  const sunday = new Date('2026-06-14T18:00:00Z')
  const d2 = await guard.authorize(
    { type: 'outreach', agentId: 'collector-01', loanId: 'LN-T1', text: 'Hola.' },
    { now: sunday }
  )
  assert.equal(d2.decision, DECISION.DENY)
  assert.equal(d2.policyId, 'POL-HOURS-001')
})

test('RUBRIC 7 — banned language is blocked (accent/case-insensitive)', async () => {
  const { guard } = makeGuard()
  // "te vamos a embargar" with different case/accents.
  const d = await guard.authorize(
    { type: 'outreach', agentId: 'collector-01', loanId: 'LN-T1', text: 'Señor, TE VAMOS A EMBARGAR si no paga hoy.' },
    { now: FRIDAY_NOON_MX }
  )
  assert.equal(d.decision, DECISION.DENY)
  assert.equal(d.policyId, 'POL-LANG-001')
})

test('RUBRIC 8 — sensitive actions escalate; agent cannot self-approve', async () => {
  const { guard } = makeGuard()
  const d = await guard.authorize(
    { type: 'write_off', agentId: 'servicer-02', loanId: 'LN-T1', amount: 500 },
    { now: FRIDAY_NOON_MX }
  )
  assert.equal(d.decision, DECISION.ESCALATE)
  assert.equal(d.policyId, 'POL-GATE-001')

  // Self-approval attempt: approvedBy === agentId must NOT bypass the gate.
  const selfApproved = await guard.authorize(
    { type: 'write_off', agentId: 'servicer-02', loanId: 'LN-T1', amount: 500, approvedBy: 'servicer-02' },
    { now: FRIDAY_NOON_MX }
  )
  assert.equal(selfApproved.decision, DECISION.ESCALATE, 'self-approval is ignored')
})

test('RUBRIC 11 — data minimization: full identifier in outbound text is blocked', async () => {
  const { guard } = makeGuard()
  const d = await guard.authorize(
    {
      type: 'outreach',
      agentId: 'collector-01',
      loanId: 'LN-T1',
      identifier: '400000009999',
      text: 'Su cuenta 400000009999 tiene saldo pendiente.',
    },
    { now: FRIDAY_NOON_MX }
  )
  assert.equal(d.decision, DECISION.DENY)
  assert.equal(d.policyId, 'POL-PII-001')

  // Masked last-4 form is fine.
  const ok = await guard.authorize(
    { type: 'outreach', agentId: 'collector-01', loanId: 'LN-T1', identifier: '400000009999', text: 'Su cuenta ****9999 tiene saldo.' },
    { now: FRIDAY_NOON_MX }
  )
  assert.equal(ok.decision, DECISION.ALLOW)
})

test('RUBRIC 12 — document amount mismatch routes to exception (escalate), not posted', async () => {
  const { guard } = makeGuard()
  const d = await guard.authorize(
    { type: 'payment_post', agentId: 'servicer-01', loanId: 'LN-T1', amount: 250, extractedAmount: 250.0, ledgerExpected: 100.0 },
    { now: FRIDAY_NOON_MX }
  )
  assert.equal(d.decision, DECISION.ESCALATE)
  assert.equal(d.category, 'exception')
  assert.equal(d.policyId, 'POL-RECON-001')

  // Matching amount posts cleanly.
  const ok = await guard.authorize(
    { type: 'payment_post', agentId: 'servicer-01', loanId: 'LN-T1', amount: 100, extractedAmount: 100.0, ledgerExpected: 100.0 },
    { now: FRIDAY_NOON_MX }
  )
  assert.equal(ok.decision, DECISION.ALLOW)
})

test('RUBRIC 9 — every log entry has agentId, policyId, decision, authorizer, timestamp', async () => {
  const { guard, audit } = makeGuard()
  await guard.authorize({ type: 'risk_score', agentId: 'collector-03', loanId: 'LN-T1' }, { now: FRIDAY_NOON_MX })
  const [entry] = audit.list({ limit: 1 })
  for (const f of ['agentId', 'policyId', 'decision', 'authorizer', 'ts']) {
    assert.ok(entry[f] !== undefined && entry[f] !== null, `entry has ${f}`)
  }
  assert.equal(entry.authorizer, 'system')
})

test('RUBRIC 10 — audit log is append-only and tamper-evident', async () => {
  const { guard, audit } = makeGuard()
  await guard.authorize({ type: 'risk_score', agentId: 'collector-01', loanId: 'LN-T1' }, { now: FRIDAY_NOON_MX })
  await guard.authorize({ type: 'risk_score', agentId: 'collector-02', loanId: 'LN-T1' }, { now: FRIDAY_NOON_MX })

  // Mutation of a returned entry must throw (entries are frozen).
  const [entry] = audit.list({ limit: 1 })
  assert.throws(() => {
    entry.decision = 'allow'
  }, 'frozen entry cannot be mutated')

  // Explicit mutate/delete APIs must reject.
  assert.throws(() => audit.mutate(1, { decision: 'allow' }), /append-only/)
  assert.throws(() => audit.delete(1), /append-only/)
  assert.throws(() => audit.remove(1), /append-only/)

  // Chain verifies intact.
  const v = audit.verify()
  assert.equal(v.valid, true)
})
