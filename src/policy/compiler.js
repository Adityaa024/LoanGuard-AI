// Natural-language → policy compiler. A non-engineer types a governance rule in English or
// Spanish; Opus 4.8 compiles it (via tool-use, so the output is a STRUCTURED rule, not prose)
// into the engine's authored-rule grammar. We validate against the schema before it is ever
// allowed near the authority file. Offline (no key / HIVE_OFFLINE=1) → a deterministic mini-parser
// handles the demo sentences so the path never blocks on an API call.

import YAML from 'yaml'
import { extractStructured, isConfigured, modelName } from '../llm/anthropic.js'
import { WEEKDAY_NUM } from '../guard/localPolicyEngine.js'
import { normalizeText } from '../guard/policyTypes.js'

const KINDS = ['contact_day', 'amount_cap', 'banned_phrase', 'contact_hours']
const ACTION_TYPES = ['outreach', 'transfer', 'payment_post', 'write_off', 'restructure', 'bureau_report', 'risk_score']
const ON_VIOLATION = ['deny', 'escalate', 'deny_and_escalate']

// The target grammar handed to Opus as a tool. The model MUST emit an object of this shape.
export const POLICY_TOOL = {
  name: 'emit_policy_rule',
  description:
    'Compile a plain-language governance rule into a structured policy rule for THE HIVE. ' +
    'Choose the single best kind:\n' +
    '- contact_day: block outbound contact on given weekdays. params={blockedWeekdays:[1-7]} (1=Mon..7=Sun).\n' +
    '- amount_cap: block a money action above a limit. params={maxAmount:<number>}.\n' +
    '- banned_phrase: block outbound text containing phrases. params={phrases:[string,...]}.\n' +
    '- contact_hours: restrict outbound contact to an hour window. params={startHour:<0-23>,endHour:<0-24>}.\n' +
    'appliesTo lists the action types the rule governs (outreach for contact rules; transfer/payment_post/etc for amount).',
  input_schema: {
    type: 'object',
    additionalProperties: false,
    required: ['kind', 'appliesTo', 'onViolation', 'params', 'description'],
    properties: {
      kind: { type: 'string', enum: KINDS },
      appliesTo: { type: 'array', items: { type: 'string', enum: ACTION_TYPES }, minItems: 1 },
      onViolation: { type: 'string', enum: ON_VIOLATION },
      params: { type: 'object' },
      description: { type: 'string' },
    },
  },
}

const SYSTEM =
  'You are a compliance policy compiler. Convert the user\'s plain-language rule (English or Spanish) ' +
  'into exactly one structured policy rule by calling emit_policy_rule. Pick sensible params. ' +
  'Contact/outreach rules applyTo ["outreach"]. Default onViolation to "deny" unless the user asks for ' +
  'human approval (then "escalate").'

// ---- Deterministic offline mini-parser (demo sentences, EN + ES) ----
function fallbackParse(text) {
  const t = normalizeText(text)

  // contact-day: a weekday word + a contact verb
  const dayWord = Object.keys(WEEKDAY_NUM).find((d) => t.includes(d) || t.includes(d.replace(/s$/, '')))
  const mentionsContact = /(contact|outreach|call|message|sms|contacto|contactar|llamar|mensaje)/.test(t)
  if (dayWord && mentionsContact) {
    const wd = WEEKDAY_NUM[dayWord]
    return {
      kind: 'contact_day',
      appliesTo: ['outreach'],
      onViolation: 'deny',
      params: { blockedWeekdays: [wd] },
      description: `No outbound contact on weekday ${wd}`,
    }
  }

  // amount cap on transfers/payments
  const amt = t.match(/(?:over|above|more than|greater than|exceed(?:ing)?|mayor(?:es)? a|mas de|superior(?:es)? a)\s*\$?\s*([\d.,]+)/)
  if (amt && /(transfer|transferencia|payment|pago|move|mover)/.test(t)) {
    const maxAmount = Number(amt[1].replace(/[.,](?=\d{3}\b)/g, '').replace(/,/g, ''))
    return {
      kind: 'amount_cap',
      appliesTo: /payment|pago/.test(t) ? ['payment_post', 'transfer'] : ['transfer'],
      onViolation: 'deny',
      params: { maxAmount },
      description: `Block ${/payment|pago/.test(t) ? 'payments/transfers' : 'transfers'} over ${maxAmount}`,
    }
  }

  // banned phrase
  const phrase = text.match(/(?:word|phrase|term|palabra|frase|termino|término)\s+["“']?([^"”'.]+)["”']?/i)
  if (phrase && /(ban|block|forbid|prohib|no use|no usar|no decir)/.test(t)) {
    const p = phrase[1].trim()
    return {
      kind: 'banned_phrase',
      appliesTo: ['outreach'],
      onViolation: 'deny',
      params: { phrases: [p] },
      description: `Block outbound text containing "${p}"`,
    }
  }

  return null
}

