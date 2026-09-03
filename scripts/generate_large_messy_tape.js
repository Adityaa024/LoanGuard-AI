// Generator for a large, realistic messy loan tape containing all Section 7 intentional anomalies.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.join(__dirname, '..', 'data', 'large_messy_loan_tape.csv');

const FIRST_NAMES = ['James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer', 'Michael', 'Linda', 'David', 'Elizabeth', 'William', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen', 'Christopher', 'Nancy', 'Daniel', 'Lisa', 'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra', 'Donald', 'Ashley', 'Steven', 'Kimberly', 'Paul', 'Emily', 'Andrew', 'Donna', 'Joshua', 'Michelle'];
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson'];
const VALID_STATES = ['CA', 'NY', 'TX', 'FL', 'WA', 'IL', 'PA', 'OH', 'GA', 'NC', 'MI', 'NJ', 'VA', 'AZ', 'MA', 'TN', 'IN', 'MO', 'MD', 'WI', 'CO', 'MN', 'SC', 'AL', 'LA', 'KY', 'OR', 'OK', 'CT', 'UT'];
const INVALID_STATES = ['california', 'newyork', 'texas', 'XX', 'ZZ', '99', 'fl', 'unknown'];
const PROPERTY_TYPES = ['Single Family', 'Condo', 'Townhouse', 'Multi Family', 'Commercial'];
const LOAN_STATUSES = ['Current', '30 Days Delinquent', '60 Days Delinquent', '90+ Days Delinquent', 'Paid Off', 'Default'];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min, max, decimals = 2) {
  const str = (Math.random() * (max - min) + min).toFixed(decimals);
  return parseFloat(str);
}

function pad(n) {
  return n < 10 ? '0' + n : String(n);
}

