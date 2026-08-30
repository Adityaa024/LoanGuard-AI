// Assembles the whole governance system from its parts. Used by the server and by tests
// so there is exactly one wiring of the Warden + runtime.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { LocalPolicyEngine } from './guard/localPolicyEngine.js'
import { Guard } from './guard/guard.js'
import { AuditLog } from './audit/auditLog.js'
import { EventBus } from './events/bus.js'
import { KillSwitch, Ledger } from './state/stores.js'
import { Orchestrator } from './engine/orchestrator.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

function readJson(p, fallback) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'))
  } catch {
    return fallback
  }
}

export function buildSystem({ ledger, tasks, agents } = {}) {
  const meta = readJson(path.join(ROOT, 'data', 'meta.json'), { agents: [], taskCount: 0, loanCount: 0 })
  const led = ledger || Ledger.fromSeed()
  const taskSet = tasks || readJson(path.join(ROOT, 'data', 'tasks.json'), [])
  const agentSet = agents || meta.agents || []

  const backend = new LocalPolicyEngine()
  const audit = new AuditLog()
  const events = new EventBus()
  const killSwitch = new KillSwitch()
  const guard = new Guard({ backend, killSwitch, ledger: led, audit, events })
  const orchestrator = new Orchestrator({ guard, ledger: led, audit, events, agents: agentSet, tasks: taskSet })

  return { meta, ledger: led, backend, audit, events, killSwitch, guard, orchestrator }
}
