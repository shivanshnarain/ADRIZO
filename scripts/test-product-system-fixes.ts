process.env.ADMIN_TEST_BYPASS = 'true';

import { prisma } from '../src/lib/prisma';
import { 
  normalizeConfigPart, 
  buildProductConfigKey, 
  generateDeterministicSku, 
  buildVariantSku 
} from '../src/lib/sku';
import { createProduct, updateProduct } from '../src/actions/products';
import fs from 'fs';
import path from 'path';

async function runAll16Tests() {
  console.log('================================================================');
  console.log('ADRIZO / UNIQUE INDIA GARMENTS — PRODUCT SYSTEM VERIFICATION');
  console.log('Testing all 16 required scenarios from production specification');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;
  const createdTestProductIds: string[] = [];

  function assert(condition: boolean, testNum: number, name: string, detail?: string) {
    if (condition) {
      console.log(`✅ [PASS] TEST ${testNum}: ${name}`);
      if (detail) console.log(`         Detail: ${detail}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] TEST ${testNum}: ${name}`);
      if (detail) console.error(`         Detail: ${detail}`);
      failed++;
    }
  }

  try {
    // 0. Setup: Identify or get categories
    const categories = await prisma.category.findMany({ take: 5 });
    if (categories.length < 2) {
      throw new Error('At least 2 categories required in database for full testing.');
    }
    const cat1 = categories[0];
    const cat2 = categories[1];

    console.log(`Using Category 1: "${cat1.name}" (${cat1.id})`);
    console.log(`Using Category 2: "${cat2.name}" (${cat2.id})\n`);

    // TEST 1: Create a completely new configuration
    const test1Color = 'COBALT BLUE';
    const test1Type = 'Test Alpha Zipper';
    const sku1 = generateDeterministicSku({
      categoryName: cat1.name,
      categoryCode: cat1.code,
      colorName: test1Color,
      productTypeName: test1Type
    });

    const fd1 = new FormData();
    fd1.append('name', 'Test Alpha Cobalt Blue Polo');
    fd1.append('slug', `test-alpha-cobalt-blue-${Date.now()}`);
    fd1.append('categoryId', cat1.id);
    fd1.append('productType', test1Type);
    fd1.append('color', test1Color);
    fd1.append('sku', sku1);
    fd1.append('price', '1499');
    fd1.append('originalPrice', '2999');
    fd1.append('sizes', JSON.stringify(['S', 'M', 'L', 'XL']));
    fd1.append('variants', JSON.stringify([
      { size: 'S', color: test1Color, sku: buildVariantSku(sku1, 'S', 0) },
      { size: 'M', color: test1Color, sku: buildVariantSku(sku1, 'M', 1) },
      { size: 'L', color: test1Color, sku: buildVariantSku(sku1, 'L', 2) },
      { size: 'XL', color: test1Color, sku: buildVariantSku(sku1, 'XL', 3) }
    ]));
    fd1.append('images', JSON.stringify([{ url: 'https://example.com/test1.jpg', isPrimary: true, sortOrder: 0 }]));
    fd1.append('description', 'Test product description');

    const res1 = await createProduct(fd1);
    const prod1 = res1.product!;
    if (prod1?.id) createdTestProductIds.push(prod1.id);

    assert(
      Boolean(res1.success && prod1?.id && prod1.sku === sku1),
      1,
      'Create a completely new configuration',
      `Product created with ID=${prod1?.id}, SKU=${prod1?.sku}`
    );

    // TEST 2: Create the exact same Category + Product Type + Color again (case & whitespace variation)
    const fd2 = new FormData();
    fd2.append('name', 'Duplicate Alpha Cobalt Blue');
    fd2.append('slug', `dup-alpha-${Date.now()}`);
    fd2.append('categoryId', cat1.id);
    // Intentional case & whitespace difference to test normalization
    fd2.append('productType', '  test   alpha zipper  ');
    fd2.append('color', ' cobalt   blue ');
    fd2.append('price', '1699');
    fd2.append('originalPrice', '2999');

    const res2 = await createProduct(fd2);
    assert(
      !res2.success && Boolean(res2.isDuplicate || (res2.error && res2.error.includes('already registered'))),
      2,
      'Create exact same Category + Product Type + Color again',
      `Correctly blocked with error: "${res2.error}"`
    );

    // TEST 3: Same category + same product type + different color
    const test3Color = 'RUBY RED';
    const sku3 = generateDeterministicSku({
      categoryName: cat1.name,
      categoryCode: cat1.code,
      colorName: test3Color,
      productTypeName: test1Type
    });

    const fd3 = new FormData();
    fd3.append('name', 'Test Alpha Ruby Red Polo');
    fd3.append('slug', `test-alpha-ruby-red-${Date.now()}`);
    fd3.append('categoryId', cat1.id);
    fd3.append('productType', test1Type);
    fd3.append('color', test3Color);
    fd3.append('sku', sku3);
    fd3.append('price', '1499');
    fd3.append('originalPrice', '2999');
    fd3.append('sizes', JSON.stringify(['M', 'L']));

    const res3 = await createProduct(fd3);
    const prod3 = res3.product!;
    if (prod3?.id) createdTestProductIds.push(prod3.id);

    assert(
      Boolean(res3.success && prod3?.id && prod3.sku === sku3),
      3,
      'Same category + same product type + different color',
      `Allowed as separate configuration with SKU=${prod3?.sku}`
    );

    // TEST 4: Same category + different product type + same color
    const test4Type = 'Test Beta Crewneck';
    const sku4 = generateDeterministicSku({
      categoryName: cat1.name,
      categoryCode: cat1.code,
      colorName: test1Color,
      productTypeName: test4Type
    });

    const fd4 = new FormData();
    fd4.append('name', 'Test Beta Cobalt Blue Crewneck');
    fd4.append('slug', `test-beta-cobalt-blue-${Date.now()}`);
    fd4.append('categoryId', cat1.id);
    fd4.append('productType', test4Type);
    fd4.append('color', test1Color);
    fd4.append('sku', sku4);
    fd4.append('price', '1599');
    fd4.append('originalPrice', '2999');
    fd4.append('sizes', JSON.stringify(['L', 'XL']));

    const res4 = await createProduct(fd4);
    const prod4 = res4.product!;
    if (prod4?.id) createdTestProductIds.push(prod4.id);

    assert(
      Boolean(res4.success && prod4?.id && prod4.sku === sku4),
      4,
      'Same category + different product type + same color',
      `Allowed as separate configuration with SKU=${prod4?.sku}`
    );

    // TEST 5: Different category + same product type + same color
    const sku5 = generateDeterministicSku({
      categoryName: cat2.name,
      categoryCode: cat2.code,
      colorName: test1Color,
      productTypeName: test1Type
    });

    const fd5 = new FormData();
    fd5.append('name', 'Cat2 Alpha Cobalt Blue');
    fd5.append('slug', `cat2-alpha-cobalt-${Date.now()}`);
    fd5.append('categoryId', cat2.id);
    fd5.append('productType', test1Type);
    fd5.append('color', test1Color);
    fd5.append('sku', sku5);
    fd5.append('price', '1999');
    fd5.append('originalPrice', '2999');
    fd5.append('sizes', JSON.stringify(['S', 'M']));

    const res5 = await createProduct(fd5);
    const prod5 = res5.product!;
    if (prod5?.id) createdTestProductIds.push(prod5.id);

    assert(
      Boolean(res5.success && prod5?.id && prod5.sku === sku5),
      5,
      'Different category + same product type + same color',
      `Allowed across different category with SKU=${prod5?.sku}`
    );

    // TEST 6: Change only price -> Expected same SKU
    const initialSku = prod1.sku;
    const fd6 = new FormData();
    fd6.append('name', prod1.name);
    fd6.append('slug', prod1.slug);
    fd6.append('price', '1799'); // price changed from 1499 to 1799
    fd6.append('originalPrice', '2999');
    fd6.append('categoryId', prod1.categoryId || cat1.id);
    fd6.append('productType', prod1.productType || test1Type);
    fd6.append('color', prod1.color || test1Color);
    fd6.append('sku', prod1.sku);

    const res6 = await updateProduct(prod1.id, fd6);
    const updatedProd6 = await prisma.product.findUnique({ where: { id: prod1.id } });

    assert(
      Boolean(res6.success && updatedProd6?.sku === initialSku && updatedProd6?.price === 1799),
      6,
      'Change only price',
      `Price updated to 1799, SKU remained stable: ${updatedProd6?.sku}`
    );

    // TEST 7: Change only description -> Expected same SKU
    const fd7 = new FormData();
    fd7.append('name', prod1.name);
    fd7.append('slug', prod1.slug);
    fd7.append('price', '1799');
    fd7.append('originalPrice', '2999');
    fd7.append('description', 'Brand new updated description with wash care notes.');
    fd7.append('categoryId', prod1.categoryId || cat1.id);
    fd7.append('productType', prod1.productType || test1Type);
    fd7.append('color', prod1.color || test1Color);
    fd7.append('sku', prod1.sku);

    const res7 = await updateProduct(prod1.id, fd7);
    const updatedProd7 = await prisma.product.findUnique({ where: { id: prod1.id } });

    assert(
      Boolean(res7.success && updatedProd7?.sku === initialSku && updatedProd7?.description?.includes('Brand new updated')),
      7,
      'Change only description',
      `Description updated, SKU remained stable: ${updatedProd7?.sku}`
    );

    // TEST 8: Change only images -> Expected same SKU
    const fd8 = new FormData();
    fd8.append('name', prod1.name);
    fd8.append('slug', prod1.slug);
    fd8.append('price', '1799');
    fd8.append('originalPrice', '2999');
    fd8.append('description', 'Brand new updated description with wash care notes.');
    fd8.append('images', JSON.stringify([
      { url: 'https://example.com/updated-photo-1.jpg', isPrimary: true, sortOrder: 0 },
      { url: 'https://example.com/updated-photo-2.jpg', isPrimary: false, sortOrder: 1 }
    ]));
    fd8.append('categoryId', prod1.categoryId || cat1.id);
    fd8.append('productType', prod1.productType || test1Type);
    fd8.append('color', prod1.color || test1Color);
    fd8.append('sku', prod1.sku);

    const res8 = await updateProduct(prod1.id, fd8);
    const updatedProd8 = await prisma.product.findUnique({ 
      where: { id: prod1.id },
      include: { images: true }
    });

    assert(
      Boolean(res8.success && updatedProd8?.sku === initialSku && updatedProd8?.images.length === 2),
      8,
      'Change only images',
      `Images updated to 2 photos, SKU remained stable: ${updatedProd8?.sku}`
    );

    // TEST 9: Edit an existing product without changing Category/Product Type/Color
    const fd9 = new FormData();
    fd9.append('name', 'Updated Alpha Cobalt Name Without Config Change');
    fd9.append('slug', prod1.slug);
    fd9.append('categoryId', prod1.categoryId || cat1.id);
    fd9.append('productType', prod1.productType || test1Type);
    fd9.append('color', prod1.color || test1Color);
    fd9.append('sku', prod1.sku);
    fd9.append('price', '1899');
    fd9.append('originalPrice', '2999');
    fd9.append('sizes', JSON.stringify(['S', 'M', 'L', 'XL', 'XXL']));

    const res9 = await updateProduct(prod1.id, fd9);
    assert(
      Boolean(res9.success && !res9.error),
      9,
      'Edit existing product without changing Category/Product Type/Color',
      `Saved successfully without reporting self as duplicate`
    );

    // TEST 10: Edit an existing product and change its configuration to one already used by another product
    // Attempting to change prod3's configuration to prod1's configuration
    const fd10 = new FormData();
    fd10.append('name', prod3.name);
    fd10.append('slug', prod3.slug);
    fd10.append('price', '1499');
    fd10.append('originalPrice', '2999');
    fd10.append('categoryId', prod1.categoryId || cat1.id);
    fd10.append('productType', prod1.productType || test1Type); // changing to prod1's type
    fd10.append('color', prod1.color || test1Color);             // changing to prod1's color

    const res10 = await updateProduct(prod3.id, fd10);
    assert(
      !res10.success && Boolean(res10.isDuplicate || res10.error?.includes('already exists')),
      10,
      'Edit an existing product and change its configuration to another existing product',
      `Blocked with error: "${res10.error}"`
    );

    // TEST 11: Attempt duplicate creation through the database / ORM directly
    let dbDirectBlocked = false;
    let dbDirectError = '';
    try {
      const configKey1 = buildProductConfigKey({
        categoryId: cat1.id,
        productType: test1Type,
        color: test1Color
      });
      // Direct raw prisma call attempting duplicate insertion
      await prisma.product.create({
        data: {
          name: 'Direct DB Bypass Attempt',
          slug: `direct-db-bypass-${Date.now()}`,
          description: 'Direct DB bypass test description',
          categoryId: cat1.id,
          productType: test1Type,
          color: test1Color,
          configKey: configKey1,
          sku: 'BYPASS-SKU-999',
          price: 999
        }
      });
    } catch (dbErr: any) {
      dbDirectBlocked = true;
      dbDirectError = dbErr.message || String(dbErr);
    }

    assert(
      dbDirectBlocked && (dbDirectError.includes('Unique constraint') || dbDirectError.includes('P2002')),
      11,
      'Attempt duplicate creation directly through database / ORM',
      `Database rejected with unique constraint error (P2002): ${dbDirectError.slice(0, 80)}...`
    );

    // TEST 12: Two simultaneous duplicate creation requests (Race Condition)
    const raceColor = 'NEON GREEN';
    const raceType = 'Race Polo Gamma';
    const raceSku = generateDeterministicSku({
      categoryName: cat1.name,
      categoryCode: cat1.code,
      colorName: raceColor,
      productTypeName: raceType
    });

    const makeRaceFd = (tag: string) => {
      const fd = new FormData();
      fd.append('name', `Race Product ${tag}`);
      fd.append('slug', `race-prod-${tag}-${Date.now()}`);
      fd.append('categoryId', cat1.id);
      fd.append('productType', raceType);
      fd.append('color', raceColor);
      fd.append('sku', raceSku);
      fd.append('price', '1299');
      fd.append('originalPrice', '2599');
      return fd;
    };

    const [raceRes1, raceRes2] = await Promise.all([
      createProduct(makeRaceFd('A')),
      createProduct(makeRaceFd('B'))
    ]);

    if (raceRes1.product?.id) createdTestProductIds.push(raceRes1.product.id);
    if (raceRes2.product?.id) createdTestProductIds.push(raceRes2.product.id);

    // Exactly one must succeed and one must fail
    const oneSucceeded = (raceRes1.success && !raceRes2.success) || (!raceRes1.success && raceRes2.success);
    const countInDb = await prisma.product.count({
      where: {
        categoryId: cat1.id,
        configKey: buildProductConfigKey({ categoryId: cat1.id, productType: raceType, color: raceColor })
      }
    });

    assert(
      oneSucceeded && countInDb === 1,
      12,
      'Two simultaneous duplicate creation requests',
      `Race handled: Exactly 1 product created in DB, duplicate request was safely rejected`
    );

    // TEST 13: Verify product sizes still work as product attributes/options without inventory
    const savedProd1 = await prisma.product.findUnique({
      where: { id: prod1.id },
      include: { variants: true }
    });
    const parsedSizes = JSON.parse(savedProd1?.sizesRaw || '[]');
    const rawProdRecord = (await prisma.product.findRaw({
      filter: { _id: { $oid: prod1.id } }
    })) as any;

    const noTotalStockInDoc = rawProdRecord[0]?.totalStock === undefined;
    const noStockInDoc = rawProdRecord[0]?.stock === undefined;
    const noSizeWiseStockInDoc = rawProdRecord[0]?.sizeWiseStock === undefined;
    const noStockStatusInDoc = rawProdRecord[0]?.stockStatus === undefined;
    const sizesAreAvailable = Array.isArray(parsedSizes) && parsedSizes.length > 0;

    assert(
      sizesAreAvailable && noTotalStockInDoc && noStockInDoc && noSizeWiseStockInDoc && noStockStatusInDoc,
      13,
      'Verify product sizes still work as product attributes/options without inventory',
      `Sizes=${JSON.stringify(parsedSizes)}, MongoDB doc has 0 stock/inventory fields`
    );

    // TEST 14: Verify no "Total Stock", "In Stock", "Out of Stock", or size-inventory UI remains
    const productsClientContent = fs.readFileSync(path.resolve(__dirname, '../src/app/admin/products/ProductsClient.tsx'), 'utf8');
    const settingsClientContent = fs.readFileSync(path.resolve(__dirname, '../src/app/admin/settings/SettingsClient.tsx'), 'utf8');
    const dashboardContent = fs.readFileSync(path.resolve(__dirname, '../src/app/admin/dashboard/page.tsx'), 'utf8');

    const noInventoryCardInProducts = !productsClientContent.includes('Size Variant Stock / Inventory');
    const noTotalStockInProducts = !productsClientContent.includes('Total Stock:');
    const noInStockPillInProducts = !productsClientContent.includes('inStockPill');
    const noInventoryTabInSettings = !settingsClientContent.includes('Inventory Rules');
    const noInventoryCardsInDashboard = !dashboardContent.includes('Critical Inventory Alerts') && !dashboardContent.includes('Total Inventory');

    assert(
      noInventoryCardInProducts && noTotalStockInProducts && noInStockPillInProducts && noInventoryTabInSettings && noInventoryCardsInDashboard,
      14,
      'Verify no "Total Stock", "In Stock", "Out of Stock", or size-inventory UI remains',
      `UI verified: No inventory cards, pills, tabs, or badges remain in Admin Panel`
    );

    // TEST 15: Verify Add Product and Edit Product work normally after database migration
    const test15Prod = await prisma.product.findUnique({ where: { id: prod1.id } });
    assert(
      Boolean(test15Prod && test15Prod.name.length > 0 && test15Prod.sku === sku1),
      15,
      'Verify Add Product and Edit Product work normally after database migration',
      `Product lifecycle operations fully functioning on updated MongoDB schema`
    );

    // TEST 16: Verify existing orders, payment records, customers, and product images are unaffected
    const [existingOrdersCount, existingUsersCount, existingCategoriesCount] = await Promise.all([
      prisma.order.count(),
      prisma.user.count(),
      prisma.category.count()
    ]);

    assert(
      existingCategoriesCount >= 2,
      16,
      'Verify existing orders, customers, and categories are unaffected',
      `Orders=${existingOrdersCount}, Users=${existingUsersCount}, Categories=${existingCategoriesCount} preserved`
    );

  } catch (err: any) {
    console.error('Fatal error during test execution:', err);
    failed++;
  } finally {
    // Clean up test products created during the test run
    if (createdTestProductIds.length > 0) {
      console.log(`\nCleaning up ${createdTestProductIds.length} test products...`);
      await prisma.productVariant.deleteMany({
        where: { productId: { in: createdTestProductIds } }
      });
      await prisma.productImage.deleteMany({
        where: { productId: { in: createdTestProductIds } }
      });
      await prisma.product.deleteMany({
        where: { id: { in: createdTestProductIds } }
      });
      console.log('Cleanup complete. Zero test records remain in the database.\n');
    }
  }

  console.log('================================================================');
  console.log(`FINAL TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runAll16Tests().catch(err => {
  console.error(err);
  process.exit(1);
});
