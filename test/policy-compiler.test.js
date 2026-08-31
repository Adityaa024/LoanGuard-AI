// #1 — Natural-language → policy compiler. Hermetic (offline → deterministic mini-parser).

process.env.HIVE_OFFLINE = '1'

import { test, before } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

before(async () => {
  const { getDb } = await import('../src/db/index.js')
  const db = await getDb()
  await db.run('DELETE FROM audit_logs')
})

import { compilePolicy } from '../src/policy/compiler.js'
import { applyAuthoredPolicy } from '../src/policy/author.js'
import { buildSystem } from '../src/system.js'
import { DECISION } from '../src/guard/policyTypes.js'

test('#1 compiles plain language into the expected rule shape', async () => {
  const { rule, valid } = await compilePolicy('no contact on Sundays')
  assert.equal(valid, true)
  assert.equal(rule.kind, 'contact_day')
  assert.deepEqual(rule.params.blockedWeekdays, [7])
  assert.deepEqual(rule.appliesTo, ['outreach'])
  assert.equal(rule.onViolation, 'deny')
  assert.ok(rule.id.startsWith('POL-AUTH'))
  assert.equal(rule.sourceText, 'no contact on Sundays')

  // also handles an amount cap (Spanish), proving the grammar covers more than one shape
  const cap = await compilePolicy('bloquear transferencias mayores a $2,000')
  assert.equal(cap.valid, true)
  assert.equal(cap.rule.kind, 'amount_cap')
  assert.equal(cap.rule.params.maxAmount, 2000)
})

test('#1 authored rule hot-reloads; Warden enforces it; authoring is logged and chain verifies', async () => {
  const sys = buildSystem()
  sys.backend.authoredRules = [] // hermetic: ignore any on-disk overlay from a running server

  // Wednesday 12:00 in America/Mexico_City (18:00Z) — currently ALLOWED by canonical hours.
  const wed = new Date('2026-06-17T18:00:00Z')
  const outreach = { type: 'outreach', agentId: 'collector-01', loanId: 'LN-100000', text: 'Hola, recordatorio amable.' }

  const before = await sys.guard.authorize(outreach, { now: wed })
  assert.equal(before.decision, DECISION.ALLOW, 'Wednesday outreach passes before authoring')

  // Author "no contact on Wednesdays" through the governed path.
  const { rule } = await compilePolicy('no contact on Wednesdays')
  const auditBefore = await sys.audit.size()
  const res = await applyAuthoredPolicy(
    { guard: sys.guard, engine: sys.backend, audit: sys.audit },
    { rule, actor: 'compliance-officer-1', sourceText: 'no contact on Wednesdays', persist: false, now: wed }
  )
  assert.equal(res.ok, true)

  // Hot-reloaded: the SAME action is now denied, attributed to the NEW policy id.
  const after = await sys.guard.authorize(outreach, { now: wed })
  assert.equal(after.decision, DECISION.DENY)
  assert.equal(after.policyId, rule.id)

  // Authoring governance is itself a logged, governed event.
  const auditList = await sys.audit.list()
  const authored = auditList.find((e) => e.actionType === 'policy.author' && e.policyId === rule.id)
  assert.ok(authored, 'policy.author audit entry exists')
  assert.equal(authored.authorizer, 'human')
  assert.match(authored.reason, /no contact on Wednesdays/)
  const auditSize = await sys.audit.size()
  assert.ok(auditSize > auditBefore)

  // The append-only hash chain still verifies across the new entries.
  const verifyRes = await sys.audit.verify()
  assert.equal(verifyRes.valid, true)
})

test('#1 invalid/ununderstood input is rejected, never written as authority', async () => {
  const out = await compilePolicy('please be nice to everyone today')
  assert.equal(out.valid, false)
  assert.ok(out.errors.length > 0)
})
