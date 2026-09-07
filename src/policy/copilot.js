// Opus 4.8 as an approval co-pilot. When an action escalates to the human inbox, Opus drafts a
// recommendation citing the matched policy, the amount/risk, and MASKED borrower context (last-4
// only — never full identifiers). The human still decides with one click; the recommendation and
// the human's decision are both logged. Opus advises; it never authorizes.

import { complete, isConfigured, modelName } from '../llm/anthropic.js'

const SYSTEM =
  'You are a compliance approval co-pilot for a regulated collections operation. Given a gated agent ' +
  'action, write 2–3 sentences recommending APPROVE or DENY for a human officer. You MUST cite the ' +
  'gating policy id verbatim. Use only the masked borrower reference provided (last-4 only); never ' +
  'invent identifiers. Be concise and decision-useful. You advise only — the human authorizes.'

/**
 * @param {object} ctx
 * @param {string} ctx.actionType
 * @param {number|null} ctx.amount
 * @param {string} ctx.policyId   the policy that gated the action
 * @param {object|null} ctx.loan  ledger loan (for masked borrower context)
 * @returns {Promise<{source:'opus'|'fallback', model:string, recommendation:string, policyId:string}>}
 */
export async function recommendApproval({ actionType, amount, policyId, loan }) {
  const last4 = String(loan?.accountId || '').slice(-4) || '????'
  const first = String(loan?.borrower || 'the borrower').split(' ')[0]
  const masked = `${first} (****${last4})`
  const amt = amount != null ? `$${Number(amount).toLocaleString()} MXN` : 'n/a'

  const fallback =
    `Recommend routing to manual review: a ${actionType} of ${amt} on account ****${last4} is gated by ` +
    `${policyId} because sensitive actions require human approval and the agent cannot self-approve. ` +
    `Confirm the borrower's standing and the officer's authority before approving (policy ${policyId}).`

  if (!isConfigured()) return { source: 'fallback', model: 'offline-fallback', recommendation: fallback, policyId }

  const r = await complete({
    system: SYSTEM,
    prompt:
      `Action: ${actionType}\nAmount: ${amt}\nBorrower (masked): ${masked}\nGating policy: ${policyId}\n` +
      `Reason gated: requires human approval; agent cannot self-approve.\n` +
      `Write the recommendation and cite ${policyId}.`,
    maxTokens: 200,
    fallback,
  })
  let recommendation = (r.text || fallback).trim()
  // Guarantee the citation is present (so the recommendation always references the real policy).
  if (!recommendation.includes(policyId)) recommendation = `${recommendation} (policy ${policyId})`
  return { source: r.source, model: r.source === 'opus' ? modelName() : 'offline-fallback', recommendation, policyId }
}
