const fs = require('fs');
const path = require('path');

async function seedRender() {
  const BASE_URL = 'https://loanguard-ai-uql9.onrender.com';
  console.log('Connecting to', BASE_URL);
  
  // 1. Login Operator
  const opLogin = await fetch(BASE_URL + '/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'aditya.raj@gmail.com', password: 'password123' })
  }).then(r => r.json());
  const opToken = opLogin.token;
  console.log('Operator logged in:', opLogin.user.name);

  // Helper upload function using standard FormData & Blob
  async function uploadFile(filePath, sourceType) {
    const fileBuffer = fs.readFileSync(path.resolve(__dirname, '..', filePath));
    const fileName = path.basename(filePath);
    const blob = new Blob([fileBuffer], { type: 'text/csv' });
    const formData = new FormData();
    formData.append('file', blob, fileName);
    formData.append('source_type', sourceType);

    const res = await fetch(BASE_URL + '/api/upload?force=true', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + opToken,
        'x-force-upload': 'true'
      },
      body: formData
    });
    return res.json();
  }

  console.log('Uploading data/qa/clean_loans.csv (1000 clean loans)...');
  const rClean = await uploadFile('data/qa/clean_loans.csv', 'primary_tape');
  console.log('clean_loans result:', rClean.success, 'records:', rClean.recordsProcessed, 'valid:', rClean.validCount, 'exceptions:', rClean.exceptionCount);

  console.log('Uploading data/qa/sample_ui_test_tape.csv...');
  const rSample = await uploadFile('data/qa/sample_ui_test_tape.csv', 'primary_tape');
  console.log('sample_ui_test_tape result:', rSample.success, 'records:', rSample.recordsProcessed, 'valid:', rSample.validCount, 'exceptions:', rSample.exceptionCount);

  console.log('Uploading data/qa/malicious_loans.csv...');
  const r2 = await uploadFile('data/qa/malicious_loans.csv', 'primary_tape');
  console.log('malicious_loans result:', r2.success, 'records:', r2.recordsProcessed, 'valid:', r2.validCount, 'exceptions:', r2.exceptionCount);

  console.log('Uploading data/servicer_update.csv...');
  const r3 = await uploadFile('data/servicer_update.csv', 'servicer_update');
  console.log('servicer_update result:', r3.success, 'records:', r3.recordsProcessed);

  console.log('Uploading data/document_manifest.csv...');
  const r4 = await uploadFile('data/document_manifest.csv', 'document_manifest');
  console.log('document_manifest result:', r4.success, 'records:', r4.recordsProcessed);

  // 2. Login Reviewer and resolve a couple of exceptions so Data Consumer has verified loans
  const revLogin = await fetch(BASE_URL + '/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'rajesh.menon@loanguard.ai', password: 'password123' })
  }).then(r => r.json());
  const revToken = revLogin.token;

  const excs = await fetch(BASE_URL + '/api/exceptions', {
    headers: { 'Authorization': 'Bearer ' + revToken }
  }).then(r => r.json());
  console.log('Open exceptions on Render:', excs.data ? excs.data.length : 0);

  if (excs.data && excs.data.length >= 3) {
    for (let i = 0; i < 3; i++) {
      const e = excs.data[i];
      const resolveRes = await fetch(BASE_URL + '/api/exceptions/' + e.id, {
        method: 'PATCH',
        headers: {
          'Authorization': 'Bearer ' + revToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'resolve',
          corrected_value: e.suggested_value || '4.50',
          note: 'Approved during baseline verification on deployment'
        })
      }).then(r => r.json());
      console.log('Resolved exception', e.loan_id, ':', resolveRes.success);
    }
  }

  // Check summary
  const summary = await fetch(BASE_URL + '/api/summary').then(r => r.json());
  console.log('\nUpdated Summary on Render:\n', JSON.stringify(summary.data, null, 2));

  // Check verified loans
  const verified = await fetch(BASE_URL + '/api/verified-loans', {
    headers: { 'Authorization': 'Bearer ' + revToken }
  }).then(r => r.json());
  console.log('\nVerified Loans on Render:', verified.data ? verified.data.length : 0);
}

seedRender().catch(console.error);
