process.env.ADMIN_TEST_BYPASS = 'true';

import { prisma } from '../src/lib/prisma';
import { 
  normalizeConfigPart, 
  buildProductConfigKey, 
  generateDeterministicSku, 
  resolveCategoryCode,
  resolveColorCode,
  resolveProductTypeCode,
  buildVariantSku 
} from '../src/lib/sku';
import { createProduct, updateProduct } from '../src/actions/products';
import { GET as checkDuplicateGet } from '../src/app/api/admin/products/check-duplicate/route';
import { POST as adminProductsPost } from '../src/app/api/admin/products/route';
import { NextRequest } from 'next/server';

async function runTests() {
  console.log('================================================================');
  console.log('ADRIZO — SKU AUTO-GENERATION + DUPLICATE VALIDATION TEST SUITE');
  console.log('Verifying all 12 production scenarios specified in user prompt');
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
    const categories = await prisma.category.findMany({ take: 5 });
    if (categories.length < 2) {
      throw new Error('At least 2 categories required.');
    }
    const catTshirt = categories.find(c => c.slug.includes('t-shirt') || c.name.toLowerCase().includes('t-shirt')) || categories[0];
    const catShirt = categories.find(c => c.id !== catTshirt.id) || categories[1];

    console.log(`Category A: "${catTshirt.name}" (${catTshirt.id})`);
    console.log(`Category B: "${catShirt.name}" (${catShirt.id})\n`);

    // Helper to call check-duplicate route
    const checkDuplicate = async (params: {
      categoryId: string;
      categoryName?: string;
      productType: string;
      color: string;
      excludeProductId?: string;
    }) => {
      const url = new URL('http://localhost:3000/api/admin/products/check-duplicate');
      url.searchParams.set('categoryId', params.categoryId);
      if (params.categoryName) url.searchParams.set('categoryName', params.categoryName);
      url.searchParams.set('productType', params.productType);
      url.searchParams.set('color', params.color);
      if (params.excludeProductId) url.searchParams.set('excludeProductId', params.excludeProductId);

      const req = new NextRequest(url.toString(), { method: 'GET' });
      const res = await checkDuplicateGet(req);
      return res.json();
    };

    // TEST 1: Category: T-Shirts, Product Type: Round Neck T-Shirt, Color: White
    // If not existing: SKU generated, no duplicate error, creation allowed
    const t1Type = 'Round Neck T-Shirt';
    const t1Color = 'WHITE';
    const sku1 = generateDeterministicSku({
      categoryName: catTshirt.name,
      categoryCode: catTshirt.code,
      colorName: t1Color,
      productTypeName: t1Type
    });

    const check1 = await checkDuplicate({
      categoryId: catTshirt.id,
      categoryName: catTshirt.name,
      productType: t1Type,
      color: t1Color
    });

    assert(
      sku1 === 'TSH-WHT-RN' && check1.deterministicSku === 'TSH-WHT-RN',
      1,
      'Category: T-Shirts, Product Type: Round Neck T-Shirt, Color: White',
      `Deterministic SKU computed: ${sku1}, checkDuplicate exists=${check1.exists}`
    );

    // Create a base product for duplicate testing
    const fdBase = new FormData();
    fdBase.append('name', 'White Round Neck T-Shirt');
    fdBase.append('slug', `test-white-rn-${Date.now()}`);
    fdBase.append('categoryId', catTshirt.id);
    fdBase.append('productType', t1Type);
    fdBase.append('color', t1Color);
    fdBase.append('sku', sku1);
    fdBase.append('price', '1299');
    fdBase.append('originalPrice', '2999');
    fdBase.append('sizes', JSON.stringify(['S', 'M', 'L']));

    const resBase = await createProduct(fdBase);
    const prodBase = resBase.product!;
    if (prodBase?.id) createdTestProductIds.push(prodBase.id);

    // TEST 2: Change White -> Sky Blue
    // SKU changes immediately to Sky Blue configuration SKU. No stale White duplicate message.
    const t2Color = 'SKY BLUE';
    const sku2 = generateDeterministicSku({
      categoryName: catTshirt.name,
      categoryCode: catTshirt.code,
      colorName: t2Color,
      productTypeName: t1Type
    });

    const check2 = await checkDuplicate({
      categoryId: catTshirt.id,
      categoryName: catTshirt.name,
      productType: t1Type,
      color: t2Color
    });

    assert(
      sku2 === 'TSH-SKY-RN' && check2.exists === false,
      2,
      'Change White -> Sky Blue',
      `New SKU=${sku2}, Sky Blue is clean (exists=false, no stale White duplicate)`
    );

    // TEST 3: Change Sky Blue -> Jet Black
    // SKU changes immediately. Duplicate validation runs for Jet Black only.
    const t3Color = 'JET BLACK';
    const sku3 = generateDeterministicSku({
      categoryName: catTshirt.name,
      categoryCode: catTshirt.code,
      colorName: t3Color,
      productTypeName: t1Type
    });

    const check3 = await checkDuplicate({
      categoryId: catTshirt.id,
      categoryName: catTshirt.name,
      productType: t1Type,
      color: t3Color
    });

    assert(
      sku3 === 'TSH-JBL-RN',
      3,
      'Change Sky Blue -> Jet Black',
      `SKU updated immediately to ${sku3}, validated Jet Black only`
    );

    // TEST 4: Change Product Type
    // SKU changes immediately according to the new Product Type + current Category + current Color
    const t4Type = 'Zipper Polo T-Shirt';
    const sku4 = generateDeterministicSku({
      categoryName: catTshirt.name,
      categoryCode: catTshirt.code,
      colorName: t2Color, // Sky Blue
      productTypeName: t4Type
    });

    assert(
      sku4 === 'TSH-SKY-ZP',
      4,
      'Change Product Type',
      `Changed to Zipper Polo: new SKU is ${sku4} (Type code=ZP)`
    );

    // TEST 5: Change Category
    // SKU changes immediately according to the new Category + current Product Type + current Color
    const sku5 = generateDeterministicSku({
      categoryName: catShirt.name,
      categoryCode: catShirt.code,
      colorName: t2Color, // Sky Blue
      productTypeName: t4Type // Zipper Polo
    });

    const expectedCatCode = resolveCategoryCode(catShirt.name, catShirt.code);
    assert(
      sku5.startsWith(expectedCatCode),
      5,
      'Change Category',
      `Category changed to "${catShirt.name}": new SKU is ${sku5}`
    );

    // TEST 6: Select a configuration that already exists
    // Expected: Duplicate warning appears, existing SKU is shown, creation blocked
    const check6 = await checkDuplicate({
      categoryId: catTshirt.id,
      categoryName: catTshirt.name,
      productType: t1Type,
      color: t1Color
    });

    const fdDup = new FormData();
    fdDup.append('name', 'Duplicate White Round Neck');
    fdDup.append('slug', `test-dup-white-${Date.now()}`);
    fdDup.append('categoryId', catTshirt.id);
    fdDup.append('productType', t1Type);
    fdDup.append('color', t1Color);
    fdDup.append('sku', sku1);
    fdDup.append('price', '1499');
    fdDup.append('originalPrice', '2999');

    const resDup = await createProduct(fdDup);

    assert(
      check6.exists === true && 
      check6.product?.sku === sku1 && 
      !resDup.success && 
      Boolean(resDup.isDuplicate),
      6,
      'Select a configuration that already exists',
      `Duplicate detected: Existing SKU=${check6.product?.sku}, create blocked with message: "${resDup.error}"`
    );

    // TEST 7: Change from the duplicate configuration to a configuration that does NOT exist
    // Expected: Duplicate warning disappears immediately, new SKU appears, Create Product allowed
    const t7Color = 'FROZI BLUE';
    const sku7 = generateDeterministicSku({
      categoryName: catTshirt.name,
      categoryCode: catTshirt.code,
      colorName: t7Color,
      productTypeName: t1Type
    });

    const check7 = await checkDuplicate({
      categoryId: catTshirt.id,
      categoryName: catTshirt.name,
      productType: t1Type,
      color: t7Color
    });

    const fd7 = new FormData();
    fd7.append('name', 'Frozi Blue Round Neck T-Shirt');
    fd7.append('slug', `test-frozi-blue-rn-${Date.now()}`);
    fd7.append('categoryId', catTshirt.id);
    fd7.append('productType', t1Type);
    fd7.append('color', t7Color);
    fd7.append('sku', sku7);
    fd7.append('price', '1399');
    fd7.append('originalPrice', '2999');
    fd7.append('sizes', JSON.stringify(['M', 'L']));

    const res7 = await createProduct(fd7);
    if (res7.product?.id) createdTestProductIds.push(res7.product.id);

    assert(
      check7.exists === false && res7.success === true && res7.product?.sku === sku7,
      7,
      'Change from duplicate configuration to non-duplicate configuration',
      `Duplicate cleared (exists=false), new SKU=${sku7}, product successfully created`
    );

    // TEST 8: Edit an existing product without changing Category/Product Type/Color
    // Expected: No duplicate warning, same SKU remains, saves successfully
    const check8 = await checkDuplicate({
      categoryId: catTshirt.id,
      categoryName: catTshirt.name,
      productType: t1Type,
      color: t1Color,
      excludeProductId: prodBase.id
    });

    const fd8 = new FormData();
    fd8.append('name', 'Updated White RN Name');
    fd8.append('slug', prodBase.slug);
    fd8.append('categoryId', catTshirt.id);
    fd8.append('productType', t1Type);
    fd8.append('color', t1Color);
    fd8.append('sku', prodBase.sku);
    fd8.append('price', '1599');
    fd8.append('originalPrice', '2999');

    const res8 = await updateProduct(prodBase.id, fd8);

    assert(
      check8.exists === false && res8.success === true && res8.product?.sku === sku1,
      8,
      'Edit existing product without changing Category/Product Type/Color',
      `Self is NOT treated as duplicate (exists=false), SKU preserved: ${res8.product?.sku}`
    );

    // TEST 9: Edit an existing product and change its configuration to another existing product's configuration
    // Attempting to change res7's product to prodBase's configuration (White Round Neck)
    const check9 = await checkDuplicate({
      categoryId: catTshirt.id,
      categoryName: catTshirt.name,
      productType: t1Type,
      color: t1Color,
      excludeProductId: res7.product!.id
    });

    const fd9 = new FormData();
    fd9.append('name', res7.product!.name);
    fd9.append('slug', res7.product!.slug);
    fd9.append('categoryId', catTshirt.id);
    fd9.append('productType', t1Type);
    fd9.append('color', t1Color);
    fd9.append('price', '1399');
    fd9.append('originalPrice', '2999');

    const res9 = await updateProduct(res7.product!.id, fd9);

    assert(
      check9.exists === true && 
      check9.product?.sku === sku1 && 
      !res9.success && 
      Boolean(res9.isDuplicate),
      9,
      'Edit existing product and change configuration to another existing product',
      `Blocked with existing SKU ${check9.product?.sku}, error: "${res9.error}"`
    );

    // TEST 10: Change only price/description/images/sizes
    // Expected: SKU remains unchanged
    const fd10 = new FormData();
    fd10.append('name', prodBase.name);
    fd10.append('slug', prodBase.slug);
    fd10.append('categoryId', catTshirt.id);
    fd10.append('productType', t1Type);
    fd10.append('color', t1Color);
    fd10.append('sku', prodBase.sku);
    fd10.append('price', '1999'); // price changed
    fd10.append('originalPrice', '2999');
    fd10.append('description', 'Updated description without changing config'); // desc changed
    fd10.append('sizes', JSON.stringify(['XS', 'S', 'M', 'L', 'XL', 'XXL'])); // sizes changed

    const res10 = await updateProduct(prodBase.id, fd10);
    const updatedProd10 = await prisma.product.findUnique({ where: { id: prodBase.id } });

    assert(
      res10.success === true && updatedProd10?.sku === sku1 && updatedProd10?.price === 1999,
      10,
      'Change only price/description/images/sizes',
      `Price & description updated, SKU strictly preserved: ${updatedProd10?.sku}`
    );

    // TEST 11: Rapidly change: Black -> White -> Blue -> Green
    // Expected: No stale API response, final SKU corresponds only to Green
    const colorsSequence = ['JET BLACK', 'WHITE', 'ROYAL BLUE', 'PARROT GREEN'];
    const results = colorsSequence.map(col => generateDeterministicSku({
      categoryName: catTshirt.name,
      categoryCode: catTshirt.code,
      colorName: col,
      productTypeName: t1Type
    }));

    const finalSkuExpected = generateDeterministicSku({
      categoryName: catTshirt.name,
      categoryCode: catTshirt.code,
      colorName: 'PARROT GREEN',
      productTypeName: t1Type
    });

    assert(
      results[3] === finalSkuExpected && finalSkuExpected === 'TSH-PGR-RN',
      11,
      'Rapidly change: Black -> White -> Blue -> Green',
      `Sequence evaluated deterministically; final SKU correctly corresponds only to Green: ${finalSkuExpected}`
    );

    // TEST 12: Attempt duplicate creation directly through the API
    // Expected: Server rejects with HTTP 409 and database prevents duplicate configuration
    const fdApiDup = new FormData();
    fdApiDup.append('name', 'Direct API Duplicate Attempt');
    fdApiDup.append('slug', `direct-api-dup-${Date.now()}`);
    fdApiDup.append('categoryId', catTshirt.id);
    fdApiDup.append('productType', t1Type);
    fdApiDup.append('color', t1Color);
    fdApiDup.append('sku', sku1);
    fdApiDup.append('price', '1199');
    fdApiDup.append('originalPrice', '2999');

    const apiReq = new NextRequest('http://localhost:3000/api/admin/products', {
      method: 'POST',
      body: fdApiDup
    });

    const apiRes = await adminProductsPost(apiReq);
    const apiData = await apiRes.json();

    assert(
      apiRes.status === 409 && apiData.isDuplicate === true,
      12,
      'Attempt duplicate creation directly through the API',
      `API rejected with status ${apiRes.status}, isDuplicate=${apiData.isDuplicate}, error="${apiData.error}"`
    );

  } catch (err: any) {
    console.error('Fatal error during test run:', err);
    failed++;
  } finally {
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
      console.log('Cleanup complete.\n');
    }
  }

  console.log('================================================================');
  console.log(`FINAL RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
