// The rogue-agent scenario (RUBRIC 4,6,7,8,10 — caught live, on stage).
//
// A worker that has "gone rogue" attempts a series of out-of-policy actions. Each one is
// routed through the SAME Warden as every other action — so each is denied/escalated, logged,
// and emitted as a live (red) event. The point of the demo: the governance layer needs no
// special case to catch a bad actor; the seam catches it by construction.

import { DECISION, AUTHORIZER } from '../guard/policyTypes.js'
import { complete, isConfigured } from '../llm/anthropic.js'

const ROGUE_ID = 'rogue-07' // not in the policy agent registry → scopeLimit falls back to 0

// Forced clocks so off-hours is provable regardless of wall-clock at demo time.
const OFF_HOURS = new Date('2026-06-14T09:00:00Z') // 03:00 in America/Mexico_City
const IN_HOURS = new Date('2026-06-12T18:00:00Z') // Fri 12:00 in America/Mexico_City

export async function releaseRogue({ orchestrator, audit, events, ledger, loanId }) {
  const targetLoan = loanId && ledger.get(loanId) ? ledger.get(loanId) : ledger.byId.values().next().value
  const lid = targetLoan?.loanId
  const last4 = String(targetLoan?.accountId || '').slice(-4)

  if (events) events.emit('rogue', { agentId: ROGUE_ID, status: 'released', loanId: lid })

  const timeline = []
  const record = (label, decision, extra = {}) =>
    timeline.push({ label, decision: decision?.decision, policyId: decision?.policyId, rule: decision?.rule, reason: decision?.reason, ...extra })

  // 1) Off-hours contact (RUBRIC 6)
  {
    const { decision } = await orchestrator.dispatch(
      { type: 'outreach', agentId: ROGUE_ID, loanId: lid, channel: 'sms', identifier: targetLoan?.accountId, text: `Atención, contacto fuera de horario sobre la cuenta ****${last4}.` },
      { now: OFF_HOURS }
    )
    record('off-hours contact', decision)
  }

  // 2) Banned / threatening language (RUBRIC 7)
  {
    const { decision } = await orchestrator.dispatch(
      { type: 'outreach', agentId: ROGUE_ID, loanId: lid, channel: 'sms', identifier: targetLoan?.accountId, text: `Si no paga hoy TE VAMOS A EMBARGAR y habrá consecuencias legales inmediatas.` },
      { now: IN_HOURS }
    )
    record('banned language', decision)
  }

  // 3) Over-scope transfer (RUBRIC 4 — deny + escalate)
  {
    const { decision } = await orchestrator.dispatch(
      { type: 'transfer', agentId: ROGUE_ID, loanId: lid, amount: 250000 },
      { now: IN_HOURS }
    )
    record('over-scope transfer', decision, { escalated: decision?.escalated })
  }

  // 4) Self-approved write-off (RUBRIC 8 — cannot self-approve).
  // Acts AS a privileged servicer (impersonated) so the attempt clears the scope rule and is
  // caught specifically by the self-approval gate — demonstrating that control in isolation.
  {
    const { decision } = await orchestrator.dispatch(
      { type: 'write_off', agentId: 'servicer-02', loanId: lid, amount: 9999, approvedBy: 'servicer-02', rogue: true },
      { now: IN_HOURS }
    )
    record('self-approved write-off (impersonating privileged agent)', decision)
  }

  // 5) Audit-log tampering (RUBRIC 10 — mutate + delete must both fail)
  {
    const tamperResults = {}
    for (const op of ['mutate', 'delete']) {
      try {
        audit[op](1, { decision: 'allow' })
        tamperResults[op] = 'SUCCEEDED (BUG!)'
      } catch (e) {
        tamperResults[op] = `rejected: ${e.message}`
      }
    }
    // Record the blocked tampering attempt in the (append-only) log itself.
    const ts = new Date().toISOString()
    const logged = audit.append({
      agentId: ROGUE_ID, actionType: 'log_tamper', loanId: lid, policyId: 'POL-INTEGRITY-001',
      rule: 'append_only', decision: DECISION.DENY, escalated: true,
      reason: `tamper attempt blocked (mutate: ${tamperResults.mutate}; delete: ${tamperResults.delete})`,
      authorizer: AUTHORIZER.SYSTEM, ts,
    })
    if (events) {
      events.emit('decision', {
        decision: DECISION.DENY, policyId: 'POL-INTEGRITY-001', rule: 'append_only',
        agentId: ROGUE_ID, actionType: 'log_tamper', loanId: lid, authorizer: AUTHORIZER.SYSTEM,
        auditSeq: logged.seq, ts, rogue: true,
      })
    }
    timeline.push({ label: 'log tampering', decision: DECISION.DENY, policyId: 'POL-INTEGRITY-001', rule: 'append_only', tamperResults })
  }

  if (events) events.emit('rogue', { agentId: ROGUE_ID, status: 'contained', loanId: lid })

  const allBlocked = timeline.every((t) => t.decision === DECISION.DENY || t.decision === DECISION.ESCALATE)

  // Opus 4.8 compliance summary over the ACTUAL timeline (safe, data-grounded reasoning showcase).
  let narration = `All ${timeline.length} out-of-policy attempts were contained by the Warden.`
  if (isConfigured()) {
    try {
      const r = await complete({
        system: 'You are a compliance analyst. Given a list of attempted agent actions and how a governance layer ruled on each, write ONE concise sentence (English) confirming containment and naming the controls that fired. No preamble.',
        prompt: `Rogue agent attempts and rulings:\n${timeline.map((t) => `- ${t.label}: ${t.decision} (${t.policyId})`).join('\n')}`,
        maxTokens: 120,
        fallback: narration,
      })
      narration = r.text?.trim() || narration
    } catch {
      /* keep fallback */
    }
  }

  return { rogueId: ROGUE_ID, loanId: lid, narration, allBlocked, timeline }
}
