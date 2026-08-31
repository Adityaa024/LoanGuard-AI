const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const BASE_URL = 'http://localhost:8080';
let tokens = {};

async function login(email, password) {
  const r = await fetch(`${BASE_URL}/api/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  return await r.json();
}

async function api(path, method = 'GET', token = null, body = null) {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';
  
  const r = await fetch(`${BASE_URL}${path}`, {
    method, headers, body: body ? JSON.stringify(body) : undefined
  });
  
  const text = await r.text();
  try { return { status: r.status, data: JSON.parse(text) }; } 
  catch(e) { return { status: r.status, text }; }
}

async function upload(token, filePath) {
  const FormData = require('formdata-node').FormData;
  const { fileFromPathSync } = require('formdata-node/file-from-path');
  const fd = new FormData();
  fd.append('file', fileFromPathSync(filePath));
  
  const r = await fetch(`${BASE_URL}/api/upload`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: fd
  });
  return await r.json();
}

async function run() {
  console.log("=== STARTING API ATTACK SUITE ===");
  
  // 1. Auth & RBAC
  console.log("\n--- Testing Authentication & RBAC ---");
  const op = await login('aditya.raj@gmail.com', 'password123');
  const rev = await login('rajesh.menon@LoanGuard-AI.io', 'password123');
  const con = await login('ananya.iyer@LoanGuard-AI.io', 'password123');
  
  tokens.op = op.token; tokens.rev = rev.token; tokens.con = con.token;
  
  const conUpload = await api('/api/upload', 'POST', tokens.con);
  console.log(`Consumer Upload attempt status: ${conUpload.status} (Expected 403 or 400 for no file)`);
  
  const opReview = await api('/api/exceptions/123', 'PATCH', tokens.op, {action: 'resolve'});
  console.log(`Operator Review attempt status: ${opReview.status} (Expected 403)`);

  // 2. Data Ingestion (Malicious)
  console.log("\n--- Testing Malicious Ingestion ---");
  const malData = path.join(__dirname, '..', 'data', 'qa', 'malicious_loans.csv');
  const uploadRes = await upload(tokens.op, malData);
  console.log(`Malicious Upload Result:`, uploadRes);
  
  // 3. Fuzzing API Endpoints
  console.log("\n--- Testing API Fuzzing ---");
  const fuzzed = await api("/api/loans/' OR 1=1--", 'GET', tokens.con);
  console.log(`SQLi attempt on GET /loans/:id status: ${fuzzed.status}`);
  
  const xss = await api("/api/exceptions/123", 'PATCH', tokens.rev, { action: 'resolve', note: '<script>alert("XSS")</script>' });
  console.log(`XSS Injection on Exception Resolve status: ${xss.status}`);

  // 4. Exception Workflow
  console.log("\n--- Testing Exception Workflow ---");
  const excs = await api('/api/exceptions', 'GET', tokens.rev);
  if (excs.data.data && excs.data.data.length > 0) {
    const target = excs.data.data[0];
    console.log(`Testing AI Review on exc: ${target.id}`);
    const aiReview = await api('/api/ai-review', 'POST', tokens.rev, { exception_id: target.id });
    console.log(`AI Review Response:`, aiReview.data.success ? 'Success' : aiReview.data.error);
    
    // Double Submission Test
    console.log(`Testing double submission on resolve`);
    const p1 = api(`/api/exceptions/${target.id}`, 'PATCH', tokens.rev, { action: 'resolve', corrected_value: '100' });
    const p2 = api(`/api/exceptions/${target.id}`, 'PATCH', tokens.rev, { action: 'resolve', corrected_value: '200' });
    const res = await Promise.all([p1, p2]);
    console.log(`Double resolve status: [${res[0].status}, ${res[1].status}]`);
  }

  // 5. Audit Trail Consistency
  console.log("\n--- Verifying Audit Trail API ---");
  const summary = await api('/api/summary', 'GET');
  console.log(`System Summary:`, summary.data.data);
  
  console.log("\n=== ATTACK SUITE COMPLETE ===");
}

run().catch(console.error);
