const fs = require('fs');
const path = require('path');

const targetDir = path.resolve(__dirname, '..', 'qa', 'test-data');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

console.log('Generating adversarial test datasets in:', targetDir);

// 1. clean_loans.csv (100% compliant)
const cleanRows = [
  'loan_id,borrower_name,property_state,principal_balance,interest_rate,origination_date,maturity_date,term_months,loan_purpose,payment_status,days_past_due,document_status,loan_status'
];
for (let i = 1; i <= 200; i++) {
  cleanRows.push(`LN_CLN_TEST_${i},Clean Borrower ${i},CA,${250000 + i * 100},4.50,2023-01-15,2053-01-15,360,Purchase,Current,0,Available,Active`);
}
fs.writeFileSync(path.join(targetDir, 'clean_loans.csv'), cleanRows.join('\n'));
console.log('✅ clean_loans.csv (200 records)');

// 2. adversarial_loans.csv (Testing all 16 PS defects + edge cases)
const advRows = [
  'loan_id,borrower_name,property_state,principal_balance,original_principal,current_balance,interest_rate,origination_date,maturity_date,term_months,loan_purpose,payment_status,days_past_due,document_status,loan_status,last_updated_at,source_system',
  // 1. Missing Loan ID
  ',Alice MissingID,CA,250000,250000,240000,4.50,2023-01-15,2053-01-15,360,Purchase,Current,0,Available,Active,2026-08-01,Origination_Tape',
  // 2. Duplicate Loan ID (will be uploaded twice or collide)
  'LN_ADV_DUP_001,Bob DuplicateOne,NY,300000,300000,290000,5.25,2022-05-10,2052-05-10,360,Refinance,Current,0,Available,Active,2026-08-01,Origination_Tape',
  'LN_ADV_DUP_001,Bob DuplicateTwo,NY,300000,300000,290000,5.25,2022-05-10,2052-05-10,360,Refinance,Current,0,Available,Active,2026-08-01,Origination_Tape',
  // 3. Duplicate Borrower + Amount + Date (Suspicious Repeated Borrower)
  'LN_ADV_COMBO_001,Charlie Repeat,TX,180000,180000,175000,6.00,2023-06-01,2053-06-01,360,Purchase,Current,0,Available,Active,2026-08-01,Origination_Tape',
  'LN_ADV_COMBO_002,Charlie Repeat,TX,180000,180000,175000,6.00,2023-06-01,2053-06-01,360,Purchase,Current,0,Available,Active,2026-08-01,Origination_Tape',
  // 4. Invalid Date Format
  'LN_ADV_DATE_INV,David BadDate,FL,220000,220000,215000,4.75,invalid-date,2053-01-15,360,Purchase,Current,0,Available,Active,2026-08-01,Origination_Tape',
  // 5. Maturity Before Origination (Inverted Dates)
  'LN_ADV_DATE_REV,Eve ReverseDate,WA,400000,400000,390000,3.85,2025-01-01,2020-01-01,360,Purchase,Current,0,Available,Active,2026-08-01,Origination_Tape',
  // 6. Negative Principal Balance
  'LN_ADV_BAL_NEG,Frank NegPrincipal,IL,-150000,-150000,-140000,5.00,2023-02-10,2053-02-10,360,Purchase,Current,0,Available,Active,2026-08-01,Origination_Tape',
  // 7. Negative Current Balance
  'LN_ADV_CURBAL_NEG,Grace NegCurrentBal,PA,200000,200000,-5000,4.25,2023-03-12,2053-03-12,360,Purchase,Current,0,Available,Active,2026-08-01,Origination_Tape',
  // 8. Balance > Principal (Negative Amortization / Over-balance)
  'LN_ADV_BALCAP,Harry OverBalance,OH,100000,100000,150000,6.50,2023-04-15,2053-04-15,360,Purchase,Current,0,Available,Active,2026-08-01,Origination_Tape',
  // 9. Interest Rate Outside Expected Range (Usurious > 25%)
  'LN_ADV_RATE_HIGH,Iris HighRate,NJ,320000,320000,310000,42.50,2023-05-20,2053-05-20,360,Purchase,Current,0,Available,Active,2026-08-01,Origination_Tape',
  // 10. Negative Interest Rate
  'LN_ADV_RATE_NEG,Jack NegRate,GA,280000,280000,275000,-3.50,2023-05-20,2053-05-20,360,Purchase,Current,0,Available,Active,2026-08-01,Origination_Tape',
  // 11. Payment Status Inconsistent with DPD (Current with DPD = 90)
  'LN_ADV_PAYST,Kelly DpdMismatch,NC,350000,350000,340000,4.15,2023-07-01,2053-07-01,360,Purchase,Current,90,Available,Active,2026-08-01,Origination_Tape',
  // 12. Missing Document Status
  'LN_ADV_DOC,Leo MissingDoc,AZ,290000,290000,280000,5.10,2023-08-15,2053-08-15,360,Purchase,Current,0,,Active,2026-08-01,Origination_Tape',
  // 13. Stale Record (> 90 days ago without servicer update)
  'LN_ADV_STALE,Mary StaleRecord,MI,210000,210000,205000,4.80,2021-01-01,2051-01-01,360,Purchase,Current,0,Available,Active,2024-01-01,Origination_Tape',
  // 14. Invalid State Code (Full state name 'california' or lowercase 'ny')
  'LN_ADV_STATE,Ned BadState,california,310000,310000,300000,4.50,2023-09-01,2053-09-01,360,Purchase,Current,0,Available,Active,2026-08-01,Origination_Tape',
  // 15. Closed Loan with Positive Balance
  'LN_ADV_CLOSED,Olivia ClosedWithBal,VA,190000,190000,45000,5.75,2022-10-10,2052-10-10,360,Purchase,Current,0,Available,Closed,2026-08-01,Origination_Tape',
  // 16. Missing Borrower Name
  'LN_ADV_BLANKBOR,,CO,260000,260000,250000,4.35,2023-11-12,2053-11-12,360,Purchase,Current,0,Available,Active,2026-08-01,Origination_Tape'
];
fs.writeFileSync(path.join(targetDir, 'adversarial_loans.csv'), advRows.join('\n'));
console.log('✅ adversarial_loans.csv (16 defect scenarios)');

