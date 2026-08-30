// Orchestrator — the swarm runtime and the ONLY executor of effects.
//
// RUBRIC 1 (no unmediated action) is structural here:
//   - Agents only propose (see agent.js); they cannot execute.
//   - The only public method that can change state is dispatch(), and it ALWAYS calls
//     guard.authorize() before touching anything.
//   - Effects are private (#applyEffect) and run only on an `allow` decision (or on a human
//     approval through approve()). There is no public method to apply an effect directly.

import { Agent } from './agent.js'
import { AUTHORIZER, DECISION } from '../guard/policyTypes.js'

export class Orchestrator {
  #applyImpl // private effect executor, not exposed

  constructor({ guard, ledger, audit, events, agents, tasks = [] }) {
    this.guard = guard
    this.ledger = ledger
    this.audit = audit
    this.events = events
    this.agents = new Map((agents || []).map((a) => [a.agentId, new Agent(a)]))

    this.tasks = [...tasks]
    this.cursor = 0
    this.inbox = [] // pending human approvals (RUBRIC 8)
    this.exceptions = [] // reconciliation mismatches (RUBRIC 12)
    this.outbox = [] // simulated sent messages (NEVER real)
    this.riskScores = new Map()
    this.stats = { allow: 0, deny: 0, escalate: 0, dispatched: 0 }

    // Bind the private executor.
    this.#applyImpl = this.#makeExecutor()
  }

  // ---- The single entry point for any action (agent-proposed or injected) ----
  async dispatch(action, context = {}) {
    this.stats.dispatched += 1
    if (this.events) this.events.emit('action', { agentId: action.agentId, actionType: action.type, loanId: action.loanId })

    const decision = await this.guard.authorize(action, context)
    this.stats[decision.decision] = (this.stats[decision.decision] || 0) + 1

    const outcome = this.#handle(action, decision)
    return { decision, outcome }
  }

