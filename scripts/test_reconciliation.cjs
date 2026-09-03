const fs = require('fs')
const path = require('path')
const { getDb } = require('../src/db')
const { getCanonicalVerifiedCount } = require('../src/audit/auditLog')

async function runTests() {
  console.log('--- RUNNING MATHEMATICAL RECONCILIATION TESTS ---')
  const db = await getDb()

  try {
    const totalLoans = (await db.get(`SELECT COUNT(*) as count FROM loans WHERE validation_status != 'pending'`)).count
    const validLoans = (await db.get(`SELECT COUNT(*) as count FROM loans WHERE validation_status = 'valid'`)).count
    const verifiedLoans = await getCanonicalVerifiedCount(db)
    const cleanRecords = validLoans + verifiedLoans
    
    // Affected records: unique loans that have either open exceptions or validation_status = 'has_exceptions'
    // To be perfectly rigorous, we should just query unique loans with open exceptions.
    // In our handleSummary, we use: 
    // const affectedRecords = (await db.get(`SELECT COUNT(DISTINCT loan_id) as count FROM exceptions WHERE status = 'open'`)).count || exceptionLoans
    const affectedRecords = (await db.get(`SELECT COUNT(DISTINCT loan_id) as count FROM exceptions WHERE status = 'open'`)).count

    const exceptionLoans = (await db.get(`SELECT COUNT(*) as count FROM loans WHERE validation_status = 'has_exceptions'`)).count

    console.log(`[DATA] Total Loans: ${totalLoans}`)
    console.log(`[DATA] Clean Records (valid + verified): ${cleanRecords}`)
    console.log(`[DATA] Affected Records (unique with open exceptions): ${affectedRecords}`)
    console.log(`[DATA] Exception Loans (validation_status = 'has_exceptions'): ${exceptionLoans}`)

    let allPassed = true

    // TEST-001: clean_records + affected_records == total_loans
    const mathTotal = cleanRecords + (affectedRecords || exceptionLoans)
    if (mathTotal === totalLoans) {
      console.log('✅ TEST-001 PASS: clean_records + affected_records == total_loans')
    } else {
      console.error(`❌ TEST-001 FAIL: ${cleanRecords} + ${affectedRecords || exceptionLoans} = ${mathTotal} != ${totalLoans}`)
      allPassed = false
    }

    // TEST-002: Exception occurrences >= Affected unique records
    const totalOpenExceptions = (await db.get(`SELECT COUNT(*) as count FROM exceptions WHERE status = 'open'`)).count
    if (totalOpenExceptions >= affectedRecords) {
      console.log(`✅ TEST-002 PASS: Total Open Exceptions (${totalOpenExceptions}) >= Affected Unique Loans (${affectedRecords})`)
    } else {
      console.error(`❌ TEST-002 FAIL: Total Open Exceptions (${totalOpenExceptions}) < Affected Unique Loans (${affectedRecords})`)
      allPassed = false
    }

    // TEST-003: No verified loans have open exceptions
    const verifiedWithOpen = await db.get(`
      SELECT COUNT(DISTINCT l.id) as count 
      FROM loans l 
      JOIN exceptions e ON l.id = e.loan_id 
      WHERE l.validation_status = 'verified' AND e.status = 'open'
    `)
    if (verifiedWithOpen.count === 0) {
      console.log('✅ TEST-003 PASS: No verified loans have open exceptions')
    } else {
      console.error(`❌ TEST-003 FAIL: ${verifiedWithOpen.count} verified loans have open exceptions`)
      allPassed = false
    }

    if (allPassed) {
      console.log('\n🎉 All Reconciliation Tests Passed!')
      process.exit(0)
    } else {
      console.log('\n💥 Reconciliation Tests Failed!')
      process.exit(1)
    }
  } catch (e) {
    console.error('Test execution failed:', e)
    process.exit(1)
  }
}

runTests()
