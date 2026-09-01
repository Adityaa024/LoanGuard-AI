import { getDb } from '../src/db/index.js';

async function inspectLoanId() {
  const db = await getDb();
  const badLoans = await db.all("SELECT * FROM loans WHERE loan_id = '250000'");
  console.log('Bad loans count:', badLoans.length);
  for (const l of badLoans) {
    console.log('Loan record:', { id: l.id, loan_id: l.loan_id, borrower: l.borrower_name, principal: l.principal_balance, status: l.validation_status });
    const ex = await db.all("SELECT * FROM exceptions WHERE loan_id = ?", [l.id]);
    console.log('Exceptions for this loan:', ex.map(e => ({ id: e.id, field: e.field, rule: e.rule_id, val: e.current_value, suggested: e.suggested_value, status: e.status, note: e.resolution_note })));
  }
}

inspectLoanId().catch(console.error);
