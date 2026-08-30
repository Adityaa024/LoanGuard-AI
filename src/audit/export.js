// Regulator-readable export of the audit trail (RUBRIC 9, and DEMO step "audit export produced").
// Produces JSON (machine) and Markdown (human/regulator) with the integrity attestation.

export function toJSON(audit, { policy } = {}) {
  return {
    title: 'THE HIVE — Governance Audit Export',
    generatedAt: new Date().toISOString(),
    synthetic: true,
    policy: policy || null,
    integrity: audit.verify(),
    entryCount: audit.size(),
    entries: audit.list(),
  }
}

export function toMarkdown(audit, { policy } = {}) {
  const entries = audit.list()
  const v = audit.verify()
  const lines = []
  lines.push('# THE HIVE — Governance Audit Export')
  lines.push('')
  lines.push(`Generated: ${new Date().toISOString()}  `)
  lines.push(`Entries: **${entries.length}**  `)
  lines.push(`Chain integrity: **${v.valid ? 'VERIFIED ✓' : `BROKEN at seq ${v.brokenAt} (${v.reason})`}**  `)
  if (policy) lines.push(`Policy: version ${policy.version}, domain \`${policy.domain}\`, tz ${policy.timezone}  `)
  lines.push('')
  lines.push('> Synthetic demonstration data. No real persons, institutions, or identifiers.')
  lines.push('')
  lines.push('Each entry is hash-chained to its predecessor; altering or removing any entry breaks the chain and is detected by `verify()`.')
  lines.push('')
  lines.push('| Seq | Time | Agent | Action | Policy | Decision | Esc | Authorizer | Reason |')
  lines.push('|----:|------|-------|--------|--------|----------|:---:|-----------|--------|')
  for (const e of entries) {
    const reason = (e.reason || '').replace(/\|/g, '\\|').slice(0, 80)
    lines.push(
      `| ${e.seq} | ${e.ts} | ${e.agentId} | ${e.actionType ?? ''} | ${e.policyId} | ${e.decision.toUpperCase()} | ${e.escalated ? '⚠︎' : ''} | ${e.authorizer} | ${reason} |`
    )
  }
  lines.push('')
  lines.push(`Chain head hash: \`${v.head || 'n/a'}\``)
  lines.push('')
  return lines.join('\n')
}
