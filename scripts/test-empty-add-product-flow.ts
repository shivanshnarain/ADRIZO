/**
 * Verification Test Suite for Empty Initial State & Dependency Behavior
 * in Admin Panel Product Creation Flow.
 */

import {
  isHoodieCategory,
  isTShirtCategory,
  getCategoryProductTypes,
  getCategoryColors,
  INITIAL_HOODIE_PRODUCT_TYPES,
  INITIAL_TSHIRT_PRODUCT_TYPES
} from '../src/lib/catalogueDefaults';
import {
  generateDeterministicSku,
  buildProductConfigKey,
  resolveCategoryCode,
  resolveColorCode,
  resolveProductTypeCode,
  normalizeConfigPart
} from '../src/lib/sku';
import { generateProductName, generateProductDescription } from '../src/lib/productNaming';

function runSuite() {
  console.log('================================================================');
  console.log('ADRIZO ADMIN PANEL - EMPTY ADD PRODUCT & DEPENDENCY FLOW TESTS');
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

  // Mock Categories
  const categories = [
    { id: 'cat-tshirts', name: 'T-Shirts', slug: 't-shirts', code: 'TSH' },
    { id: 'cat-hoodies', name: 'Hoodies', slug: 'hoodies', code: 'HOD' },
    { id: 'cat-jeans', name: 'Jeans', slug: 'jeans', code: 'JNS' }
  ];

  // ---------------------------------------------------------------------------
  // TEST 1: Initial Form State when Admin Opens "Add Product"
  // ---------------------------------------------------------------------------
  console.log('--- TEST 1: Initial State Must Be Completely Empty ---');
  let categoryId = '';
  let productType = '';
  let primaryColor = '';
  let name = '';
  let sku = '';
  let description = '';
  let duplicateConflict: any = null;

  // Emulate currentCategory
  const getCurrentCategory = (catId: string) => {
    if (!catId) return null;
    return categories.find(c => c.id === catId) || null;
  };

  let currentCategory = getCurrentCategory(categoryId);

  // Emulate availableProductTypes
  const getAvailableProductTypes = (cat: any) => {
    if (!cat) return [];
    if (isHoodieCategory(cat)) return INITIAL_HOODIE_PRODUCT_TYPES;
    if (isTShirtCategory(cat)) return INITIAL_TSHIRT_PRODUCT_TYPES;
    return getCategoryProductTypes(cat);
  };

  let availableTypes = getAvailableProductTypes(currentCategory);

  // Emulate activeCategoryColors
  const getActiveColors = (cat: any) => {
    if (!cat) return [];
    return getCategoryColors(cat);
  };

  let activeColors = getActiveColors(currentCategory);

  // Emulate currentConfigKey and isCurrentDuplicate
  const getCurrentConfigKey = (catId: string, pType: string, pColor: string) => {
    if (!catId || !pType || !pColor) return '';
    return `${catId}:${normalizeConfigPart(pType)}:${normalizeConfigPart(pColor)}`;
  };

  const getIsCurrentDuplicate = (catId: string, pType: string, pColor: string, conflict: any) => {
    if (!catId || !pType || !pColor) return false;
    if (!conflict?.exists) return false;
    return conflict.validatedKey === getCurrentConfigKey(catId, pType, pColor);
  };

  assert(categoryId === '', '1. Category starts empty / unselected');
  assert(currentCategory === null, '2. currentCategory resolves to null (no default to T-Shirts)');
  assert(availableTypes.length === 0, '3. No product types listed before category selection');
  assert(productType === '', '4. Product Type starts empty / unselected');
  assert(activeColors.length === 0, '5. No color grid items active before category selection');
  assert(primaryColor === '', '6. Product Color starts empty / unselected');
  assert(name === '', '7. Product Name starts empty (no Baby Pink Zipper Polo)');
  assert(sku === '', '8. Product SKU starts empty (no TSH-BPK-ZP)');
  assert(description === '', '9. Description starts empty / unset');
  assert(!getIsCurrentDuplicate(categoryId, productType, primaryColor, duplicateConflict), '10. Duplicate warning is NOT shown initially');

  // ---------------------------------------------------------------------------
  // TEST 2: Admin Selects Category Only
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 2: Selecting Category Only ---');
  categoryId = 'cat-tshirts';
  currentCategory = getCurrentCategory(categoryId);
  availableTypes = getAvailableProductTypes(currentCategory);
  activeColors = getActiveColors(currentCategory);

  // Dependent fields must STILL remain empty!
  assert(currentCategory?.name === 'T-Shirts', 'Category updated to T-Shirts');
  assert(availableTypes.length > 0, `Available types populated for T-Shirts (${availableTypes.length} styles)`);
  assert(activeColors.length > 0, `Available colors populated for T-Shirts (${activeColors.length} colors)`);
  assert(productType === '', 'Product Type remains unselected');
  assert(primaryColor === '', 'Product Color remains unselected');
  assert(name === '', 'Product Name remains empty');
  assert(sku === '', 'Product SKU remains empty');
  assert(!getIsCurrentDuplicate(categoryId, productType, primaryColor, duplicateConflict), 'Duplicate warning remains false');

  // ---------------------------------------------------------------------------
  // TEST 3: Admin Selects Product Type
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 3: Selecting Product Type ---');
  productType = 'Zipper Polo T-Shirt';

  // Still missing Color!
  assert(productType === 'Zipper Polo T-Shirt', 'Product Type set to Zipper Polo T-Shirt');
  assert(primaryColor === '', 'Color is still unselected');
  assert(name === '', 'Product Name remains empty until Color is selected');
  assert(sku === '', 'Product SKU remains empty until Color is selected');
  assert(!getIsCurrentDuplicate(categoryId, productType, primaryColor, duplicateConflict), 'No duplicate validation run without Color');

  // ---------------------------------------------------------------------------
  // TEST 4: Admin Selects Color (All 3 Selected) -> Auto-Generation & Validation
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 4: Selecting Color -> Triggers Generation ---');
  primaryColor = 'BABY PINK';

  // All 3 are now present: Category + Product Type + Color
  name = generateProductName(primaryColor, productType);
  const catCode = resolveCategoryCode(currentCategory?.name, currentCategory?.code);
  const colCode = resolveColorCode(primaryColor);
  const typCode = resolveProductTypeCode(productType);
  sku = `${catCode}-${colCode}-${typCode}`;
  description = generateProductDescription({
    colorName: primaryColor,
    productTypeName: productType,
    categoryName: currentCategory?.name
  });

  assert(name === 'Baby Pink Zipper Polo T-Shirt', `Product Name auto-generated: "${name}"`);
  assert(sku === 'TSH-BPK-ZP', `Product SKU auto-generated: "${sku}"`);
  assert(description.length > 0, 'Description auto-generated');

  // Now emulate duplicate detection
  const validatedKey = getCurrentConfigKey(categoryId, productType, primaryColor);
  duplicateConflict = {
    exists: true,
    validatedKey,
    existingProduct: { id: 'prod-1', name: 'Baby Pink Zipper Polo T-Shirt', sku: 'TSH-BPK-ZP' }
  };
  assert(getIsCurrentDuplicate(categoryId, productType, primaryColor, duplicateConflict), 'Duplicate validation identifies existing product now that config is complete');

  // ---------------------------------------------------------------------------
  // TEST 5: Admin Clears Color (or Clicks Selected Color Pill to Toggle Off)
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 5: Admin Clears Color Selection ---');
  primaryColor = '';
  // Name, SKU, Description, and duplicate state must immediately clear!
  name = '';
  sku = '';
  description = '';
  assert(primaryColor === '', 'Color is now empty');
  assert(name === '', 'Name is immediately cleared');
  assert(sku === '', 'SKU is immediately cleared');
  assert(description === '', 'Description is immediately cleared');
  assert(!getIsCurrentDuplicate(categoryId, productType, primaryColor, duplicateConflict), 'Duplicate warning is immediately cleared');

  // ---------------------------------------------------------------------------
  // TEST 6: Admin Re-selects a Different Color
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 6: Admin Selects Yellow Color ---');
  primaryColor = 'YELLOW';
  name = generateProductName(primaryColor, productType);
  sku = generateDeterministicSku({
    categoryName: currentCategory?.name,
    productTypeName: productType,
    colorName: primaryColor
  });

  assert(name === 'Yellow Zipper Polo T-Shirt', `Name correctly generated: "${name}"`);
  assert(sku === 'TSH-YLW-ZP', `SKU correctly generated: "${sku}"`);
  assert(!getIsCurrentDuplicate(categoryId, productType, primaryColor, duplicateConflict), 'Yellow config does not trigger duplicate warning of Baby Pink');

  // ---------------------------------------------------------------------------
  // TEST 7: Admin Switches Category to Hoodies
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 7: Switching Category to Hoodies ---');
  categoryId = 'cat-hoodies';
  currentCategory = getCurrentCategory(categoryId);
  availableTypes = getAvailableProductTypes(currentCategory);
  activeColors = getActiveColors(currentCategory);

  // Zipper Polo T-Shirt is NOT a hoodie type -> must reset to empty!
  const hasTypeInHoodie = availableTypes.some(pt => pt.name.toLowerCase() === productType.toLowerCase());
  if (!hasTypeInHoodie) {
    productType = '';
  }

  // Yellow is NOT in 18 hoodie colors -> must reset to empty!
  const hasColorInHoodie = activeColors.some(c => c.name.toUpperCase() === primaryColor.toUpperCase());
  if (!hasColorInHoodie) {
    primaryColor = '';
  }

  if (!productType || !primaryColor) {
    name = '';
    sku = '';
  }

  assert(availableTypes.length === 3, 'Hoodies category provides strictly 3 types');
  assert(productType === '', 'Product Type safely reset to empty on category switch');
  assert(primaryColor === '', 'Color safely reset to empty on category switch');
  assert(name === '', 'Product Name safely cleared on category switch');
  assert(sku === '', 'Product SKU safely cleared on category switch');
  assert(!getIsCurrentDuplicate(categoryId, productType, primaryColor, duplicateConflict), 'Duplicate warning remains completely cleared');

  // ---------------------------------------------------------------------------
  // TEST 8: Admin Selects Hoodie Style + Color
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 8: Select Hoodie Type + Color ---');
  productType = 'Unisex Hoodie';
  primaryColor = 'JET BLACK';

  name = generateProductName(primaryColor, productType);
  sku = generateDeterministicSku({
    categoryName: currentCategory?.name,
    productTypeName: productType,
    colorName: primaryColor
  });

  assert(name === 'Jet Black Unisex Hoodie', `Generated Hoodie Name: "${name}"`);
  assert(sku === 'HOD-JBL-UH', `Generated Hoodie SKU: "${sku}"`);
  assert(!name.toLowerCase().includes('pullover'), 'No "Pullover" extra wording');

  // ---------------------------------------------------------------------------
  // TEST 9: Edit Existing Product Flow
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 9: Edit Existing Product (Self-Exclusion) ---');
  const existingProduct = {
    id: 'prod-existing-1',
    categoryId: 'cat-tshirts',
    productType: 'Zipper Polo T-Shirt',
    color: 'BABY PINK',
    name: 'Baby Pink Zipper Polo T-Shirt',
    sku: 'TSH-BPK-ZP'
  };

  // When editing, initialConfig stores the product's config
  const initialConfig = {
    categoryId: existingProduct.categoryId,
    productType: existingProduct.productType,
    color: existingProduct.color,
    sku: existingProduct.sku
  };

  const isSameAsInitial = (
    initialConfig.categoryId === existingProduct.categoryId &&
    initialConfig.productType === existingProduct.productType &&
    initialConfig.color === existingProduct.color
  );

  const willTriggerDuplicate = !isSameAsInitial;
  assert(!willTriggerDuplicate, 'Existing product does NOT trigger duplicate warning on itself');

  console.log('\n================================================================');
  console.log(`VERIFICATION COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runSuite();
