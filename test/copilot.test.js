// #4 — Opus approval co-pilot. Hermetic (offline → deterministic recommendation).

process.env.HIVE_OFFLINE = '1'
process.env.HIVE_NO_OVERLAY = '1'

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { recommendApproval } from '../src/policy/copilot.js'
import { buildSystem } from '../src/system.js'
import { DECISION, AUTHORIZER } from '../src/guard/policyTypes.js'

test('#4 recommendation cites the gating policy and uses masked borrower context', async () => {
  const rec = await recommendApproval({
    actionType: 'write_off',
    amount: 4200,
    policyId: 'POL-GATE-001',
    loan: { borrower: 'Prim Zell', accountId: '400000000173' },
  })
  assert.ok(rec.recommendation.includes('POL-GATE-001'), 'recommendation cites the correct policyId')
  assert.ok(rec.recommendation.includes('0173'), 'uses last-4 of the account')
  assert.ok(!rec.recommendation.includes('400000000173'), 'never exposes the full identifier')
  assert.equal(rec.policyId, 'POL-GATE-001')
})

test('#4 co-pilot advises but the human authorizes; the decision is logged as human', async () => {
  const sys = buildSystem()
  // escalate a sensitive action into the inbox
  const { outcome } = await sys.orchestrator.dispatch(
    { type: 'write_off', agentId: 'servicer-02', loanId: 'LN-100000', amount: 4200 },
    { now: new Date('2026-06-12T18:00:00Z') }
  )
  assert.equal(outcome.queued, 'approval')

  // human approves → final authorizer must be human (co-pilot never authorizes)
  const { result } = sys.orchestrator.approve(outcome.id, 'compliance-officer-1')
  assert.equal(result.effect, 'write_off')
  const [humanEntry] = sys.audit.list({ limit: 1 })
  assert.equal(humanEntry.authorizer, AUTHORIZER.HUMAN)
  assert.equal(humanEntry.decision, DECISION.ALLOW)
})
