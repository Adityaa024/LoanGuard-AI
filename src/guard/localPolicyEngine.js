// LocalPolicyEngine for Loan Data Verification
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import YAML from 'yaml'
import { DECISION, SEVERITY } from './policyTypes.js'
import { LoanSchema } from './schema.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const POLICY_DIR = path.resolve(__dirname, '..', '..', 'policies')

export const WEEKDAY_NUM = {
  sunday: 7,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
  domingo: 7,
  lunes: 1,
  martes: 2,
  miercoles: 3,
  jueves: 4,
  viernes: 5,
  sabado: 6
}

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

    // Load validation_rules.json as first-class policy configuration
    try {
      const jsonRulesPath = path.resolve(this.policyDir, '..', 'data', 'validation_rules.json')
      if (fs.existsSync(jsonRulesPath)) {
        const jsonContent = JSON.parse(fs.readFileSync(jsonRulesPath, 'utf8'))
        this.jsonRules = jsonContent.rules || []
        // Pre-load active authored rules from validation_rules.json
        for (const jr of this.jsonRules) {
          if (jr.custom || jr.id.startsWith('POL-CUSTOM') || jr.id.startsWith('POL-RATE-CAP')) {
            this.authoredRules.push({
              id: jr.id,
              name: jr.name,
              description: jr.description,
              severity: jr.severity || 'high',
              field: Array.isArray(jr.fields) ? jr.fields[0] : (jr.field || 'interest_rate'),
              operator: jr.operator || (jr.max !== undefined ? '>' : '=='),
              value: jr.value !== undefined ? jr.value : (jr.max !== undefined ? jr.max : 0),
              is_active: true
            })
          }
        }
      } else {
        this.jsonRules = []
      }
    } catch (e) {
      this.jsonRules = []
    }
  }

  addRule(rule, { persist = true } = {}) {
    this.authoredRules = this.authoredRules.filter((r) => r.id !== rule.id)
    const normalized = {
      id: rule.id || `POL-CUSTOM-${Date.now()}`,
      name: rule.name || 'Custom Policy Rule',
      description: rule.description || '',
      severity: rule.severity || 'high',
      field: rule.field || 'interest_rate',
      operator: rule.operator || '>',
      value: rule.value !== undefined ? rule.value : 0,
      is_active: rule.is_active !== false,
      custom: true
    }
    this.authoredRules.push(normalized)

    if (persist) {
      try {
        const jsonRulesPath = path.resolve(this.policyDir, '..', 'data', 'validation_rules.json')
        let dataObj = { rules: [] }
        if (fs.existsSync(jsonRulesPath)) {
          dataObj = JSON.parse(fs.readFileSync(jsonRulesPath, 'utf8'))
        }
        dataObj.rules = (dataObj.rules || []).filter(r => r.id !== normalized.id)
        dataObj.rules.push({
          id: normalized.id,
          name: normalized.name,
          description: normalized.description,
          severity: normalized.severity,
          type: 'custom_dynamic',
          fields: [normalized.field],
          operator: normalized.operator,
          value: normalized.value,
          custom: true,
          activated_at: new Date().toISOString()
        })
        fs.writeFileSync(jsonRulesPath, JSON.stringify(dataObj, null, 2), 'utf8')
      } catch (err) {
        console.error('[LocalPolicyEngine] Failed to persist rule to validation_rules.json:', err.message)
      }
    }
    return normalized
  }

  getAllRules() {
    const builtinList = Object.entries(this.rules || {}).map(([key, val]) => ({
      id: val.id || key,
      key,
      name: key.replace(/_/g, ' ').toUpperCase(),
      severity: val.severity || 'medium',
      description: val.description || 'Builtin underwriting rule',
      category: 'builtin'
    }))
    const jsonList = (this.jsonRules || []).map(r => ({
      id: r.id,
      name: r.name,
      severity: r.severity || 'high',
      description: r.description,
      fields: r.fields || [r.field],
      category: r.custom ? 'custom_active' : 'statutory_dataset'
    }))
    return {
      builtin: builtinList,
      dataset_rules: jsonList,
      active_authored: this.authoredRules
    }
  }

  isAppealable(rule) {
    if (!rule) return false
    return this.rules[rule]?.appealable === true
  }

  // ---- Loan Validation Rules ----

  checkNegativeBalance(action) {
    const r = this.rules.negative_balance
    if (!r?.appliesTo?.includes(action.type)) return null
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
    if (!r?.appliesTo?.includes(action.type)) return null
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
    if (!r?.appliesTo?.includes(action.type)) return null
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
    if (!r?.appliesTo?.includes(action.type)) return null
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
    if (!r?.appliesTo?.includes(action.type)) return null
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
    if (!r?.appliesTo?.includes(action.type)) return null
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

  checkStaleRecord(action, ctx) {
    const r = this.rules.stale_record
    if (!r?.appliesTo?.includes(action.type)) return null
    if (!action.record || !action.record.last_updated_at) return null
    
    const lastUpdate = new Date(action.record.last_updated_at)
    const ageDays = (ctx.now - lastUpdate) / (1000 * 60 * 60 * 24)
    if (ageDays > 90) {
      return {
        outcome: DECISION.ESCALATE,
        escalated: true,
        policyId: r.id,
        rule: 'stale_record',
        reason: `Record is stale. Last updated ${Math.round(ageDays)} days ago.`,
        category: 'exception',
        field: 'last_updated_at',
        severity: 'low'
      }
    }
    return null
  }

  checkDuplicateBorrowerCombo(action, ctx) {
    const r = this.rules.duplicate_borrower_combo
    if (!r?.appliesTo?.includes(action.type)) return null
    if (!action.record || !action.record.borrower_name || !action.record.principal_balance || !action.record.origination_date) return null
    
    // Construct a composite key: Name_Amount_Date
    const comboKey = `${action.record.borrower_name}_${action.record.principal_balance}_${action.record.origination_date}`
    if (ctx.borrowerCombos && ctx.borrowerCombos.has(comboKey)) {
      return {
        outcome: DECISION.ESCALATE,
        escalated: true,
        policyId: r.id,
        rule: 'duplicate_borrower_combo',
        reason: `Suspicious duplicate borrower combo detected for: ${action.record.borrower_name}`,
        category: 'exception',
        field: 'borrower_name',
        severity: 'medium'
      }
    }
    
    if (ctx.borrowerCombos) {
      ctx.borrowerCombos.add(comboKey)
    }
    
    return null
  }

  checkCrossSourceConflict(action, ctx) {
    const r = this.rules.cross_source_conflict
    if (!r?.appliesTo?.includes(action.type)) return null
    if (!action.record || !ctx.existingLoanMap) return null
    
    const existing = ctx.existingLoanMap.get(action.record.loan_id)
    if (!existing) return null

    // Check for discrepancies between existing record and incoming secondary update
    if (action.record.source_system && action.record.source_system !== existing.source_system) {
      if (action.record.current_balance !== undefined && existing.current_balance !== undefined) {
        if (Math.abs(Number(action.record.current_balance) - Number(existing.current_balance)) > 0.01) {
          return {
            outcome: DECISION.ESCALATE,
            escalated: true,
            policyId: r.id,
            rule: 'cross_source_conflict',
            reason: `Conflicting current balance between ${existing.source_system || 'Baseline'} ($${existing.current_balance}) and ${action.record.source_system} ($${action.record.current_balance})`,
            category: 'exception',
            field: 'current_balance',
            severity: 'high'
          }
        }
      }
      if (action.record.payment_status && existing.payment_status && action.record.payment_status.toLowerCase() !== existing.payment_status.toLowerCase()) {
        return {
          outcome: DECISION.ESCALATE,
          escalated: true,
          policyId: r.id,
          rule: 'cross_source_conflict',
          reason: `Conflicting payment status: ${existing.source_system || 'Baseline'} reports "${existing.payment_status}" vs ${action.record.source_system} reports "${action.record.payment_status}"`,
          category: 'exception',
          field: 'payment_status',
          severity: 'high'
        }
      }
    }
    return null
  }

  // ---- Evaluate ----
  evaluate(action, ctx = {}) {
    const now = ctx.now instanceof Date ? ctx.now : new Date()
    const context = { ...ctx, now }

    const checks = []
    
    // Evaluate Authored Rules FIRST (from natural-language compilation)
    for (const rule of this.authoredRules) {
      if (rule.appliesTo && !rule.appliesTo.includes(action.type)) continue
      
      let violation = false
      if (rule.kind === 'contact_day') {
        const day = now.getUTCDay() || 7 // 1=Mon, 7=Sun
        if (rule.params.blockedWeekdays.includes(day)) violation = true
      }
      else if (rule.kind === 'amount_cap') {
        if (action.amount > rule.params.maxAmount) violation = true
      }
      else if (rule.kind === 'banned_phrase') {
        const txt = (action.text || '').toLowerCase()
        if (rule.params.phrases.some(p => txt.includes(p.toLowerCase()))) violation = true
      }
      else if (rule.field && action.record) {
        const val = action.record[rule.field]
        const numVal = parseFloat(val)
        const targetNum = parseFloat(rule.value)

        if (rule.operator === '>' && !isNaN(numVal) && !isNaN(targetNum)) {
          if (numVal > targetNum) violation = true
        } else if (rule.operator === '>=' && !isNaN(numVal) && !isNaN(targetNum)) {
          if (numVal >= targetNum) violation = true
        } else if (rule.operator === '<' && !isNaN(numVal) && !isNaN(targetNum)) {
          if (numVal < targetNum) violation = true
        } else if (rule.operator === '<=' && !isNaN(numVal) && !isNaN(targetNum)) {
          if (numVal <= targetNum) violation = true
        } else if (rule.operator === '==' || rule.operator === '=') {
          if (String(val) === String(rule.value)) violation = true
        } else if (rule.operator === '!=') {
          if (String(val) !== String(rule.value)) violation = true
        }
      }

      if (violation) {
        checks.push({
          outcome: (rule.onViolation === 'deny' || rule.severity === 'critical') ? DECISION.DENY : DECISION.ESCALATE,
          escalated: true,
          policyId: rule.id,
          rule: rule.name || rule.kind || 'dynamic_policy_violation',
          reason: rule.description || `${rule.field} (${action.record?.[rule.field]}) violates rule ${rule.operator} ${rule.value}`,
          field: rule.field || 'loan_id',
          severity: rule.severity || 'high',
          category: 'authored'
        })
      }
    }
    
    const dupCheck = this.checkDuplicateLoan(action, context)
    if (dupCheck) checks.push(dupCheck)
    
    const staleCheck = this.checkStaleRecord(action, context)
    if (staleCheck) checks.push(staleCheck)
    
    const comboCheck = this.checkDuplicateBorrowerCombo(action, context)
    if (comboCheck) checks.push(comboCheck)

    const conflictCheck = this.checkCrossSourceConflict(action, context)
    if (conflictCheck) checks.push(conflictCheck)

    // 2. Zod Schema Validation
    if (action.record && ['ingest_loan_record', 'update_loan_record'].includes(action.type)) {
      const result = LoanSchema.safeParse(action.record)
      if (!result.success) {
        const zodErrors = result.error?.issues || result.error?.errors || []
        zodErrors.forEach(err => {
          let rule = 'validation_error'
          let policyId = 'POL-GEN-001'
          let severity = 'high'
          let outcome = DECISION.ESCALATE

          const pathStr = Array.isArray(err.path) ? err.path.join('.') : String(err.path || '')
          const msgStr = String(err.message || '')

          if (pathStr.includes('principal_balance')) {
            policyId = this.rules.negative_balance?.id || 'POL-BAL-001'
            rule = 'negative_balance'
            severity = 'critical'
          } else if (pathStr.includes('interest_rate')) {
            policyId = this.rules.invalid_interest_rate?.id || 'POL-RATE-001'
            rule = 'invalid_interest_rate'
            severity = msgStr.includes('25%') ? 'high' : 'critical'
          } else if (pathStr.includes('borrower_name')) {
            policyId = this.rules.missing_borrower?.id || 'POL-BOR-001'
            rule = 'missing_borrower'
            severity = 'high'
          } else if (pathStr.includes('maturity_date')) {
            policyId = this.rules.invalid_dates?.id || 'POL-DATE-001'
            rule = 'invalid_dates'
            severity = 'medium'
          } else if (pathStr.includes('property_state')) {
            policyId = this.rules.invalid_state?.id || 'POL-STATE-001'
            rule = 'invalid_state'
            severity = 'low'
          } else if (pathStr.includes('current_balance')) {
            if (msgStr.includes('original principal')) {
              policyId = this.rules.balance_exceeds_principal?.id || 'POL-BALCAP-001'
              rule = 'balance_exceeds_principal'
              severity = 'high'
            } else if (msgStr.includes('closed')) {
              policyId = this.rules.closed_loan_balance?.id || 'POL-CLOSED-001'
              rule = 'closed_loan_balance'
              severity = 'high'
            } else {
              policyId = 'POL-BAL-002'
              rule = 'invalid_current_balance'
              severity = 'high'
            }
          } else if (pathStr.includes('payment_status')) {
            policyId = this.rules.payment_status_mismatch?.id || 'POL-PAYST-001'
            rule = 'payment_status_mismatch'
            severity = 'medium'
          } else if (pathStr.includes('document_status')) {
            policyId = this.rules.missing_document_status?.id || 'POL-DOC-001'
            rule = 'missing_document_status'
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
