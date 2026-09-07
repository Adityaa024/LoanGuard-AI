// Shared types/constants for the governance seam. Kept domain-agnostic.

export const DECISION = Object.freeze({
  ALLOW: 'allow',
  DENY: 'deny',
  ESCALATE: 'escalate',
})

export const AUTHORIZER = Object.freeze({
  SYSTEM: 'system',
  HUMAN: 'human',
})

// Decision severity for picking the single governing outcome when several rules apply.
// deny is the most restrictive, then escalate (held for human), then allow.
export const SEVERITY = { [DECISION.ALLOW]: 0, [DECISION.ESCALATE]: 1, [DECISION.DENY]: 2 }

// Normalize text for banned-language / matching: lowercase, strip accents/diacritics, collapse ws.
export function normalizeText(s) {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip combining marks (accents)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

// An Action is what an agent attempts. Domain-agnostic envelope; finance fields are optional.
//   { type, agentId, loanId?, amount?, text?, identifier?, channel?,
//     extractedAmount?, ledgerExpected?, source?, meta? }
// A Decision is what the Warden returns:
//   { decision, policyId, rule, reason, escalated, category, checks[], action, ts }
