// Integration tests — the vision flow (RUBRIC 12) and the rogue scenario (RUBRIC 4,6,7,8,10),
// driven through the assembled system. Forced offline so tests are hermetic (no live API calls);
// the vision extractor falls back to the document descriptor.

process.env.HIVE_OFFLINE = '1'

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { buildSystem } from '../src/system.js'
import { scanAndReconcile } from '../src/vision/visionFlow.js'
import { releaseRogue } from '../src/engine/rogue.js'
import { DECISION } from '../src/guard/policyTypes.js'

test('RUBRIC 12 — vision flow posts a matching doc and excepts a mismatched one', async () => {
  const sys = buildSystem()
  const match = await scanAndReconcile({ orchestrator: sys.orchestrator, ledger: sys.ledger, meta: sys.meta, which: 'match' })
  assert.equal(match.stage, 'posted')
  assert.equal(match.decision.decision, DECISION.ALLOW)

  const mismatch = await scanAndReconcile({ orchestrator: sys.orchestrator, ledger: sys.ledger, meta: sys.meta, which: 'mismatch' })
  assert.equal(mismatch.stage, 'exception')
  assert.equal(mismatch.decision.decision, DECISION.ESCALATE)
  assert.equal(mismatch.decision.category, 'exception')
  assert.ok(sys.orchestrator.exceptions.length >= 1, 'mismatch routed to exceptions, not posted')
})

test('RUBRIC 4,6,7,8,10 — rogue agent: every attempt is caught and logged', async () => {
  const sys = buildSystem()
  const before = sys.audit.size()
  const result = await releaseRogue({ orchestrator: sys.orchestrator, audit: sys.audit, events: sys.events, ledger: sys.ledger })

  assert.equal(result.allBlocked, true, 'no rogue attempt slipped through')

  const byPolicy = Object.fromEntries(result.timeline.map((t) => [t.policyId, t.decision]))
  assert.equal(byPolicy['POL-HOURS-001'], DECISION.DENY)
  assert.equal(byPolicy['POL-LANG-001'], DECISION.DENY)
  assert.equal(byPolicy['POL-SCOPE-001'], DECISION.DENY)
  assert.equal(byPolicy['POL-GATE-001'], DECISION.ESCALATE)
  assert.equal(byPolicy['POL-INTEGRITY-001'], DECISION.DENY)

  // Tamper attempt rejected on both mutate and delete.
  const tamper = result.timeline.find((t) => t.rule === 'append_only')
  assert.match(tamper.tamperResults.mutate, /rejected/)
  assert.match(tamper.tamperResults.delete, /rejected/)

  // Everything was logged, and the chain is still intact.
  assert.ok(sys.audit.size() > before)
  assert.equal(sys.audit.verify().valid, true)
})

test('RUBRIC 11 — simulated outbox never exposes more than last-4', async () => {
  const sys = buildSystem()
  // run a few ticks to generate outbound messages
  for (let i = 0; i < 30; i++) await sys.orchestrator.tick()
  for (const msg of sys.orchestrator.outbox) {
    const longRun = (msg.text.match(/\d{5,}/g) || [])[0]
    assert.equal(longRun, undefined, `outbound message exposes a long digit run: ${msg.text}`)
    assert.match(msg.to, /^\*{4}\d{4}$/, 'recipient is masked to last-4')
  }
})
