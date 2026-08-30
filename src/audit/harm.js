// "Harm prevented" — quantifies what the Warden actually stopped, derived PURELY from the
// append-only audit log (never invented). Same data an auditor would recompute from the export.

export const PREVENTED_POLICIES = {
  scope: 'POL-SCOPE-001',
  hours: 'POL-HOURS-001',
  language: 'POL-LANG-001',
  gate: 'POL-GATE-001',
}

/**
 * @param {Array} entries  audit entries (e.g. audit.list() or the JSON export's `entries`)
 * @returns {{scopeDollarsBlocked:number, offHoursBlocked:number, bannedLanguageBlocked:number, selfApprovalsGated:number}}
 */
export function computePrevented(entries = []) {
  let scopeDollarsBlocked = 0
  let offHoursBlocked = 0
  let bannedLanguageBlocked = 0
  let selfApprovalsGated = 0
  for (const e of entries) {
    if (e.decision === 'deny' && e.policyId === PREVENTED_POLICIES.scope) scopeDollarsBlocked += Number(e.amount) || 0
    if (e.decision === 'deny' && e.policyId === PREVENTED_POLICIES.hours) offHoursBlocked += 1
    if (e.decision === 'deny' && e.policyId === PREVENTED_POLICIES.language) bannedLanguageBlocked += 1
    if (e.decision === 'escalate' && e.policyId === PREVENTED_POLICIES.gate) selfApprovalsGated += 1
  }
  return {
    scopeDollarsBlocked: Math.round(scopeDollarsBlocked * 100) / 100,
    offHoursBlocked,
    bannedLanguageBlocked,
    selfApprovalsGated,
  }
}
