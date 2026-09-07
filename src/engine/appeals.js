// Multi-Agent Appeals (governed negotiation) — additive, isolated.
//
// When the Warden DENIES an action, an Appeals agent (appeals-01) files an appeal: Opus 4.8 builds
// an argument from MASKED loan context, and the Warden rules live through the SAME Guard seam
// (guard.reviewAppeal): UPHELD ("policy immutable") for hard-floor rules, or OVERTURNED → routed to
// the human inbox for discretionary rules. An appeal NEVER auto-grants (RUBRIC 8 preserved).
//
// Two hash-chained audit kinds are written: `appeal.filed` (the argument) and `appeal.ruling`
// (the verdict, written by the Guard). Everything is emitted over SSE as `appeal` events.
// Offline (HIVE_OFFLINE=1): a canned argument is used so the flow runs end-to-end without a key.

import { DECISION, AUTHORIZER } from '../guard/policyTypes.js'
import { complete, isConfigured } from '../llm/anthropic.js'

const APPEALS_AGENT = 'appeals-01'

// Canned, case-appropriate arguments for offline/no-key runs (and as LLM fallback).
function cannedArgument(rule) {
  if (rule === 'frequency_cap') {
    return 'Borrower explicitly requested this follow-up after two missed calls during a hospital stay; ' +
      'a third contact this week is solely to confirm the payment plan they asked us to set up. Requesting human review.'
  }
  if (rule === 'sensitive_actions') {
    return 'Borrower qualifies for hardship restructuring under documented circumstances; requesting a human officer review the terms.'
  }
  // immutable rules — the argument will be rejected, but the appeal is still recorded
  return 'Borrower has a long on-time history and disputes this action; requesting reconsideration of the denial.'
}

// Build the Appeals agent's argument from MASKED loan context (never full identifiers).
export async function draftArgument({ originalAction, originalDecision, ledger }) {
  const rule = originalDecision?.rule
  const loan = ledger?.get?.(originalAction.loanId) || null
  const ctx = loan
    ? {
        accountLast4: String(loan.accountId || '').slice(-4),
        balance: loan.balance,
        daysPastDue: loan.daysPastDue,
        riskTier: loan.riskTier,
        product: loan.product,
      }
    : {}
  const fallback = cannedArgument(rule)
  if (!isConfigured()) return { source: 'fallback', text: fallback }
  try {
    const r = await complete({
      system:
        'You are appeals-01, an AI appeals agent in a governed collections system. Given a DENIED action, ' +
        'its policy reason, and MASKED borrower context, write ONE concise, good-faith sentence arguing the ' +
        'action deserves human reconsideration. Never request to bypass policy; never reveal full identifiers. English.',
      prompt:
        `Denied action: ${originalAction.type} on account ****${ctx.accountLast4 ?? '????'}\n` +
        `Policy: ${originalDecision.policyId} (${rule}) — ${originalDecision.reason}\n` +
        `Masked context: balance ${ctx.balance} MXN, ${ctx.daysPastDue} days past due, risk ${ctx.riskTier}, product ${ctx.product}\n` +
        `Write the one-sentence appeal argument.`,
      maxTokens: 120,
      fallback,
    })
    return { source: r.source, text: (r.text || '').trim() || fallback }
  } catch {
    return { source: 'fallback', text: fallback }
  }
}

/**
 * File an appeal against a denied action and have the Warden rule on it.
 * @param {object} deps  { guard, audit, events, orchestrator, ledger }
 * @param {object} args  { originalAction, originalDecision, context }
 * @returns {{argument, source, ruling, policyId, rule, reason, inboxId, auditSeq}}
 */
