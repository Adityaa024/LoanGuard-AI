const fs = require('fs');
const path = require('path');

const HEADERS = 'loan_id,borrower_name,property_state,principal_balance,interest_rate,origination_date,maturity_date';
const DIR = path.join(__dirname, '..', 'data', 'qa');
if (!fs.existsSync(DIR)) fs.mkdirSync(DIR);

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

// 1. Clean Loans (1000)
let clean = [HEADERS];
for (let i = 1; i <= 1000; i++) {
  clean.push(`LN_CLN_${i},Borrower ${i},CA,${rand(50000, 500000)},${(rand(10, 100)/10).toFixed(2)},2024-01-01,2054-01-01`);
}
fs.writeFileSync(path.join(DIR, 'clean_loans.csv'), clean.join('\n'));

// 2. Malicious/Adversarial Loans (100+)
let malicious = [HEADERS];
malicious.push(`,No ID Borrower,TX,100000,5.5,2024-01-01,2054-01-01`); // Missing ID
malicious.push(`LN_DUP_1,Dup One,TX,100000,5.5,2024-01-01,2054-01-01`); // Dup 1
malicious.push(`LN_DUP_1,Dup Two,NY,200000,6.5,2024-01-01,2054-01-01`); // Dup 2
malicious.push(`LN_MAL_1,Neg Balance,WA,-50000,5.5,2024-01-01,2054-01-01`); // Neg Bal
malicious.push(`LN_MAL_2,Neg Interest,FL,100000,-1.5,2024-01-01,2054-01-01`); // Neg Rate
malicious.push(`LN_MAL_3,High Interest,FL,100000,45.5,2024-01-01,2054-01-01`); // High Rate
malicious.push(`LN_MAL_4,Bad Dates,OH,100000,5.5,2024-01-01,2020-01-01`); // Mat < Orig
malicious.push(`LN_MAL_5,Bad State,california,100000,5.5,2024-01-01,2054-01-01`); // Bad State
malicious.push(`LN_MAL_6,,NV,100000,5.5,2024-01-01,2054-01-01`); // Empty Borrower
malicious.push(`LN_MAL_7,O'Connor <script>alert(1)</script>,OR,100000,5.5,2024-01-01,2054-01-01`); // XSS
malicious.push(`LN_MAL_8,Giant Value,CA,999999999999.99,5.5,2024-01-01,2054-01-01`); // Big Num
malicious.push(`LN_MAL_9,Nulls,NULL,NULL,NULL,NULL,NULL`); // Nulls
for(let i=10; i<=100; i++) {
    malicious.push(`LN_MAL_${i},Misc ${i},CA,-${rand(10,100)},45,2024-01-01,2020-01-01`);
}
fs.writeFileSync(path.join(DIR, 'malicious_loans.csv'), malicious.join('\n'));

// 3. Massive Loans (5000)
let massive = [HEADERS];
for (let i = 1; i <= 5000; i++) {
  massive.push(`LN_MSV_${i},Massive Borrower ${i},TX,${rand(50000, 500000)},${(rand(10, 100)/10).toFixed(2)},2024-01-01,2054-01-01`);
}
fs.writeFileSync(path.join(DIR, 'massive_loans.csv'), massive.join('\n'));

console.log('QA datasets generated in data/qa/');
