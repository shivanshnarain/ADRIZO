try {
  process.loadEnvFile('.env.local');
} catch {}
try {
  process.loadEnvFile('.env');
} catch {}

import { createRazorpayOrder, isRazorpayConfigured, verifyRazorpaySignature } from '../src/lib/razorpay.ts';
import crypto from 'crypto';

async function testLiveRazorpay() {
  console.log('--- Testing Live Razorpay Order Creation ---');
  console.log('isRazorpayConfigured():', isRazorpayConfigured());

  if (!isRazorpayConfigured()) {
    console.error('Razorpay is not configured!');
    process.exit(1);
  }

  try {
    // 1. Test Online Payment order creation
    console.log('\n1. Testing Online Payment Order Creation (₹1299):');
    const onlineOrder = await createRazorpayOrder({
      amountInPaise: 129900,
      currency: 'INR',
      receipt: `ADR-ONL-${Math.floor(100000 + Math.random() * 900000)}`,
      notes: {
        paymentType: 'ONLINE_RAZORPAY',
        environment: 'live_credentials_verification'
      }
    });

    console.log('✅ Successfully created Online Payment Razorpay Order:');
    console.log('Order ID:', onlineOrder.id);
    console.log('Amount (in paise):', onlineOrder.amount);
    console.log('Currency:', onlineOrder.currency);
    console.log('Status:', onlineOrder.status);

    // 2. Test COD confirmation order creation (₹99)
    console.log('\n2. Testing COD Confirmation Order Creation (₹99):');
    const codOrder = await createRazorpayOrder({
      amountInPaise: 9900, // 9900 paise = ₹99
      currency: 'INR',
      receipt: `ADR-COD-${Math.floor(100000 + Math.random() * 900000)}`,
      notes: {
        paymentType: 'COD_CONFIRMATION',
        environment: 'live_credentials_verification'
      }
    });

    console.log('✅ Successfully created COD Confirmation Razorpay Order:');
    console.log('Order ID:', codOrder.id);
    console.log('Amount (in paise):', codOrder.amount);
    console.log('Currency:', codOrder.currency);
    console.log('Status:', codOrder.status);

    // 3. Test HMAC-SHA256 signature verification with dummy payment id
    const dummyPaymentId = 'pay_TEST' + Math.floor(10000000 + Math.random() * 90000000);
    const validSig = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(`${onlineOrder.id}|${dummyPaymentId}`)
      .digest('hex');

    const verified = verifyRazorpaySignature(onlineOrder.id, dummyPaymentId, validSig);
    console.log('\n3. Signature verification check:', verified ? '✅ PASSED' : '❌ FAILED');

    const fakeSig = 'invalid_signature_hex';
    const rejected = !verifyRazorpaySignature(onlineOrder.id, dummyPaymentId, fakeSig);
    console.log('Signature rejection of bad signature check:', rejected ? '✅ PASSED' : '❌ FAILED');

  } catch (err: any) {
    console.error('❌ Razorpay order creation failed:', err.message || err);
    process.exit(1);
  }
}

testLiveRazorpay();