export async function fileAppeal({ guard, audit, events, orchestrator, ledger }, { originalAction, originalDecision, context = {} }) {
  const ts = (context.now instanceof Date ? context.now : new Date()).toISOString()
  const { text: argument, source } = await draftArgument({ originalAction, originalDecision, ledger })

  // 1) appeal.filed — recorded on the hash chain + emitted over SSE (the argument).
  const filed = audit.append({
    agentId: APPEALS_AGENT,
    actionType: 'appeal.filed',
    loanId: originalAction.loanId ?? null,
    policyId: originalDecision.policyId,
    rule: 'appeal',
    decision: DECISION.ESCALATE, // an appeal under review; not an allow
    escalated: false,
    amount: originalAction.amount ?? null,
    reason: `appeal filed by ${APPEALS_AGENT}: ${String(argument).slice(0, 200)}`,
    authorizer: AUTHORIZER.SYSTEM,
    ts,
  })
  if (events) {
    events.emit('appeal', {
      status: 'filed',
      agentId: APPEALS_AGENT,
      originalAgentId: originalAction.agentId,
      policyId: originalDecision.policyId,
      loanId: originalAction.loanId ?? null,
      argument,
      reason: `appeal filed against ${originalDecision.policyId}`,
      auditSeq: filed.seq,
    })
  }

  // 2) The Warden rules through the SAME seam. Logs appeal.ruling + emits the verdict.
  const ruling = guard.reviewAppeal(
    {
      agentId: originalAction.agentId,
      actionType: originalAction.type,
      loanId: originalAction.loanId ?? null,
      amount: originalAction.amount ?? null,
      policyId: originalDecision.policyId,
      rule: originalDecision.rule,
      decision: originalDecision.decision,
    },
    { agentId: APPEALS_AGENT, argument, originalAgentId: originalAction.agentId },
    { now: new Date(ts) }
  )

  // 3) Overturned → route the ORIGINAL action to the human inbox (no auto-grant).
  let inboxId = null
  if (ruling.ruling === 'overturned') {
    const item = orchestrator.enqueueAppealReview(originalAction, {
      policyId: originalDecision.policyId,
      reason: `overturned on appeal (${originalDecision.policyId}) → human review`,
    })
    inboxId = item.id
  }

  return { argument, source, ...ruling, inboxId }
}

/**
 * Demo driver: construct a genuinely-DENIED action for each tier, show the denial (via dispatch),
 * then file the appeal. Deterministic and safe for a live demo.
 * @param {'immutable'|'discretionary'} caseKind
 */
export async function runAppealDemo({ guard, audit, events, orchestrator, ledger }, caseKind = 'discretionary') {
  // Pick DISTINCT delinquent loans per case so a seeded frequency loan never pre-empts the
  // banned-language (immutable) case on a shared loan.
  const delinquent = []
  for (const l of ledger.byId.values()) {
    if (l.status === 'delinquent') { delinquent.push(l); if (delinquent.length >= 2) break }
  }
  while (delinquent.length < 2) delinquent.push(ledger.byId.values().next().value)
  const loan = caseKind === 'immutable' ? delinquent[0] : delinquent[1]
  const loanId = loan.loanId

  // Fixed in-hours clock so the GOVERNING rule is deterministic regardless of wall-clock
  // (otherwise an off-hours run would let contact_hours pre-empt banned_language / frequency_cap).
  const now = new Date('2026-06-12T18:00:00Z') // Fri 12:00 in America/Mexico_City

  let originalAction
  if (caseKind === 'immutable') {
    // banned-language outreach → DENY POL-LANG-001 (immutable) → appeal UPHELD
    originalAction = {
      type: 'outreach', agentId: 'collector-01', loanId, channel: 'sms',
      identifier: loan.accountId,
      text: 'Si no paga hoy te vamos a embargar y habrá consecuencias.',
    }
  } else {
    // 3rd-contact-in-7-days → DENY POL-FREQ-001 (discretionary) → appeal OVERTURNED → human
    ledger.recordContact(loanId, new Date(now.getTime() - 2 * 86400000).toISOString())
    ledger.recordContact(loanId, new Date(now.getTime() - 1 * 86400000).toISOString())
    originalAction = {
      type: 'outreach', agentId: 'collector-01', loanId, channel: 'sms',
      identifier: loan.accountId,
      text: `Hola, le confirmamos su plan de pago de la cuenta ****${String(loan.accountId).slice(-4)}. Gracias.`,
    }
  }

  // Show the denial as a real governed decision (emits action + decision events, logs it).
  const { decision } = await orchestrator.dispatch(originalAction, { now })
  // Only appeal genuine denials; if somehow not denied, still record the (no-op) appeal honestly.
  const appeal = await fileAppeal(
    { guard, audit, events, orchestrator, ledger },
    { originalAction, originalDecision: decision, context: { now } }
  )

  return {
    case: caseKind,
    originalAgentId: originalAction.agentId,
    loanId,
    denied: { decision: decision.decision, policyId: decision.policyId, rule: decision.rule, reason: decision.reason },
    appeal,
  }
}
