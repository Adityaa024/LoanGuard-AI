// Multi-Agent Appeals — additive, isolated. Asserts the two-tier ruling, that an appeal NEVER
// auto-grants, that both hash-chained audit kinds are written, and the chain verifies throughout.
// Hermetic: forced offline (canned argument) and no authored overlay.

process.env.HIVE_OFFLINE = '1'
process.env.HIVE_NO_OVERLAY = '1'

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { buildSystem } from '../src/system.js'
import { fileAppeal } from '../src/engine/appeals.js'
import { DECISION, AUTHORIZER } from '../src/guard/policyTypes.js'

const FRIDAY_NOON_MX = new Date('2026-06-12T18:00:00Z') // in-hours, so contact_hours never interferes

function pickLoan(sys) {
  for (const l of sys.ledger.byId.values()) if (l.status === 'delinquent') return l
  return sys.ledger.byId.values().next().value
}

test('Appeals — IMMUTABLE rule (banned language) → UPHELD, no effect, both audit kinds, chain verifies', async () => {
  const sys = buildSystem()
  const loan = pickLoan(sys)
  const action = {
    type: 'outreach', agentId: 'collector-01', loanId: loan.loanId, channel: 'sms',
    identifier: loan.accountId, text: 'Si no paga hoy te vamos a embargar.',
  }
  const { decision } = await sys.orchestrator.dispatch(action, { now: FRIDAY_NOON_MX })
  assert.equal(decision.decision, DECISION.DENY)
  assert.equal(decision.rule, 'banned_language')

  const outboxBefore = sys.orchestrator.outbox.length
  const inboxBefore = sys.orchestrator.inbox.length

  const appeal = await fileAppeal(sys, { originalAction: action, originalDecision: decision, context: { now: FRIDAY_NOON_MX } })

  assert.equal(appeal.ruling, 'upheld', 'immutable policy → denial upheld')
  assert.equal(appeal.inboxId, null, 'never routed to human')
  assert.equal(sys.orchestrator.inbox.length, inboxBefore, 'no inbox item created')
  assert.equal(sys.orchestrator.outbox.length, outboxBefore, 'no outreach was sent (no effect ran)')

  const kinds = sys.audit.list().map((e) => e.actionType)
  assert.ok(kinds.includes('appeal.filed'), 'appeal.filed recorded')
  assert.ok(kinds.includes('appeal.ruling'), 'appeal.ruling recorded')
  assert.equal(sys.audit.verify().valid, true, 'hash chain verifies')
})

test('Appeals — DISCRETIONARY rule (frequency) → OVERTURNED → human inbox (not executed), then human approves', async () => {
  const sys = buildSystem()
  const loan = pickLoan(sys)
  const loanId = loan.loanId
  // seed two recent contacts so a 3rd is frequency-capped
  sys.ledger.recordContact(loanId, new Date(FRIDAY_NOON_MX.getTime() - 2 * 86400000).toISOString())
  sys.ledger.recordContact(loanId, new Date(FRIDAY_NOON_MX.getTime() - 1 * 86400000).toISOString())

  const action = {
    type: 'outreach', agentId: 'collector-01', loanId, channel: 'sms',
    identifier: loan.accountId, text: `Hola, recordatorio de su cuenta ****${String(loan.accountId).slice(-4)}.`,
  }
  const { decision } = await sys.orchestrator.dispatch(action, { now: FRIDAY_NOON_MX })
  assert.equal(decision.decision, DECISION.DENY)
  assert.equal(decision.rule, 'frequency_cap')

  const outboxBefore = sys.orchestrator.outbox.length
  const appeal = await fileAppeal(sys, { originalAction: action, originalDecision: decision, context: { now: FRIDAY_NOON_MX } })

  assert.equal(appeal.ruling, 'overturned', 'discretionary policy → routed to human')
  assert.ok(appeal.inboxId, 'an inbox item was created')
  const item = sys.orchestrator.inbox.find((i) => i.id === appeal.inboxId)
  assert.equal(item.status, 'pending', 'still pending — NOT auto-granted')
  assert.equal(sys.orchestrator.outbox.length, outboxBefore, 'nothing sent before human approval')

  // Human decides — only now does the action execute, logged with authorizer = human.
  const { result } = sys.orchestrator.approve(appeal.inboxId, 'compliance-officer-appeals')
  assert.equal(result.effect, 'outreach')
  assert.equal(sys.orchestrator.outbox.length, outboxBefore + 1, 'outreach sent after human approval')
  const humanEntry = sys.audit.list().reverse().find((e) => e.authorizer === AUTHORIZER.HUMAN)
  assert.ok(humanEntry && humanEntry.decision === DECISION.ALLOW, 'human authorization logged')

  // both appeal kinds present and chain intact
  const kinds = sys.audit.list().map((e) => e.actionType)
  assert.ok(kinds.includes('appeal.filed') && kinds.includes('appeal.ruling'))
  assert.equal(sys.audit.verify().valid, true, 'hash chain verifies throughout')
})

test('Appeals — flow through the same Guard seam; guard.reviewAppeal never returns allow', async () => {
  const sys = buildSystem()
  assert.equal(typeof sys.guard.reviewAppeal, 'function', 'appeal rules through the Guard seam')
  // immutable
  const up = sys.guard.reviewAppeal({ policyId: 'POL-LANG-001', rule: 'banned_language', decision: DECISION.DENY, loanId: 'LN-x' }, { agentId: 'appeals-01', argument: 'x' })
  assert.equal(up.ruling, 'upheld')
  // discretionary
  const ov = sys.guard.reviewAppeal({ policyId: 'POL-FREQ-001', rule: 'frequency_cap', decision: DECISION.DENY, loanId: 'LN-x' }, { agentId: 'appeals-01', argument: 'x' })
  assert.equal(ov.ruling, 'overturned')
  // a ruling is never an outright grant: the standard decision it logs is deny|escalate, never allow
  const entries = sys.audit.list().filter((e) => e.actionType === 'appeal.ruling')
  assert.ok(entries.length >= 2)
  assert.ok(entries.every((e) => e.decision !== DECISION.ALLOW), 'appeal ruling never auto-grants')
  assert.equal(sys.audit.verify().valid, true)
})
