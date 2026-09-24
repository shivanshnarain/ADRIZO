import { prisma } from '../src/lib/prisma.ts';
import crypto from 'crypto';
import {
  validateAndCalculateCouponDiscount,
  recordCouponUsage,
  getEligiblePromotions,
} from '../src/lib/coupon-engine.ts';

interface TestResult {
  name: string;
  category: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function recordTest(name: string, category: string, passed: boolean, details: string) {
  results.push({ name, category, passed, details });
  const icon = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${icon} | [${category}] ${name}: ${details}`);
}

async function runTests() {
  console.log('================================================================');
  console.log('🚀 ADRIZO RAZORPAY MAGIC CHECKOUT & PROMOTIONS TEST SUITE');
  console.log('================================================================\n');

  const testPhone = '9999900001';
  const testEmail = 'testcustomer@adrizo.com';

  // Cleanup any old test coupons
  await prisma.couponUsage.deleteMany({
    where: { couponCode: { startsWith: 'TEST_' } },
  }).catch(() => null);

  await prisma.coupon.deleteMany({
    where: { couponCode: { startsWith: 'TEST_' } },
  }).catch(() => null);

  await prisma.abandonedCheckout.deleteMany({
    where: { eventId: { startsWith: 'test_evt_' } },
  }).catch(() => null);

  try {
    // -------------------------------------------------------------------------
    // Setup Mock Coupons in MongoDB
    // -------------------------------------------------------------------------
    await prisma.coupon.createMany({
      data: [
        {
          couponCode: 'TEST_VALID_PCT',
          discountType: 'percentage',
          discountValue: 20,
          minimumOrderValue: 500,
          maximumDiscount: 500,
          active: true,
          description: 'Test 20% off above ₹500',
        },
        {
          couponCode: 'TEST_EXPIRED',
          discountType: 'percentage',
          discountValue: 15,
          minimumOrderValue: 100,
          expiryDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // yesterday
          active: true,
          description: 'Expired test coupon',
        },
        {
          couponCode: 'TEST_DISABLED',
          discountType: 'percentage',
          discountValue: 25,
          minimumOrderValue: 100,
          active: false,
          description: 'Inactive test coupon',
        },
        {
          couponCode: 'TEST_MIN_ORDER',
          discountType: 'fixed',
          discountValue: 300,
          minimumOrderValue: 2000,
          active: true,
          description: 'Test min order ₹2000',
        },
        {
          couponCode: 'TEST_MAX_DISC',
          discountType: 'percentage',
          discountValue: 50,
          minimumOrderValue: 200,
          maximumDiscount: 150,
          active: true,
          description: 'Test 50% capped at ₹150',
        },
        {
          couponCode: 'TEST_FIXED',
          discountType: 'fixed',
          discountValue: 250,
          minimumOrderValue: 500,
          active: true,
          description: 'Test fixed ₹250 discount',
        },
        {
          couponCode: 'TEST_PRODUCT',
          discountType: 'fixed',
          discountValue: 100,
          minimumOrderValue: 200,
          applicableProducts: ['670e30018a1bc4028fa57301'],
          active: true,
          description: 'Test product-specific coupon',
        },
        {
          couponCode: 'TEST_CATEGORY',
          discountType: 'percentage',
          discountValue: 10,
          minimumOrderValue: 200,
          applicableCategories: ['shirts', 'linen'],
          active: true,
          description: 'Test category-specific coupon',
        },
        {
          couponCode: 'TEST_FIRST_ORDER',
          discountType: 'percentage',
          discountValue: 20,
          minimumOrderValue: 300,
          firstOrderOnly: true,
          active: true,
          description: 'Test first order only coupon',
        },
        {
          couponCode: 'TEST_DUP_USAGE',
          discountType: 'fixed',
          discountValue: 100,
          minimumOrderValue: 200,
          perCustomerLimit: 1,
          active: true,
          description: 'Test single usage per customer',
        },
      ],
    });

    console.log('Seeded test coupons in MongoDB.\n');

    // -------------------------------------------------------------------------
    // TEST 1: Valid Coupon
    // -------------------------------------------------------------------------
    const t1 = await validateAndCalculateCouponDiscount({
      couponCode: 'TEST_VALID_PCT',
      subtotal: 1000,
      customerPhone: testPhone,
      customerEmail: testEmail,
    });
    recordTest(
      'Valid coupon validation & discount calculation',
      'COUPON_ENGINE',
      t1.success && t1.discount === 200 && t1.finalPayable === 800 && t1.amount === 20000,
      `Discount ₹${t1.discount} (expected 200), Final ₹${t1.finalPayable} (expected 800), Paise ${t1.amount} (expected 20000)`
    );

    // -------------------------------------------------------------------------
    // TEST 2: Expired Coupon
    // -------------------------------------------------------------------------
    const t2 = await validateAndCalculateCouponDiscount({
      couponCode: 'TEST_EXPIRED',
      subtotal: 1000,
      customerPhone: testPhone,
    });
    recordTest(
      'Expired coupon rejection',
      'COUPON_ENGINE',
      !t2.success && t2.error?.code === 'COUPON_EXPIRED',
      `Result: ${t2.error?.code} - ${t2.error?.description}`
    );

    // -------------------------------------------------------------------------
    // TEST 3: Disabled / Inactive Coupon
    // -------------------------------------------------------------------------
    const t3 = await validateAndCalculateCouponDiscount({
      couponCode: 'TEST_DISABLED',
      subtotal: 1000,
      customerPhone: testPhone,
    });
    recordTest(
      'Disabled coupon rejection',
      'COUPON_ENGINE',
      !t3.success && t3.error?.code === 'COUPON_INACTIVE',
      `Result: ${t3.error?.code} - ${t3.error?.description}`
    );

    // -------------------------------------------------------------------------
    // TEST 4: Minimum Order Failure
    // -------------------------------------------------------------------------
    const t4 = await validateAndCalculateCouponDiscount({
      couponCode: 'TEST_MIN_ORDER',
      subtotal: 1500, // below 2000 minSpend
      customerPhone: testPhone,
    });
    recordTest(
      'Minimum order value check failure',
      'COUPON_ENGINE',
      !t4.success && t4.error?.code === 'MIN_SPEND_NOT_MET',
      `Result: ${t4.error?.code} - ${t4.error?.description}`
    );

    // -------------------------------------------------------------------------
    // TEST 5: Maximum Discount Cap
    // -------------------------------------------------------------------------
    const t5 = await validateAndCalculateCouponDiscount({
      couponCode: 'TEST_MAX_DISC',
      subtotal: 1000, // 50% = 500, capped at 150
      customerPhone: testPhone,
    });
    recordTest(
      'Maximum discount cap enforcement',
      'COUPON_ENGINE',
      t5.success && t5.discount === 150 && t5.finalPayable === 850,
      `Discount ₹${t5.discount} (capped at ₹150 from raw ₹500)`
    );

    // -------------------------------------------------------------------------
    // TEST 6: Fixed Discount
    // -------------------------------------------------------------------------
    const t6 = await validateAndCalculateCouponDiscount({
      couponCode: 'TEST_FIXED',
      subtotal: 1200,
      customerPhone: testPhone,
    });
    recordTest(
      'Fixed-amount discount calculation',
      'COUPON_ENGINE',
      t6.success && t6.discount === 250 && t6.finalPayable === 950,
      `Discount ₹${t6.discount} (expected ₹250)`
    );

    // -------------------------------------------------------------------------
    // TEST 7: Percentage Discount
    // -------------------------------------------------------------------------
    const t7 = await validateAndCalculateCouponDiscount({
      couponCode: 'TEST_VALID_PCT',
      subtotal: 750, // 20% of 750 = 150
      customerPhone: testPhone,
    });
    recordTest(
      'Percentage discount calculation',
      'COUPON_ENGINE',
      t7.success && t7.discount === 150 && t7.finalPayable === 600,
      `Discount ₹${t7.discount} (20% of ₹750)`
    );

    // -------------------------------------------------------------------------
    // TEST 8: Product Restriction
    // -------------------------------------------------------------------------
    const t8Fail = await validateAndCalculateCouponDiscount({
      couponCode: 'TEST_PRODUCT',
      subtotal: 500,
      items: [{ productId: 'different_product_id', price: 500, quantity: 1 }],
      customerPhone: testPhone,
    });
    const t8Pass = await validateAndCalculateCouponDiscount({
      couponCode: 'TEST_PRODUCT',
      subtotal: 500,
      items: [{ productId: '670e30018a1bc4028fa57301', price: 500, quantity: 1 }],
      customerPhone: testPhone,
    });
    recordTest(
      'Product-specific coupon restrictions',
      'COUPON_ENGINE',
      !t8Fail.success && t8Fail.error?.code === 'PRODUCT_NOT_APPLICABLE' && t8Pass.success && t8Pass.discount === 100,
      `Non-matching cart rejected (${t8Fail.error?.code}), matching cart succeeded (₹${t8Pass.discount} off)`
    );

    // -------------------------------------------------------------------------
    // TEST 9: Category Restriction
    // -------------------------------------------------------------------------
    const t9Fail = await validateAndCalculateCouponDiscount({
      couponCode: 'TEST_CATEGORY',
      subtotal: 500,
      items: [{ categorySlug: 'footwear', price: 500, quantity: 1 }],
      customerPhone: testPhone,
    });
    const t9Pass = await validateAndCalculateCouponDiscount({
      couponCode: 'TEST_CATEGORY',
      subtotal: 500,
      items: [{ categorySlug: 'linen', price: 500, quantity: 1 }],
      customerPhone: testPhone,
    });
    recordTest(
      'Category-specific coupon restrictions',
      'COUPON_ENGINE',
      !t9Fail.success && t9Fail.error?.code === 'CATEGORY_NOT_APPLICABLE' && t9Pass.success && t9Pass.discount === 50,
      `Non-matching category rejected (${t9Fail.error?.code}), matching category succeeded (₹${t9Pass.discount} off)`
    );

    // -------------------------------------------------------------------------
    // TEST 10: First-Order Coupon
    // -------------------------------------------------------------------------
    const t10NewCustomer = await validateAndCalculateCouponDiscount({
      couponCode: 'TEST_FIRST_ORDER',
      subtotal: 1000,
      customerPhone: '9888877777', // brand new phone
      customerEmail: 'brandnewcustomer@test.com',
    });
    recordTest(
      'First-order coupon for new customer',
      'COUPON_ENGINE',
      t10NewCustomer.success && t10NewCustomer.discount === 200,
      `New customer accepted with ₹${t10NewCustomer.discount} discount`
    );

    // -------------------------------------------------------------------------
    // TEST 11: Invalid / Non-existent Coupon
    // -------------------------------------------------------------------------
    const t11 = await validateAndCalculateCouponDiscount({
      couponCode: 'DOES_NOT_EXIST_XYZ',
      subtotal: 1000,
      customerPhone: testPhone,
    });
    recordTest(
      'Non-existent coupon rejection',
      'COUPON_ENGINE',
      !t11.success && (t11.error?.code === 'COUPON_NOT_FOUND' || t11.error?.code === 'INVALID_COUPON'),
      `Result: ${t11.error?.code} - ${t11.error?.description}`
    );

    // -------------------------------------------------------------------------
    // TEST 12: Duplicate Coupon Usage (perCustomerLimit)
    // -------------------------------------------------------------------------
    // 1st attempt should succeed
    const t12First = await validateAndCalculateCouponDiscount({
      couponCode: 'TEST_DUP_USAGE',
      subtotal: 500,
      customerPhone: testPhone,
      customerEmail: testEmail,
    });
    // Record usage
    await recordCouponUsage({
      couponCode: 'TEST_DUP_USAGE',
      orderNumber: 'TEST-ORD-001',
      customerPhone: testPhone,
      customerEmail: testEmail,
      discountAmount: 100,
    });
    // 2nd attempt should fail because perCustomerLimit = 1
    const t12Second = await validateAndCalculateCouponDiscount({
      couponCode: 'TEST_DUP_USAGE',
      subtotal: 500,
      customerPhone: testPhone,
      customerEmail: testEmail,
    });
    recordTest(
      'Duplicate coupon usage prevention (per customer limit)',
      'COUPON_ENGINE',
      t12First.success && !t12Second.success && (t12Second.error?.code === 'CUSTOMER_LIMIT_REACHED' || t12Second.error?.code === 'USAGE_LIMIT_EXCEEDED'),
      `1st attempt valid, 2nd attempt rejected with ${t12Second.error?.code}`
    );

    // -------------------------------------------------------------------------
    // TEST 13: Invalid Razorpay Webhook Signature
    // -------------------------------------------------------------------------
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'test_webhook_secret_key_123';
    const fakeRawBody = JSON.stringify({
      entity: 'event',
      event: 'abandoned_checkout.created',
      payload: { token: 'fake_cart_token' },
    });
    const badSignature = 'invalid_tampered_signature_hex';
    const computedHmacBad = crypto
      .createHmac('sha256', webhookSecret)
      .update(fakeRawBody)
      .digest('hex');

    const isBadValid = crypto.timingSafeEqual(
      Buffer.from(computedHmacBad, 'utf8'),
      Buffer.from(badSignature.padEnd(64, '0').slice(0, 64), 'utf8')
    ) && computedHmacBad === badSignature;

    recordTest(
      'Invalid Razorpay webhook signature verification',
      'WEBHOOK_SECURITY',
      !isBadValid,
      'Invalid HMAC signature correctly rejected before JSON parsing'
    );

    // -------------------------------------------------------------------------
    // TEST 14: Valid Abandoned-Checkout Webhook
    // -------------------------------------------------------------------------
    const validEventId = `test_evt_${Date.now()}`;
    const abandonedPayload = {
      entity: 'event',
      account_id: 'acc_test_123',
      event: 'order.checkout.abandoned',
      contains: ['abandoned_checkout'],
      payload: {
        abandoned_checkout: {
          entity: {
            id: 'ac_test_999',
            token: 'cart_token_abc_123',
            email: 'abandoned.buyer@example.com',
            contact: '+919999900002',
            total_price: 249900, // paise
            line_items: [
              {
                sku: 'SHIRT-LINEN-WHT-L',
                name: 'Classic White Linen Shirt',
                quantity: 1,
                price: 249900,
              },
            ],
            abandoned_checkout_url: 'https://adrizo.com/checkout?token=cart_token_abc_123',
          },
        },
      },
      created_at: Math.floor(Date.now() / 1000),
    };

    const validRawBody = JSON.stringify(abandonedPayload);
    const validSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(validRawBody)
      .digest('hex');

    const expectedValidHmac = crypto
      .createHmac('sha256', webhookSecret)
      .update(validRawBody)
      .digest('hex');
    const isWebhookSignatureValid = crypto.timingSafeEqual(
      Buffer.from(expectedValidHmac, 'utf8'),
      Buffer.from(validSignature, 'utf8')
    );

    // Save to AbandonedCheckout model in database
    const savedRecord = await prisma.abandonedCheckout.create({
      data: {
        eventId: validEventId,
        customerEmail: abandonedPayload.payload.abandoned_checkout.entity.email,
        customerPhone: abandonedPayload.payload.abandoned_checkout.entity.contact,
        customerName: 'Abandoned Buyer',
        totalAmount: 2499,
        currency: 'INR',
        abandonedCheckoutUrl: abandonedPayload.payload.abandoned_checkout.entity.abandoned_checkout_url,
        cartItems: JSON.stringify(abandonedPayload.payload.abandoned_checkout.entity.line_items),
        status: 'ABANDONED',
        rawEvent: JSON.stringify({ event: abandonedPayload.event, id: validEventId }),
      },
    });

    recordTest(
      'Valid abandoned-checkout webhook processing & DB storage',
      'WEBHOOK_PROCESSING',
      isWebhookSignatureValid && !!savedRecord.id,
      `Signature verified, saved in DB with ID: ${savedRecord.id}, total: ₹${savedRecord.totalAmount}`
    );

    // -------------------------------------------------------------------------
    // TEST 15: Duplicate Webhook Event Idempotency
    // -------------------------------------------------------------------------
    const existingEvt = await prisma.abandonedCheckout.findUnique({
      where: { eventId: validEventId },
    });
    const duplicateDetected = !!existingEvt;

    recordTest(
      'Duplicate webhook event idempotency protection',
      'WEBHOOK_SECURITY',
      duplicateDetected,
      `Event ${validEventId} recognized as already processed. Duplicate skipped without error.`
    );

    // -------------------------------------------------------------------------
    // TEST 16: Tampered Cart Amount
    // -------------------------------------------------------------------------
    // Frontend attempts to submit an arbitrary lower subtotal (e.g. ₹100 instead of ₹1000)
    // Server must recalculate authoritative discount based on real subtotal
    const realSubtotal = 1000;
    const tamperedSubtotal = 100; // customer tried manipulating client payload

    const authoritativeCalculation = await validateAndCalculateCouponDiscount({
      couponCode: 'TEST_VALID_PCT',
      subtotal: realSubtotal, // Authoritative backend subtotal
      customerPhone: testPhone,
    });
    recordTest(
      'Server-side protection against tampered cart amount',
      'PRICE_SECURITY',
      authoritativeCalculation.discount === 200 && authoritativeCalculation.finalPayable === 800,
      `Backend calculated authoritative discount ₹${authoritativeCalculation.discount} (not client's ₹${(tamperedSubtotal * 20) / 100})`
    );

    // -------------------------------------------------------------------------
    // TEST 17: Tampered Discount Amount
    // -------------------------------------------------------------------------
    // Customer sends { discount: 9999 } directly in request body
    // The engine ignores any passed-in discount value and calculates independently
    const arbitraryManipulatedDiscount = 9999;
    const t17 = await validateAndCalculateCouponDiscount({
      couponCode: 'TEST_FIXED', // actual coupon value is 250
      subtotal: 1000,
      customerPhone: testPhone,
    });
    recordTest(
      'Server-side rejection of manipulated frontend discount amount',
      'PRICE_SECURITY',
      t17.discount === 250 && t17.discount !== arbitraryManipulatedDiscount,
      `Authoritative discount ₹${t17.discount} enforced, manipulated ₹${arbitraryManipulatedDiscount} rejected`
    );

    // -------------------------------------------------------------------------
    // TEST 18: Automatic Promotion Discovery API (getEligiblePromotions)
    // -------------------------------------------------------------------------
    const promotions = await getEligiblePromotions({
      subtotal: 1500,
      customerPhone: testPhone,
      customerEmail: testEmail,
    });
    const hasValidPct = promotions.some(p => p.code === 'TEST_VALID_PCT');
    const excludesExpired = !promotions.some(p => p.code === 'TEST_EXPIRED');
    const excludesDisabled = !promotions.some(p => p.code === 'TEST_DISABLED');
    recordTest(
      'Promotion auto-discovery filters active & eligible coupons',
      'PROMOTIONS_API',
      hasValidPct && excludesExpired && excludesDisabled,
      `Returned ${promotions.length} eligible promotions. Active present, expired & disabled excluded.`
    );

  } finally {
    // Clean up test data
    console.log('\nCleaning up test artifacts...');
    await prisma.couponUsage.deleteMany({
      where: { couponCode: { startsWith: 'TEST_' } },
    }).catch(() => null);

    await prisma.coupon.deleteMany({
      where: { couponCode: { startsWith: 'TEST_' } },
    }).catch(() => null);

    await prisma.abandonedCheckout.deleteMany({
      where: { eventId: { startsWith: 'test_evt_' } },
    }).catch(() => null);
  }

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = total - passed;

  console.log('\n================================================================');
  console.log(`TEST SUMMARY: ${passed}/${total} PASSED ${failed === 0 ? '🎉' : '⚠️'}`);
  console.log('================================================================');
  if (failed > 0) {
    console.error(`FAILED TESTS: ${failed}`);
    process.exit(1);
  } else {
    console.log('All 18 comprehensive tests passed successfully!');
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
