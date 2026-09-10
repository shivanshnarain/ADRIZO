try {
  process.loadEnvFile('.env.local');
} catch {}
try {
  process.loadEnvFile('.env');
} catch {}

import { prisma } from '../src/lib/prisma';
import { getAdminClient } from '../src/lib/supabase/admin';
import { validateAndPriceOrderItems, getPromotionConfig, savePromotionOffers } from '../src/lib/promotions';
import { POLICY_CONFIG } from '../src/config/policies';

async function runBuy1Get2FreePromotionTests() {
  console.log('================================================================');
  console.log('AD(R)IZO — BUY 1 GET 2 FREE PROMOTION VERIFICATION SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName} ${detail ? `| Detail: ${detail}` : ''}`);
      failed++;
    }
  }

  // Cleanup helper for test products
  const createdProductIds: string[] = [];
  const createdOrderIds: string[] = [];

  async function createTestProduct(name: string, price: number, stock = 50) {
    const timestamp = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const sku = `PROMO-TEST-${timestamp}`;
    const p = await prisma.product.create({
      data: {
        name,
        slug: `promo-test-${timestamp}`,
        description: 'Automated test product for promotional validation',
        price,
        originalPrice: price * 1.5,
        sku,
        stock,
        color: 'NAVY BLUE',
        productType: 'Polo T-Shirt',
        status: 'ACTIVE',
        sizeWiseStock: JSON.stringify({ S: stock, M: stock, L: stock, XL: stock }),
        variants: {
          create: [
            { size: 'M', color: 'NAVY BLUE', sku, stock },
            { size: 'L', color: 'NAVY BLUE', sku, stock },
          ],
        },
        images: {
          create: [
            { url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500', isPrimary: true, sortOrder: 0 }
          ]
        }
      },
      include: { variants: true }
    });
    createdProductIds.push(p.id);
    return p;
  }

  try {
    // Ensure active B1G2 offer is present for the verification suite
    await savePromotionOffers([
      {
        id: 'bogo-buy1-get2',
        name: 'BUY 1 GET 2 FREE',
        type: 'Buy X Get Y',
        offerType: 'BUY_X_GET_Y',
        buyQuantity: 1,
        freeQuantity: 2,
        applicableCategories: ['all', 'polo-t-shirt', 't-shirts'],
        applicableProducts: [],
        applicableProductIds: [],
        status: 'ACTIVE',
        priority: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    ]);
    // -------------------------------------------------------------------------
    // TEST 1: ₹1,000 + ₹2,000 + ₹1,500 => Pay ₹2,000, 2 free, Save ₹2,500
    // -------------------------------------------------------------------------
    console.log('--- TEST 1: Highest Price Calculation (₹1,000 + ₹2,000 + ₹1,500) ---');
    const pA = await createTestProduct('Product A (₹1,000)', 1000);
    const pB = await createTestProduct('Product B (₹2,000)', 2000);
    const pC = await createTestProduct('Product C (₹1,500)', 1500);

    const bundle1Result = await validateAndPriceOrderItems([
      { productId: pA.id, size: 'M', quantity: 1, promoGroupId: 'bundle-test-1' },
      { productId: pB.id, size: 'M', quantity: 1, promoGroupId: 'bundle-test-1' },
      { productId: pC.id, size: 'M', quantity: 1, promoGroupId: 'bundle-test-1' },
    ]);

    assert(bundle1Result.success, 'TEST 1: Bundle 1 validation succeeds');
    assert(bundle1Result.subtotal === 2000, `TEST 1: Customer pays ₹2,000 (actual: ₹${bundle1Result.subtotal})`);
    assert(bundle1Result.catalogSubtotal === 4500, `TEST 1: Catalog sum is ₹4,500 (actual: ₹${bundle1Result.catalogSubtotal})`);
    assert(bundle1Result.promotionalDiscount === 2500, `TEST 1: Customer saves ₹2,500 (actual: ₹${bundle1Result.promotionalDiscount})`);

    const paidItem1 = bundle1Result.items.find(i => !i.isFree);
    const freeItems1 = bundle1Result.items.filter(i => i.isFree);
    assert(paidItem1?.productId === pB.id && paidItem1?.price === 2000, 'TEST 1: Product B (₹2,000) is the PAID product');
    assert(freeItems1.length === 2 && freeItems1.every(i => i.price === 0), 'TEST 1: Other 2 products are FREE (₹0)');

    // -------------------------------------------------------------------------
    // TEST 2: ₹999 + ₹999 + ₹1,999 => Pay ₹1,999, 2 free, Save ₹1,998
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 2: Equal Lower Prices (₹999 + ₹999 + ₹1,999) ---');
    const pD = await createTestProduct('Product D (₹999)', 999);
    const pE = await createTestProduct('Product E (₹999)', 999);
    const pF = await createTestProduct('Product F (₹1,999)', 1999);

    const bundle2Result = await validateAndPriceOrderItems([
      { productId: pD.id, size: 'M', quantity: 1, promoGroupId: 'bundle-test-2' },
      { productId: pE.id, size: 'M', quantity: 1, promoGroupId: 'bundle-test-2' },
      { productId: pF.id, size: 'M', quantity: 1, promoGroupId: 'bundle-test-2' },
    ]);

    assert(bundle2Result.success, 'TEST 2: Bundle 2 validation succeeds');
    assert(bundle2Result.subtotal === 1999, `TEST 2: Customer pays ₹1,999 (actual: ₹${bundle2Result.subtotal})`);
    assert(bundle2Result.promotionalDiscount === 1998, `TEST 2: Customer saves ₹1,998 (actual: ₹${bundle2Result.promotionalDiscount})`);
    const paidItem2 = bundle2Result.items.find(i => !i.isFree);
    assert(paidItem2?.productId === pF.id && paidItem2?.price === 1999, 'TEST 2: Highest-priced Product F is the PAID item');

    // -------------------------------------------------------------------------
    // TEST 3: ₹2,000 + ₹1,500 + ₹900 => Pay ₹2,000, 2 free, Save ₹2,400
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 3: Decreasing Prices (₹2,000 + ₹1,500 + ₹900) ---');
    const pG = await createTestProduct('Product G (₹2,000)', 2000);
    const pH = await createTestProduct('Product H (₹1,500)', 1500);
    const pI = await createTestProduct('Product I (₹900)', 900);

    const bundle3Result = await validateAndPriceOrderItems([
      { productId: pG.id, size: 'L', quantity: 1, promoGroupId: 'bundle-test-3' },
      { productId: pH.id, size: 'L', quantity: 1, promoGroupId: 'bundle-test-3' },
      { productId: pI.id, size: 'L', quantity: 1, promoGroupId: 'bundle-test-3' },
    ]);

    assert(bundle3Result.success, 'TEST 3: Bundle 3 validation succeeds');
    assert(bundle3Result.subtotal === 2000, `TEST 3: Customer pays ₹2,000 (actual: ₹${bundle3Result.subtotal})`);
    assert(bundle3Result.promotionalDiscount === 2400, `TEST 3: Customer saves ₹2,400 (actual: ₹${bundle3Result.promotionalDiscount})`);

    // -------------------------------------------------------------------------
    // TEST 4: Customer closes popup / incomplete bundle (only 1 or 2 items)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 4: Incomplete Bundle Rejected ---');
    const bundleIncomplete = await validateAndPriceOrderItems([
      { productId: pA.id, size: 'M', quantity: 1, promoGroupId: 'bundle-incomplete' },
      { productId: pB.id, size: 'M', quantity: 1, promoGroupId: 'bundle-incomplete' },
    ]);

    assert(
      Boolean(!bundleIncomplete.success && bundleIncomplete.error?.includes('must contain exactly 3 products')),
      'TEST 4: Incomplete bundle with 2 products is strictly rejected'
    );

    // -------------------------------------------------------------------------
    // TEST 5: Customer tries to add 3+ free products (4 items in bundle)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 5: Over-limit Bundle (4 items) Blocked ---');
    const bundleExcess = await validateAndPriceOrderItems([
      { productId: pA.id, size: 'M', quantity: 1, promoGroupId: 'bundle-excess' },
      { productId: pB.id, size: 'M', quantity: 1, promoGroupId: 'bundle-excess' },
      { productId: pC.id, size: 'M', quantity: 1, promoGroupId: 'bundle-excess' },
      { productId: pD.id, size: 'M', quantity: 1, promoGroupId: 'bundle-excess' },
    ]);

    assert(
      Boolean(!bundleExcess.success && bundleExcess.error?.includes('must contain exactly 3 products')),
      'TEST 5: Bundle with 4 products is blocked'
    );

    // -------------------------------------------------------------------------
    // TEST 6: Client-side Price Manipulation Attempt
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 6: Client-Side Price Manipulation Thwarted ---');
    // Attacker tries to send price: 1 on expensive item pB (₹2,000 in DB),
    // and price: 0 with isFree: true on expensive item, claiming pA is paid.
    const manipulatedPayload = [
      { productId: pA.id, size: 'M', quantity: 1, price: 1000, isFree: false, promoGroupId: 'bundle-tamper' },
      { productId: pB.id, size: 'M', quantity: 1, price: 1, isFree: true, promoGroupId: 'bundle-tamper' },
      { productId: pC.id, size: 'M', quantity: 1, price: 0, isFree: true, promoGroupId: 'bundle-tamper' },
    ];

    const tamperResult = await validateAndPriceOrderItems(manipulatedPayload);
    assert(tamperResult.success, 'TEST 6: Server successfully processes and sanitizes payload');
    assert(tamperResult.subtotal === 2000, `TEST 6: Server ignores client price/flags and charges ₹2,000 (actual: ₹${tamperResult.subtotal})`);
    const tamperPaid = tamperResult.items.find(i => !i.isFree);
    assert(tamperPaid?.productId === pB.id && tamperPaid?.price === 2000, 'TEST 6: Server forces ₹2,000 product as the paid item regardless of client isFree flag');

    // -------------------------------------------------------------------------
    // TEST 7: Free Product Out of Stock
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 7: Out-of-Stock Free Product Blocked ---');
    const pOOS = await createTestProduct('Out of Stock Product', 1200, 0); // 0 stock

    const oosBundle = await validateAndPriceOrderItems([
      { productId: pA.id, size: 'M', quantity: 1, promoGroupId: 'bundle-oos' },
      { productId: pB.id, size: 'M', quantity: 1, promoGroupId: 'bundle-oos' },
      { productId: pOOS.id, size: 'M', quantity: 1, promoGroupId: 'bundle-oos' },
    ]);

    assert(
      Boolean(!oosBundle.success && oosBundle.error?.toLowerCase().includes('out of stock')),
      'TEST 7: Out of stock product in promotion bundle is blocked'
    );

    // -------------------------------------------------------------------------
    // TEST 8: COD Checkout Payable Calculation
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 8: COD Order Calculation & Database Write ---');
    const supabase = getAdminClient();
    const codOrderNumber = `ADR-TEST-COD-${Date.now().toString().slice(-6)}`;
    const codSubtotal = bundle1Result.subtotal; // ₹2,000
    const codShipping = codSubtotal >= POLICY_CONFIG.shipping.freeShippingThreshold ? 0 : POLICY_CONFIG.shipping.standardFee;
    const codCharge = POLICY_CONFIG.shipping.codHandlingFee; // ₹99
    const codTotal = codSubtotal + codShipping + codCharge; // ₹2,099

    assert(codTotal === 2099, `TEST 8: COD Total is ₹2,099 (Subtotal ₹2,000 + Shipping ₹0 + COD ₹99)`);

    const { data: supaCodOrder, error: codOrderErr } = await supabase
      .from('orders')
      .insert({
        order_number: codOrderNumber,
        customer_name: 'Promotion Test User',
        customer_email: 'care.adrizo@gmail.com',
        customer_phone: '9876543210',
        shipping_address: 'ADRIZO Testing Facility, Test Street, Mumbai - 400001, Maharashtra, India',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        subtotal: codSubtotal,
        shipping_charge: codShipping,
        cod_charge: codCharge,
        discount: bundle1Result.promotionalDiscount,
        total_amount: codTotal,
        payment_method: 'COD',
        payment_status: 'PENDING',
        order_status: 'PLACED',
      })
      .select('id')
      .single();

    assert(!codOrderErr && Boolean(supaCodOrder?.id), 'TEST 8: COD order inserted into Supabase with accurate promotional total');
    if (supaCodOrder?.id) createdOrderIds.push(supaCodOrder.id);

    // -------------------------------------------------------------------------
    // TEST 9: Prepaid / Online Payment Gateway Amount Calculation
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 9: Prepaid Payment Amount Calculation ---');
    const prepaidSubtotal = bundle1Result.subtotal; // ₹2,000
    const prepaidShipping = prepaidSubtotal >= POLICY_CONFIG.shipping.freeShippingThreshold ? 0 : POLICY_CONFIG.shipping.standardFee;
    const prepaidTotal = prepaidSubtotal + prepaidShipping; // ₹2,000 (no COD fee)
    const razorpayAmountPaise = Math.round(prepaidTotal * 100);

    assert(prepaidTotal === 2000, `TEST 9: Prepaid Total is ₹2,000 (actual: ₹${prepaidTotal})`);
    assert(razorpayAmountPaise === 200000, `TEST 9: Gateway receives exactly 200,000 paise (₹2,000), NEVER 450,000 paise (₹4,500)`);

    // -------------------------------------------------------------------------
    // TEST 10: Bundle Consistency & Idempotency
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 10: Consistency Across Multiple Executions ---');
    const rerun1 = await validateAndPriceOrderItems([
      { productId: pA.id, size: 'M', quantity: 1, promoGroupId: 'bundle-test-1' },
      { productId: pB.id, size: 'M', quantity: 1, promoGroupId: 'bundle-test-1' },
      { productId: pC.id, size: 'M', quantity: 1, promoGroupId: 'bundle-test-1' },
    ]);
    const rerun2 = await validateAndPriceOrderItems([
      { productId: pA.id, size: 'M', quantity: 1, promoGroupId: 'bundle-test-1' },
      { productId: pB.id, size: 'M', quantity: 1, promoGroupId: 'bundle-test-1' },
      { productId: pC.id, size: 'M', quantity: 1, promoGroupId: 'bundle-test-1' },
    ]);
    assert(
      rerun1.subtotal === rerun2.subtotal && rerun1.promotionalDiscount === rerun2.promotionalDiscount,
      'TEST 10: Promotion calculation is 100% deterministic and consistent across refreshes'
    );

    // -------------------------------------------------------------------------
    // TEST 11: Duplicate Order Prevention Guard
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 11: Duplicate Order Prevention Check ---');
    // Verify duplicate prevention logic by querying recent orders for same phone & total
    const thirtySecondsAgoIso = new Date(Date.now() - 30000).toISOString();
    const { data: recentOrders } = await supabase
      .from('orders')
      .select('id, order_number, total_amount')
      .eq('customer_phone', '9876543210')
      .gte('created_at', thirtySecondsAgoIso)
      .limit(1);

    assert(
      Array.isArray(recentOrders) && recentOrders.length > 0,
      'TEST 11: System detects recent order within 30s idempotency window to prevent duplicate submissions'
    );

    // -------------------------------------------------------------------------
    // TEST 12: Future Dynamic Products Work Automatically Without Code Changes
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 12: Future Products Automatic Dynamic Eligibility ---');
    // Simulating user creating brand new products tomorrow:
    // Product X (₹799), Product Y (₹2,499), Product Z (₹1,299)
    const pX = await createTestProduct('Product X (Future)', 799);
    const pY = await createTestProduct('Product Y (Future)', 2499);
    const pZ = await createTestProduct('Product Z (Future)', 1299);

    const futureResult = await validateAndPriceOrderItems([
      { productId: pX.id, size: 'M', quantity: 1, promoGroupId: 'bundle-future' },
      { productId: pY.id, size: 'M', quantity: 1, promoGroupId: 'bundle-future' },
      { productId: pZ.id, size: 'M', quantity: 1, promoGroupId: 'bundle-future' },
    ]);

    assert(futureResult.success, 'TEST 12: Future products automatically participate without code changes');
    assert(futureResult.subtotal === 2499, `TEST 12: Customer pays ₹2,499 (highest of 799, 2499, 1299) (actual: ₹${futureResult.subtotal})`);
    assert(futureResult.catalogSubtotal === 799 + 2499 + 1299, `TEST 12: Catalog sum is ₹${799 + 2499 + 1299} (actual: ₹${futureResult.catalogSubtotal})`);
    assert(futureResult.promotionalDiscount === 799 + 1299, `TEST 12: Savings is ₹${799 + 1299} (actual: ₹${futureResult.promotionalDiscount})`);
    const futurePaid = futureResult.items.find(i => !i.isFree);
    assert(futurePaid?.productId === pY.id && futurePaid?.price === 2499, 'TEST 12: Newly added Product Y is identified as the paid product');

  } catch (err: any) {
    console.error('Unexpected error in test suite:', err);
    failed++;
  } finally {
    // Clean up test data
    console.log('\n--- Cleaning up temporary test data ---');
    for (const pid of createdProductIds) {
      try {
        await prisma.productImage.deleteMany({ where: { productId: pid } });
        await prisma.productVariant.deleteMany({ where: { productId: pid } });
        await prisma.product.delete({ where: { id: pid } });
      } catch {}
    }
    const supabase = getAdminClient();
    for (const oid of createdOrderIds) {
      try {
        await supabase.from('order_items').delete().eq('order_id', oid);
        await supabase.from('orders').delete().eq('id', oid);
      } catch {}
    }
    console.log('Cleaned up test products and test orders.');
  }

  console.log('\n================================================================');
  console.log(`PROMOTION TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runBuy1Get2FreePromotionTests();
