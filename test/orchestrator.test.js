// Orchestrator tests — RUBRIC 1 (no unmediated action), 3 (kill-switch halts the loop),
// 8 (human approval flow, authorizer recorded).

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { buildSystem } from '../src/system.js'
import { Agent } from '../src/engine/agent.js'
import { Ledger } from '../src/state/stores.js'
import { DECISION, AUTHORIZER } from '../src/guard/policyTypes.js'

const FRIDAY_NOON_MX = new Date('2026-06-12T18:00:00Z')

function smallSystem() {
  const ledger = new Ledger([
    { loanId: 'LN-A', accountId: '400000000001', borrower: 'A B', minPayment: 100, balance: 9000, daysPastDue: 30, contactHistory: [] },
  ])
  const agents = [
    { agentId: 'collector-01', tier: 'junior', scopeLimit: 5000 },
    { agentId: 'servicer-02', tier: 'lead', scopeLimit: 100000 },
  ]
  return buildSystem({ ledger, tasks: [], agents })
}

test('RUBRIC 1 — agents cannot execute; only the orchestrator (via the Warden) can', async () => {
  const { orchestrator, guard } = smallSystem()

  // (a) An Agent exposes no execution capability — only `propose`.
  const agent = new Agent({ agentId: 'collector-01', tier: 'junior', scopeLimit: 5000 })
  assert.equal(typeof agent.propose, 'function')
  for (const forbidden of ['execute', 'act', 'send', 'post', 'apply', 'run']) {
    assert.equal(typeof agent[forbidden], 'undefined', `agent has no ${forbidden}()`)
  }

  // (b) The orchestrator exposes no public effect executor.
  for (const forbidden of ['applyEffect', 'apply', 'execute']) {
    assert.equal(typeof orchestrator[forbidden], 'undefined', `orchestrator has no public ${forbidden}()`)
  }

  // (c) dispatch always consults the Warden.
  let authorizeCalls = 0
  const realAuthorize = guard.authorize.bind(guard)
  guard.authorize = async (a, c) => {
    authorizeCalls += 1
    return realAuthorize(a, c)
  }
  await orchestrator.dispatch({ type: 'risk_score', agentId: 'collector-01', loanId: 'LN-A' }, { now: FRIDAY_NOON_MX })
  assert.equal(authorizeCalls, 1, 'every dispatch authorizes')
})

test('RUBRIC 1 — a denied action mutates nothing', async () => {
  const { orchestrator, ledger } = smallSystem()
  const before = ledger.get('LN-A').balance
  // Over-scope transfer (junior, 5000) → deny → no effect.
  const { decision, outcome } = await orchestrator.dispatch(
    { type: 'transfer', agentId: 'collector-01', loanId: 'LN-A', amount: 50000 },
    { now: FRIDAY_NOON_MX }
  )
  assert.equal(decision.decision, DECISION.DENY)
  assert.equal(outcome.blocked, true)
  assert.equal(ledger.get('LN-A').balance, before, 'ledger unchanged after deny')
})

test('RUBRIC 3 — kill-switch halts the swarm loop and any dispatch', async () => {
  const { orchestrator, killSwitch, ledger } = smallSystem()
  orchestrator.tasks = [{ taskId: 'T1', agentId: 'collector-01', type: 'risk_score', loanId: 'LN-A' }]
  killSwitch.engage('test')

  // The loop schedules nothing.
  const tick = await orchestrator.tick()
  assert.equal(tick, null)

  // A direct dispatch is denied by the Warden.
  const before = ledger.get('LN-A').balance
  const { decision } = await orchestrator.dispatch(
    { type: 'payment_post', agentId: 'servicer-02', loanId: 'LN-A', amount: 100 },
    { now: FRIDAY_NOON_MX }
  )
  assert.equal(decision.decision, DECISION.DENY)
  assert.equal(decision.rule, 'kill_switch')
  assert.equal(ledger.get('LN-A').balance, before)
})

test('RUBRIC 8 — sensitive action waits for human approval, then applies with human authorizer', async () => {
  const { orchestrator, audit } = smallSystem()
  const { decision, outcome } = await orchestrator.dispatch(
    { type: 'write_off', agentId: 'servicer-02', loanId: 'LN-A', amount: 500 },
    { now: FRIDAY_NOON_MX }
  )
  assert.equal(decision.decision, DECISION.ESCALATE)
  assert.equal(outcome.queued, 'approval')
  assert.equal(orchestrator.inbox.length, 1)
  assert.equal(orchestrator.inbox[0].status, 'pending')

  // Human approves; effect applies and is logged with authorizer = human.
  const sizeBefore = audit.size()
  const { result } = orchestrator.approve(outcome.id, 'compliance-officer-1')
  assert.equal(result.effect, 'write_off')
  assert.equal(orchestrator.inbox[0].status, 'approved')
  const [humanEntry] = audit.list({ limit: 1 })
  assert.equal(humanEntry.authorizer, AUTHORIZER.HUMAN)
  assert.equal(humanEntry.decision, DECISION.ALLOW)
  assert.ok(audit.size() > sizeBefore)
})
