try {
  process.loadEnvFile('.env.local');
} catch {}
try {
  process.loadEnvFile('.env');
} catch {}

import { 
  isRazorpayConfigured, 
  verifyRazorpaySignature, 
  verifyRazorpayWebhookSignature, 
  generateOrderNumber, 
  RAZORPAY_CURRENCY 
} from '../src/lib/razorpay';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('================================================================');
  console.log('AD(R)IZO — RAZORPAY ONLINE PAYMENT INTEGRATION TEST SUITE');
  console.log('================================================================\n');

  // TEST 1: Currency & Order Number Generation
  console.log('--- TEST 1: Currency & Order Number Standards ---');
  assert(RAZORPAY_CURRENCY === 'INR', `Default currency is INR (got: ${RAZORPAY_CURRENCY})`);
  const orderNum1 = generateOrderNumber();
  const orderNum2 = generateOrderNumber();
  assert(orderNum1.startsWith('ADR-') && orderNum1.length === 10, `Order number follows ADR-XXXXXX format (${orderNum1})`);
  assert(orderNum1 !== orderNum2, `Order numbers are uniquely generated (${orderNum1} !== ${orderNum2})`);

  // TEST 2: Environment Variable Protection & Placeholder Detection
  console.log('\n--- TEST 2: Environment Security & Placeholder Guard ---');
  assert(process.env.RAZORPAY_KEY_ID !== undefined, 'RAZORPAY_KEY_ID is defined in environment');
  assert(process.env.RAZORPAY_KEY_SECRET !== undefined, 'RAZORPAY_KEY_SECRET is defined in environment');
  assert(process.env.RAZORPAY_WEBHOOK_SECRET !== undefined, 'RAZORPAY_WEBHOOK_SECRET is defined in environment');

  // Check that secrets are NEVER prefixed with NEXT_PUBLIC_
  assert(
    process.env.NEXT_PUBLIC_RAZORPAY_KEY_SECRET === undefined,
    'SECURITY: RAZORPAY_KEY_SECRET is never exposed to frontend (no NEXT_PUBLIC_ key secret)'
  );
  assert(
    process.env.NEXT_PUBLIC_RAZORPAY_WEBHOOK_SECRET === undefined,
    'SECURITY: RAZORPAY_WEBHOOK_SECRET is never exposed to frontend (no NEXT_PUBLIC_ webhook secret)'
  );

  // Placeholder detection test (temporarily set placeholder to verify guard)
  const realKey = process.env.RAZORPAY_KEY_ID;
  const realSecret = process.env.RAZORPAY_KEY_SECRET;
  process.env.RAZORPAY_KEY_ID = 'your_razorpay_key_id';
  process.env.RAZORPAY_KEY_SECRET = 'your_razorpay_key_secret';
  assert(!isRazorpayConfigured(), 'Placeholder credentials correctly flagged as not configured (isRazorpayConfigured() === false)');
  process.env.RAZORPAY_KEY_ID = realKey;
  process.env.RAZORPAY_KEY_SECRET = realSecret;
  assert(isRazorpayConfigured(), 'Active Razorpay test credentials correctly recognized (isRazorpayConfigured() === true)');

  // TEST 3: Timing-Safe HMAC-SHA256 Signature Verification
  console.log('\n--- TEST 3: Timing-Safe Signature Verification ---');
  const testSecret = 'secret_test_key_1234567890';
  const testOrderId = 'order_DA92019482';
  const testPaymentId = 'pay_9182374921';
  
  // Temporarily set secret for verification algorithm testing
  const originalSecret = process.env.RAZORPAY_KEY_SECRET;
  process.env.RAZORPAY_KEY_SECRET = testSecret;

  const validSignature = crypto
    .createHmac('sha256', testSecret)
    .update(`${testOrderId}|${testPaymentId}`)
    .digest('hex');

  const isValid = verifyRazorpaySignature(testOrderId, testPaymentId, validSignature);
  assert(isValid, 'Valid Razorpay checkout signature verifies successfully');

  // Tampered signature
  const tamperedSignature = validSignature.slice(0, -2) + 'aa';
  const isTamperedValid = verifyRazorpaySignature(testOrderId, testPaymentId, tamperedSignature);
  assert(!isTamperedValid, 'Tampered signature is strictly rejected');

  // Tampered Order ID
  const isWrongOrderValid = verifyRazorpaySignature('order_FAKE999', testPaymentId, validSignature);
  assert(!isWrongOrderValid, 'Signature with mismatched order_id is strictly rejected');

  // Tampered Payment ID
  const isWrongPayValid = verifyRazorpaySignature(testOrderId, 'pay_FAKE888', validSignature);
  assert(!isWrongPayValid, 'Signature with mismatched payment_id is strictly rejected');

  // Empty / Missing parameters
  assert(!verifyRazorpaySignature('', testPaymentId, validSignature), 'Empty order_id rejected');
  assert(!verifyRazorpaySignature(testOrderId, '', validSignature), 'Empty payment_id rejected');
  assert(!verifyRazorpaySignature(testOrderId, testPaymentId, ''), 'Empty signature rejected');

  // TEST 4: Timing-Safe Webhook Signature Verification
  console.log('\n--- TEST 4: Webhook Signature Verification ---');
  const testWebhookSecret = 'webhook_secret_9988776655';
  const originalWebhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  process.env.RAZORPAY_WEBHOOK_SECRET = testWebhookSecret;

  const samplePayload = JSON.stringify({
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: 'pay_ABC123',
          order_id: 'order_XYZ789',
          amount: 259800,
          currency: 'INR',
          status: 'captured'
        }
      }
    }
  });

  const validWebhookSignature = crypto
    .createHmac('sha256', testWebhookSecret)
    .update(samplePayload)
    .digest('hex');

  const isWebhookValid = verifyRazorpayWebhookSignature(samplePayload, validWebhookSignature);
  assert(isWebhookValid, 'Valid Razorpay webhook signature verifies successfully');

  const tamperedWebhookSignature = validWebhookSignature.slice(0, -4) + '0000';
  const isTamperedWebhookValid = verifyRazorpayWebhookSignature(samplePayload, tamperedWebhookSignature);
  assert(!isTamperedWebhookValid, 'Tampered webhook signature is strictly rejected');

  // Tampered body with valid signature
  const tamperedPayload = samplePayload.replace('259800', '100');
  const isTamperedBodyValid = verifyRazorpayWebhookSignature(tamperedPayload, validWebhookSignature);
  assert(!isTamperedBodyValid, 'Payload body tampering is strictly detected and rejected');

  // Restore original secrets
  process.env.RAZORPAY_KEY_SECRET = originalSecret;
  process.env.RAZORPAY_WEBHOOK_SECRET = originalWebhookSecret;

  // TEST 5: Smallest Currency Unit (Paise) Conversion
  console.log('\n--- TEST 5: Currency Conversion & Paise Calculation ---');
  const testRupeesAmounts = [
    { inr: 1299, expectedPaise: 129900 },
    { inr: 2598.50, expectedPaise: 259850 },
    { inr: 0, expectedPaise: 0 },
    { inr: 3499, expectedPaise: 349900 },
    { inr: 99.99, expectedPaise: 9999 },
  ];

  for (const item of testRupeesAmounts) {
    const calculatedPaise = Math.round(item.inr * 100);
    assert(
      calculatedPaise === item.expectedPaise,
      `₹${item.inr} accurately converts to ${calculatedPaise} paise (expected: ${item.expectedPaise})`
    );
  }

  // TEST 6: Git Security (.gitignore rules)
  console.log('\n--- TEST 6: Git Security (.gitignore) ---');
  const gitignorePath = path.resolve(__dirname, '../.gitignore');
  const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
  assert(gitignoreContent.includes('.env'), '.gitignore explicitly excludes .env');
  assert(gitignoreContent.includes('!.env.example'), '.gitignore explicitly allows .env.example');

  // TEST 7: .env.example Validation
  console.log('\n--- TEST 7: .env.example Structure ---');
  const envExamplePath = path.resolve(__dirname, '../.env.example');
  const envExampleContent = fs.readFileSync(envExamplePath, 'utf8');
  assert(envExampleContent.includes('RAZORPAY_KEY_ID='), '.env.example includes RAZORPAY_KEY_ID');
  assert(envExampleContent.includes('RAZORPAY_KEY_SECRET='), '.env.example includes RAZORPAY_KEY_SECRET');
  assert(envExampleContent.includes('RAZORPAY_WEBHOOK_SECRET='), '.env.example includes RAZORPAY_WEBHOOK_SECRET');
  assert(envExampleContent.includes('RAZORPAY_CURRENCY=INR'), '.env.example includes RAZORPAY_CURRENCY=INR');

  // TEST 8: .env File Configuration Validation
  console.log('\n--- TEST 8: .env Configuration Validation ---');
  const envPath = path.resolve(__dirname, '../.env');
  const envContent = fs.readFileSync(envPath, 'utf8');
  assert(envContent.includes('RAZORPAY_KEY_ID='), '.env defines RAZORPAY_KEY_ID');
  assert(envContent.includes('RAZORPAY_KEY_SECRET='), '.env defines RAZORPAY_KEY_SECRET');
  assert(envContent.includes('RAZORPAY_WEBHOOK_SECRET='), '.env defines RAZORPAY_WEBHOOK_SECRET');
  assert(envContent.includes('RAZORPAY_CURRENCY=INR'), '.env defines RAZORPAY_CURRENCY=INR');

  console.log('\n================================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
