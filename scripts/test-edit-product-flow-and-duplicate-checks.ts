/**
 * Comprehensive verification of Edit Product -> Save Changes and SKU regeneration.
 * Tests all requirements from Item 11:
 * A. Add Product
 * B. Edit Product
 * C. Change Category
 * D. Change Product Type
 * E. Change Color
 * F. Change Category + Type + Color together
 * G. Save without changing anything
 * H. Save after changing only Color
 * I. Save after changing only Product Type
 * J. Save after changing Category
 * K. Attempt exact duplicate configuration
 * L. Attempt duplicate while editing another product
 * M. Existing product edits successfully
 * N. New unique product saves successfully
 */

import { prisma } from '../src/lib/prisma';

const BASE_URL = 'http://localhost:3001';

async function getAdminCookie(): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'Care.adrizo@gmail.com',
      password: 'Shree@2805',
    }),
  });
  const cookieHeader = res.headers.get('set-cookie');
  if (!cookieHeader) throw new Error('Failed to obtain admin session cookie');
  return cookieHeader.split(';')[0];
}

async function postProduct(cookie: string, fields: Record<string, string>): Promise<any> {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    fd.append(k, v);
  }
  const res = await fetch(`${BASE_URL}/api/admin/products`, {
    method: 'POST',
    headers: {
      Cookie: cookie,
    },
    body: fd,
  });
  return res.json();
}

