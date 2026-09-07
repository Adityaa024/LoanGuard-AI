const fs = require('fs');
const path = require('path');

const states = ['CA', 'TX', 'FL', 'NY', 'IL', 'PA', 'OH', 'GA', 'NC', 'MI'];
const props = ['Single Family', 'Condo', 'Townhouse', 'Multi Family'];
const statuses = ['Current', 'Current', 'Current', 'Delinquent', 'Current'];

let csv = 'loan_id,borrower_name,origination_date,maturity_date,principal_balance,current_balance,interest_rate,monthly_payment,loan_status,property_type,ltv_ratio,credit_score,property_state,zip_code\n';

for (let i = 1; i <= 1000; i++) {
  const loanId = 'LN_STRESS_' + String(10000 + i);
  const name = 'Borrower_' + i;
  const origYear = 2020 + (i % 4);
  const origMonth = String(1 + (i % 12)).padStart(2, '0');
  const origDate = `${origYear}-${origMonth}-15`;
  const matDate = `${origYear + 30}-${origMonth}-15`;
  const principal = 200000 + (i * 175) % 400000;
  const balance = Math.round(principal * 0.96 * 100) / 100;
  const rate = Math.round((3.5 + (i % 45) * 0.1) * 100) / 100;
  const payment = Math.round((principal * (rate / 1200)) * 1.5 * 100) / 100;
  const status = statuses[i % statuses.length];
  const prop = props[i % props.length];
  const ltv = 60 + (i % 35);
  const credit = 620 + (i % 180);
  const state = states[i % states.length];
  const zip = String(10000 + (i * 37) % 89999);
  
  csv += `${loanId},${name},${origDate},${matDate},${principal.toFixed(2)},${balance.toFixed(2)},${rate},${payment.toFixed(2)},${status},${prop},${ltv},${credit},${state},${zip}\n`;
}

const targetPath = path.join(__dirname, '..', 'data', 'stress_benchmark_1000_tape.csv');
fs.writeFileSync(targetPath, csv);
console.log(`✅ Successfully generated 1,000 stress benchmark loans at ${targetPath}`);
