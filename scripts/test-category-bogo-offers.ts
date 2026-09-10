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
  findMatchingOfferForProductOrCategory,
  PromotionOffer,
} from '../src/lib/promotions';

async function runCategoryBogoOfferTests() {
  console.log('================================================================');
  console.log('AD(R)IZO — CATEGORY-BASED BUY X GET Y OFFER SYSTEM VERIFICATION');
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
  const createdCategoryIds: string[] = [];

  // Backup existing offers to restore after tests
  const initialOffers = await getAllPromotionOffers();

  async function createTestCategory(name: string, slug: string) {
    const existing = await prisma.category.findUnique({ where: { slug } });
    if (existing) return existing;
    const cat = await prisma.category.create({
      data: {
        name,
        slug,
        status: 'ACTIVE',
      },
    });
    createdCategoryIds.push(cat.id);
    return cat;
  }

  async function createTestProduct(opts: {
    name: string;
    sellingPrice: number;
    mrp: number;
    stock?: number;
    categoryId?: string;
    categorySlug?: string;
    productType?: string;
    sizeStock?: Record<string, number>;
  }) {
    const timestamp = Date.now() + Math.floor(Math.random() * 100000);
    const sku = `BOGO-CAT-${timestamp}`;
    const stock = opts.stock ?? 50;

    const sizeWiseStock = opts.sizeStock || { S: stock, M: stock, L: stock, XL: stock };

    const p = await prisma.product.create({
      data: {
        name: opts.name,
        slug: `bogo-cat-${timestamp}`,
        description: 'Category BOGO Test Product',
        price: opts.sellingPrice, // Authoritative current selling price
        originalPrice: opts.mrp,   // Authoritative MRP / catalog strike-through reference
        sku,
        stock,
        color: 'CLASSIC BLACK',
        categoryId: opts.categoryId,
        productType: opts.productType || 'T-Shirts',
        status: 'ACTIVE',
        sizeWiseStock: JSON.stringify(sizeWiseStock),
        variants: {
          create: [
            {
              size: 'M',
              color: 'CLASSIC BLACK',
              sku: `${sku}-M`,
              stock: sizeWiseStock['M'] ?? stock,
            },
            {
              size: 'L',
              color: 'CLASSIC BLACK',
              sku: `${sku}-L`,
              stock: sizeWiseStock['L'] ?? stock,
            },
          ],
        },
      },
      include: {
        category: true,
        variants: true,
      },
    });

    createdProductIds.push(p.id);
    return p;
  }

  try {
    // 0. Setup Categories
    const tshirtsCat = await createTestCategory('T-Shirts', 't-shirts');
    const hoodiesCat = await createTestCategory('Hoodies', 'hoodies');
    const pantsCat = await createTestCategory('Pants', 'pants');
    const shirtsCat = await createTestCategory('Shirts', 'shirts');

    // 0b. Configure Multiple Active Category-Specific Offers
    const testOffers: PromotionOffer[] = [
      {
        id: 'offer-tshirts-b1g2',
        name: 'BUY 1 GET 2 FREE',
        type: 'Buy X Get Y',
        buyQuantity: 1,
        freeQuantity: 2,
        applicableCategories: ['t-shirts', 'polo-t-shirt'],
        status: 'ACTIVE',
        allowSameProduct: true,
        allowDifferentProducts: true,
        priority: 20,
      },
      {
        id: 'offer-hoodies-b1g1',
        name: 'BUY 1 GET 1 FREE',
        type: 'Buy X Get Y',
        buyQuantity: 1,
        freeQuantity: 1,
        applicableCategories: ['hoodies'],
        status: 'ACTIVE',
        allowSameProduct: true,
        allowDifferentProducts: true,
        priority: 15,
      },
      {
        id: 'offer-shirts-b1g3',
        name: 'BUY 1 GET 3 FREE',
        type: 'Buy X Get Y',
        buyQuantity: 1,
        freeQuantity: 3,
        applicableCategories: ['shirts'],
        status: 'ACTIVE',
        allowSameProduct: true,
        allowDifferentProducts: true,
        priority: 12,
      },
      {
        id: 'offer-pants-b2g1',
        name: 'BUY 2 GET 1 FREE',
        type: 'Buy X Get Y',
        buyQuantity: 2,
        freeQuantity: 1,
        applicableCategories: ['pants'],
        status: 'ACTIVE',
        allowSameProduct: true,
        allowDifferentProducts: true,
        priority: 10,
      },
    ];

    await savePromotionOffers(testOffers);
    const activeLoaded = await getActivePromotionOffers();
    assert(activeLoaded.length === 4, 'Admin configured multiple category-specific offers successfully');

    // -------------------------------------------------------------
    // TEST 1 — T-SHIRT (BUY 1 GET 2 FREE, SAME CATEGORY, SELLING PRICE)
    // -------------------------------------------------------------
    console.log('\n--- Running TEST 1: T-Shirt BUY 1 GET 2 FREE (Same Category) ---');
    const tshirt1 = await createTestProduct({
      name: 'Rama Green Zipper Polo T-Shirt',
      sellingPrice: 1299,
      mrp: 1999,
      categoryId: tshirtsCat.id,
      categorySlug: 't-shirts',
      productType: 'T-Shirts',
    });
    const tshirt2 = await createTestProduct({
      name: 'White Zipper Polo T-Shirt',
      sellingPrice: 999,
      mrp: 1499,
      categoryId: tshirtsCat.id,
      categorySlug: 't-shirts',
      productType: 'T-Shirts',
    });
    const tshirt3 = await createTestProduct({
      name: 'Mehroon Zipper Polo T-Shirt',
      sellingPrice: 899,
      mrp: 1399,
      categoryId: tshirtsCat.id,
      categorySlug: 't-shirts',
      productType: 'T-Shirts',
    });

    // Verify dynamic offer resolver for T-Shirts
    const tshirtOffer = findMatchingOfferForProductOrCategory(activeLoaded, {
      productId: tshirt1.id,
      categorySlug: 't-shirts',
      categoryName: 'T-Shirts',
      productType: 'T-Shirts',
    });
    assert(tshirtOffer?.name === 'BUY 1 GET 2 FREE', 'T-Shirt resolves BUY 1 GET 2 FREE offer');
    assert(tshirtOffer?.buyQuantity === 1 && tshirtOffer?.freeQuantity === 2, 'T-Shirt offer specifies X=1 and Y=2');

    // Validate bundle with 1 paid + 2 free T-shirts
    const t1Result = await validateAndPriceOrderItems([
      { id: tshirt1.id, productId: tshirt1.id, name: tshirt1.name, price: 1299, size: 'M', quantity: 1, promoGroupId: 'tshirt-bundle-1', promotionRule: 'BUY 1 GET 2 FREE' },
      { id: tshirt2.id, productId: tshirt2.id, name: tshirt2.name, price: 999, size: 'M', quantity: 1, isFree: true, promoGroupId: 'tshirt-bundle-1', promotionRule: 'BUY 1 GET 2 FREE' },
      { id: tshirt3.id, productId: tshirt3.id, name: tshirt3.name, price: 899, size: 'M', quantity: 1, isFree: true, promoGroupId: 'tshirt-bundle-1', promotionRule: 'BUY 1 GET 2 FREE' },
    ]);

    assert(t1Result.success === true, 'T-Shirt bundle validates successfully');
    assert(t1Result.subtotal === 1299, 'T-Shirt bundle payable total equals highest selling price (₹1299)', `Got ${t1Result.subtotal}`);
    const t1FreeItems = t1Result.items.filter(i => i.isFree);
    assert(t1FreeItems.length === 2, 'Bundle contains exactly 2 free items');
    assert(t1FreeItems.every(i => i.price === 0), 'All free items priced at ₹0.00');
    assert(t1Result.catalogSubtotal === (1299 + 999 + 899), 'Catalog selling sum matches ₹3,197');
    assert(t1Result.promotionalDiscount === (999 + 899), 'Promotional savings matches ₹1,898');

    // -------------------------------------------------------------
    // TEST 2 — HOODIE (BUY 1 GET 1 FREE, SAME CATEGORY)
    // -------------------------------------------------------------
    console.log('\n--- Running TEST 2: Hoodie BUY 1 GET 1 FREE ---');
    const hoodie1 = await createTestProduct({
      name: 'Black Heavyweight Fleece Hoodie',
      sellingPrice: 2499,
      mrp: 3999,
      categoryId: hoodiesCat.id,
      categorySlug: 'hoodies',
      productType: 'Hoodies',
    });
    const hoodie2 = await createTestProduct({
      name: 'Charcoal Grey Oversized Hoodie',
      sellingPrice: 2199,
      mrp: 3499,
      categoryId: hoodiesCat.id,
      categorySlug: 'hoodies',
      productType: 'Hoodies',
    });

    const hoodieOffer = findMatchingOfferForProductOrCategory(activeLoaded, {
      productId: hoodie1.id,
      categorySlug: 'hoodies',
      categoryName: 'Hoodies',
      productType: 'Hoodies',
    });
    assert(hoodieOffer?.name === 'BUY 1 GET 1 FREE', 'Hoodie resolves BUY 1 GET 1 FREE offer');
    assert(hoodieOffer?.buyQuantity === 1 && hoodieOffer?.freeQuantity === 1, 'Hoodie offer specifies X=1 and Y=1');

    const hResult = await validateAndPriceOrderItems([
      { id: hoodie1.id, productId: hoodie1.id, name: hoodie1.name, price: 2499, size: 'M', quantity: 1, promoGroupId: 'hoodie-bundle-1', promotionRule: 'BUY 1 GET 1 FREE' },
      { id: hoodie2.id, productId: hoodie2.id, name: hoodie2.name, price: 2199, size: 'L', quantity: 1, isFree: true, promoGroupId: 'hoodie-bundle-1', promotionRule: 'BUY 1 GET 1 FREE' },
    ]);

    assert(hResult.success === true, 'Hoodie bundle validates successfully');
    assert(hResult.subtotal === 2499, 'Hoodie bundle payable total equals highest selling price (₹2499)');
    assert(hResult.items.filter(i => i.isFree).length === 1, 'Hoodie bundle contains exactly 1 free item');

    // -------------------------------------------------------------
    // TEST 3 — SHIRTS (BUY 1 GET 3 FREE)
    // -------------------------------------------------------------
    console.log('\n--- Running TEST 3: Shirts BUY 1 GET 3 FREE ---');
    const shirt1 = await createTestProduct({ name: 'Oxford Cotton Shirt - Blue', sellingPrice: 1899, mrp: 2999, categoryId: shirtsCat.id, categorySlug: 'shirts' });
    const shirt2 = await createTestProduct({ name: 'Oxford Cotton Shirt - White', sellingPrice: 1799, mrp: 2799, categoryId: shirtsCat.id, categorySlug: 'shirts' });
    const shirt3 = await createTestProduct({ name: 'Linen Casual Shirt - Olive', sellingPrice: 1699, mrp: 2699, categoryId: shirtsCat.id, categorySlug: 'shirts' });
    const shirt4 = await createTestProduct({ name: 'Striped Formal Shirt', sellingPrice: 1599, mrp: 2599, categoryId: shirtsCat.id, categorySlug: 'shirts' });

    const sResult = await validateAndPriceOrderItems([
      { id: shirt1.id, productId: shirt1.id, name: shirt1.name, price: 1899, size: 'M', quantity: 1, promoGroupId: 'shirt-bundle-1', promotionRule: 'BUY 1 GET 3 FREE' },
      { id: shirt2.id, productId: shirt2.id, name: shirt2.name, price: 1799, size: 'M', quantity: 1, isFree: true, promoGroupId: 'shirt-bundle-1', promotionRule: 'BUY 1 GET 3 FREE' },
      { id: shirt3.id, productId: shirt3.id, name: shirt3.name, price: 1699, size: 'M', quantity: 1, isFree: true, promoGroupId: 'shirt-bundle-1', promotionRule: 'BUY 1 GET 3 FREE' },
      { id: shirt4.id, productId: shirt4.id, name: shirt4.name, price: 1599, size: 'M', quantity: 1, isFree: true, promoGroupId: 'shirt-bundle-1', promotionRule: 'BUY 1 GET 3 FREE' },
    ]);

    assert(sResult.success === true, 'Buy 1 Get 3 Free bundle validates successfully');
    assert(sResult.subtotal === 1899, 'Buy 1 Get 3 Free bundle payable total equals highest selling price (₹1899)');
    assert(sResult.items.filter(i => i.isFree).length === 3, 'Exactly 3 free shirts in bundle');

    // -------------------------------------------------------------
    // TEST 4 — STRICT CROSS-CATEGORY REJECTION
    // -------------------------------------------------------------
    console.log('\n--- Running TEST 4: Cross-Category Rejection (T-Shirt + Hoodie mixed bundle) ---');
    // Customer buys a T-shirt and attempts to add a Hoodie as a free item
    const mixedBundleResult = await validateAndPriceOrderItems([
      { id: tshirt1.id, productId: tshirt1.id, name: tshirt1.name, price: 1299, size: 'M', quantity: 1, promoGroupId: 'tampered-bundle', promotionRule: 'BUY 1 GET 2 FREE' },
      { id: tshirt2.id, productId: tshirt2.id, name: tshirt2.name, price: 999, size: 'M', quantity: 1, isFree: true, promoGroupId: 'tampered-bundle', promotionRule: 'BUY 1 GET 2 FREE' },
      { id: hoodie1.id, productId: hoodie1.id, name: hoodie1.name, price: 2499, size: 'M', quantity: 1, isFree: true, promoGroupId: 'tampered-bundle', promotionRule: 'BUY 1 GET 2 FREE' },
    ]);

    assert(mixedBundleResult.success === false, 'Server strictly rejects mixed cross-category bundle');
    assert(
      mixedBundleResult.error?.includes('must be from the same category') === true ||
      mixedBundleResult.error?.includes('Cross-category') === true,
      'Error message explicitly states cross-category selection is prohibited',
      mixedBundleResult.error
    );

    // Multiple Independent Bundles (1 T-shirt bundle + 1 Hoodie bundle)
    console.log('\n--- Running Multiple Independent Bundles in Cart ---');
    const multiBundleResult = await validateAndPriceOrderItems([
      // Bundle 1: T-Shirts (B1G2)
      { id: tshirt1.id, productId: tshirt1.id, name: tshirt1.name, price: 1299, size: 'M', quantity: 1, promoGroupId: 'bundle-tshirt', promotionRule: 'BUY 1 GET 2 FREE' },
      { id: tshirt2.id, productId: tshirt2.id, name: tshirt2.name, price: 999, size: 'M', quantity: 1, isFree: true, promoGroupId: 'bundle-tshirt', promotionRule: 'BUY 1 GET 2 FREE' },
      { id: tshirt3.id, productId: tshirt3.id, name: tshirt3.name, price: 899, size: 'M', quantity: 1, isFree: true, promoGroupId: 'bundle-tshirt', promotionRule: 'BUY 1 GET 2 FREE' },
      // Bundle 2: Hoodies (B1G1)
      { id: hoodie1.id, productId: hoodie1.id, name: hoodie1.name, price: 2499, size: 'M', quantity: 1, promoGroupId: 'bundle-hoodie', promotionRule: 'BUY 1 GET 1 FREE' },
      { id: hoodie2.id, productId: hoodie2.id, name: hoodie2.name, price: 2199, size: 'M', quantity: 1, isFree: true, promoGroupId: 'bundle-hoodie', promotionRule: 'BUY 1 GET 1 FREE' },
    ]);

    assert(multiBundleResult.success === true, 'Multiple independent bundles validate simultaneously');
    assert(multiBundleResult.promotionalBundlesCount === 2, 'Detected exactly 2 promotional bundles');
    assert(multiBundleResult.subtotal === (1299 + 2499), 'Payable sum equals paid T-shirt + paid Hoodie (₹3798)', `Got ${multiBundleResult.subtotal}`);
    assert(multiBundleResult.items.filter(i => i.isFree).length === 3, 'Total 3 free products (2 T-shirts + 1 Hoodie)');

    // -------------------------------------------------------------
    // TEST 5 — PRICING (CURRENT SELLING PRICE VS MRP)
    // -------------------------------------------------------------
    console.log('\n--- Running TEST 5: Strict Current Selling Price vs MRP Rule ---');
    // Product A: MRP = ₹5,000, Selling Price = ₹3,000
    // Product B: MRP = ₹1,299, Selling Price = ₹1,299
    // Product C: MRP = ₹1,999, Selling Price = ₹1,999
    const prodA = await createTestProduct({ name: 'Premium Linen T-Shirt A', sellingPrice: 3000, mrp: 5000, categoryId: tshirtsCat.id, categorySlug: 't-shirts' });
    const prodB = await createTestProduct({ name: 'Standard Polo T-Shirt B', sellingPrice: 1299, mrp: 1299, categoryId: tshirtsCat.id, categorySlug: 't-shirts' });
    const prodC = await createTestProduct({ name: 'Cotton Crewneck T-Shirt C', sellingPrice: 1999, mrp: 1999, categoryId: tshirtsCat.id, categorySlug: 't-shirts' });

    const p5Result = await validateAndPriceOrderItems([
      { id: prodA.id, productId: prodA.id, name: prodA.name, price: 3000, size: 'M', quantity: 1, promoGroupId: 'bundle-p5', promotionRule: 'BUY 1 GET 2 FREE' },
      { id: prodB.id, productId: prodB.id, name: prodB.name, price: 1299, size: 'M', quantity: 1, isFree: true, promoGroupId: 'bundle-p5', promotionRule: 'BUY 1 GET 2 FREE' },
      { id: prodC.id, productId: prodC.id, name: prodC.name, price: 1999, size: 'M', quantity: 1, isFree: true, promoGroupId: 'bundle-p5', promotionRule: 'BUY 1 GET 2 FREE' },
    ]);

    assert(p5Result.success === true, 'Test 5 bundle validates');
    assert(p5Result.subtotal === 3000, 'Customer pays EXACTLY selling price of ₹3,000 (NEVER MRP ₹5,000)', `Got ${p5Result.subtotal}`);
    assert(p5Result.catalogMrpSubtotal === (5000 + 1299 + 1999), 'Catalog MRP sum is ₹8,298');
    assert(p5Result.promotionalDiscount === (1299 + 1999), 'Promotional discount is ₹3,298 off selling prices');

    // -------------------------------------------------------------
    // TEST 6 — UNBUNDLED REGULAR ITEM (POPUP CLOSE / SKIP BEHAVIOR)
    // -------------------------------------------------------------
    console.log('\n--- Running TEST 6: Popup Close / Skip Behavior ---');
    // Original product remains in cart without any free items or promoGroupId
    const p6Result = await validateAndPriceOrderItems([
      { id: prodA.id, productId: prodA.id, name: prodA.name, price: 3000, size: 'M', quantity: 1 },
    ]);

    assert(p6Result.success === true, 'Single unbundled item validates normally');
    assert(p6Result.subtotal === 3000, 'Customer pays regular selling price ₹3,000');
    assert(p6Result.items.length === 1, 'No fake or free products added');
    assert(p6Result.promotionalBundlesCount === 0, 'No bundles created');

    // -------------------------------------------------------------
    // TEST 7 — OUT OF STOCK VARIANT REJECTION
    // -------------------------------------------------------------
    console.log('\n--- Running TEST 7: Out Of Stock Variant Rejection ---');
    const outOfStockTshirt = await createTestProduct({
      name: 'Sold Out Limited T-Shirt',
      sellingPrice: 1499,
      mrp: 1999,
      categoryId: tshirtsCat.id,
      categorySlug: 't-shirts',
      sizeStock: { M: 0, L: 10 }, // Size M is out of stock
    });

    const oosResult = await validateAndPriceOrderItems([
      { id: tshirt1.id, productId: tshirt1.id, name: tshirt1.name, price: 1299, size: 'M', quantity: 1, promoGroupId: 'bundle-oos', promotionRule: 'BUY 1 GET 2 FREE' },
      { id: tshirt2.id, productId: tshirt2.id, name: tshirt2.name, price: 999, size: 'M', quantity: 1, isFree: true, promoGroupId: 'bundle-oos', promotionRule: 'BUY 1 GET 2 FREE' },
      { id: outOfStockTshirt.id, productId: outOfStockTshirt.id, name: outOfStockTshirt.name, price: 1499, size: 'M', quantity: 1, isFree: true, promoGroupId: 'bundle-oos', promotionRule: 'BUY 1 GET 2 FREE' },
    ]);

    assert(oosResult.success === false, 'Server strictly rejects out-of-stock free variant');
    assert(oosResult.error?.includes('out of stock') === true, 'Error indicates item is out of stock', oosResult.error);

    // -------------------------------------------------------------
    // TEST 8 — ADMIN DISABLE OFFER
    // -------------------------------------------------------------
    console.log('\n--- Running TEST 8: Admin Disable Offer ---');
    // Disable T-Shirt offer
    const disabledOffers: PromotionOffer[] = testOffers.map(o =>
      o.id === 'offer-tshirts-b1g2' ? { ...o, status: 'INACTIVE' } : o
    );
    await savePromotionOffers(disabledOffers);

    const activeAfterDisable = await getActivePromotionOffers();
    assert(
      !activeAfterDisable.some(o => o.id === 'offer-tshirts-b1g2'),
      'Disabled offer is removed from active offers'
    );

    // Try submitting a T-Shirt bundle under disabled offer
    const disabledAttempt = await validateAndPriceOrderItems([
      { id: tshirt1.id, productId: tshirt1.id, name: tshirt1.name, price: 1299, size: 'M', quantity: 1, promoGroupId: 'bundle-disabled', promotionRule: 'BUY 1 GET 2 FREE' },
      { id: tshirt2.id, productId: tshirt2.id, name: tshirt2.name, price: 999, size: 'M', quantity: 1, isFree: true, promoGroupId: 'bundle-disabled', promotionRule: 'BUY 1 GET 2 FREE' },
      { id: tshirt3.id, productId: tshirt3.id, name: tshirt3.name, price: 899, size: 'M', quantity: 1, isFree: true, promoGroupId: 'bundle-disabled', promotionRule: 'BUY 1 GET 2 FREE' },
    ]);

    assert(disabledAttempt.success === false, 'Server rejects bundle when offer is disabled by admin');

    // -------------------------------------------------------------
    // TEST 9 — BUY 2 GET 1 FREE (PANTS)
    // -------------------------------------------------------------
    console.log('\n--- Running TEST 9: BUY 2 GET 1 FREE (Pants) ---');
    const pants1 = await createTestProduct({ name: 'Slim Chino Pants - Beige', sellingPrice: 2299, mrp: 3499, categoryId: pantsCat.id, categorySlug: 'pants' });
    const pants2 = await createTestProduct({ name: 'Slim Chino Pants - Navy', sellingPrice: 2199, mrp: 3399, categoryId: pantsCat.id, categorySlug: 'pants' });
    const pants3 = await createTestProduct({ name: 'Linen Casual Trousers', sellingPrice: 1999, mrp: 2999, categoryId: pantsCat.id, categorySlug: 'pants' });

    const b2g1Result = await validateAndPriceOrderItems([
      { id: pants1.id, productId: pants1.id, name: pants1.name, price: 2299, size: 'M', quantity: 1, promoGroupId: 'pants-bundle', promotionRule: 'BUY 2 GET 1 FREE' },
      { id: pants2.id, productId: pants2.id, name: pants2.name, price: 2199, size: 'M', quantity: 1, promoGroupId: 'pants-bundle', promotionRule: 'BUY 2 GET 1 FREE' },
      { id: pants3.id, productId: pants3.id, name: pants3.name, price: 1999, size: 'M', quantity: 1, isFree: true, promoGroupId: 'pants-bundle', promotionRule: 'BUY 2 GET 1 FREE' },
    ]);

    assert(b2g1Result.success === true, 'BUY 2 GET 1 FREE bundle validates');
    // Top 2 items are paid: 2299 + 2199 = 4498. Lowest 1999 is free.
    assert(b2g1Result.subtotal === (2299 + 2199), 'Payable sum is top 2 items (₹4498)', `Got ${b2g1Result.subtotal}`);
    assert(b2g1Result.items.filter(i => i.isFree).length === 1, 'Exactly 1 free item in BUY 2 GET 1 bundle');

    // -------------------------------------------------------------
    // TEST 10 — SERVER-SIDE CLIENT PRICE TAMPERING PROTECTION
    // -------------------------------------------------------------
    console.log('\n--- Running TEST 10: Client Price Tampering Protection ---');
    // Re-enable T-Shirt offer
    await savePromotionOffers(testOffers);
    // Malicious client tries to send price: 0 for the paid item
    const tamperedResult = await validateAndPriceOrderItems([
      { id: tshirt1.id, productId: tshirt1.id, name: tshirt1.name, price: 0, size: 'M', quantity: 1, promoGroupId: 'tamper-price', promotionRule: 'BUY 1 GET 2 FREE' },
      { id: tshirt2.id, productId: tshirt2.id, name: tshirt2.name, price: 0, size: 'M', quantity: 1, isFree: true, promoGroupId: 'tamper-price', promotionRule: 'BUY 1 GET 2 FREE' },
      { id: tshirt3.id, productId: tshirt3.id, name: tshirt3.name, price: 0, size: 'M', quantity: 1, isFree: true, promoGroupId: 'tamper-price', promotionRule: 'BUY 1 GET 2 FREE' },
    ]);

    assert(tamperedResult.success === true, 'Bundle processed through authoritative DB prices');
    assert(tamperedResult.subtotal === 1299, 'Server ignores client price 0 and charges authoritative selling price ₹1,299');
    assert(tamperedResult.items.find(i => !i.isFree)?.price === 1299, 'Paid item price set from database');

  } finally {
    // Cleanup created test products
    if (createdProductIds.length > 0) {
      await prisma.productVariant.deleteMany({ where: { productId: { in: createdProductIds } } });
      await prisma.product.deleteMany({ where: { id: { in: createdProductIds } } });
    }
    // Cleanup created test categories
    if (createdCategoryIds.length > 0) {
      await prisma.category.deleteMany({ where: { id: { in: createdCategoryIds } } });
    }
    // Restore initial store offers
    await savePromotionOffers(initialOffers);
    await prisma.$disconnect();
  }

  console.log('\n================================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runCategoryBogoOfferTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
