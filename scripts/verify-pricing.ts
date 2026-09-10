import {
  calculateDiscountPercentage,
  validatePricing,
  getProductPricing,
  formatCurrency,
  formatSaveText
} from '../src/lib/pricing.ts';

function testPricing() {
  console.log('--- RUNNING PRICING TESTS ---');
  let failures = 0;

  function assert(condition: boolean, testName: string, actual?: any, expected?: any) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
    } else {
      console.error(`❌ FAIL: ${testName} | Expected: ${JSON.stringify(expected)} | Got: ${JSON.stringify(actual)}`);
      failures++;
    }
  }

  // 1. ₹2000 → ₹1000 = SAVE 50%
  const disc1 = calculateDiscountPercentage(2000, 1000);
  assert(disc1 === 50, 'Case 1: MRP 2000, Selling 1000 => 50%', disc1, 50);
  assert(formatSaveText(disc1) === 'SAVE 50%', 'Case 1 format: SAVE 50%');

  // 2. ₹100 → ₹75 = SAVE 25%
  const disc2 = calculateDiscountPercentage(100, 75);
  assert(disc2 === 25, 'Case 2: MRP 100, Selling 75 => 25%', disc2, 25);
  assert(formatSaveText(disc2) === 'SAVE 25%', 'Case 2 format: SAVE 25%');

  // 3. ₹2399 → ₹1399 = SAVE 42% (exact: 41.684% -> 42%)
  const disc3 = calculateDiscountPercentage(2399, 1399);
  assert(disc3 === 42, 'Case 3: MRP 2399, Selling 1399 => 42%', disc3, 42);
  assert(formatSaveText(disc3) === 'SAVE 42%', 'Case 3 format: SAVE 42%');

  // 4. ₹1000 → ₹580 = SAVE 42% (exact: 42%)
  const disc4 = calculateDiscountPercentage(1000, 580);
  assert(disc4 === 42, 'Case 4: MRP 1000, Selling 580 => 42%', disc4, 42);
  assert(formatSaveText(disc4) === 'SAVE 42%', 'Case 4 format: SAVE 42%');

  // 5. ₹1000 → ₹1000 = 0%, no misleading sale badge
  const disc5 = calculateDiscountPercentage(1000, 1000);
  assert(disc5 === 0, 'Case 5: MRP 1000, Selling 1000 => 0%', disc5, 0);
  assert(formatSaveText(disc5) === '', 'Case 5 format: empty save text');
  const info5 = getProductPricing({ price: 1000, originalPrice: 1000 });
  assert(info5.hasDiscount === false, 'Case 5: hasDiscount is false');

  // 6. ₹1000 → ₹1200 = validation error, cannot save
  const val6 = validatePricing(1000, 1200);
  assert(val6.isValid === false, 'Case 6: Selling > MRP validation fails', val6.isValid, false);

  // 7. Empty MRP = validation error
  const val7 = validatePricing('', 1000);
  assert(val7.isValid === false, 'Case 7: Empty MRP validation fails', val7.isValid, false);
  const val7Null = validatePricing(null, 1000);
  assert(val7Null.isValid === false, 'Case 7: Null MRP validation fails', val7Null.isValid, false);

  // 8. Empty Selling Price = validation error
  const val8 = validatePricing(2000, '');
  assert(val8.isValid === false, 'Case 8: Empty Selling Price validation fails', val8.isValid, false);

  // 9. Zero/negative price = validation error
  const val9a = validatePricing(0, 1000);
  assert(val9a.isValid === false, 'Case 9a: Zero MRP validation fails', val9a.isValid, false);
  const val9b = validatePricing(2000, 0);
  assert(val9b.isValid === false, 'Case 9b: Zero Selling Price validation fails', val9b.isValid, false);
  const val9c = validatePricing(-500, 1000);
  assert(val9c.isValid === false, 'Case 9c: Negative MRP validation fails', val9c.isValid, false);
  const val9d = validatePricing(2000, -100);
  assert(val9d.isValid === false, 'Case 9d: Negative Selling Price validation fails', val9d.isValid, false);

  // 10. Decimal prices work correctly
  const disc10 = calculateDiscountPercentage(999.50, 499.75);
  assert(disc10 === 50, 'Case 10: Decimal prices 999.50 -> 499.75 => 50%', disc10, 50);
  const val10 = validatePricing(1999.99, 1499.50);
  assert(val10.isValid === true, 'Case 10: Valid decimal pricing passes', val10.isValid, true);

  // 11. String inputs with spaces/decimals
  const disc11 = calculateDiscountPercentage('  2000  ', ' 1000 ');
  assert(disc11 === 50, 'Case 11: String prices parsed safely => 50%', disc11, 50);

  // 12. Invalid strings (NaN safe)
  const disc12 = calculateDiscountPercentage('abc', 'def');
  assert(disc12 === 0, 'Case 12: Invalid strings return 0 discount without NaN', disc12, 0);
  assert(!isNaN(disc12), 'Case 12: Is not NaN');

  // 13. getProductPricing with legacy salePrice fallback
  const info13 = getProductPricing({ price: 2000, salePrice: 1000 });
  assert(info13.sellingPrice === 1000 && info13.mrp === 2000 && info13.discountPercent === 50, 'Case 13: Legacy fallback works correctly');

  // 14. Currency formatting
  assert(formatCurrency(1000) === '₹1,000', 'Case 14: formatCurrency(1000) === ₹1,000');
  assert(formatCurrency(1399.50) === '₹1,399.50', 'Case 14: formatCurrency(1399.50) === ₹1,399.50');

  console.log(`\n--- PRICING TESTS COMPLETED: ${failures === 0 ? 'ALL PASSED' : failures + ' FAILED'} ---`);
  if (failures > 0) process.exit(1);
}

testPricing();
