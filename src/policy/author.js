// Apply an authored policy rule — itself a GOVERNED, logged event.
// The act of authoring governance flows through the same Guard seam (so the kill-switch halts it
// too), is validated before touching the ruleset, hot-reloads into the live engine, persists to
// the overlay, and is recorded on the append-only hash chain. UI-free: callable from tests.

import { validateRule } from './compiler.js'
import { DECISION, AUTHORIZER } from '../guard/policyTypes.js'

/**
 * @param {object} deps
 * @param {object} deps.guard   the Warden seam (for the governed gate + audit access)
 * @param {object} deps.engine  the LocalPolicyEngine (addRule/persist)
 * @param {object} deps.audit   the append-only audit log
 * @param {object} opts
 * @param {object} opts.rule        the compiled+validated rule
 * @param {string} opts.actor       who is authoring (e.g. "compliance-officer")
 * @param {string} opts.sourceText  the original plain-language text
 * @param {boolean} [opts.persist]  write to the overlay file (default true)
 */
export async function applyAuthoredPolicy({ guard, engine, audit }, { rule, actor = 'compliance-officer', sourceText = '', persist = true, now = new Date() }) {
  // 1) Never write unvalidated output into the authority.
  const v = validateRule(rule)
  if (!v.valid) return { ok: false, errors: v.errors }

  // 2) Authoring is governed: route through the Warden. The kill-switch halts authoring too.
  const gate = await guard.authorize({ type: 'policy.author', agentId: actor, loanId: null }, { now })
  if (gate.decision !== DECISION.ALLOW) {
    return { ok: false, errors: [`authoring blocked: ${gate.rule} (${gate.policyId})`], decision: gate }
  }

  // 3) Hot-reload into the live engine (+ persist overlay). Enforced immediately, no restart.
  engine.addRule(rule, { persist })

  // 4) Record the authoritative governance event on the hash chain.
  const ts = now.toISOString()
  const logged = await audit.append({
    agentId: actor,
    actionType: 'policy.author',
    loanId: null,
    policyId: rule.id,
    rule: 'policy_author',
    decision: DECISION.ALLOW,
    escalated: false,
    reason: `authored ${rule.kind} from: "${sourceText || rule.sourceText || ''}"`,
    authorizer: AUTHORIZER.HUMAN,
    ts,
  })

  return { ok: true, policyId: rule.id, auditSeq: logged.seq, rule }
}
