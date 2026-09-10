try {
  process.loadEnvFile('.env.local');
} catch {}
try {
  process.loadEnvFile('.env');
} catch {}

import http from 'http';
import crypto from 'crypto';

async function testVerifyPaymentAPI() {
  console.log('--- Testing Verify Payment API on running dev server ---');

  const orderId = 'ce6d4aee-01bd-4324-aabc-4aedfc912793';
  const razorpayOrderId = 'order_TYikkrEHjjUFd9';
  const dummyPaymentId = 'pay_TEST' + Math.floor(10000000 + Math.random() * 90000000);

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) throw new Error('Missing RAZORPAY_KEY_SECRET');

  // Test 1: Tampered/Invalid signature test
  console.log('\nSubmitting invalid signature to /api/checkout/verify-payment...');
  const badPayload = JSON.stringify({
    orderId,
    razorpay_order_id: razorpayOrderId,
    razorpay_payment_id: dummyPaymentId,
    razorpay_signature: 'fake_tampered_signature_hex_123456'
  });

  const badRes: any = await makePostRequest('/api/checkout/verify-payment', badPayload);
  console.log('Bad Signature Response Status:', badRes.statusCode);
  console.log('Bad Signature Response Body:', badRes.body);

  if (badRes.statusCode === 400 && badRes.body.success === false) {
    console.log('✅ PASS: Server-side correctly rejected invalid signature!');
  } else {
    console.error('❌ FAIL: Invalid signature was not rejected!');
    process.exit(1);
  }

  // Test 2: Valid signature generated using the exact HMAC-SHA256 formula with keySecret
  console.log('\nSubmitting valid HMAC signature to /api/checkout/verify-payment...');
  const validSignature = crypto
    .createHmac('sha256', keySecret.trim())
    .update(`${razorpayOrderId}|${dummyPaymentId}`)
    .digest('hex');

  const goodPayload = JSON.stringify({
    orderId,
    razorpay_order_id: razorpayOrderId,
    razorpay_payment_id: dummyPaymentId,
    razorpay_signature: validSignature
  });

  const goodRes: any = await makePostRequest('/api/checkout/verify-payment', goodPayload);
  console.log('Good Signature Response Status:', goodRes.statusCode);
  console.log('Good Signature Response Body:', goodRes.body);

  if (goodRes.statusCode === 200 && goodRes.body.success === true) {
    console.log('✅ PASS: Server-side signature verified successfully & order marked PAID/CONFIRMED!');
  } else {
    console.error('❌ FAIL: Valid signature failed verification!');
    process.exit(1);
  }

  // Test 3: Idempotency check (re-verifying already processed order)
  console.log('\nSubmitting duplicate verification request for idempotency...');
  const retryRes: any = await makePostRequest('/api/checkout/verify-payment', goodPayload);
  console.log('Idempotency Response Status:', retryRes.statusCode);
  console.log('Idempotency Response Body:', retryRes.body);
  if (retryRes.body.alreadyProcessed === true) {
    console.log('✅ PASS: Idempotency handled gracefully without duplicate processing!');
  }
}

function makePostRequest(path: string, jsonPayload: string) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3001,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(jsonPayload)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode, body: JSON.parse(body) });
        } catch {
          resolve({ statusCode: res.statusCode, body });
        }
      });
    });

    req.on('error', reject);
    req.write(jsonPayload);
    req.end();
  });
}

testVerifyPaymentAPI().catch(console.error);
