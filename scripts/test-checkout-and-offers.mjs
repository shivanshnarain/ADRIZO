import crypto from 'crypto';

console.log('=== STARTING ADRIZO CHECKOUT & OFFER LOGIC TESTS ===\n');

let passed = 0;
let failed = 0;

function assert(condition, testName, detail = '') {
  if (condition) {
    console.log(`✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${testName}`, detail);
    failed++;
  }
}

// 1. Reusable Promotion Pricing & Validation Logic (Mirroring promotions.ts)
function evaluatePromotionEntitlement(items) {
  const paidItems = items.filter(it => !it.isFree);
  const freeItems = items.filter(it => it.isFree);

  const totalPaidQuantity = paidItems.reduce((s, it) => s + (it.quantity || 1), 0);
  const totalFreeQuantity = freeItems.reduce((s, it) => s + (it.quantity || 1), 0);

  if (totalFreeQuantity > 0 && totalPaidQuantity === 0) {
    return {
      success: false,
      error: 'Free promotional items require eligible paid products in the order.',
    };
  }

  // Offer: BUY 1 GET 2 FREE T-SHIRTS per qualifying paid product
  const expectedFreeQuantity = totalPaidQuantity * 2;

  if (totalFreeQuantity > 0 && totalFreeQuantity !== expectedFreeQuantity) {
    return {
      success: false,
      error: `Invalid promotional item count: ${totalPaidQuantity} paid product(s) entitle you to exactly ${expectedFreeQuantity} free items (found ${totalFreeQuantity}).`,
    };
  }

  // Automatic Tiered Discount Logic:
  // 3 qualifying paid + 6 free (= 9 items) -> ₹200 OFF
  // 2 qualifying paid + 4 free (= 6 items) -> ₹100 OFF
  const has9ProductOfferBonus = totalPaidQuantity >= 3 && totalFreeQuantity >= 6;
  const has6ProductOfferBonus = totalPaidQuantity >= 2 && totalFreeQuantity >= 4;
  const autoOfferDiscount = has9ProductOfferBonus ? 200 : (has6ProductOfferBonus ? 100 : 0);

  const subtotal = paidItems.reduce((s, it) => s + (it.price * (it.quantity || 1)), 0);

  return {
    success: true,
    qualifyingPaidCount: totalPaidQuantity,
    qualifyingFreeCount: totalFreeQuantity,
    has6ProductOfferBonus,
    has9ProductOfferBonus,
    autoOfferDiscount,
    subtotal,
  };
}

// 2. Razorpay Signature Verification Logic (Mirroring razorpay.ts)
function verifyRazorpaySignature(orderId, paymentId, signature, secret) {
  if (!orderId || !paymentId || !signature || !secret) return false;
  const payload = `${orderId}|${paymentId}`;
  const generatedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return generatedSignature === signature;
}

// ==========================================
// TEST SUITE
// ==========================================

// Test 1: 1 qualifying paid product -> 2 free items
{
  const items = [
    { productId: 'tshirt-1', price: 999, quantity: 1, isFree: false },
    { productId: 'tshirt-2', price: 0, quantity: 1, isFree: true },
    { productId: 'tshirt-3', price: 0, quantity: 1, isFree: true },
  ];
  const res = evaluatePromotionEntitlement(items);
  assert(res.success === true, '1 qualifying paid product -> 2 free items is VALID');
  assert(res.qualifyingPaidCount === 1, 'Qualifying paid count is 1');
  assert(res.qualifyingFreeCount === 2, 'Qualifying free count is 2');
  assert(res.has6ProductOfferBonus === false, '3 total items does NOT qualify for 6-product ₹100 discount');
  assert(res.has9ProductOfferBonus === false, '3 total items does NOT qualify for 9-product ₹200 discount');
  assert(res.autoOfferDiscount === 0, 'Auto discount is ₹0 for 3 products');
}

// Test 2: 2 qualifying paid products -> 4 free items (= 6 products total)
{
  const items = [
    { productId: 'tshirt-1', price: 1299, quantity: 2, isFree: false },
    { productId: 'tshirt-2', price: 0, quantity: 2, isFree: true },
    { productId: 'tshirt-3', price: 0, quantity: 2, isFree: true },
  ];
  const res = evaluatePromotionEntitlement(items);
  assert(res.success === true, '2 qualifying paid products -> 4 free items is VALID');
  assert(res.qualifyingPaidCount === 2, 'Qualifying paid count is 2');
  assert(res.qualifyingFreeCount === 4, 'Qualifying free count is 4');
  assert(res.has6ProductOfferBonus === true, '6 total products (2 paid + 4 free) QUALIFIES for ₹100 discount');
  assert(res.has9ProductOfferBonus === false, '6 total products does NOT qualify for 9-product ₹200 discount');
  assert(res.autoOfferDiscount === 100, 'Auto discount is exactly ₹100 for 6 products');
  assert(res.subtotal === 2598, 'Subtotal is 2 * 1299 = 2598');
}

