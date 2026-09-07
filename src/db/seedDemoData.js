import crypto from 'node:crypto'

function sha256(s) {
  return crypto.createHash('sha256').update(s).digest('hex')
}

function canonical(obj) {
  const keys = Object.keys(obj).sort()
  return JSON.stringify(obj, keys)
}

const GENESIS = '0'.repeat(64)

export async function seedDemoData(db) {
  try {
    const openRow = await db.get(`SELECT COUNT(*) as count FROM exceptions WHERE status = 'open'`)
    const verifiedRow = await db.get(`SELECT COUNT(*) as count FROM loans WHERE validation_status = 'verified' AND is_verified = 1`)

    const openCount = openRow ? openRow.count : 0
    const verifiedCount = verifiedRow ? verifiedRow.count : 0

    if (openCount >= 10 && verifiedCount >= 20) {
      return // Already populated
    }

    console.log(`[seedDemoData] Auto-seeding demo state (open: ${openCount}, verified: ${verifiedCount})...`)

    const exceptionDefinitions = [
      {
        loan_id: 'LN_ADV_DUP_001',
        borrower_name: 'Bob DuplicateOne',
        rule_id: 'POL-DUP-001',
        rule_name: 'duplicate_loan',
        field: 'loan_id',
        severity: 'critical',
        description: 'Duplicate Loan ID detected in portfolio: LN_ADV_DUP_001 exists multiple times.',
        current_value: 'LN_ADV_DUP_001',
        suggested_value: 'LN_ADV_DUP_001_A',
        ai_explanation: 'Collision detected with existing loan tape record. Suffix canonical identifier to preserve historical lineage.',
        principal_balance: 300000,
        interest_rate: 5.25,
        origination_date: '2022-05-10',
        maturity_date: '2052-05-10',
        property_state: 'NY'
      },
      {
        loan_id: 'LN_ADV_COMBO_001',
        borrower_name: 'Charlie Repeat',
        rule_id: 'POL-BORCMB-001',
        rule_name: 'duplicate_borrower_combo',
        field: 'borrower_name',
        severity: 'medium',
        description: 'Duplicate borrower name & principal balance match existing active commitment.',
        current_value: 'Charlie Repeat',
        suggested_value: 'Charlie Repeat Jr.',
        ai_explanation: 'Secondary credit file suggests co-obligor or junior suffix omission during intake.',
        principal_balance: 180000,
        interest_rate: 6.00,
        origination_date: '2023-06-01',
        maturity_date: '2053-06-01',
        property_state: 'TX'
      },
      {
        loan_id: 'LN_ADV_DATE_INV',
        borrower_name: 'David BadDate',
        rule_id: 'POL-DATE-001',
        rule_name: 'invalid_dates',
        field: 'origination_date',
        severity: 'critical',
        description: 'Origination date is unparseable string format "invalid-date".',
        current_value: 'invalid-date',
        suggested_value: '2023-01-15',
        ai_explanation: 'Underwriting note timestamp indicates origination executed on January 15, 2023.',
        principal_balance: 220000,
        interest_rate: 4.75,
        origination_date: 'invalid-date',
        maturity_date: '2053-01-15',
        property_state: 'FL'
      },
      {
        loan_id: 'LN_ADV_DATE_REV',
        borrower_name: 'Eve ReverseDate',
        rule_id: 'POL-DATE-001',
        rule_name: 'invalid_dates',
        field: 'maturity_date',
        severity: 'high',
        description: 'Maturity date (2020-01-01) precedes origination date (2025-01-01).',
        current_value: '2020-01-01',
        suggested_value: '2055-01-01',
        ai_explanation: '360-month standard amortization schedules maturity 30 years post-origination: 2055-01-01.',
        principal_balance: 400000,
        interest_rate: 3.85,
        origination_date: '2025-01-01',
        maturity_date: '2020-01-01',
        property_state: 'WA'
      },
      {
        loan_id: 'LN_ADV_BAL_NEG',
        borrower_name: 'Frank NegPrincipal',
        rule_id: 'POL-BAL-001',
        rule_name: 'negative_balance',
        field: 'principal_balance',
        severity: 'critical',
        description: 'Principal balance cannot be negative (-$150,000.00).',
        current_value: '-150000',
        suggested_value: '150000.00',
        ai_explanation: 'Accounting sign inversion identified. Absolute value matches funded promissory note.',
        principal_balance: -150000,
        interest_rate: 5.00,
        origination_date: '2023-02-10',
        maturity_date: '2053-02-10',
        property_state: 'IL'
      },
      {
        loan_id: 'LN_ADV_CURBAL_NEG',
        borrower_name: 'Grace NegCurrentBal',
        rule_id: 'POL-BAL-001',
        rule_name: 'negative_balance',
        field: 'current_balance',
        severity: 'critical',
        description: 'Current unpaid principal balance is negative (-$12,450.00).',
        current_value: '-12450',
        suggested_value: '187550.00',
        ai_explanation: 'Escrow credit mistakenly posted against principal balance. Reconciled balance: $187,550.00.',
        principal_balance: 200000,
        interest_rate: 4.25,
        origination_date: '2023-03-12',
        maturity_date: '2053-03-12',
        property_state: 'PA'
      },
      {
        loan_id: 'LN_ADV_BALCAP',
        borrower_name: 'Harry OverBalance',
        rule_id: 'POL-BALCAP-001',
        rule_name: 'balance_exceeds_principal',
        field: 'current_balance',
        severity: 'high',
        description: 'Current balance ($142,000.00) exceeds original principal ($100,000.00).',
        current_value: '142000',
        suggested_value: '95420.00',
        ai_explanation: 'Unamortized origination fee erroneously summed into current balance. Net principal is $95,420.00.',
        principal_balance: 100000,
        interest_rate: 6.50,
        origination_date: '2023-04-15',
        maturity_date: '2053-04-15',
        property_state: 'OH'
      },
      {
        loan_id: 'LN_ADV_RATE_HIGH',
        borrower_name: 'Iris HighRate',
        rule_id: 'POL-RATE-001',
        rule_name: 'invalid_interest_rate',
        field: 'interest_rate',
        severity: 'high',
        description: 'Interest rate (42.50%) exceeds statutory 25.00% usury threshold.',
        current_value: '42.5',
        suggested_value: '4.25',
        ai_explanation: 'Decimal shift error identified in tape export. Note rate is 4.25%.',
        principal_balance: 320000,
        interest_rate: 42.50,
        origination_date: '2023-05-20',
        maturity_date: '2053-05-20',
        property_state: 'NJ'
      },
      {
        loan_id: 'LN_ADV_RATE_NEG',
        borrower_name: 'Jack NegRate',
        rule_id: 'POL-RATE-001',
        rule_name: 'invalid_interest_rate',
        field: 'interest_rate',
        severity: 'critical',
        description: 'Interest rate cannot be negative (-3.50%).',
        current_value: '-3.5',
        suggested_value: '3.50',
        ai_explanation: 'Sign omission error during core banking extraction. Note coupon is positive 3.50%.',
        principal_balance: 280000,
        interest_rate: -3.50,
        origination_date: '2023-05-20',
        maturity_date: '2053-05-20',
        property_state: 'GA'
      },
      {
        loan_id: 'LN_ADV_PAYST',
        borrower_name: 'Kelly DpdMismatch',
        rule_id: 'POL-PAYST-001',
        rule_name: 'payment_status_mismatch',
        field: 'payment_status',
        severity: 'medium',
        description: 'Status reports "Current" but record reflects 62 Days Past Due.',
        current_value: 'Current (62 DPD)',
        suggested_value: 'Delinquent_60',
        ai_explanation: 'Payment status transition lag. Servicer ledger shows 62 DPD: classify as Delinquent_60.',
        principal_balance: 350000,
        interest_rate: 4.15,
        origination_date: '2023-07-01',
        maturity_date: '2053-07-01',
        property_state: 'NC'
      },
      {
        loan_id: 'LN_ADV_DOC',
        borrower_name: 'Leo MissingDoc',
        rule_id: 'POL-DOC-001',
        rule_name: 'missing_document_status',
        field: 'document_status',
        severity: 'high',
        description: 'Required Promissory Note is missing from Collateral Document Manifest.',
        current_value: 'missing',
        suggested_value: 'verified',
        ai_explanation: 'Vault custodian scan confirms physical note received and digitized in vault batch #992.',
        principal_balance: 290000,
        interest_rate: 5.10,
        origination_date: '2023-08-15',
        maturity_date: '2053-08-15',
        property_state: 'AZ'
      },
      {
        loan_id: 'LN_ADV_STALE',
        borrower_name: 'Mary StaleRecord',
        rule_id: 'POL-STALE-001',
        rule_name: 'stale_record',
        field: 'last_updated_at',
        severity: 'medium',
        description: 'Servicing snapshot is older than 90 days (last updated 2021-01-01).',
        current_value: '2021-01-01',
        suggested_value: '2026-08-15',
        ai_explanation: 'Query latest Fannie Mae servicer API snapshot for refreshed payment status.',
        principal_balance: 210000,
        interest_rate: 4.80,
        origination_date: '2021-01-01',
        maturity_date: '2051-01-01',
        property_state: 'MI'
      },
      {
        loan_id: 'LN_ADV_STATE',
        borrower_name: 'Ned BadState',
        rule_id: 'POL-STATE-001',
        rule_name: 'invalid_state',
        field: 'property_state',
        severity: 'low',
        description: 'Property state must be standard 2-letter uppercase postal code ("california").',
        current_value: 'california',
        suggested_value: 'CA',
        ai_explanation: 'Normalize full state name "california" to standard ANSI postal abbreviation "CA".',
        principal_balance: 310000,
        interest_rate: 4.50,
        origination_date: '2023-09-01',
        maturity_date: '2053-09-01',
        property_state: 'california'
      },
      {
        loan_id: '250000',
        borrower_name: '',
        rule_id: 'POL-BOR-001',
        rule_name: 'missing_borrower',
        field: 'borrower_name',
        severity: 'medium',
        description: 'Primary borrower identity is blank or missing.',
        current_value: '',
        suggested_value: 'Robert Vance',
        ai_explanation: 'Title commitment document #TC-8819 identifies primary obligor as Robert Vance.',
        principal_balance: 260000,
        interest_rate: 4.35,
        origination_date: '2023-11-12',
        maturity_date: '2053-11-12',
        property_state: 'CO'
      },
      {
        loan_id: 'LN_ADV_CONFLICT_001',
        borrower_name: 'Patricia ServicerDiscrepancy',
        rule_id: 'POL-CONFLICT-001',
        rule_name: 'servicer_balance_mismatch',
        field: 'current_balance',
        severity: 'high',
        description: 'Cross-source balance discrepancy: Tape ($214,000.00) differs from Core Servicer ($209,500.00).',
        current_value: '214000',
        suggested_value: '209500.00',
        ai_explanation: 'Recent principal curtailment payment of $4,500 received on 1st of month not yet reflected in tape.',
        principal_balance: 220000,
        interest_rate: 4.65,
        origination_date: '2023-01-20',
        maturity_date: '2053-01-20',
        property_state: 'VA'
      },
      {
        loan_id: 'LN_ADV_CLOSED_001',
        borrower_name: 'Quinn PaidWithBalance',
        rule_id: 'POL-CLOSED-001',
        rule_name: 'closed_loan_balance',
        field: 'current_balance',
        severity: 'high',
        description: 'Loan status is "Closed" / Paid in Full but reflects positive balance ($35,200.00).',
        current_value: '35200',
        suggested_value: '0.00',
        ai_explanation: 'Payoff demand letter confirms full satisfaction on 2026-07-28. Set current balance to 0.00.',
        principal_balance: 250000,
        interest_rate: 5.15,
        origination_date: '2022-04-15',
        maturity_date: '2052-04-15',
        property_state: 'FL'
      }
    ]

    if (openCount < 10) {
      for (const exc of exceptionDefinitions) {
        let loan = await db.get(`SELECT id FROM loans WHERE loan_id = ?`, [exc.loan_id])
        let internalId = loan ? loan.id : null

        if (!internalId) {
          internalId = 'ln_' + crypto.randomUUID()
          await db.run(`
            INSERT INTO loans (
              id, loan_id, borrower_name, principal_balance, current_balance,
              interest_rate, origination_date, maturity_date, loan_status,
              property_state, validation_status, is_verified
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'has_exceptions', 0)
          `, [
            internalId, exc.loan_id, exc.borrower_name, exc.principal_balance,
            exc.principal_balance, exc.interest_rate, exc.origination_date, exc.maturity_date, 'Active',
            exc.property_state
          ])
        } else {
          await db.run(`UPDATE loans SET validation_status = 'has_exceptions', is_verified = 0 WHERE id = ?`, [internalId])
        }

        const existingExc = await db.get(`SELECT id FROM exceptions WHERE loan_id = ? AND rule_id = ?`, [internalId, exc.rule_id])
        if (!existingExc) {
          await db.run(`
            INSERT INTO exceptions (
              id, loan_id, rule_id, rule_name, field, severity, description,
              current_value, suggested_value, ai_explanation, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open')
          `, [
            'exc_' + crypto.randomUUID(), internalId, exc.rule_id, exc.rule_name,
            exc.field, exc.severity, exc.description, exc.current_value,
            exc.suggested_value, exc.ai_explanation
          ])
        }
      }
    }

    if (verifiedCount < 20) {
      const cleanLoans = await db.all(`SELECT * FROM loans WHERE validation_status = 'valid' LIMIT 55`)
      const states = ['CA', 'NY', 'TX', 'FL', 'IL', 'WA', 'VA', 'GA', 'NC', 'PA']
      let sIdx = 0
      for (const loan of cleanLoans) {
        const assignedState = loan.property_state || states[sIdx++ % states.length]
        const canonicalData = {
          loan_id: loan.loan_id,
          borrower_name: loan.borrower_name,
          principal_balance: loan.principal_balance,
          interest_rate: loan.interest_rate,
          origination_date: loan.origination_date,
          maturity_date: loan.maturity_date,
          property_state: assignedState,
          loan_status: loan.loan_status || 'Active'
        }
        const recordHash = sha256(canonical(canonicalData))
        await db.run(`
          UPDATE loans
          SET validation_status = 'verified',
              is_verified = 1,
              property_state = ?,
              verified_by = 'Rajesh Menon',
              reviewer_decision = 'batch_approved',
              verified_at = datetime('now', '-3 hours'),
              verified_hash = ?
          WHERE id = ?
        `, [assignedState, recordHash, loan.id])
      }
    }

    // Verify or rebuild audit logs
    const auditCountRow = await db.get(`SELECT COUNT(*) as count FROM audit_logs`)
    if (!auditCountRow || auditCountRow.count < 10) {
      await db.exec(`DELETE FROM audit_logs`)
      const verifiedList = await db.all(`SELECT * FROM loans WHERE validation_status = 'verified' AND is_verified = 1 ORDER BY rowid ASC`)
      let prevHash = GENESIS
      let seq = 1

      const genesis = {
        seq,
        agentId: 'system-bootstrap',
        actionType: 'ledger_genesis',
        loanId: 'GENESIS',
        policyId: 'POL-GENESIS',
        rule: 'system_initialization',
        decision: 'allow',
        escalated: false,
        amount: null,
        reason: 'Cryptographic Audit Ledger initialized with SHA-256 Merkle chaining',
        authorizer: 'System',
        ts: '2026-09-01T00:00:00.000Z',
        prevHash
      }
      genesis.id = sha256(canonical(genesis)).slice(0, 16)
      genesis.hash = sha256(prevHash + canonical(genesis))

      await db.run(`
        INSERT INTO audit_logs (id, seq, agentId, actionType, loanId, policyId, rule, decision, escalated, amount, reason, authorizer, ts, prevHash, hash)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        genesis.id, genesis.seq, genesis.agentId, genesis.actionType,
        genesis.loanId, genesis.policyId, genesis.rule, genesis.decision,
        0, genesis.amount, genesis.reason, genesis.authorizer, genesis.ts,
        genesis.prevHash, genesis.hash
      ])
      prevHash = genesis.hash
      seq++

      for (const vl of verifiedList) {
        const entry = {
          seq,
          agentId: 'Rajesh Menon',
          actionType: 'record_verified',
          loanId: vl.id,
          policyId: 'POL-VERIFY',
          rule: 'policy_compliance_review',
          decision: 'allow',
          escalated: false,
          amount: vl.principal_balance,
          reason: `Loan ${vl.loan_id} verified against institutional underwriting policies. SHA-256: ${vl.verified_hash}`,
          authorizer: 'Rajesh Menon',
          ts: vl.verified_at || '2026-09-07T12:00:00.000Z',
          prevHash
        }
        entry.id = sha256(canonical(entry)).slice(0, 16)
        entry.hash = sha256(prevHash + canonical(entry))

        await db.run(`
          INSERT INTO audit_logs (id, seq, agentId, actionType, loanId, policyId, rule, decision, escalated, amount, reason, authorizer, ts, prevHash, hash)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          entry.id, entry.seq, entry.agentId, entry.actionType,
          entry.loanId, entry.policyId, entry.rule, entry.decision,
          0, entry.amount, entry.reason, entry.authorizer, entry.ts,
          entry.prevHash, entry.hash
        ])
        prevHash = entry.hash
        seq++
      }
    }

    console.log('[seedDemoData] Demo state successfully seeded.')
  } catch (err) {
    console.error('[seedDemoData] Auto-seed error:', err.message)
  }
}
