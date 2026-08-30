// #2 — "Harm prevented" aggregates must be provably derived from the audit log.

process.env.HIVE_OFFLINE = '1'

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { buildSystem } from '../src/system.js'
import { releaseRogue } from '../src/engine/rogue.js'
import { computePrevented } from '../src/audit/harm.js'

test('#2 prevented aggregates equal an independent recomputation from the audit export', async () => {
  const sys = buildSystem()
  // generate real governed activity: a rogue run (scope deny w/ amount, off-hours, banned language,
  // gate escalation, tamper) plus an explicit over-scope transfer to add a known dollar amount.
  await releaseRogue({ orchestrator: sys.orchestrator, audit: sys.audit, events: sys.events, ledger: sys.ledger })
  await sys.orchestrator.dispatch(
    { type: 'transfer', agentId: 'collector-01', loanId: 'LN-100000', amount: 12345 },
    { now: new Date('2026-06-12T18:00:00Z') }
  )

  const entries = sys.audit.list()
  const prevented = computePrevented(entries)

  // Independent recomputation (different code path) straight from the export entries.
  const expect = entries.reduce(
    (a, e) => {
      if (e.decision === 'deny' && e.policyId === 'POL-SCOPE-001') a.scopeDollarsBlocked += Number(e.amount) || 0
      if (e.decision === 'deny' && e.policyId === 'POL-HOURS-001') a.offHoursBlocked += 1
      if (e.decision === 'deny' && e.policyId === 'POL-LANG-001') a.bannedLanguageBlocked += 1
      if (e.decision === 'escalate' && e.policyId === 'POL-GATE-001') a.selfApprovalsGated += 1
      return a
    },
    { scopeDollarsBlocked: 0, offHoursBlocked: 0, bannedLanguageBlocked: 0, selfApprovalsGated: 0 }
  )
  expect.scopeDollarsBlocked = Math.round(expect.scopeDollarsBlocked * 100) / 100

  assert.deepEqual(prevented, expect)

  // sanity: the rogue's over-scope (250000) + the 12345 transfer are real dollars blocked
  assert.ok(prevented.scopeDollarsBlocked >= 262345, `expected >= 262345, got ${prevented.scopeDollarsBlocked}`)
  assert.ok(prevented.offHoursBlocked >= 1)
  assert.ok(prevented.bannedLanguageBlocked >= 1)
  assert.ok(prevented.selfApprovalsGated >= 1)
})
