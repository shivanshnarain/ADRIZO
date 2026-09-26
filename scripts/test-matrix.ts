import { 
  calculateBxGyCounts, 
  processItemBundles, 
  calculateCheckoutTotals, 
  RawCheckoutItem,
  PaymentMode 
} from '../src/lib/checkout-engine';
import type { PromotionOffer } from '../src/lib/promotions';
import { getCodAdvanceAmount } from '../src/config/policies';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${message}`);
  }
}

console.log('=== RUNNING PROMOTION & CHECKOUT TEST MATRIX ===\n');

// -------------------------------------------------------------
// 1. Generic BXGY Count Math Tests
// -------------------------------------------------------------
console.log('--- 1. Testing Generic BXGY Math ---');
// Buy 1 Get 2 (1 bundle = 3 items)
const b1g2_3 = calculateBxGyCounts(3, 1, 2);
assert(b1g2_3.paidCount === 1 && b1g2_3.freeCount === 2, 'B1G2 for 3 items: 1 paid, 2 free');

const b1g2_6 = calculateBxGyCounts(6, 1, 2);
assert(b1g2_6.paidCount === 2 && b1g2_6.freeCount === 4, 'B1G2 for 6 items: 2 paid, 4 free');

// Buy 1 Get 1
const b1g1_2 = calculateBxGyCounts(2, 1, 1);
assert(b1g1_2.paidCount === 1 && b1g1_2.freeCount === 1, 'B1G1 for 2 items: 1 paid, 1 free');

// Buy 1 Get 3
const b1g3_4 = calculateBxGyCounts(4, 1, 3);
assert(b1g3_4.paidCount === 1 && b1g3_4.freeCount === 3, 'B1G3 for 4 items: 1 paid, 3 free');

// Buy 2 Get 1
const b2g1_3 = calculateBxGyCounts(3, 2, 1);
assert(b2g1_3.paidCount === 2 && b2g1_3.freeCount === 1, 'B2G1 for 3 items: 2 paid, 1 free');

// Buy 2 Get 2
const b2g2_4 = calculateBxGyCounts(4, 2, 2);
assert(b2g2_4.paidCount === 2 && b2g2_4.freeCount === 2, 'B2G2 for 4 items: 2 paid, 2 free');

// -------------------------------------------------------------
// Mock Admin Panel Offers
// -------------------------------------------------------------
const mockB1G2Offer: PromotionOffer = {
  id: 'promo_b1g2',
  name: 'BUY 1 GET 2 FREE',
  type: 'Buy X Get Y',
  buyQuantity: 1,
  freeQuantity: 2,
  applicableCategories: ['polo-t-shirts', 't-shirts'],
  status: 'ACTIVE',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

const mockB1G1Offer: PromotionOffer = {
  id: 'promo_b1g1',
  name: 'BUY 1 GET 1 FREE',
  type: 'Buy X Get Y',
  buyQuantity: 1,
  freeQuantity: 1,
  applicableCategories: ['hoodies'],
  status: 'ACTIVE',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

const mockB1G3Offer: PromotionOffer = {
  id: 'promo_b1g3',
  name: 'BUY 1 GET 3 FREE',
  type: 'Buy X Get Y',
  buyQuantity: 1,
  freeQuantity: 3,
  applicableCategories: ['oversized-t-shirts'],
  status: 'ACTIVE',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

const mockB2G1Offer: PromotionOffer = {
  id: 'promo_b2g1',
  name: 'BUY 2 GET 1 FREE',
  type: 'Buy X Get Y',
  buyQuantity: 2,
  freeQuantity: 1,
  applicableCategories: ['sweatshirts'],
  status: 'ACTIVE',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

const allOffers = [mockB1G2Offer, mockB1G1Offer, mockB1G3Offer, mockB2G1Offer];

// -------------------------------------------------------------
// TEST A — BUY 1 GET 2 FREE + ONLINE
// -------------------------------------------------------------
console.log('\n--- TEST A: BUY 1 GET 2 FREE + ONLINE ---');
const itemsA: RawCheckoutItem[] = [
  {
    productId: 'p1',
    productName: 'Melange Zipper Polo T-Shirt',
    price: 1299,
    originalPrice: 2999,
    quantity: 1,
    categorySlug: 'polo-t-shirts',
    isFree: false
  },
  {
    productId: 'p2',
    productName: 'Rose Pink Button Polo T-Shirt',
    price: 0,
    originalPrice: 2999,
    quantity: 1,
    categorySlug: 'polo-t-shirts',
    isFree: true
  },
  {
    productId: 'p3',
    productName: 'Rama Green Button Polo T-Shirt',
    price: 0,
    originalPrice: 2999,
    quantity: 1,
    categorySlug: 'polo-t-shirts',
    isFree: true
  }
];

const processedA = processItemBundles(itemsA, allOffers);
const freeItemsA = processedA.unitItems.filter(u => u.isFree);
assert(freeItemsA.length === 2, 'Processed 2 free items');
assert(processedA.unitItems.length === 3, 'All 3 items retained in order');

const totalsA_online = calculateCheckoutTotals({
  items: itemsA,
  offers: allOffers,
  paymentMode: 'ONLINE_RAZORPAY'
});

console.log('TEST A Totals:', {
  subtotalAfterBundles: totalsA_online.subtotalAfterBundles,
  prepaidDiscount: totalsA_online.prepaidDiscount,
  amountPayableNow: totalsA_online.amountPayableNow,
  finalOrderValue: totalsA_online.finalOrderValue
});

assert(totalsA_online.subtotalAfterBundles === 1299, 'Merchandise subtotal is 1299 (not 3897 or 8997)');
assert(totalsA_online.prepaidDiscount === 50, 'Online ₹50 discount applied once');
assert(totalsA_online.amountPayableNow === 1249, 'Online payable is ₹1,249');
assert(totalsA_online.amountPayableNow !== 3897, 'NEVER ₹3,897');
assert(totalsA_online.amountPayableNow !== 8997, 'NEVER ₹8,997');

// -------------------------------------------------------------
// TEST B — BUY 1 GET 2 FREE + COD
// -------------------------------------------------------------
console.log('\n--- TEST B: BUY 1 GET 2 FREE + COD ---');
const totalsB_cod = calculateCheckoutTotals({
  items: itemsA,
  offers: allOffers,
  paymentMode: 'COD'
});

console.log('TEST B Totals:', {
  finalOrderValue: totalsB_cod.finalOrderValue,
  amountPayableNow: totalsB_cod.amountPayableNow,
  amountDueOnDelivery: totalsB_cod.amountDueOnDelivery
});

assert(totalsB_cod.finalOrderValue === 1299, 'Full order value is ₹1,299');
assert(totalsB_cod.amountPayableNow === 99, 'Razorpay COD order is ₹99 ONLY');
assert(totalsB_cod.amountDueOnDelivery === 1200, 'Remaining balance due on delivery is ₹1,200');
assert(totalsB_cod.amountPayableNow !== 1299, 'COD advance is NOT full amount');
assert(totalsB_cod.amountPayableNow !== 3897, 'COD advance is NOT ₹3,897');

// -------------------------------------------------------------
// TEST C — BUY 1 GET 1 FREE HOODIE
// -------------------------------------------------------------
console.log('\n--- TEST C: BUY 1 GET 1 FREE HOODIE ---');
const itemsC: RawCheckoutItem[] = [
  {
    productId: 'h1',
    productName: 'Heavyweight Black Hoodie',
    price: 1999,
    originalPrice: 3999,
    quantity: 1,
    categorySlug: 'hoodies',
    isFree: false
  },
  {
    productId: 'h2',
    productName: 'Heavyweight Grey Hoodie',
    price: 0,
    originalPrice: 3999,
    quantity: 1,
    categorySlug: 'hoodies',
    isFree: true
  }
];

const processedC = processItemBundles(itemsC, allOffers);
const freeItemsC = processedC.unitItems.filter(u => u.isFree);
assert(freeItemsC.length === 1, '1 hoodie is free');

const totalsC_online = calculateCheckoutTotals({
  items: itemsC,
  offers: allOffers,
  paymentMode: 'ONLINE_RAZORPAY'
});
assert(totalsC_online.amountPayableNow === 1949, 'Hoodie online payable is ₹1,949 (1999 - 50)');

const totalsC_cod = calculateCheckoutTotals({
  items: itemsC,
  offers: allOffers,
  paymentMode: 'COD'
});
assert(totalsC_cod.amountPayableNow === 99, 'Hoodie COD advance is ₹99');
assert(totalsC_cod.amountDueOnDelivery === 1900, 'Hoodie COD balance is ₹1,900');
assert(totalsC_cod.finalOrderValue === 1999, 'Hoodie full order value is ₹1,999');

// -------------------------------------------------------------
// TEST D — BUY 1 GET 3 FREE
// -------------------------------------------------------------
console.log('\n--- TEST D: BUY 1 GET 3 FREE ---');
const itemsD: RawCheckoutItem[] = [
  { productId: 'd1', productName: 'Oversized Tee Black', price: 1299, originalPrice: 2499, quantity: 1, categorySlug: 'oversized-t-shirts', isFree: false },
  { productId: 'd2', productName: 'Oversized Tee White', price: 0, originalPrice: 2499, quantity: 1, categorySlug: 'oversized-t-shirts', isFree: true },
  { productId: 'd3', productName: 'Oversized Tee Beige', price: 0, originalPrice: 2499, quantity: 1, categorySlug: 'oversized-t-shirts', isFree: true },
  { productId: 'd4', productName: 'Oversized Tee Olive', price: 0, originalPrice: 2499, quantity: 1, categorySlug: 'oversized-t-shirts', isFree: true }
];

const processedD = processItemBundles(itemsD, allOffers);
const freeItemsD = processedD.unitItems.filter(u => u.isFree);
assert(freeItemsD.length === 3, '3 items are free');
assert(processedD.unitItems.length === 4, 'All 4 physical items remain in order');

const totalsD = calculateCheckoutTotals({
  items: itemsD,
  offers: allOffers,
  paymentMode: 'ONLINE_RAZORPAY'
});
// 1299 - 50 online = 1249
assert(totalsD.amountPayableNow === 1249, 'Only paid item contributes: payable is ₹1,249 with prepaid discount');

// -------------------------------------------------------------
// TEST E — NO PROMOTION (Regular Product)
// -------------------------------------------------------------
console.log('\n--- TEST E: NO PROMOTION ---');
const itemsE: RawCheckoutItem[] = [
  { productId: 'e1', productName: 'Classic Oxford Shirt', price: 1499, originalPrice: 2999, quantity: 1, categorySlug: 'shirts', isFree: false }
];
const processedE = processItemBundles(itemsE, allOffers);
const freeItemsE = processedE.unitItems.filter(u => u.isFree);
assert(freeItemsE.length === 0, 'No free items');

const totalsE_online = calculateCheckoutTotals({
  items: itemsE,
  offers: allOffers,
  paymentMode: 'ONLINE_RAZORPAY'
});
assert(totalsE_online.amountPayableNow === 1449, 'Online payable is ₹1,449 (1499 - 50)');

const totalsE_cod = calculateCheckoutTotals({
  items: itemsE,
  offers: allOffers,
  paymentMode: 'COD'
});
assert(totalsE_cod.amountPayableNow === 99, 'COD advance is ₹99');
assert(totalsE_cod.amountDueOnDelivery === 1400, 'COD balance is ₹1,400');
assert(totalsE_cod.finalOrderValue === 1499, 'Full order value is ₹1,499');

// -------------------------------------------------------------
// TEST F — COUPON + BXGY
// -------------------------------------------------------------
console.log('\n--- TEST F: COUPON + BXGY ---');
const totalsF = calculateCheckoutTotals({
  items: itemsA,
  offers: allOffers,
  paymentMode: 'ONLINE_RAZORPAY',
  couponDiscount: 100
});
// 1299 - 100 coupon - 50 prepaid = 1149
assert(totalsF.couponDiscount === 100, 'Coupon discount is ₹100');
assert(totalsF.prepaidDiscount === 50, 'Prepaid discount is ₹50');
assert(totalsF.amountPayableNow === 1149, 'Online payable with coupon is ₹1,149');

// -------------------------------------------------------------
// TEST G — COD + BXGY
// -------------------------------------------------------------
console.log('\n--- TEST G: COD + BXGY ---');
const totalsG = calculateCheckoutTotals({
  items: itemsA,
  offers: allOffers,
  paymentMode: 'COD',
  couponDiscount: 100
});
// Full order: 1299 - 100 coupon = 1199
// Pay now: 99
// Due on delivery: 1199 - 99 = 1100
assert(totalsG.finalOrderValue === 1199, 'Full order value with coupon is ₹1,199');
assert(totalsG.amountPayableNow === 99, 'COD advance is ₹99');
assert(totalsG.amountDueOnDelivery === 1100, 'Remaining balance due is ₹1,100');

// -------------------------------------------------------------
// TEST H — FUTURE ADMIN PROMOTIONS (Dynamic BUY 2 GET 1 FREE)
// -------------------------------------------------------------
console.log('\n--- TEST H: FUTURE ADMIN PROMOTION (BUY 2 GET 1 FREE) ---');
// 3 sweatshirts in cart: 2 paid @ 1599, 1 free @ 0
const itemsH: RawCheckoutItem[] = [
  { productId: 's1', productName: 'Sweatshirt A', price: 1599, originalPrice: 2999, quantity: 1, categorySlug: 'sweatshirts' },
  { productId: 's2', productName: 'Sweatshirt B', price: 1599, originalPrice: 2999, quantity: 1, categorySlug: 'sweatshirts' },
  { productId: 's3', productName: 'Sweatshirt C', price: 1599, originalPrice: 2999, quantity: 1, categorySlug: 'sweatshirts' }
];

// Automatically bundles based on mockB2G1Offer!
const processedH = processItemBundles(itemsH, allOffers);
const freeItemsH = processedH.unitItems.filter(u => u.isFree);
assert(freeItemsH.length === 1, 'Engine automatically allocated 1 free sweatshirt for Buy 2 Get 1');
const freeItemH = freeItemsH[0];
assert(freeItemH !== undefined && freeItemH.effectivePrice === 0, 'Free sweatshirt has effectivePrice = 0');

const totalsH = calculateCheckoutTotals({
  items: itemsH,
  offers: allOffers,
  paymentMode: 'PREPAID' // Full payment without ₹50 incentive test
});
// 2 paid sweatshirts @ 1599 = 3198 - 50 prepaid = 3148
assert(totalsH.subtotalAfterBundles === 3198, 'Subtotal after bundles is exactly the sum of 2 paid sweatshirts: ₹3,198');

console.log('\n🎉 ALL 8 TEST MATRIX SCENARIOS (A - H) PASSED WITH FLYING COLORS!');
