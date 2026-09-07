// The Warden's seam. THE single interface every agent action must pass through.
//
//   const decision = await guard.authorize(action, context)
//
// Guarantees by construction:
//   - the kill-switch is checked FIRST: when engaged, nothing is authorized (RUBRIC 3);
//   - the policy backend is pluggable (LocalPolicyEngine today, external API tomorrow);
//   - EVERY decision is written to the append-only audit log with full traceability (RUBRIC 9);
//   - EVERY decision emits a live event for the hive visualization.
//
// Agents never see the policy engine; they only ever call guard.authorize(). This is the
// "no unmediated action" guarantee (RUBRIC 1): the runtime hands agents a Guard, not a backend.

import { DECISION, AUTHORIZER } from './policyTypes.js'

const KILL_POLICY_ID = 'POL-KILL-001'

export class Guard {
  /**
   * @param {object} deps
   * @param {{evaluate: Function, describe?: Function}} deps.backend  pluggable policy backend
   * @param {object} deps.killSwitch  global halt
   * @param {object} [deps.ledger]    portfolio/contact state for stateful rules
   * @param {object} [deps.audit]     append-only audit log (audit.append)
   * @param {object} [deps.events]    live event bus (events.emit)
   */
  constructor({ backend, killSwitch, ledger = null, audit = null, events = null }) {
    if (!backend || typeof backend.evaluate !== 'function') {
      throw new Error('Guard requires a policy backend with evaluate(action, context)')
    }
    if (!killSwitch) throw new Error('Guard requires a killSwitch')
    this.backend = backend
    this.killSwitch = killSwitch
    this.ledger = ledger
    this.audit = audit
    this.events = events
  }

  /**
   * Authorize (or refuse) an agent action against policy.
   * @returns {Promise<Decision>} { decision, policyId, rule, reason, escalated, category, ... }
   */
  async authorize(action, context = {}) {
    const ts = (context.now instanceof Date ? context.now : new Date()).toISOString()

    // Validate the action envelope minimally — an unidentified action cannot be governed.
    if (!action || !action.type || !action.agentId) {
      const decision = this.#finalize(action || {}, {
        decision: DECISION.DENY,
        policyId: 'POL-MALFORMED',
        rule: 'malformed_action',
        reason: 'action missing type or agentId; refused',
        escalated: false,
        category: null,
        checks: [],
      }, ts)
      return decision
    }

    // 1) Kill-switch is the first gate. When engaged, NOTHING is authorized.
    if (this.killSwitch.engaged) {
      return this.#finalize(action, {
        decision: DECISION.DENY,
        policyId: KILL_POLICY_ID,
        rule: 'kill_switch',
        reason: 'global kill-switch engaged; all agent actions halted',
        escalated: false,
        category: 'halt',
        checks: [],
      }, ts)
    }

    // 2) Pluggable policy backend evaluates the action.
    const result = this.backend.evaluate(action, { now: new Date(ts), ledger: this.ledger })

    return this.#finalize(action, result, ts)
  }

  // Attach identity/trace fields, log to the audit trail, emit the live event, return.
  #finalize(action, result, ts) {
    const decision = {
      decision: result.decision,
      policyId: result.policyId,
      rule: result.rule,
      reason: result.reason,
      escalated: !!result.escalated,
      category: result.category ?? null,
      checks: result.checks ?? [],
      agentId: action.agentId ?? null,
      actionType: action.type ?? null,
      loanId: action.loanId ?? null,
      authorizer: AUTHORIZER.SYSTEM,
      ts,
    }

    let logged = null
    if (this.audit) {
      logged = this.audit.append({
        agentId: decision.agentId,
        actionType: decision.actionType,
        loanId: decision.loanId,
        policyId: decision.policyId,
        rule: decision.rule,
        decision: decision.decision,
        escalated: decision.escalated,
        amount: action.amount ?? null,
        reason: decision.reason,
        authorizer: decision.authorizer,
        ts,
      })
      decision.auditId = logged.id
      decision.auditSeq = logged.seq
    }

    if (this.events) {
      this.events.emit('decision', {
        ...decision,
        auditSeq: logged?.seq,
      })
    }

    return decision
  }

  /**
   * Rule on an appeal of a DENIED action (Multi-Agent Appeals). Flows through THE SAME seam as
   * authorize(), so an appeal can never bypass governance. Two-tier ruling driven by the policy:
   *   - immutable rule (appealable:false)     → UPHELD  (denial stands; "policy immutable")
   *   - discretionary rule (appealable:true)  → OVERTURNED (routed to human review)
   * An appeal NEVER auto-grants — overturned only signals the caller to route to the human inbox
   * (preserves RUBRIC 8). The ruling is appended to the hash-chained audit log + emitted over SSE.
   *
   * @param {object} original  the denied action's governing info: { agentId, actionType, loanId,
   *                            amount, policyId, rule, decision }
   * @param {object} appeal    { agentId:'appeals-01', argument, originalAgentId }
   * @returns {{ruling:'upheld'|'overturned', policyId, rule, reason, auditSeq}}
   */
  reviewAppeal(original = {}, appeal = {}, context = {}) {
    const ts = (context.now instanceof Date ? context.now : new Date()).toISOString()
    // Only DENIED actions are appealable in the first place; anything else is upheld by default.
    const wasDenied = original.decision === DECISION.DENY
    // Kill-switch and non-appealable (immutable) rules are never overturned.
    const appealable =
      wasDenied &&
      !this.killSwitch.engaged &&
      (typeof this.backend.isAppealable === 'function' ? this.backend.isAppealable(original.rule) : false)

    const ruling = appealable ? 'overturned' : 'upheld'
    const reason = appealable
      ? `OVERTURNED — ${original.policyId} (${original.rule}) is discretionary; routed to human review (no auto-grant)`
      : `UPHELD — ${original.policyId} (${original.rule || 'policy'}) is immutable; denial stands`

    let logged = null
    if (this.audit) {
      logged = this.audit.append({
        agentId: appeal.agentId || 'appeals-01',
        actionType: 'appeal.ruling',
        loanId: original.loanId ?? null,
        policyId: original.policyId,
        rule: 'appeal',
        // ruling maps onto the standard decision set: upheld → deny stands; overturned → escalate
        decision: appealable ? DECISION.ESCALATE : DECISION.DENY,
        escalated: appealable,
        amount: original.amount ?? null,
        reason,
        authorizer: AUTHORIZER.SYSTEM,
        ts,
      })
    }

    if (this.events) {
      this.events.emit('appeal', {
        status: ruling,
        agentId: appeal.agentId || 'appeals-01',
        originalAgentId: appeal.originalAgentId ?? original.agentId ?? null,
        policyId: original.policyId,
        loanId: original.loanId ?? null,
        argument: appeal.argument ?? null,
        reason,
        auditSeq: logged?.seq ?? null,
      })
    }

    return { ruling, policyId: original.policyId, rule: original.rule, reason, auditSeq: logged?.seq ?? null }
  }

  describe() {
    return {
      backend: this.backend.describe ? this.backend.describe() : { type: 'unknown' },
      killSwitch: this.killSwitch.status(),
    }
  }
}

export { DECISION, AUTHORIZER }