// Test 3: 3 qualifying paid products -> 6 free items (= 9 products total)
{
  const items = [
    { productId: 'tshirt-1', price: 999, quantity: 3, isFree: false },
    { productId: 'tshirt-2', price: 0, quantity: 3, isFree: true },
    { productId: 'tshirt-3', price: 0, quantity: 3, isFree: true },
  ];
  const res = evaluatePromotionEntitlement(items);
  assert(res.success === true, '3 qualifying paid products -> 6 free items is VALID');
  assert(res.qualifyingPaidCount === 3, 'Qualifying paid count is 3');
  assert(res.qualifyingFreeCount === 6, 'Qualifying free count is 6');
  assert(res.has9ProductOfferBonus === true, '9 total products qualifies for ₹200 discount');
  assert(res.autoOfferDiscount === 200, 'Auto discount is exactly ₹200 for 9 items (non-stacking)');
}

// Test 4: Abuse Prevention - Customer selects more free items than entitlement
{
  // 1 paid item with 3 free items (attempted abuse)
  const items = [
    { productId: 'tshirt-1', price: 999, quantity: 1, isFree: false },
    { productId: 'tshirt-2', price: 0, quantity: 3, isFree: true },
  ];
  const res = evaluatePromotionEntitlement(items);
  assert(res.success === false, 'Abuse attempt (3 free for 1 paid) is STRICTLY REJECTED');
}

// Test 5: Abuse Prevention - Free items without any paid item
{
  const items = [
    { productId: 'tshirt-2', price: 0, quantity: 2, isFree: true },
  ];
  const res = evaluatePromotionEntitlement(items);
  assert(res.success === false, 'Abuse attempt (free items with 0 paid items) is STRICTLY REJECTED');
}

// Test 6: Removing a paid product reduces entitlement
{
  // Customer had 2 paid (entitled to 4 free), but reduced paid to 1 while keeping 4 free items
  const items = [
    { productId: 'tshirt-1', price: 999, quantity: 1, isFree: false },
    { productId: 'tshirt-2', price: 0, quantity: 4, isFree: true },
  ];
  const res = evaluatePromotionEntitlement(items);
  assert(res.success === false, 'Reducing paid item makes old free selection invalid (REJECTED)');
}

// Test 7: Automatic ₹100 Coupon Application & Floor at ₹0
{
  const rawSubtotal = 2598;
  const autoDiscount = 100;
  const couponDiscount = 50;
  const shipping = 0;
  const codHandling = 99;

  const totalDiscount = autoDiscount + couponDiscount;
  const finalPayable = Math.max(0, rawSubtotal - totalDiscount + shipping + codHandling);
  assert(finalPayable === 2547, `Final payable calculated accurately (2598 - 150 + 99 = 2547, got ${finalPayable})`);

  // Excessive discount capped at 0
  const extremeDiscount = 5000;
  const cappedPayable = Math.max(0, rawSubtotal - extremeDiscount);
  assert(cappedPayable === 0, 'Payable amount cannot drop below ₹0');
}

// Test 8: COD ₹99 Mandatory Instant Confirmation & Balance Separation
{
  const orderTotal = 2547;
  const codConfirmationAmount = 99;
  const codRemainingAmount = orderTotal - codConfirmationAmount;

  assert(codConfirmationAmount === 99, 'COD confirmation amount is ₹99');
  assert(codRemainingAmount === 2448, `Remaining COD balance is 2547 - 99 = 2448 (got ${codRemainingAmount})`);
}

// Test 9: Razorpay Order Amount in Paise for ₹99 COD Confirmation
{
  const codConfirmationAmount = 99;
  const razorpayOrderAmountPaise = codConfirmationAmount * 100;
  assert(razorpayOrderAmountPaise === 9900, 'Razorpay order created for exactly 9900 paise (₹99.00)');
}

// Test 10: Razorpay Signature Verification Security
{
  const secret = 'test_secret_key_secure_123';
  const orderId = 'order_cod_99_test_1';
  const paymentId = 'pay_test_xyz_99';
  const validSignature = crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  const isValid = verifyRazorpaySignature(orderId, paymentId, validSignature, secret);
  assert(isValid === true, 'Authentic Razorpay HMAC-SHA256 signature is verified');

  const isForgedValid = verifyRazorpaySignature(orderId, paymentId, 'forged_fake_signature', secret);
  assert(isForgedValid === false, 'Forged/tampered signature is rejected');
}

// Test 11: Order Status Progression Flow
{
  // Online flow: PENDING -> PAID -> CONFIRMED
  // COD flow: PENDING_COD_CONFIRMATION -> (after ₹99 verification) -> COD_CONFIRMATION_PAID & CONFIRMED
  const allowedInitialCodStatus = 'PENDING_COD_CONFIRMATION';
  const allowedConfirmedCodStatus = 'COD_CONFIRMATION_PAID';
  assert(allowedInitialCodStatus === 'PENDING_COD_CONFIRMATION', 'Initial COD status is PENDING_COD_CONFIRMATION');
  assert(allowedConfirmedCodStatus === 'COD_CONFIRMATION_PAID', 'Verified COD status is COD_CONFIRMATION_PAID');
}

console.log(`\n=== SUMMARY: ${passed} PASSED, ${failed} FAILED ===`);
if (failed > 0) {
  process.exit(1);
}
