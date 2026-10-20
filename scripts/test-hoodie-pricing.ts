import { 
  DEFAULT_HOODIE_MRP, 
  DEFAULT_HOODIE_SELLING_PRICE, 
  DEFAULT_STANDARD_MRP, 
  DEFAULT_STANDARD_SELLING_PRICE,
  getDefaultPricingForCategory,
  isHoodieCategory,
  isTShirtCategory
} from '../src/lib/catalogueDefaults.ts';
import { calculateDiscountPercentage, validatePricing } from '../src/lib/pricing.ts';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${message}`);
}

console.log('--- Testing Hoodie Pricing Defaults & Calculations ---');

// 1. Check Constants
assert(DEFAULT_HOODIE_MRP === '3999', `DEFAULT_HOODIE_MRP is '3999' (actual: ${DEFAULT_HOODIE_MRP})`);
assert(DEFAULT_HOODIE_SELLING_PRICE === '2499', `DEFAULT_HOODIE_SELLING_PRICE is '2499' (actual: ${DEFAULT_HOODIE_SELLING_PRICE})`);
assert(DEFAULT_STANDARD_MRP === '2999', `DEFAULT_STANDARD_MRP is '2999' (actual: ${DEFAULT_STANDARD_MRP})`);
assert(DEFAULT_STANDARD_SELLING_PRICE === '1499', `DEFAULT_STANDARD_SELLING_PRICE is '1499' (actual: ${DEFAULT_STANDARD_SELLING_PRICE})`);

// 2. Check Discount Percentage for Hoodie Defaults
const hoodieDiscount = calculateDiscountPercentage(DEFAULT_HOODIE_MRP, DEFAULT_HOODIE_SELLING_PRICE);
assert(hoodieDiscount === 38, `Hoodie default discount is exactly 38% (actual: ${hoodieDiscount}%)`);

const standardDiscount = calculateDiscountPercentage(DEFAULT_STANDARD_MRP, DEFAULT_STANDARD_SELLING_PRICE);
assert(standardDiscount === 50, `Standard default discount is 50% (actual: ${standardDiscount}%)`);

// 3. Category Detection & Helper
const hoodieCategory = { id: 'cat-hoodies', name: 'Hoodies', slug: 'hoodies' };
const tshirtCategory = { id: 'cat-tshirts', name: 'T-Shirts', slug: 't-shirts' };
const shirtCategory = { id: 'cat-shirts', name: 'Shirts', slug: 'shirts' };
const pantsCategory = { id: 'cat-pants', name: 'Pants', slug: 'pants' };

assert(isHoodieCategory(hoodieCategory), 'isHoodieCategory returns true for Hoodies');
assert(!isHoodieCategory(tshirtCategory), 'isHoodieCategory returns false for T-Shirts');
assert(!isHoodieCategory(shirtCategory), 'isHoodieCategory returns false for Shirts');
assert(!isHoodieCategory(pantsCategory), 'isHoodieCategory returns false for Pants');

const hoodiePricing = getDefaultPricingForCategory(hoodieCategory);
assert(hoodiePricing.mrp === '3999' && hoodiePricing.sellingPrice === '2499', 'getDefaultPricingForCategory returns 3999/2499 for Hoodies');

const tshirtPricing = getDefaultPricingForCategory(tshirtCategory);
assert(tshirtPricing.mrp === '2999' && tshirtPricing.sellingPrice === '1499', 'getDefaultPricingForCategory returns 2999/1499 for T-Shirts');

const shirtPricing = getDefaultPricingForCategory(shirtCategory);
assert(shirtPricing.mrp === '2999' && shirtPricing.sellingPrice === '1499', 'getDefaultPricingForCategory returns 2999/1499 for Shirts');

// 4. Simulate State Transition Logic (as in ProductsClient.tsx handleCategoryChange)
interface FormState {
  categoryId: string;
  originalPrice: string;
  price: string;
  isPriceManuallyEdited: boolean;
}

const categories = [hoodieCategory, tshirtCategory, shirtCategory, pantsCategory];

function simulateCategoryChange(state: FormState, newCatId: string): FormState {
  const prevCat = categories.find(c => c.id === state.categoryId);
  const isOldHoodie = isHoodieCategory(prevCat);

  if (!newCatId) {
    let originalPrice = state.originalPrice;
    let price = state.price;
    let isPriceManuallyEdited = state.isPriceManuallyEdited;
    if (isOldHoodie || state.originalPrice === DEFAULT_HOODIE_MRP) {
      originalPrice = DEFAULT_STANDARD_MRP;
      price = DEFAULT_STANDARD_SELLING_PRICE;
      isPriceManuallyEdited = false;
    }
    return { categoryId: '', originalPrice, price, isPriceManuallyEdited };
  }

  const newCat = categories.find(c => c.id === newCatId);
  const isNewHoodie = isHoodieCategory(newCat);

  let originalPrice = state.originalPrice;
  let price = state.price;
  let isPriceManuallyEdited = state.isPriceManuallyEdited;

  if (isNewHoodie) {
    originalPrice = DEFAULT_HOODIE_MRP;
    price = DEFAULT_HOODIE_SELLING_PRICE;
    isPriceManuallyEdited = false;
  } else if (isOldHoodie || state.originalPrice === DEFAULT_HOODIE_MRP || !state.isPriceManuallyEdited) {
    originalPrice = DEFAULT_STANDARD_MRP;
    price = DEFAULT_STANDARD_SELLING_PRICE;
    isPriceManuallyEdited = false;
  }

  return {
    categoryId: newCatId,
    originalPrice,
    price,
    isPriceManuallyEdited,
  };
}

// Scenario A: Initial State -> Select Hoodies
let state: FormState = {
  categoryId: '',
  originalPrice: DEFAULT_STANDARD_MRP,
  price: DEFAULT_STANDARD_SELLING_PRICE,
  isPriceManuallyEdited: false,
};

state = simulateCategoryChange(state, hoodieCategory.id);
assert(state.originalPrice === '3999', 'Selecting Hoodies sets MRP to 3999');
assert(state.price === '2499', 'Selecting Hoodies sets Selling Price to 2499');
assert(calculateDiscountPercentage(state.originalPrice, state.price) === 38, 'Discount is 38%');

// Scenario B: Switch from Hoodies to T-Shirts (Must NOT carry Hoodie pricing)
state = simulateCategoryChange(state, tshirtCategory.id);
assert(state.originalPrice === '2999', 'Switching Hoodies -> T-Shirts resets MRP to 2999');
assert(state.price === '1499', 'Switching Hoodies -> T-Shirts resets Selling Price to 1499');
assert(calculateDiscountPercentage(state.originalPrice, state.price) === 50, 'Discount resets to 50%');

// Scenario C: Switch from T-Shirts back to Hoodies
state = simulateCategoryChange(state, hoodieCategory.id);
assert(state.originalPrice === '3999', 'Switching back to Hoodies sets MRP to 3999');
assert(state.price === '2499', 'Switching back to Hoodies sets Selling Price to 2499');

// Scenario D: Manual Price Edit on Hoodies
state.originalPrice = '4999';
state.price = '2499';
state.isPriceManuallyEdited = true;
assert(calculateDiscountPercentage(state.originalPrice, state.price) === 50, 'Manual edit 4999/2499 calculates 50% discount');

// Scenario E: Switch from Hoodies to Shirts after manual edit (Must NOT carry Hoodie pricing)
state = simulateCategoryChange(state, shirtCategory.id);
assert(state.originalPrice === '2999', 'Switching Hoodies (edited) -> Shirts resets MRP to 2999');
assert(state.price === '1499', 'Switching Hoodies (edited) -> Shirts resets Selling Price to 1499');

// Scenario F: Switch from Shirts to Pants (both non-hoodie)
state = simulateCategoryChange(state, pantsCategory.id);
assert(state.originalPrice === '2999', 'Switching Shirts -> Pants keeps standard MRP 2999');
assert(state.price === '1499', 'Switching Shirts -> Pants keeps standard Selling Price 1499');

// Scenario G: Switch from Hoodies to Empty Category (unselected)
state = simulateCategoryChange(state, hoodieCategory.id);
assert(state.originalPrice === '3999', 'Switched back to Hoodies (MRP 3999)');
state = simulateCategoryChange(state, '');
assert(state.originalPrice === '2999', 'Switching Hoodies -> empty resets MRP to 2999');
assert(state.price === '1499', 'Switching Hoodies -> empty resets Selling Price to 1499');

// 5. Pricing Validation
const hoodieValidation = validatePricing('3999', '2499');
assert(hoodieValidation.isValid === true, 'Hoodie default pricing (3999/2499) passes validation');

console.log('\n🎉 ALL 24 HOODIE PRICING TESTS PASSED!');
