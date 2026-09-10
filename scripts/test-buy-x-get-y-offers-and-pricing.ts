try {
  process.loadEnvFile('.env.local');
} catch {}
try {
  process.loadEnvFile('.env');
} catch {}

import { prisma } from '../src/lib/prisma';
import {
  savePromotionOffers,
  getAllPromotionOffers,
  getActivePromotionOffers,
  validateAndPriceOrderItems,
  PromotionOffer,
} from '../src/lib/promotions';

async function runTests() {
  console.log('================================================================');
  console.log('AD(R)IZO — BUY X GET Y PROMOTIONS & CRITICAL PRICING TEST SUITE');
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

  const createdProductIds: string[] = [];

  async function createTestProduct(opts: {
    name: string;
    sellingPrice: number;
    mrp: number;
    stock?: number;
    categorySlug?: string;
  }) {
    const timestamp = Date.now() + Math.floor(Math.random() * 100000);
    const sku = `OFFER-TEST-${timestamp}`;
    const stock = opts.stock ?? 50;

    const p = await prisma.product.create({
      data: {
        name: opts.name,
        slug: `offer-test-${timestamp}`,
        description: 'Test product for promotional pricing validation',
        price: opts.sellingPrice, // Authoritative current selling price
        originalPrice: opts.mrp,   // MRP / Catalog strike-through reference
        sku,
        stock,
        color: 'NAVY BLUE',
        productType: opts.categorySlug || 'T-Shirts',
        status: 'ACTIVE',
        sizeWiseStock: JSON.stringify({ M: stock, L: stock }),
        variants: {
          create: [
            { size: 'M', color: 'NAVY BLUE', sku: `${sku}-M`, stock },
            { size: 'L', color: 'NAVY BLUE', sku: `${sku}-L`, stock },
          ],
        },
        images: {
          create: [
            { url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500', isPrimary: true, sortOrder: 0 },
          ],
        },
      },
      include: { variants: true },
    });

    createdProductIds.push(p.id);
    return p;
  }

  // Backup existing promotion offers to restore after test
  const originalOffers = await getAllPromotionOffers();

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Admin Create, Retrieve, and Priority Ordering of Offers
    // -------------------------------------------------------------------------
    console.log('\n--- 1. ADMIN OFFER CRUD & LIFECYCLE ---');
    const testOffers: PromotionOffer[] = [
      {
        id: 'offer-b1g2',
        name: 'BUY 1 GET 2 FREE — T-SHIRTS',
        type: 'Buy X Get Y',
        offerType: 'BUY_X_GET_Y',
        buyQuantity: 1,
        freeQuantity: 2,
        applicableCategories: ['t-shirts', 't-shirt'],
        applicableProducts: [],
        applicableProductIds: [],
        status: 'ACTIVE',
        priority: 10,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'offer-b1g1',
        name: 'BUY 1 GET 1 FREE — HOODIES',
        type: 'Buy X Get Y',
        offerType: 'BUY_X_GET_Y',
        buyQuantity: 1,
        freeQuantity: 1,
        applicableCategories: ['hoodies', 'hoodie'],
        applicableProducts: [],
        applicableProductIds: [],
        status: 'ACTIVE',
        priority: 5,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'offer-b2g1',
        name: 'BUY 2 GET 1 FREE — JEANS',
        type: 'Buy X Get Y',
        offerType: 'BUY_X_GET_Y',
        buyQuantity: 2,
        freeQuantity: 1,
        applicableCategories: ['jeans'],
        applicableProducts: [],
        applicableProductIds: [],
        status: 'INACTIVE', // Disabled
        priority: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    await savePromotionOffers(testOffers);

    const fetchedOffers = await getAllPromotionOffers();
    assert(fetchedOffers.length === 3, 'Admin: Successfully saved and retrieved 3 offers');

    const activeOffers = await getActivePromotionOffers();
    assert(activeOffers.length === 2, 'Admin: Only active offers returned (INACTIVE excluded)');
    assert(activeOffers[0].id === 'offer-b1g2', 'Admin: Offers sorted by priority descending (priority 10 first)');

    // -------------------------------------------------------------------------
    // TEST 2: CRITICAL PRICING BUG FIX (Requirement 2 & 18)
    // Product A: MRP ₹5,000, Selling ₹3,000
    // Product B: MRP ₹1,299, Selling ₹1,299
    // Product C: MRP ₹1,499, Selling ₹1,499
    // BUY 1 GET 2 FREE
    // Customer pays ONLY ₹3,000. NOT ₹5,000.
    // -------------------------------------------------------------------------
    console.log('\n--- 2. CRITICAL PRICING: MRP ₹5,000 vs Selling ₹3,000 ---');
    const pA = await createTestProduct({ name: 'Product A', sellingPrice: 3000, mrp: 5000, categorySlug: 't-shirts' });
    const pB = await createTestProduct({ name: 'Product B', sellingPrice: 1299, mrp: 1299, categorySlug: 't-shirts' });
    const pC = await createTestProduct({ name: 'Product C', sellingPrice: 1499, mrp: 1499, categorySlug: 't-shirts' });

    const resBundle1 = await validateAndPriceOrderItems([
      { productId: pA.id, size: 'M', quantity: 1, promoGroupId: 'b1' },
      { productId: pB.id, size: 'M', quantity: 1, promoGroupId: 'b1' },
      { productId: pC.id, size: 'M', quantity: 1, promoGroupId: 'b1' },
    ]);

    assert(resBundle1.success, 'Validation succeeded for bundle 1');
    assert(resBundle1.subtotal === 3000, `Payable amount is exactly ₹3,000 (actual: ₹${resBundle1.subtotal})`);
    assert(resBundle1.catalogSubtotal === 5798, `Catalog/Selling sum is ₹5,798 (actual: ₹${resBundle1.catalogSubtotal})`);
    assert(resBundle1.promotionalDiscount === 2798, `Promotional discount is ₹2,798 (actual: ₹${resBundle1.promotionalDiscount})`);

    const paidItem1 = resBundle1.items.find(i => !i.isFree);
    const freeItems1 = resBundle1.items.filter(i => i.isFree);
    assert(paidItem1?.productId === pA.id && paidItem1?.price === 3000, 'Product A is the PAID item at ₹3,000');
    assert(freeItems1.length === 2 && freeItems1.every(i => i.price === 0), 'Other two items are ₹0 FREE');

    // -------------------------------------------------------------------------
    // TEST 3: User Example with ₹1,299 Selling Price (Requirement 3 & 27 Test 1)
    // Product A: MRP ₹2,999, Selling ₹1,299
    // Product B: Selling ₹1,299 (MRP 1,299)
    // Product C: Selling ₹1,499 (MRP 1,499)
    // BUY 1 GET 2 FREE
    // Highest Selling Price = ₹1,499 (Product C)
    // System must NOT use ₹2,999 because that is MRP!
    // Total Payable = ₹1,499
    // -------------------------------------------------------------------------
    console.log('\n--- 3. HIGH-MRP PRODUCT WITH LOWER SELLING PRICE ---');
    const pD = await createTestProduct({ name: 'Product D', sellingPrice: 1299, mrp: 2999, categorySlug: 't-shirts' });
    const pE = await createTestProduct({ name: 'Product E', sellingPrice: 1299, mrp: 1299, categorySlug: 't-shirts' });
    const pF = await createTestProduct({ name: 'Product F', sellingPrice: 1499, mrp: 1499, categorySlug: 't-shirts' });

    const resBundle2 = await validateAndPriceOrderItems([
      { productId: pD.id, size: 'M', quantity: 1, promoGroupId: 'b2' },
      { productId: pE.id, size: 'M', quantity: 1, promoGroupId: 'b2' },
      { productId: pF.id, size: 'M', quantity: 1, promoGroupId: 'b2' },
    ]);

    assert(resBundle2.success, 'Validation succeeded for bundle 2');
    assert(resBundle2.subtotal === 1499, `Total payable is ₹1,499, NOT MRP ₹2,999 (actual: ₹${resBundle2.subtotal})`);
    const paidItem2 = resBundle2.items.find(i => !i.isFree);
    assert(paidItem2?.productId === pF.id && paidItem2?.price === 1499, 'Product F (₹1,499 selling) is PAID');
    const productDInBundle = resBundle2.items.find(i => i.productId === pD.id);
    assert(productDInBundle?.isFree === true && productDInBundle?.price === 0, 'Product D (MRP ₹2,999) is FREE (₹0)');

    // -------------------------------------------------------------------------
    // TEST 4: Mathematical Discount Derivation (Requirement 17)
    // Product 1: ₹1,499
    // Product 2: ₹1,299
    // Product 3: ₹999
    // Selling Value: ₹3,797
    // Payable: ₹1,499
    // Discount: ₹2,298
    // -------------------------------------------------------------------------
    console.log('\n--- 4. EXACT DISCOUNT MATHEMATICS (₹1,499 + ₹1,299 + ₹999) ---');
    const pG = await createTestProduct({ name: 'Product G', sellingPrice: 1499, mrp: 1999, categorySlug: 't-shirts' });
    const pH = await createTestProduct({ name: 'Product H', sellingPrice: 1299, mrp: 1499, categorySlug: 't-shirts' });
    const pI = await createTestProduct({ name: 'Product I', sellingPrice: 999, mrp: 1299, categorySlug: 't-shirts' });

    const resBundle3 = await validateAndPriceOrderItems([
      { productId: pG.id, size: 'M', quantity: 1, promoGroupId: 'b3' },
      { productId: pH.id, size: 'M', quantity: 1, promoGroupId: 'b3' },
      { productId: pI.id, size: 'M', quantity: 1, promoGroupId: 'b3' },
    ]);

    assert(resBundle3.catalogSubtotal === 3797, `Original Selling Value is ₹3,797 (actual: ₹${resBundle3.catalogSubtotal})`);
    assert(resBundle3.subtotal === 1499, `Payable Value is ₹1,499 (actual: ₹${resBundle3.subtotal})`);
    assert(resBundle3.promotionalDiscount === 2298, `Discount is exactly ₹2,298 (actual: ₹${resBundle3.promotionalDiscount})`);
    assert(resBundle3.catalogSubtotal - resBundle3.promotionalDiscount === resBundle3.subtotal, 'Selling Value - Discount = Total Payable');

    // -------------------------------------------------------------------------
    // TEST 5: BUY 1 GET 1 FREE Offer Execution
    // -------------------------------------------------------------------------
    console.log('\n--- 5. BUY 1 GET 1 FREE DYNAMIC OFFER ---');
    // Set active offer to BUY 1 GET 1 FREE
    const b1g1Offer: PromotionOffer = {
      id: 'offer-b1g1-active',
      name: 'BUY 1 GET 1 FREE',
      type: 'Buy X Get Y',
      offerType: 'BUY_X_GET_Y',
      buyQuantity: 1,
      freeQuantity: 1,
      applicableCategories: ['t-shirts'],
      applicableProducts: [],
      applicableProductIds: [],
      status: 'ACTIVE',
      priority: 100,
    };
    await savePromotionOffers([b1g1Offer]);

    const pJ = await createTestProduct({ name: 'Product J', sellingPrice: 1299, mrp: 2499, categorySlug: 't-shirts' });
    const pK = await createTestProduct({ name: 'Product K', sellingPrice: 899, mrp: 1199, categorySlug: 't-shirts' });

    const resB1G1 = await validateAndPriceOrderItems([
      { productId: pJ.id, size: 'M', quantity: 1, promoGroupId: 'b1g1-group' },
      { productId: pK.id, size: 'M', quantity: 1, promoGroupId: 'b1g1-group' },
    ]);

    assert(resB1G1.success, 'B1G1 bundle validation succeeds');
    assert(resB1G1.subtotal === 1299, `B1G1: Customer pays highest selling price ₹1,299 (actual: ₹${resB1G1.subtotal})`);
    assert(resB1G1.promotionalDiscount === 899, `B1G1: Savings equal ₹899 (actual: ₹${resB1G1.promotionalDiscount})`);
    const freeItemB1G1 = resB1G1.items.find(i => i.isFree);
    assert(freeItemB1G1?.productId === pK.id && freeItemB1G1.price === 0, 'B1G1: Product K (₹899) is ₹0 FREE');

    // -------------------------------------------------------------------------
    // TEST 6: BUY 2 GET 1 FREE Offer Execution
    // Buy 2, Get 1 Free: 3 items total; Top 2 highest selling items are PAID, lowest is FREE
    // -------------------------------------------------------------------------
    console.log('\n--- 6. BUY 2 GET 1 FREE DYNAMIC OFFER ---');
    const b2g1Offer: PromotionOffer = {
      id: 'offer-b2g1-active',
      name: 'BUY 2 GET 1 FREE',
      type: 'Buy X Get Y',
      offerType: 'BUY_X_GET_Y',
      buyQuantity: 2,
      freeQuantity: 1,
      applicableCategories: ['t-shirts'],
      applicableProducts: [],
      applicableProductIds: [],
      status: 'ACTIVE',
      priority: 100,
    };
    await savePromotionOffers([b2g1Offer]);

    const pL = await createTestProduct({ name: 'Product L', sellingPrice: 2000, mrp: 3000, categorySlug: 't-shirts' });
    const pM = await createTestProduct({ name: 'Product M', sellingPrice: 1500, mrp: 2000, categorySlug: 't-shirts' });
    const pN = await createTestProduct({ name: 'Product N', sellingPrice: 1000, mrp: 1200, categorySlug: 't-shirts' });

    const resB2G1 = await validateAndPriceOrderItems([
      { productId: pL.id, size: 'M', quantity: 1, promoGroupId: 'b2g1-group' },
      { productId: pM.id, size: 'M', quantity: 1, promoGroupId: 'b2g1-group' },
      { productId: pN.id, size: 'M', quantity: 1, promoGroupId: 'b2g1-group' },
    ]);

    assert(resB2G1.success, 'B2G1 bundle validation succeeds');
    assert(resB2G1.subtotal === 3500, `B2G1: Customer pays for top 2 items ₹2,000 + ₹1,500 = ₹3,500 (actual: ₹${resB2G1.subtotal})`);
    assert(resB2G1.promotionalDiscount === 1000, `B2G1: Lowest item ₹1,000 is discount savings (actual: ₹${resB2G1.promotionalDiscount})`);
    const freeB2G1 = resB2G1.items.find(i => i.isFree);
    assert(freeB2G1?.productId === pN.id && freeB2G1.price === 0, 'B2G1: Product N (₹1,000) is ₹0 FREE');

    // -------------------------------------------------------------------------
    // TEST 7: Server-Side Protection Against Client Price Tampering (Requirement 12)
    // Client sends price: 0 or price: 10 for the paid item
    // -------------------------------------------------------------------------
    console.log('\n--- 7. TAMPERING PROTECTION: CLIENT MANIPULATION ATTEMPT ---');
    const resTamper = await validateAndPriceOrderItems([
      { productId: pL.id, size: 'M', quantity: 1, promoGroupId: 'tamper-group', price: 1, isFree: true } as any,
      { productId: pM.id, size: 'M', quantity: 1, promoGroupId: 'tamper-group', price: 0 } as any,
      { productId: pN.id, size: 'M', quantity: 1, promoGroupId: 'tamper-group', price: 5 } as any,
    ]);

    assert(resTamper.success, 'Validation completed safely');
    assert(resTamper.subtotal === 3500, `Server completely ignored client prices (subtotal is ₹3,500, NOT ₹1 or ₹6)`);
    assert(resTamper.items.find(i => i.productId === pL.id)?.price === 2000, 'Product L price enforced from DB (₹2,000)');

    // -------------------------------------------------------------------------
    // TEST 8: Out-of-Stock Item in Bundle Fails Gracefully (Requirement 15)
    // -------------------------------------------------------------------------
    console.log('\n--- 8. INVENTORY: OUT OF STOCK HANDLING ---');
    const pOOS = await createTestProduct({ name: 'Product OOS', sellingPrice: 999, mrp: 1299, stock: 0, categorySlug: 't-shirts' });
    const resOOS = await validateAndPriceOrderItems([
      { productId: pL.id, size: 'M', quantity: 1, promoGroupId: 'oos-group' },
      { productId: pM.id, size: 'M', quantity: 1, promoGroupId: 'oos-group' },
      { productId: pOOS.id, size: 'M', quantity: 1, promoGroupId: 'oos-group' },
    ]);

    assert(!resOOS.success, 'Validation correctly rejected out-of-stock item in bundle');
    assert(
      Boolean(resOOS.error && (resOOS.error.toLowerCase().includes('stock') || resOOS.error.toLowerCase().includes('unavailable'))),
      `Helpful error returned: "${resOOS.error}"`
    );

    // -------------------------------------------------------------------------
    // TEST 9: Real-time Price Change Recalculation (Requirement 22)
    // Change product price in DB and verify checkout uses new price
    // -------------------------------------------------------------------------
    console.log('\n--- 9. PRICE CHANGE DYNAMIC RECALCULATION ---');
    // Restore B1G2
    await savePromotionOffers([testOffers[0]]); // B1G2

    // Update Product A price from ₹3,000 to ₹3,500
    await prisma.product.update({
      where: { id: pA.id },
      data: { price: 3500 },
    });

    const resPriceChange = await validateAndPriceOrderItems([
      { productId: pA.id, size: 'M', quantity: 1, promoGroupId: 'b-pricechange' },
      { productId: pB.id, size: 'M', quantity: 1, promoGroupId: 'b-pricechange' },
      { productId: pC.id, size: 'M', quantity: 1, promoGroupId: 'b-pricechange' },
    ]);

    assert(resPriceChange.subtotal === 3500, `Updated DB selling price ₹3,500 applied immediately (actual: ₹${resPriceChange.subtotal})`);

    // -------------------------------------------------------------------------
    // TEST 10: Deactivated Offer Handling (Requirement 10)
    // When offers are disabled, promotional bundles cannot be checked out with free items
    // Normal purchases continue working with regular pricing
    // -------------------------------------------------------------------------
    console.log('\n--- 10. DISABLED / INACTIVE PROMOTIONS ---');
    await savePromotionOffers([
      {
        ...testOffers[0],
        status: 'INACTIVE',
      },
    ]);

    const activeCheck = await getActivePromotionOffers();
    assert(activeCheck.length === 0, 'No active offers when status is INACTIVE');

    const resDisabledBundle = await validateAndPriceOrderItems([
      { productId: pA.id, size: 'M', quantity: 1, promoGroupId: 'b-disabled' },
      { productId: pB.id, size: 'M', quantity: 1, promoGroupId: 'b-disabled' },
      { productId: pC.id, size: 'M', quantity: 1, promoGroupId: 'b-disabled' },
    ]);

    assert(!resDisabledBundle.success, 'Cart validation rejects promo bundle when promo is disabled');
    assert(
      Boolean(resDisabledBundle.error && resDisabledBundle.error.includes('inactive')),
      `Informative error returned when promo is inactive: "${resDisabledBundle.error}"`
    );

    // Regular purchase succeeds with 0 discount
    const resRegular = await validateAndPriceOrderItems([
      { productId: pB.id, size: 'M', quantity: 1 },
      { productId: pC.id, size: 'M', quantity: 1 },
    ]);
    assert(resRegular.success, 'Regular purchase succeeds when promo is inactive');
    assert(resRegular.promotionalDiscount === 0, 'No promo discount for regular purchase');
    assert(resRegular.subtotal === 1299 + 1499, `Regular items pay full normal selling price: ₹${resRegular.subtotal}`);

  } finally {
    // Restore original offers
    console.log('\n--- CLEANING UP TEST DATA ---');
    await savePromotionOffers(originalOffers);

    // Clean up test products
    for (const pid of createdProductIds) {
      try {
        await prisma.productVariant.deleteMany({ where: { productId: pid } });
        await prisma.productImage.deleteMany({ where: { productId: pid } });
        await prisma.product.delete({ where: { id: pid } });
      } catch (err) {
        console.error(`Error deleting test product ${pid}:`, err);
      }
    }
  }

  console.log('\n================================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