  #handle(action, decision) {
    if (decision.decision === DECISION.ALLOW) {
      return this.#applyImpl(action, AUTHORIZER.SYSTEM)
    }
    if (decision.decision === DECISION.ESCALATE) {
      if (decision.category === 'exception') {
        const ex = { id: `EX-${this.exceptions.length + 1}`, action, decision, createdAt: decision.ts }
        this.exceptions.push(ex)
        this.ledger.recordException(ex)
        if (this.events) this.events.emit('exception', { id: ex.id, loanId: action.loanId, reason: decision.reason })
        return { queued: 'exception', id: ex.id }
      }
      // sensitive action → human approval inbox
      const item = {
        id: `AP-${this.inbox.length + 1}`,
        action,
        policyId: decision.policyId,
        reason: decision.reason,
        status: 'pending',
        createdAt: decision.ts,
        auditSeq: decision.auditSeq,
      }
      this.inbox.push(item)
      if (this.events) this.events.emit('approval', { id: item.id, agentId: action.agentId, actionType: action.type, loanId: action.loanId, status: 'pending' })
      return { queued: 'approval', id: item.id }
    }
    // deny → nothing executed (already logged + emitted by the Guard)
    return { blocked: true, reason: decision.reason }
  }

  // ---- Human approval of a gated action (RUBRIC 8) ----
  approve(approvalId, approver = 'human-officer') {
    const item = this.inbox.find((i) => i.id === approvalId)
    if (!item) throw new Error(`approval ${approvalId} not found`)
    if (item.status !== 'pending') throw new Error(`approval ${approvalId} already ${item.status}`)
    item.status = 'approved'
    item.approver = approver
    item.resolvedAt = new Date().toISOString()

    // Log the human authorization explicitly (authorizer = human).
    const logged = this.audit.append({
      agentId: item.action.agentId,
      actionType: item.action.type,
      loanId: item.action.loanId,
      policyId: item.policyId,
      rule: 'human_approval',
      decision: DECISION.ALLOW,
      escalated: false,
      reason: `approved by ${approver}`,
      authorizer: AUTHORIZER.HUMAN,
      ts: item.resolvedAt,
    })
    if (this.events) {
      this.events.emit('decision', {
        decision: DECISION.ALLOW, policyId: item.policyId, rule: 'human_approval',
        agentId: item.action.agentId, actionType: item.action.type, loanId: item.action.loanId,
        authorizer: AUTHORIZER.HUMAN, auditSeq: logged.seq, ts: item.resolvedAt,
      })
      this.events.emit('approval', { id: item.id, status: 'approved', approver })
    }
    const result = this.#applyImpl({ ...item.action, approvedBy: approver }, AUTHORIZER.HUMAN)
    return { item, result, auditSeq: logged.seq }
  }

  deny(approvalId, approver = 'human-officer') {
    const item = this.inbox.find((i) => i.id === approvalId)
    if (!item) throw new Error(`approval ${approvalId} not found`)
    if (item.status !== 'pending') throw new Error(`approval ${approvalId} already ${item.status}`)
    item.status = 'denied'
    item.approver = approver
    item.resolvedAt = new Date().toISOString()
    const logged = this.audit.append({
      agentId: item.action.agentId, actionType: item.action.type, loanId: item.action.loanId,
      policyId: item.policyId, rule: 'human_approval', decision: DECISION.DENY, escalated: false,
      reason: `denied by ${approver}`, authorizer: AUTHORIZER.HUMAN, ts: item.resolvedAt,
    })
    if (this.events) this.events.emit('approval', { id: item.id, status: 'denied', approver, auditSeq: logged.seq })
    return { item, auditSeq: logged.seq }
  }

  // ---- Appeals: route an OVERTURNED appeal to the human approval inbox (RUBRIC 8 preserved). ----
  // The Orchestrator stays the sole executor; this only QUEUES the original action — a human must
  // still approve() for any effect to run. An appeal can never auto-grant.
  enqueueAppealReview(action, { policyId, reason, ts } = {}) {
    const item = {
      id: `AP-${this.inbox.length + 1}`,
      action,
      policyId: policyId ?? null,
      reason: reason || 'overturned on appeal → human review',
      status: 'pending',
      createdAt: ts || new Date().toISOString(),
      fromAppeal: true,
    }
    this.inbox.push(item)
    if (this.events) {
      this.events.emit('approval', {
        id: item.id, agentId: action.agentId, actionType: action.type, loanId: action.loanId,
        status: 'pending', fromAppeal: true,
      })
    }
    return item
  }

  // ---- Effects. PRIVATE. Only reachable via dispatch()(allow) or approve(). ----
  #makeExecutor() {
    return (action, authorizer) => {
      switch (action.type) {
        case 'risk_score': {
          const loan = this.ledger.get(action.loanId)
          const score = loan ? Math.min(100, Math.round(loan.daysPastDue * 0.4 + (loan.balance / 5000))) : 0
          this.riskScores.set(action.loanId, score)
          return { effect: 'risk_score', loanId: action.loanId, score }
        }
        case 'outreach': {
          this.ledger.recordContact(action.loanId, new Date().toISOString())
          const loan = this.ledger.get(action.loanId)
          const masked = `****${String(loan?.accountId || '').slice(-4)}`
          const msg = { to: masked, text: action.text, ts: new Date().toISOString(), by: action.agentId, authorizer }
          this.outbox.push(msg)
          return { effect: 'outreach', to: masked }
        }
        case 'payment_post': {
          const balance = this.ledger.applyPayment(action.loanId, action.amount)
          return { effect: 'payment_post', amount: action.amount, balance }
        }
        case 'transfer':
          return { effect: 'transfer', amount: action.amount }
        case 'write_off': {
          const loan = this.ledger.get(action.loanId)
          const amt = action.amount ?? loan?.balance ?? 0
          if (loan) this.ledger.applyPayment(action.loanId, amt)
          return { effect: 'write_off', amount: amt, authorizer }
        }
        case 'restructure':
          return { effect: 'restructure', authorizer }
        case 'bureau_report':
          return { effect: 'bureau_report', authorizer }
        default:
          return { effect: 'noop' }
      }
    }
  }

  // ---- Swarm loop: one tick pulls the next task and dispatches the agent's proposal ----
  async tick() {
    if (this.guard.killSwitch.engaged) return null // halted: schedule nothing new
    if (this.tasks.length === 0) return null
    const task = this.tasks[this.cursor % this.tasks.length]
    this.cursor += 1
    const agent = this.agents.get(task.agentId)
    const loan = this.ledger.get(task.loanId)
    if (!agent || !loan) return null
    const action = agent.propose(task, loan)
    if (!action) return null
    return this.dispatch(action)
  }

  snapshot() {
    return {
      stats: this.stats,
      inbox: this.inbox.map((i) => ({ id: i.id, agentId: i.action.agentId, actionType: i.action.type, loanId: i.action.loanId, status: i.status, reason: i.reason, createdAt: i.createdAt, approver: i.approver })),
      exceptions: this.exceptions.map((e) => ({ id: e.id, loanId: e.action.loanId, reason: e.decision.reason, createdAt: e.createdAt })),
      outboxCount: this.outbox.length,
      agents: [...this.agents.values()].map((a) => ({ agentId: a.agentId, tier: a.tier, scopeLimit: a.scopeLimit })),
      killSwitch: this.guard.killSwitch.status(),
    }
  }
}
