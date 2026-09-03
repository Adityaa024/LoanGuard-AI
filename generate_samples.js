import fs from 'fs';
import path from 'path';
import { getDb } from './src/db/index.js';

async function generate() {
  const db = await getDb();
  
  // 1. Generate verified_dataset_sample.csv
  const verifiedLoans = await db.all(`
    SELECT * FROM loans WHERE validation_status = 'verified' OR is_verified = 1
  `);
  
  if (verifiedLoans.length > 0) {
    const headers = Object.keys(verifiedLoans[0]).join(',');
    const rows = verifiedLoans.map(loan => {
      return Object.values(loan).map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });
    const csvContent = headers + '\n' + rows.join('\n');
    fs.writeFileSync('verified_dataset_sample.csv', csvContent);
    console.log(`Generated verified_dataset_sample.csv with ${verifiedLoans.length} records.`);
  } else {
    console.log('No verified loans found to export.');
  }

  // 2. Generate audit_trail_sample.json
  // Just get the audit logs for the first verified loan
  if (verifiedLoans.length > 0) {
    const targetLoan = verifiedLoans[0].loan_id;
    const auditLogs = await db.all(`
      SELECT * FROM audit_logs WHERE loanId = ? ORDER BY seq ASC
    `, [targetLoan]);
    
    fs.writeFileSync('audit_trail_sample.json', JSON.stringify(auditLogs, null, 2));
    console.log(`Generated audit_trail_sample.json for loan ${targetLoan} with ${auditLogs.length} events.`);
  }
}

generate().catch(console.error);