function generateLargeMessyTape(totalRecords = 3000) {
  const headers = [
    'loan_id',
    'borrower_name',
    'origination_date',
    'maturity_date',
    'principal_balance',
    'current_balance',
    'interest_rate',
    'monthly_payment',
    'loan_status',
    'property_type',
    'property_state',
    'ltv_ratio',
    'credit_score',
    'zip_code'
  ];

  const rows = [];
  const generatedLoanIds = [];

  // Anomaly target counts
  const anomalyTargets = {
    missingId: Math.floor(totalRecords * 0.02),          // 2% missing IDs
    negativePrincipal: Math.floor(totalRecords * 0.02),  // 2% negative principal
    negativeRate: Math.floor(totalRecords * 0.02),       // 2% negative rate
    excessiveRate: Math.floor(totalRecords * 0.02),      // 2% rate > 25% (e.g. 35-50%)
    missingBorrower: Math.floor(totalRecords * 0.02),    // 2% missing borrower
    badDates: Math.floor(totalRecords * 0.03),           // 3% maturity before origination
    invalidState: Math.floor(totalRecords * 0.03),       // 3% invalid state codes
    duplicates: Math.floor(totalRecords * 0.04),         // 4% duplicate loan IDs
  };

  let anomalyCounters = {
    missingId: 0,
    negativePrincipal: 0,
    negativeRate: 0,
    excessiveRate: 0,
    missingBorrower: 0,
    badDates: 0,
    invalidState: 0,
    duplicates: 0,
  };

  for (let i = 1; i <= totalRecords; i++) {
    let loanId = `LN-${100000 + i}`;
    let borrowerName = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
    let origYear = randInt(2018, 2023);
    let origMonth = randInt(1, 12);
    let origDay = randInt(1, 28);
    let origDate = `${pad(origMonth)}/${pad(origDay)}/${origYear}`;
    let matYear = origYear + randInt(15, 30);
    let matDate = `${pad(origMonth)}/${pad(origDay)}/${matYear}`;
    
    let principal = randInt(150, 850) * 1000;
    let currentBalance = Math.round(principal * randFloat(0.6, 0.98));
    let interestRate = randFloat(3.25, 7.75);
    let monthlyPayment = randInt(1200, 4500);
    let loanStatus = pick(LOAN_STATUSES);
    let propType = pick(PROPERTY_TYPES);
    let state = pick(VALID_STATES);
    let ltv = randInt(55, 95);
    let creditScore = randInt(620, 820);
    let zipCode = String(randInt(10000, 99999));

    // Inject intentional anomalies
    if (anomalyCounters.missingId < anomalyTargets.missingId && Math.random() < 0.1) {
      loanId = '';
      anomalyCounters.missingId++;
    } else if (anomalyCounters.negativePrincipal < anomalyTargets.negativePrincipal && Math.random() < 0.1) {
      principal = -Math.abs(principal);
      anomalyCounters.negativePrincipal++;
    } else if (anomalyCounters.negativeRate < anomalyTargets.negativeRate && Math.random() < 0.1) {
      interestRate = -Math.abs(interestRate);
      anomalyCounters.negativeRate++;
    } else if (anomalyCounters.excessiveRate < anomalyTargets.excessiveRate && Math.random() < 0.1) {
      interestRate = randFloat(28.5, 48.0);
      anomalyCounters.excessiveRate++;
    } else if (anomalyCounters.missingBorrower < anomalyTargets.missingBorrower && Math.random() < 0.1) {
      borrowerName = '';
      anomalyCounters.missingBorrower++;
    } else if (anomalyCounters.badDates < anomalyTargets.badDates && Math.random() < 0.1) {
      // Invert dates so maturity is before origination
      matDate = `${pad(origMonth)}/${pad(origDay)}/${origYear - 5}`;
      anomalyCounters.badDates++;
    } else if (anomalyCounters.invalidState < anomalyTargets.invalidState && Math.random() < 0.1) {
      state = pick(INVALID_STATES);
      anomalyCounters.invalidState++;
    } else if (anomalyCounters.duplicates < anomalyTargets.duplicates && generatedLoanIds.length > 50 && Math.random() < 0.1) {
      loanId = pick(generatedLoanIds);
      anomalyCounters.duplicates++;
    }

    if (loanId) generatedLoanIds.push(loanId);

    rows.push([
      loanId,
      borrowerName,
      origDate,
      matDate,
      principal,
      currentBalance,
      interestRate,
      monthlyPayment,
      loanStatus,
      propType,
      state,
      ltv,
      creditScore,
      zipCode
    ].join(','));
  }

  const csv = [headers.join(','), ...rows].join('\n');
  
  const targetPaths = [
    OUTPUT_PATH,
    path.join(__dirname, '..', 'data', 'large_5k_loan_tape.csv'),
    path.join(__dirname, '..', 'public', 'large_messy_loan_tape.csv'),
    path.join(__dirname, '..', 'public', 'large_5k_loan_tape.csv'),
    path.join(__dirname, '..', 'web', 'public', 'large_messy_loan_tape.csv'),
    path.join(__dirname, '..', 'web', 'public', 'large_5k_loan_tape.csv'),
    path.join(__dirname, '..', 'web', 'dist', 'large_messy_loan_tape.csv'),
    path.join(__dirname, '..', 'web', 'dist', 'large_5k_loan_tape.csv')
  ];

  for (const p of targetPaths) {
    try {
      const dir = path.dirname(p);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(p, csv, 'utf8');
      console.log(`Wrote ${totalRecords} records to ${p}`);
    } catch (err) {
      console.warn(`Could not write to ${p}:`, err.message);
    }
  }

  console.log('Anomaly Injections Summary:', anomalyCounters);
  const totalAnomalies = Object.values(anomalyCounters).reduce((a, b) => a + b, 0);
  console.log(`Total Expected Exceptions: ${totalAnomalies} (~${((totalAnomalies / totalRecords) * 100).toFixed(1)}% exception rate)`);
  console.log(`Expected Clean Records: ${totalRecords - totalAnomalies} (~${(((totalRecords - totalAnomalies) / totalRecords) * 100).toFixed(1)}% clean rate)`);
}

generateLargeMessyTape(5000);

