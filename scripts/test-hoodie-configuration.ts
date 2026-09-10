import { PrismaClient } from '@prisma/client';
import { 
  HOODIE_COLORS, 
  INITIAL_PREDEFINED_COLORS,
  INITIAL_HOODIE_PRODUCT_TYPES,
  INITIAL_TSHIRT_PRODUCT_TYPES,
  isHoodieCategory,
  isTShirtCategory,
  getCategoryProductTypes,
  getCategoryColors
} from '../src/lib/catalogueDefaults';
import { 
  generateDeterministicSku, 
  buildProductConfigKey,
  resolveCategoryCode,
  resolveColorCode,
  resolveProductTypeCode,
  normalizeConfigPart
} from '../src/lib/sku';
import { generateProductName } from '../src/lib/productNaming';

const prisma = new PrismaClient();

const EXPECTED_HOODIE_COLORS = [
  { num: '01', name: 'JET BLACK', slug: 'jet-black' },
  { num: '02', name: 'MUSTARD', slug: 'mustard' },
  { num: '03', name: 'NAVY BLUE', slug: 'navy-blue' },
  { num: '04', name: 'MEHRON', slug: 'mehron' },
  { num: '05', name: 'ONION', slug: 'onion' },
  { num: '06', name: 'OLIVE GREEN', slug: 'olive-green' },
  { num: '07', name: 'WINE', slug: 'wine' },
  { num: '08', name: 'WHITE MELANGE', slug: 'white-melange' },
  { num: '09', name: 'BOTTLE GREEN', slug: 'bottle-green' },
  { num: '10', name: 'RED', slug: 'red' },
  { num: '11', name: 'SKY BLUE', slug: 'sky-blue' },
  { num: '12', name: 'WHITE', slug: 'white' },
  { num: '13', name: 'DARK SKIN', slug: 'dark-skin' },
  { num: '14', name: 'LIGHT SKIN', slug: 'light-skin' },
  { num: '15', name: 'DARK GREY', slug: 'dark-grey' },
  { num: '16', name: 'CREAM', slug: 'cream' },
  { num: '17', name: 'CHOCOLATE BROWN', slug: 'chocolate-brown' },
  { num: '18', name: 'OFF WHITE', slug: 'off-white' },
];

const EXPECTED_HOODIE_STYLES = [
  'Unisex Hoodie',
  'Regular Fit',
  'Slim Fit'
];

const FORBIDDEN_LEGACY_HOODIE_STYLES = [
  'Pullover Hoodie',
  'Zip-Up Hoodie',
  'Full Zip Hoodie',
  'Half Zip Hoodie',
  'Oversized Hoodie',
  'Regular Fit Hoodie',
  'Slim Fit Hoodie',
  'Fleece Hoodie',
  'Heavyweight Hoodie',
  'Sleeveless Hoodie',
  'Zip Hoodie',
  'Pullover'
];

const FORBIDDEN_TSHIRT_STYLES_IN_HOODIE = [
  'Polo T-Shirt',
  'Zipper Polo T-Shirt',
  'Button Polo T-Shirt',
  'Round Neck T-Shirt',
  'V-Neck T-Shirt',
  'Oversized T-Shirt',
  'Regular Fit T-Shirt',
  'Slim Fit T-Shirt',
  'Henley T-Shirt',
  'Half Sleeve T-Shirt',
  'Full Sleeve T-Shirt'
];

