// HTTP + SSE smoke tests — covers RUBRIC 13 (endpoints/stream up) and 14 (the demo flow
// endpoints respond end-to-end). Forced offline so vision uses the descriptor fallback.

process.env.HIVE_OFFLINE = '1'

import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { registerRoutes } from '../src/routes.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

let server
let base

before(async () => {
  const app = express()
  app.use(express.json())
  await registerRoutes(app, { ROOT })
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      base = `http://127.0.0.1:${server.address().port}`
      resolve()
    })
  })
})

after(() => server && server.close())

const get = (p) => fetch(base + p).then((r) => r.json())
const post = (p, body) => fetch(base + p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }).then((r) => r.json())

test('RUBRIC 13 — core read endpoints respond and report a working, seeded system', async () => {
  const policy = await get('/api/policy')
  assert.ok(policy.backend?.ruleIds?.scope_limit, 'policy describes rules')

  const state = await get('/api/state')
  assert.ok(state.loans > 0, 'seeded loans present')
  assert.equal(typeof state.audit.size, 'number')
  assert.equal(state.audit.integrity.valid, true)
})

test('RUBRIC 13 — /events streams Server-Sent Events', async () => {
  const res = await fetch(base + '/events', { headers: { accept: 'text/event-stream' } })
  assert.match(res.headers.get('content-type') || '', /text\/event-stream/)
  const reader = res.body.getReader()
  const { value } = await reader.read()
  const text = new TextDecoder().decode(value)
  assert.match(text, /event: hello|data:/)
  await reader.cancel()
})

test('RUBRIC 14 — vision scan: match posts, mismatch routes to exceptions', async () => {
  const match = await post('/api/demo/scan', { which: 'match' })
  assert.equal(match.ok, true)
  assert.equal(match.stage, 'posted')

  const mismatch = await post('/api/demo/scan', { which: 'mismatch' })
  assert.equal(mismatch.stage, 'exception')

  const ex = await get('/api/exceptions')
  assert.ok(ex.exceptions.length >= 1)
})

test('RUBRIC 14 — rogue release: all attempts contained', async () => {
  const r = await post('/api/demo/rogue')
  assert.equal(r.ok, true)
  assert.equal(r.allBlocked, true)
})

test('RUBRIC 14 — kill-switch endpoint halts, reset resumes', async () => {
  const k = await post('/api/kill', { reason: 'test' })
  assert.equal(k.killSwitch.engaged, true)
  const ticked = await post('/api/swarm/tick')
  assert.equal(ticked.ticked, false, 'no tick while killed')
  const r = await post('/api/kill/reset')
  assert.equal(r.killSwitch.engaged, false)
})

test('RUBRIC 14 — human approval flow over HTTP', async () => {
  const sensitive = await post('/api/demo/sensitive', { type: 'restructure' })
  assert.equal(sensitive.decision.decision, 'escalate')
  const id = sensitive.outcome.id
  const approve = await post(`/api/inbox/${id}/approve`, { approver: 'officer-http' })
  assert.equal(approve.ok, true)
  assert.equal(approve.result.effect, 'restructure')
})

test('RUBRIC 9 — regulator export renders Markdown with integrity attestation', async () => {
  const res = await fetch(base + '/api/audit/export?format=md')
  assert.match(res.headers.get('content-type') || '', /markdown/)
  const md = await res.text()
  assert.match(md, /Governance Audit Export/)
  assert.match(md, /Chain integrity/)
})
