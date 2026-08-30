// LocalPolicyEngine for Loan Data Verification
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import YAML from 'yaml'
import { DECISION, SEVERITY } from './policyTypes.js'
import { LoanSchema } from './schema.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const POLICY_DIR = path.resolve(__dirname, '..', '..', 'policies')

export class LocalPolicyEngine {
  constructor({ policyDir = POLICY_DIR } = {}) {
    this.policyDir = policyDir
    this.load()
  }

  load() {
    const raw = fs.readFileSync(path.join(this.policyDir, 'policies.yaml'), 'utf8')
    this.policy = YAML.parse(raw)
    this.rules = this.policy.rules
    this.timezone = this.policy.timezone || 'UTC'
    this.authoredRules = []
  }

  addRule(rule, { persist = true } = {}) {
    this.authoredRules = this.authoredRules.filter((r) => r.id !== rule.id)
    this.authoredRules.push(rule)
    return rule
  }

  isAppealable(rule) {
    if (!rule) return false
    return this.rules[rule]?.appealable === true
  }

  // ---- Loan Validation Rules ----

  checkNegativeBalance(action) {
    const r = this.rules.negative_balance
    if (!r.appliesTo.includes(action.type)) return null
    if (!action.record) return null
    
    if (action.record.principal_balance !== undefined && action.record.principal_balance < 0) {
      return {
        outcome: DECISION.ESCALATE,
        escalated: true,
        policyId: r.id,
        rule: 'negative_balance',
        reason: `Principal balance is negative: ${action.record.principal_balance}`,
        category: 'exception',
        field: 'principal_balance',
        severity: 'critical'
      }
    }
    return null
  }

  checkInvalidInterestRate(action) {
    const r = this.rules.invalid_interest_rate
    if (!r.appliesTo.includes(action.type)) return null
    if (!action.record || action.record.interest_rate === undefined || action.record.interest_rate === null) return null
    
    const rate = action.record.interest_rate
    if (rate < 0) {
      return {
        outcome: DECISION.ESCALATE,
        escalated: true,
        policyId: r.id,
        rule: 'invalid_interest_rate',
        reason: `Interest rate is negative: ${rate}`,
        category: 'exception',
        field: 'interest_rate',
        severity: 'critical'
      }
    }
    if (rate > 25) {
      return {
        outcome: DECISION.ESCALATE,
        escalated: true,
        policyId: r.id,
        rule: 'invalid_interest_rate',
        reason: `Interest rate > 25%: ${rate}`,
        category: 'exception',
        field: 'interest_rate',
        severity: 'high'
      }
    }
    return null
  }

  checkMissingBorrower(action) {
    const r = this.rules.missing_borrower
    if (!r.appliesTo.includes(action.type)) return null
    if (!action.record) return null
    
    if (!action.record.borrower_name || action.record.borrower_name.trim() === '') {
      return {
        outcome: DECISION.ESCALATE,
        escalated: true,
        policyId: r.id,
        rule: 'missing_borrower',
        reason: 'Borrower name is empty',
        category: 'exception',
        field: 'borrower_name',
        severity: 'high'
      }
    }
    return null
  }

  checkInvalidDates(action) {
    const r = this.rules.invalid_dates
    if (!r.appliesTo.includes(action.type)) return null
    if (!action.record || !action.record.origination_date || !action.record.maturity_date) return null
    
    const orig = new Date(action.record.origination_date)
    const mat = new Date(action.record.maturity_date)
    
    if (mat <= orig) {
      return {
        outcome: DECISION.ESCALATE,
        escalated: true,
        policyId: r.id,
        rule: 'invalid_dates',
        reason: `Maturity date (${action.record.maturity_date}) is not after origination date (${action.record.origination_date})`,
        category: 'exception',
        field: 'maturity_date',
        severity: 'medium'
      }
    }
    return null
  }