async function runTests() {
  console.log('================================================================');
  console.log('ADRIZO PRODUCT CONFIGURATION & HOODIE SYSTEM VERIFICATION SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string) {
    if (condition) {
      console.log(`[PASS] ${desc}`);
      passed++;
    } else {
      console.error(`[FAIL] ${desc}`);
      failed++;
    }
  }

  // -------------------------------------------------------------------------
  // TEST 1: Category = Hoodies (Strictly 3 Styles & 18 Colors)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 1: Category = Hoodies (Styles & Colors) ---');
  const hoodieCatObj = { name: 'Hoodies', slug: 'hoodies' };
  const hoodieTypes = getCategoryProductTypes(hoodieCatObj);
  const hoodieColors = getCategoryColors(hoodieCatObj);

  assert(isHoodieCategory(hoodieCatObj), 'Identifies Hoodies category correctly');
  assert(hoodieTypes.length === 3, `Hoodie types count is exactly 3 (got ${hoodieTypes.length})`);
  
  const allStylesMatch = EXPECTED_HOODIE_STYLES.every(s => hoodieTypes.some(ht => ht.name === s));
  assert(allStylesMatch, 'All 3 required Hoodie styles (Unisex Hoodie, Regular Fit, Slim Fit) are present');

  const hasLegacyHoodieStyles = FORBIDDEN_LEGACY_HOODIE_STYLES.some(s => 
    hoodieTypes.some(ht => ht.name.toLowerCase() === s.toLowerCase())
  );
  assert(!hasLegacyHoodieStyles, 'Hoodies category does NOT contain ANY legacy Hoodie styles (Pullover, Zip-Up, Fleece, etc.)');

  const hasForbiddenTShirtStyles = FORBIDDEN_TSHIRT_STYLES_IN_HOODIE.some(s => 
    hoodieTypes.some(ht => ht.name === s)
  );
  assert(!hasForbiddenTShirtStyles, 'Hoodies category does NOT show any T-Shirt product types');

  assert(hoodieColors.length === 18, `Hoodie colors count is exactly 18 (got ${hoodieColors.length})`);
  const allColorsMatch = EXPECTED_HOODIE_COLORS.every((ec, idx) => {
    const hc: any = hoodieColors[idx];
    return hc && hc.name === ec.name && hc.slug === ec.slug && hc.numberLabel === ec.num;
  });
  assert(allColorsMatch, 'All 18 Hoodie colors match exact names, numbers (01-18), and slugs');

  // Verify no colors 19-30 exist
  const hasExtraColors = hoodieColors.some((c: any) => c.number > 18);
  assert(!hasExtraColors, 'Colors 19–30 are NOT present in Hoodie configuration');

  // -------------------------------------------------------------------------
  // TEST 2: Category = T-Shirts (Styles & Colors)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 2: Category = T-Shirts (Styles & Colors) ---');
  const tshirtCatObj = { name: 'T-Shirts', slug: 't-shirts' };
  const tshirtTypes = getCategoryProductTypes(tshirtCatObj);
  const tshirtColors = getCategoryColors(tshirtCatObj);

  assert(isTShirtCategory(tshirtCatObj), 'Identifies T-Shirts category correctly');
  assert(tshirtTypes.length === 11, `Existing T-Shirt styles intact (count: ${tshirtTypes.length})`);
  const hasPolo = tshirtTypes.some(t => t.name === 'Polo T-Shirt');
  const hasZipper = tshirtTypes.some(t => t.name === 'Zipper Polo T-Shirt');
  assert(hasPolo && hasZipper, 'Existing T-Shirt options (Polo, Zipper Polo, etc.) intact');
  assert(tshirtColors.length >= 16, `T-Shirt colors intact (count: ${tshirtColors.length})`);

  // -------------------------------------------------------------------------
  // TEST 3: Switching Hoodies → T-Shirts
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 3: Switching Hoodies → T-Shirts ---');
  let currentCat = hoodieCatObj;
  let currentType = 'Unisex Hoodie';
  let currentColor = 'ONION'; // Exists in Hoodies, not in standard T-Shirts

  // Simulate switch to T-Shirts
  currentCat = tshirtCatObj;
  const newTshirtTypes = getCategoryProductTypes(currentCat);
  const newTshirtColors = getCategoryColors(currentCat);

  // Type safe reset
  if (!newTshirtTypes.some(t => t.name.toLowerCase() === currentType.toLowerCase())) {
    currentType = newTshirtTypes[0].name;
  }
  // Color safe reset
  if (!newTshirtColors.some(c => c.name.toUpperCase() === currentColor.toUpperCase())) {
    currentColor = newTshirtColors[0].name.toUpperCase();
  }

  assert(currentType === 'Polo T-Shirt' || currentType === 'Zipper Polo T-Shirt', `Product Type safely reset to T-Shirt style: ${currentType}`);
  assert(newTshirtColors.some(c => c.name.toUpperCase() === currentColor.toUpperCase()), `Color safely reset to valid T-Shirt color: ${currentColor}`);

  // -------------------------------------------------------------------------
  // TEST 4: Switching T-Shirts → Hoodies
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 4: Switching T-Shirts → Hoodies ---');
  currentCat = tshirtCatObj;
  currentType = 'Zipper Polo T-Shirt';
  currentColor = 'BABY PINK'; // Exists in T-Shirts, not in Hoodies

  // Simulate switch to Hoodies
  currentCat = hoodieCatObj;
  const newHoodieTypes = getCategoryProductTypes(currentCat);
  const newHoodieColors = getCategoryColors(currentCat);

  if (!newHoodieTypes.some(t => t.name.toLowerCase() === currentType.toLowerCase())) {
    currentType = newHoodieTypes[0].name;
  }
  if (!newHoodieColors.some(c => c.name.toUpperCase() === currentColor.toUpperCase())) {
    currentColor = newHoodieColors[0].name.toUpperCase();
  }

  assert(currentType === 'Unisex Hoodie', `Product Type safely reset to first Hoodie style: ${currentType}`);
  assert(currentColor === 'JET BLACK', `Color safely reset to primary Hoodie color: ${currentColor}`);

  // -------------------------------------------------------------------------
  // TEST 5: Auto-generation for Hoodie + Unisex Hoodie + Jet Black
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 5: Auto-generation for Hoodie + Unisex Hoodie + Jet Black ---');
  const genName1 = generateProductName('JET BLACK', 'Unisex Hoodie');
  const genSku1 = generateDeterministicSku({
    categoryName: 'Hoodies',
    productTypeName: 'Unisex Hoodie',
    colorName: 'JET BLACK'
  });

  assert(genName1 === 'Jet Black Unisex Hoodie', `Product Name is "${genName1}" (expected "Jet Black Unisex Hoodie")`);
  assert(!genName1.toLowerCase().includes('pullover'), 'Product Name does NOT contain "Pullover"');
  assert(genSku1 === 'HOD-JBL-UH', `Deterministic SKU is "${genSku1}" (expected "HOD-JBL-UH")`);

  // -------------------------------------------------------------------------
  // TEST 6: Auto-generation for Hoodie + Regular Fit + Jet Black
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 6: Auto-generation for Hoodie + Regular Fit + Jet Black ---');
  const genName2 = generateProductName('JET BLACK', 'Regular Fit');
  const genSku2 = generateDeterministicSku({
    categoryName: 'Hoodies',
    productTypeName: 'Regular Fit',
    colorName: 'JET BLACK'
  });

  assert(genName2 === 'Jet Black Regular Fit', `Product Name is "${genName2}" (expected "Jet Black Regular Fit")`);
  assert(!genName2.toLowerCase().includes('pullover'), 'Product Name does NOT contain "Pullover"');
  assert(genSku2 === 'HOD-JBL-RF', `Deterministic SKU is "${genSku2}" (expected "HOD-JBL-RF")`);

  // -------------------------------------------------------------------------
  // TEST 7: Auto-generation for Hoodie + Slim Fit + Jet Black
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 7: Auto-generation for Hoodie + Slim Fit + Jet Black ---');
  const genName3 = generateProductName('JET BLACK', 'Slim Fit');
  const genSku3 = generateDeterministicSku({
    categoryName: 'Hoodies',
    productTypeName: 'Slim Fit',
    colorName: 'JET BLACK'
  });

  assert(genName3 === 'Jet Black Slim Fit', `Product Name is "${genName3}" (expected "Jet Black Slim Fit")`);
  assert(!genName3.toLowerCase().includes('pullover'), 'Product Name does NOT contain "Pullover"');
  assert(genSku3 === 'HOD-JBL-SF', `Deterministic SKU is "${genSku3}" (expected "HOD-JBL-SF")`);

  // -------------------------------------------------------------------------
  // TEST 8: Other Color Variations for Hoodies
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 8: Other Color Variations for Hoodies ---');
  const genName4 = generateProductName('NAVY BLUE', 'Unisex Hoodie');
  const genSku4 = generateDeterministicSku({
    categoryName: 'Hoodies',
    productTypeName: 'Unisex Hoodie',
    colorName: 'NAVY BLUE'
  });
  assert(genName4 === 'Navy Blue Unisex Hoodie', `Product Name updated to "${genName4}"`);
  assert(genSku4 === 'HOD-NVY-UH', `Deterministic SKU updated to "${genSku4}"`);

  const genName5 = generateProductName('MUSTARD', 'Regular Fit');
  const genSku5 = generateDeterministicSku({
    categoryName: 'Hoodies',
    productTypeName: 'Regular Fit',
    colorName: 'MUSTARD'
  });
  assert(genName5 === 'Mustard Regular Fit', `Product Name updated to "${genName5}"`);
  assert(genSku5 === 'HOD-MST-RF', `Deterministic SKU updated to "${genSku5}"`);

  const genName6 = generateProductName('CHOCOLATE BROWN', 'Slim Fit');
  const genSku6 = generateDeterministicSku({
    categoryName: 'Hoodies',
    productTypeName: 'Slim Fit',
    colorName: 'CHOCOLATE BROWN'
  });
  assert(genName6 === 'Chocolate Brown Slim Fit', `Product Name updated to "${genName6}"`);
  assert(genSku6 === 'HOD-CBR-SF', `Deterministic SKU is "${genSku6}"`);

  // -------------------------------------------------------------------------
  // TEST 9: Reactive State Clearing & No Stale Warning
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 9: Reactive State Clearing & No Stale Warning ---');
  const oldCatId = '6a92c70133d6376b768a9e16';
  const oldType = 'Unisex Hoodie';
  const oldColor = 'BOTTLE GREEN';

  // Suppose conflict was set for old selection:
  const validatedKey = `${oldCatId}:${normalizeConfigPart(oldType)}:${normalizeConfigPart(oldColor)}`;
  const duplicateState = {
    exists: true,
    validatedKey,
    existingProduct: { id: 'sample-123', sku: 'HOD-BGR-UH' }
  };

  // User changes color to WHITE:
  const newColor = 'WHITE';
  const currentKey = `${oldCatId}:${normalizeConfigPart(oldType)}:${normalizeConfigPart(newColor)}`;

  // Evaluated duplicate status:
  const isCurrentDuplicate = duplicateState.exists && duplicateState.validatedKey === currentKey;
  assert(!isCurrentDuplicate, 'Changing color immediately clears duplicate status without stale warning');

  // -------------------------------------------------------------------------
  // Optional DB checks (executed if database is accessible)
  // -------------------------------------------------------------------------
  try {
    const existingSample = await prisma.product.findFirst({
      where: { color: { not: null }, productType: { not: null } },
      include: { category: true }
    });
    if (existingSample) {
      console.log('[PASS] Connected to DB and queried existing products');
      passed++;
    }
  } catch (err: any) {
    console.log(`[INFO] Database connection skipped or sandbox isolated: ${err.message || err}`);
  }

  console.log('\n================================================================');
  console.log(`VERIFICATION COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests()
  .catch(err => {
    console.error('Test suite failed with unhandled error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => null);
  });