function slugId(rule) {
  if (rule.kind === 'contact_day') return `POL-AUTH-DAY-${(rule.params.blockedWeekdays || []).join('')}`
  if (rule.kind === 'amount_cap') return `POL-AUTH-CAP-${rule.params.maxAmount}`
  if (rule.kind === 'banned_phrase') return `POL-AUTH-LANG-${normalizeText((rule.params.phrases || [])[0] || '').replace(/\s+/g, '_').slice(0, 16)}`
  if (rule.kind === 'contact_hours') return `POL-AUTH-HRS-${rule.params.startHour}-${rule.params.endHour}`
  return `POL-AUTH-${rule.kind}`
}

// Validate a compiled rule against the grammar. NEVER write unvalidated model output anywhere.
export function validateRule(rule) {
  const errors = []
  if (!rule || typeof rule !== 'object') return { valid: false, errors: ['no rule object'] }
  if (!KINDS.includes(rule.kind)) errors.push(`kind must be one of ${KINDS.join(', ')}`)
  if (!Array.isArray(rule.appliesTo) || rule.appliesTo.length === 0) errors.push('appliesTo must be a non-empty array')
  else for (const a of rule.appliesTo) if (!ACTION_TYPES.includes(a)) errors.push(`unknown action type "${a}"`)
  if (!ON_VIOLATION.includes(rule.onViolation)) errors.push(`onViolation must be one of ${ON_VIOLATION.join(', ')}`)
  const p = rule.params || {}
  if (rule.kind === 'contact_day') {
    if (!Array.isArray(p.blockedWeekdays) || !p.blockedWeekdays.every((d) => d >= 1 && d <= 7)) errors.push('contact_day needs params.blockedWeekdays of 1..7')
  } else if (rule.kind === 'amount_cap') {
    if (!(Number(p.maxAmount) > 0)) errors.push('amount_cap needs params.maxAmount > 0')
  } else if (rule.kind === 'banned_phrase') {
    if (!Array.isArray(p.phrases) || p.phrases.length === 0) errors.push('banned_phrase needs params.phrases')
  } else if (rule.kind === 'contact_hours') {
    if (!(p.startHour >= 0 && p.endHour <= 24 && p.startHour < p.endHour)) errors.push('contact_hours needs 0<=startHour<endHour<=24')
  }
  if (!rule.description) errors.push('description required')
  return { valid: errors.length === 0, errors }
}

export function ruleToYaml(rule) {
  return YAML.stringify({ rules: [rule] })
}

/**
 * Compile NL → a validated rule (does NOT apply it). Returns { rule, yaml, valid, errors, source }.
 */
export async function compilePolicy(text) {
  if (!text || !text.trim()) return { rule: null, valid: false, errors: ['empty input'], source: 'none' }

  let raw = null
  let source = 'fallback'
  if (isConfigured()) {
    const fb = fallbackParse(text)
    const res = await extractStructured({ system: SYSTEM, prompt: text, tool: POLICY_TOOL, fallback: fb })
    raw = res.data
    source = res.source
  } else {
    raw = fallbackParse(text)
    source = 'fallback'
  }

  if (!raw) {
    return { rule: null, valid: false, errors: ['could not interpret the rule — try e.g. “no contact on Sundays” or “block transfers over $2,000”'], source }
  }

  const rule = {
    id: slugId(raw),
    kind: raw.kind,
    appliesTo: raw.appliesTo,
    onViolation: raw.onViolation || 'deny',
    params: raw.params || {},
    description: raw.description || text,
    sourceText: text,
  }
  const { valid, errors } = validateRule(rule)
  return { rule, yaml: ruleToYaml(rule), valid, errors, source, model: source === 'opus' ? modelName() : 'offline-fallback' }
}