// 3. conflicts.csv (Cross-source reconciliation conflict against baseline)
const conflictRows = [
  'loan_id,borrower_name,property_state,principal_balance,original_principal,current_balance,interest_rate,origination_date,maturity_date,term_months,loan_purpose,payment_status,days_past_due,document_status,loan_status,last_updated_at,source_system',
  'LN_CLN_TEST_1,Clean Borrower 1,CA,250100,250100,240000,4.50,2023-01-15,2053-01-15,360,Purchase,Delinquent,60,Available,Active,2026-08-30,Servicer_Update_Tape_A',
  'LN_CLN_TEST_2,Clean Borrower 2,CA,250200,250200,210000,4.50,2023-01-15,2053-01-15,360,Purchase,Current,0,Available,Active,2026-08-30,Servicer_Update_Tape_A'
];
fs.writeFileSync(path.join(targetDir, 'conflicts.csv'), conflictRows.join('\n'));
console.log('✅ conflicts.csv (Cross-source servicer update conflict)');

// 4. stress_1000.csv
const stress1k = [
  'loan_id,borrower_name,property_state,principal_balance,interest_rate,origination_date,maturity_date,term_months,loan_purpose,payment_status,days_past_due,document_status,loan_status'
];
for (let i = 1; i <= 1000; i++) {
  const isErr = i % 10 === 0;
  const balance = isErr ? -50000 : 150000 + i * 50;
  const rate = isErr ? 35.0 : 4.25;
  stress1k.push(`LN_STR_1K_${i},Stress Borrower ${i},CA,${balance},${rate},2023-01-01,2053-01-01,360,Purchase,Current,0,Available,Active`);
}
fs.writeFileSync(path.join(targetDir, 'stress_1000.csv'), stress1k.join('\n'));
console.log('✅ stress_1000.csv (1,000 records)');

// 5. stress_5000.csv
const stress5k = [
  'loan_id,borrower_name,property_state,principal_balance,interest_rate,origination_date,maturity_date,term_months,loan_purpose,payment_status,days_past_due,document_status,loan_status'
];
for (let i = 1; i <= 5000; i++) {
  const isErr = i % 20 === 0;
  const balance = isErr ? -75000 : 200000 + i * 25;
  const rate = isErr ? 45.0 : 5.0;
  stress5k.push(`LN_STR_5K_${i},Enterprise Borrower ${i},TX,${balance},${rate},2023-01-01,2053-01-01,360,Purchase,Current,0,Available,Active`);
}
fs.writeFileSync(path.join(targetDir, 'stress_5000.csv'), stress5k.join('\n'));
console.log('✅ stress_5000.csv (5,000 records)');
