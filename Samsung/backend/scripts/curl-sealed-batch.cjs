/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '..', 'backend', '.env') });

const secret = process.env.SEALED_WEBHOOK_SECRET;
if (!secret) {
  console.error('Missing SEALED_WEBHOOK_SECRET');
  process.exit(1);
}
const url = 'https://blockchain-project-2-zwjg.onrender.com/api/events/warranty';

for (let i = 1; i <= 3; i++) {
  const payload = {
    eventType: 'REGISTER',
    warrantyRootId: `WROOT-CURLSIM3-${Date.now()}-${i}`,
    warrantyId: `WARID-CURLSIM3-${Date.now()}-${i}`,
    versionNo: 1,
    customer: { name: 'Curl Sim', email: 'curlsim3@example.com', phone: '12345678901' },
    product: { model: 'ModelX', serialNumber: 'SER123', imei: 'IMEI123', productId: 'P001' },
    warranty: { startDate: '2026-04-01', endDate: '2027-04-01', planType: 'STANDARD' },
  };
  const body = JSON.stringify(payload);
  const sig = crypto.createHmac('sha256', secret).update(body).digest('hex');
  const tmp = path.join(require('os').tmpdir(), `sealed-req-c-${i}.json`);
  fs.writeFileSync(tmp, body, 'utf8');
  console.log(`========== REQUEST ${i} ==========`);
  const cmd = `curl.exe -sS --max-time 120 -D - -o - -X POST ${JSON.stringify(url)} -H ${JSON.stringify('Content-Type: application/json')} -H ${JSON.stringify(`x-snovia-signature: ${sig}`)} --data-binary @${tmp.replace(/\\/g, '/')}`;
  try {
    console.log(execSync(cmd, { encoding: 'utf8', maxBuffer: 10485760 }));
  } catch (e) {
    console.log(String(e.stdout || e.stderr || e.message));
  }
  fs.unlinkSync(tmp);
}
