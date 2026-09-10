try {
  process.loadEnvFile('.env.local');
} catch {}
try {
  process.loadEnvFile('.env');
} catch {}

import { createRazorpayOrder, isRazorpayConfigured, verifyRazorpaySignature } from '../src/lib/razorpay';

async function testLiveRazorpay() {
  console.log('--- Testing Live Razorpay Test Mode Order Creation ---');
  console.log('isRazorpayConfigured():', isRazorpayConfigured());
  console.log('RAZORPAY_KEY_ID:', process.env.RAZORPAY_KEY_ID);

  if (!isRazorpayConfigured()) {
    console.error('Razorpay is not configured!');
    process.exit(1);
  }

  try {
    const order = await createRazorpayOrder({
      amountInPaise: 129900,
      currency: 'INR',
      receipt: `ADR-TEST-${Math.floor(100000 + Math.random() * 900000)}`,
      notes: {
        test: 'true',
        environment: 'localhost_verification'
      }
    });

    console.log('✅ Successfully created Razorpay Order in Test Mode:');
    console.log('Order ID:', order.id);
    console.log('Amount (in paise):', order.amount);
    console.log('Currency:', order.currency);
    console.log('Status:', order.status);

    // Test signature verification with dummy payment id & freshly signed HMAC
    const crypto = require('crypto');
    const dummyPaymentId = 'pay_TEST' + Math.floor(10000000 + Math.random() * 90000000);
    const validSig = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${order.id}|${dummyPaymentId}`)
      .digest('hex');

    const verified = verifyRazorpaySignature(order.id, dummyPaymentId, validSig);
    console.log('Signature verification check:', verified ? '✅ PASSED' : '❌ FAILED');

    const fakeSig = 'invalid_signature_hex';
    const rejected = !verifyRazorpaySignature(order.id, dummyPaymentId, fakeSig);
    console.log('Signature rejection of bad signature check:', rejected ? '✅ PASSED' : '❌ FAILED');

  } catch (err: any) {
    console.error('❌ Razorpay order creation failed:', err.message || err);
    process.exit(1);
  }
}

testLiveRazorpay();