  checkInvalidState(action) {
    const r = this.rules.invalid_state
    if (!r.appliesTo.includes(action.type)) return null
    if (!action.record || !action.record.property_state) return null
    
    const state = action.record.property_state
    if (!/^[A-Z]{2}$/.test(state)) {
      return {
        outcome: DECISION.ESCALATE,
        escalated: true,
        policyId: r.id,
        rule: 'invalid_state',
        reason: `Property state must be 2 uppercase letters: ${state}`,
        category: 'exception',
        field: 'property_state',
        severity: 'low'
      }
    }
    return null
  }

  checkDuplicateLoan(action, ctx) {
    const r = this.rules.duplicate_loan
    if (!r.appliesTo.includes(action.type)) return null
    if (!action.record || !action.record.loan_id) return null
    
    // Ledger check for duplicates
    if (ctx.ledger && ctx.ledger.get(action.record.loan_id)) {
      return {
        outcome: DECISION.DENY,
        escalated: false,
        policyId: r.id,
        rule: 'duplicate_loan',
        reason: `Duplicate Loan ID detected: ${action.record.loan_id}`,
        category: 'rejection'
      }
    }
    return null
  }

  // ---- Evaluate ----
  evaluate(action, ctx = {}) {
    const now = ctx.now instanceof Date ? ctx.now : new Date()
    const context = { ...ctx, now }

    const checks = []
    
    // 1. Cross-row/DB Duplicate check
    const dupCheck = this.checkDuplicateLoan(action, context)
    if (dupCheck) checks.push(dupCheck)

    // 2. Zod Schema Validation
    if (action.record && ['ingest_loan_record', 'update_loan_record'].includes(action.type)) {
      const result = LoanSchema.safeParse(action.record)
      if (!result.success) {
        // Map Zod errors to policy violations
        result.error.errors.forEach(err => {
          let rule = 'validation_error'
          let policyId = 'POL-GEN-001'
          let severity = 'high'
          let outcome = DECISION.ESCALATE

          if (err.path.includes('principal_balance')) {
            policyId = this.rules.negative_balance?.id || 'POL-BAL-001'
            rule = 'negative_balance'
            severity = 'critical'
          } else if (err.path.includes('interest_rate')) {
            policyId = this.rules.invalid_interest_rate?.id || 'POL-RATE-001'
            rule = 'invalid_interest_rate'
            severity = err.message.includes('25%') ? 'high' : 'critical'
          } else if (err.path.includes('borrower_name')) {
            policyId = this.rules.missing_borrower?.id || 'POL-BOR-001'
            rule = 'missing_borrower'
            severity = 'high'
          } else if (err.path.includes('maturity_date')) {
            policyId = this.rules.invalid_dates?.id || 'POL-DATE-001'
            rule = 'invalid_dates'
            severity = 'medium'
          } else if (err.path.includes('property_state')) {
            policyId = this.rules.invalid_state?.id || 'POL-STATE-001'
            rule = 'invalid_state'
            severity = 'low'
          }

          checks.push({
            outcome,
            escalated: true,
            policyId,
            rule,
            reason: err.message,
            category: 'exception',
            field: err.path[0],
            severity
          })
        })
      }
    }

    if (checks.length === 0) {
      return {
        decision: DECISION.ALLOW,
        policyId: 'POL-ALLOW',
        rule: 'default_allow',
        reason: 'no policy violated',
        escalated: false,
        category: null,
        checks: [],
      }
    }

    // Pick the most severe outcome (deny > escalate).
    checks.sort((a, b) => SEVERITY[b.outcome] - SEVERITY[a.outcome])
    const governing = checks[0]
    
    return {
      decision: governing.outcome,
      policyId: governing.policyId,
      rule: governing.rule,
      reason: governing.reason,
      escalated: governing.outcome === DECISION.DENY ? !!governing.escalated : governing.outcome === DECISION.ESCALATE,
      category: governing.category ?? null,
      checks, // all violations
    }
  }

  describe() {
    return {
      version: this.policy.version,
      domain: this.policy.domain,
      ruleIds: Object.fromEntries(Object.entries(this.rules).map(([k, v]) => [k, v.id]))
    }
  }
}
