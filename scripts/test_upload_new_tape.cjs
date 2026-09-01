const fs = require('fs');
const path = require('path');

async function testUpload() {
  const filePath = path.join(__dirname, '..', 'data', 'demo_institutional_tape_2026.csv');
  const content = fs.readFileSync(filePath, 'utf8');
  const fileName = 'demo_institutional_tape_2026.csv';
  
  // Login as operator
  const loginRes = await fetch('http://localhost:8080/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'aditya.raj@gmail.com', password: 'password123' })
  }).then(r => r.json());
  
  const token = loginRes.token;
  
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
  let body = '';
  body += `--${boundary}\r\n`;
  body += `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n`;
  body += `Content-Type: text/csv\r\n\r\n`;
  body += content;
  body += `\r\n--${boundary}--\r\n`;

  const uploadRes = await fetch('http://localhost:8080/api/upload?force=true', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'x-force-upload': 'true'
    },
    body: Buffer.from(body, 'utf-8')
  }).then(r => r.json());
  
  console.log('Upload Result:', JSON.stringify(uploadRes, null, 2));
}

testUpload().catch(console.error);