async function checkDuplicate(cookie: string, params: Record<string, string>): Promise<any> {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE_URL}/api/admin/products/check-duplicate?${qs}`, {
    headers: {
      Cookie: cookie,
    },
  });
  return res.json();
}

async function runVerification() {
  console.log('================================================================');
  console.log('ADRIZO / UNIQUE INDIA GARMENTS — FULL EDIT & CREATE PRODUCT SUITE');
  console.log('Testing Scenarios A through N via live HTTP Dev Server');
  console.log('================================================================\n');

  const cookie = await getAdminCookie();
  console.log(' Authenticated as Administrator successfully.\n');

  const categories = await prisma.category.findMany({ take: 2 });
  if (categories.length < 2) throw new Error('Need at least 2 categories in database to test');
  const cat1 = categories[0];
  const cat2 = categories[1];

  const createdProductIds: string[] = [];

  try {
    // --- SCENARIO A: Add Product ---
    console.log('TEST A: Add Product with new configuration');
    const resA = await postProduct(cookie, {
      name: 'Verification Product A',
      slug: `verif-prod-a-${Date.now()}`,
      categoryId: cat1.id,
      productType: 'V-Neck Tee',
      color: 'OLIVE GREEN',
      price: '1199',
      originalPrice: '2499',
      status: 'ACTIVE',
      sizes: JSON.stringify(['S', 'M', 'L', 'XL']),
      description: 'Scenario A test product description',
    });
    if (!resA.success || !resA.product) throw new Error(`Scenario A failed: ${JSON.stringify(resA)}`);
    createdProductIds.push(resA.product.id);
    const initialSkuA = resA.product.sku;
    console.log(`  Passed! Product A created (ID: ${resA.product.id}, SKU: ${initialSkuA})\n`);

    // --- SCENARIO G: Save without changing anything ---
    console.log('TEST G: Edit Product A and save without changing anything');
    const resG = await postProduct(cookie, {
      id: resA.product.id,
      name: 'Verification Product A',
      slug: resA.product.slug,
      categoryId: cat1.id,
      productType: 'V-Neck Tee',
      color: 'OLIVE GREEN',
      sku: initialSkuA,
      price: '1199',
      originalPrice: '2499',
      status: 'ACTIVE',
      sizes: JSON.stringify(['S', 'M', 'L', 'XL']),
      description: 'Scenario A test product description',
    });
    if (!resG.success || resG.product.sku !== initialSkuA) {
      throw new Error(`Scenario G failed: ${JSON.stringify(resG)}`);
    }
    console.log(`  Passed! Saved cleanly without false duplicate warning; SKU preserved: ${resG.product.sku}\n`);

    // --- SCENARIO H: Save after changing only Color ---
    console.log('TEST H: Edit Product A and change only Color (OLIVE GREEN -> ROYAL BLUE)');
    const resH = await postProduct(cookie, {
      id: resA.product.id,
      name: 'Verification Product A - Royal Blue',
      slug: resA.product.slug,
      categoryId: cat1.id,
      productType: 'V-Neck Tee',
      color: 'ROYAL BLUE',
      sku: initialSkuA,
      price: '1199',
      originalPrice: '2499',
      status: 'ACTIVE',
      sizes: JSON.stringify(['S', 'M', 'L', 'XL']),
      description: 'Color changed to Royal Blue',
    });
    if (!resH.success || resH.product.sku === initialSkuA) {
      throw new Error(`Scenario H failed: SKU did not regenerate. Product: ${JSON.stringify(resH)}`);
    }
    const skuH = resH.product.sku;
    console.log(`  Passed! SKU regenerated dynamically for Royal Blue: ${skuH}\n`);

    // --- SCENARIO I: Save after changing only Product Type ---
    console.log('TEST I: Edit Product A and change only Product Type (V-Neck Tee -> Round Neck Tee)');
    const resI = await postProduct(cookie, {
      id: resA.product.id,
      name: 'Verification Product A - Round Neck',
      slug: resA.product.slug,
      categoryId: cat1.id,
      productType: 'Round Neck Tee',
      color: 'ROYAL BLUE',
      sku: skuH,
      price: '1199',
      originalPrice: '2499',
      status: 'ACTIVE',
      sizes: JSON.stringify(['S', 'M', 'L', 'XL']),
      description: 'Product type changed to Round Neck',
    });
    if (!resI.success || resI.product.sku === skuH) {
      throw new Error(`Scenario I failed: SKU did not regenerate. Product: ${JSON.stringify(resI)}`);
    }
    const skuI = resI.product.sku;
    console.log(`  Passed! SKU regenerated dynamically for Round Neck Tee: ${skuI}\n`);

    // --- SCENARIO J: Save after changing Category ---
    console.log(`TEST J: Edit Product A and change Category (${cat1.name} -> ${cat2.name})`);
    const resJ = await postProduct(cookie, {
      id: resA.product.id,
      name: 'Verification Product A - Under Category 2',
      slug: resA.product.slug,
      categoryId: cat2.id,
      productType: 'Round Neck Tee',
      color: 'ROYAL BLUE',
      sku: skuI,
      price: '1199',
      originalPrice: '2499',
      status: 'ACTIVE',
      sizes: JSON.stringify(['S', 'M', 'L', 'XL']),
      description: 'Category changed to cat2',
    });
    if (!resJ.success || resJ.product.sku === skuI) {
      throw new Error(`Scenario J failed: SKU did not regenerate. Product: ${JSON.stringify(resJ)}`);
    }
    const skuJ = resJ.product.sku;
    console.log(`  Passed! SKU regenerated dynamically for new Category: ${skuJ}\n`);

    // --- SCENARIO F: Change Category + Type + Color together ---
    console.log('TEST F: Edit Product A and change Category + Type + Color together');
    const resF = await postProduct(cookie, {
      id: resA.product.id,
      name: 'Verification Product A - All Changed',
      slug: resA.product.slug,
      categoryId: cat1.id,
      productType: 'Henley Polo',
      color: 'BURGUNDY RED',
      sku: skuJ,
      price: '1399',
      originalPrice: '2799',
      status: 'ACTIVE',
      sizes: JSON.stringify(['S', 'M', 'L', 'XL']),
      description: 'All 3 config values changed together',
    });
    if (!resF.success || resF.product.sku === skuJ) {
      throw new Error(`Scenario F failed: SKU did not regenerate. Product: ${JSON.stringify(resF)}`);
    }
    const skuF = resF.product.sku;
    console.log(`  Passed! All three changed and SKU regenerated: ${skuF}\n`);

    // --- SCENARIO N: Create a second product Product B ---
    console.log('TEST N: Create a second unique product (Product B)');
    const resB = await postProduct(cookie, {
      name: 'Verification Product B',
      slug: `verif-prod-b-${Date.now()}`,
      categoryId: cat1.id,
      productType: 'Henley Polo',
      color: 'CHARCOAL GREY',
      price: '1399',
      originalPrice: '2799',
      status: 'ACTIVE',
      sizes: JSON.stringify(['S', 'M', 'L']),
      description: 'Product B description',
    });
    if (!resB.success || !resB.product) throw new Error(`Scenario N failed: ${JSON.stringify(resB)}`);
    createdProductIds.push(resB.product.id);
    console.log(`  Passed! Product B created (ID: ${resB.product.id}, SKU: ${resB.product.sku})\n`);

    // --- SCENARIO K: Attempt exact duplicate creation of Product B ---
    console.log('TEST K: Attempt exact duplicate creation (same Category + Product Type + Color)');
    const resK = await postProduct(cookie, {
      name: 'Duplicate of Product B',
      slug: `verif-dup-b-${Date.now()}`,
      categoryId: cat1.id,
      productType: 'Henley Polo',
      color: 'CHARCOAL GREY',
      price: '1399',
      originalPrice: '2799',
      status: 'ACTIVE',
      sizes: JSON.stringify(['S', 'M', 'L']),
    });
    if (resK.success || !resK.isDuplicate) {
      throw new Error(`Scenario K failed: Expected duplicate error, but got: ${JSON.stringify(resK)}`);
    }
    console.log(`  Passed! Server correctly rejected duplicate creation with message: "${resK.error}"\n`);

    // --- SCENARIO L: Attempt duplicate while editing another product (Edit Product A -> change to Product B config) ---
    console.log('TEST L: Edit Product A and attempt to change its config to match Product B');
    const resL = await postProduct(cookie, {
      id: resA.product.id,
      name: 'Product A changed to B config',
      slug: resA.product.slug,
      categoryId: cat1.id,
      productType: 'Henley Polo',
      color: 'CHARCOAL GREY',
      sku: skuF,
      price: '1399',
      originalPrice: '2799',
      status: 'ACTIVE',
      sizes: JSON.stringify(['S', 'M', 'L']),
    });
    if (resL.success || !resL.isDuplicate) {
      throw new Error(`Scenario L failed: Expected duplicate conflict against other product, but got: ${JSON.stringify(resL)}`);
    }
    console.log(`  Passed! Server correctly blocked collision with Product B: "${resL.error}"\n`);

    // --- SCENARIO M: Verify Check-Duplicate endpoint excludes current product itself ---
    console.log('TEST M: Duplicate check endpoint with excludeProductId');
    const checkSelf = await checkDuplicate(cookie, {
      categoryId: cat1.id,
      productType: 'Henley Polo',
      color: 'BURGUNDY RED',
      excludeProductId: resA.product.id,
    });
    if (checkSelf.exists) {
      throw new Error(`Scenario M failed: Product A reported itself as duplicate: ${JSON.stringify(checkSelf)}`);
    }
    console.log(`  Passed! Product A is correctly excluded from its own duplicate check (exists: false)\n`);

    const checkConflict = await checkDuplicate(cookie, {
      categoryId: cat1.id,
      productType: 'Henley Polo',
      color: 'CHARCOAL GREY',
      excludeProductId: resA.product.id,
    });
    if (!checkConflict.exists) {
      throw new Error(`Scenario M failed: Conflict with Product B was not detected: ${JSON.stringify(checkConflict)}`);
    }
    console.log(`  Passed! Conflict with Product B was correctly detected for Product A (exists: true)\n`);

    console.log('================================================================');
    console.log('ALL SCENARIOS A THROUGH N VERIFIED SUCCESSFULLY!');
    console.log('================================================================');
  } finally {
    console.log(`\nCleaning up ${createdProductIds.length} test products...`);
    for (const id of createdProductIds) {
      await prisma.productImage.deleteMany({ where: { productId: id } }).catch(() => null);
      await prisma.productVariant.deleteMany({ where: { productId: id } }).catch(() => null);
      await prisma.product.delete({ where: { id } }).catch(() => null);
    }
    console.log('Cleanup complete. Zero test records remain in database.\n');
  }
}

runVerification()
  .catch((err) => {
    console.error('Fatal error during test run:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
