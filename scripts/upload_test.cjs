const fs = require('fs');
const FormData = require('form-data');

async function login() {
  const loginRes = await fetch('http://localhost:8080/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'operator' })
  });
  const data = await loginRes.json();
  return data.token;
}

async function uploadFile(token) {
  const filePath = 'd:/intain/data/large_messy_loan_tape.csv';
  
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath));

  console.log('Starting upload of 3000 rows...');
  const start = Date.now();
  
  // Need to use node-fetch since FormData boundary might not be handled natively properly with streams in native fetch sometimes, but let's try native fetch first.
  const res = await fetch('http://localhost:8080/api/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: form,
    duplex: 'half'
  });
  
  const json = await res.json();
  const time = Date.now() - start;
  
  console.log(`Upload Time: ${time}ms`);
  console.log(JSON.stringify(json, null, 2));
}

async function run() {
  const token = await login();
  await uploadFile(token);
}

run().catch(console.error);
