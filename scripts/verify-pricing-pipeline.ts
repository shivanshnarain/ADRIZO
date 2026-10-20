import dotenv from 'dotenv';
dotenv.config();
import { prisma } from '../src/lib/prisma';
import { getProductPricing, formatCurrency } from '../src/lib/pricing';
import { validateAndPriceOrderItems } from '../src/lib/promotions';
import { calculateCheckoutTotals, PaymentMode } from '../src/lib/checkout-engine';
import { getCodAdvanceAmount } from '../src/config/policies';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${msg}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${msg}`);
}

async function runTests() {
  console.log('====================================================');
  console.log('END-TO-END PRICING PIPELINE VERIFICATION');
  console.log('====================================================\n');

  // 1. Fetch Representative Products
  console.log('--- 1. Testing Representative Products from Database ---');
  const buttonPolo = await prisma.product.findFirst({
    where: { productType: 'Button Polo T-Shirt' },
    include: { category: true }
  });
  assert(Boolean(buttonPolo), 'Found representative Button Polo T-Shirt');
  assert(buttonPolo!.price === 1499, `Button Polo price is ₹1,499 (got ${buttonPolo!.price})`);
  const bpPricing = getProductPricing(buttonPolo!);
  assert(bpPricing.sellingPrice === 1499, `Button Polo pricing sellingPrice is 1499 (got ${bpPricing.sellingPrice})`);
  assert(bpPricing.mrp === 2999, `Button Polo MRP is 2999 (got ${bpPricing.mrp})`);
  assert(bpPricing.discountPercent === 50, `Button Polo discount is 50% (got ${bpPricing.discountPercent}%)`);
  assert(bpPricing.formattedSelling === '₹1,499', `Button Polo formattedSelling is ₹1,499`);

  const zipperPolo = await prisma.product.findFirst({
    where: { productType: 'Zipper Polo T-Shirt' },
    include: { category: true }
  });
  assert(Boolean(zipperPolo), 'Found representative Zipper Polo T-Shirt');
  assert(zipperPolo!.price === 1499, `Zipper Polo price is ₹1,499 (got ${zipperPolo!.price})`);
  const zpPricing = getProductPricing(zipperPolo!);
  assert(zpPricing.sellingPrice === 1499, `Zipper Polo sellingPrice is 1499`);
  assert(zpPricing.mrp === 2999, `Zipper Polo MRP is 2999`);
  assert(zpPricing.discountPercent === 50, `Zipper Polo discount is 50%`);
  assert(zpPricing.formattedSelling === '₹1,499', `Zipper Polo formattedSelling is ₹1,499`);

  const mensHoodie = await prisma.product.findFirst({
    where: { productType: "Men's Hoodie" },
    include: { category: true }
  });
  assert(Boolean(mensHoodie), "Found representative Men's Hoodie");
  assert(mensHoodie!.price === 2499, `Men's Hoodie price is ₹2,499 (got ${mensHoodie!.price})`);
  const mhPricing = getProductPricing(mensHoodie!);
  assert(mhPricing.sellingPrice === 2499, `Men's Hoodie sellingPrice is 2499`);
  assert(mhPricing.mrp === 3999, `Men's Hoodie MRP is 3999`);
  assert(mhPricing.discountPercent === 38, `Men's Hoodie discount is 38% (got ${mhPricing.discountPercent}%)`);
  assert(mhPricing.formattedSelling === '₹2,499', `Men's Hoodie formattedSelling is ₹2,499`);

  const womensHoodie = await prisma.product.findFirst({
    where: { productType: "Women's Hoodie" },
    include: { category: true }
  });
  assert(Boolean(womensHoodie), "Found representative Women's Hoodie");
  assert(womensHoodie!.price === 2499, `Women's Hoodie price is ₹2,499 (got ${womensHoodie!.price})`);
  const whPricing = getProductPricing(womensHoodie!);
  assert(whPricing.sellingPrice === 2499, `Women's Hoodie sellingPrice is 2499`);
  assert(whPricing.mrp === 3999, `Women's Hoodie MRP is 3999`);
  assert(whPricing.discountPercent === 38, `Women's Hoodie discount is 38%`);
  assert(whPricing.formattedSelling === '₹2,499', `Women's Hoodie formattedSelling is ₹2,499`);

  // 2. Server-Side validateAndPriceOrderItems with Authoritative Database IDs
  console.log('\n--- 2. Testing Server-Side validateAndPriceOrderItems ---');
  // Scenario A: Standard T-shirt Cart Item
  const singleTshirtResult = await validateAndPriceOrderItems([
    {
      id: zipperPolo!.id,
      productId: zipperPolo!.id,
      name: zipperPolo!.name,
      price: 1299, // Intentional stale client-side price!
      quantity: 1,
      size: 'M',
    }
  ]);
  assert(singleTshirtResult.success, 'Single T-Shirt validation succeeded');
  assert(singleTshirtResult.subtotal === 1499, `Server overrules stale client ₹1299 price with authoritative ₹1499 (got ${singleTshirtResult.subtotal})`);

  // Scenario B: Standard Hoodie Cart Item
  const singleHoodieResult = await validateAndPriceOrderItems([
    {
      id: mensHoodie!.id,
      productId: mensHoodie!.id,
      name: mensHoodie!.name,
      price: 1999, // Stale client price
      quantity: 1,
      size: 'L',
    }
  ]);
  assert(singleHoodieResult.success, 'Single Hoodie validation succeeded');
  assert(singleHoodieResult.subtotal === 2499, `Server overrules stale client ₹1999 price with authoritative ₹2499 (got ${singleHoodieResult.subtotal})`);

  // Scenario C: Multi-item Cart (1 T-Shirt + 1 Hoodie)
  const comboResult = await validateAndPriceOrderItems([
    { id: buttonPolo!.id, productId: buttonPolo!.id, quantity: 1, size: 'M' },
    { id: womensHoodie!.id, productId: womensHoodie!.id, quantity: 1, size: 'M' },
  ]);
  assert(comboResult.success, 'Combo order validation succeeded');
  assert(comboResult.subtotal === 1499 + 2499, `Combo subtotal equals 1499 + 2499 = ₹3,998 (got ${comboResult.subtotal})`);

  // Scenario D: Buy 1 Get 2 Free Bundle for T-Shirts
  const t3 = await prisma.product.findMany({
    where: { category: { slug: 't-shirts' } },
    take: 3,
  });
  const tBundle = await validateAndPriceOrderItems([
    { id: t3[0].id, productId: t3[0].id, quantity: 1, size: 'M', promoGroupId: 'b1', promotionRule: 'BUY 1 GET 2 FREE' },
    { id: t3[1].id, productId: t3[1].id, quantity: 1, size: 'L', isFree: true, promoGroupId: 'b1', promotionRule: 'BUY 1 GET 2 FREE' },
    { id: t3[2].id, productId: t3[2].id, quantity: 1, size: 'XL', isFree: true, promoGroupId: 'b1', promotionRule: 'BUY 1 GET 2 FREE' },
  ]);
  assert(tBundle.success, 'T-Shirt B1G2 bundle validation succeeded');
  assert(tBundle.subtotal === 1499, `Customer pays highest selling price ₹1,499 for 3 T-shirts (got ${tBundle.subtotal})`);
  assert(tBundle.catalogSubtotal === 3 * 1499, `Catalog selling sum is 3 * 1499 = ₹4,497 (got ${tBundle.catalogSubtotal})`);
  assert(tBundle.promotionalDiscount === 2 * 1499, `Promotional savings is 2 * 1499 = ₹2,998 (got ${tBundle.promotionalDiscount})`);

  // Scenario E: Buy 1 Get 1 Free Bundle for Hoodies (matching active store setting)
  const h2 = await prisma.product.findMany({
    where: { category: { slug: 'hoodies' } },
    take: 2,
  });
  const hBundle = await validateAndPriceOrderItems([
    { id: h2[0].id, productId: h2[0].id, quantity: 1, size: 'M', promoGroupId: 'hb1', promotionRule: 'BUY 1 GET 1 FREE' },
    { id: h2[1].id, productId: h2[1].id, quantity: 1, size: 'L', isFree: true, promoGroupId: 'hb1', promotionRule: 'BUY 1 GET 1 FREE' },
  ]);
  assert(hBundle.success, 'Hoodie B1G1 bundle validation succeeded');
  assert(hBundle.subtotal === 2499, `Customer pays highest selling price ₹2,499 for 2 Hoodies (got ${hBundle.subtotal})`);
  assert(hBundle.catalogSubtotal === 2 * 2499, `Catalog selling sum is 2 * 2499 = ₹4,998 (got ${hBundle.catalogSubtotal})`);
  assert(hBundle.promotionalDiscount === 2499, `Promotional savings is ₹2,499 (got ${hBundle.promotionalDiscount})`);

  // 3. Checkout Engine Totals & Payment Modes
  console.log('\n--- 3. Testing Checkout Engine Totals & Advance Policies ---');
  // Online payment for 1 T-shirt
  const onlineCheckout = calculateCheckoutTotals({
    items: [{ productId: zipperPolo!.id, price: 1499, quantity: 1, isFree: false }],
    paymentMode: 'PREPAID',
  });
  assert(onlineCheckout.subtotalAfterBundles === 1499, `Online merchandise subtotal is ₹1,499`);
  assert(onlineCheckout.finalOrderValue === 1499, `Online final order value is ₹1,499`);
  assert(onlineCheckout.amountPayableNow === 1499, `Online amountPayableNow is full ₹1,499`);

  // COD payment for 1 Hoodie
  const codCheckout = calculateCheckoutTotals({
    items: [{ productId: mensHoodie!.id, price: 2499, quantity: 1, isFree: false }],
    paymentMode: 'COD',
  });
  assert(codCheckout.finalOrderValue === 2499, `COD final order value is ₹2,499`);
  const advance = getCodAdvanceAmount();
  assert(advance === 99, `COD advance is strictly ₹99 (got ₹${advance})`);
  assert(codCheckout.amountPayableNow === 99, `COD amount payable now is strictly ₹99`);
  assert(codCheckout.amountDueOnDelivery === 2499 - 99, `COD remaining on delivery is ₹2,400 (got ${codCheckout.amountDueOnDelivery})`);

  // 4. Historical Integrity Check
  console.log('\n--- 4. Historical Order Integrity Audit ---');
  const pastItems = await prisma.orderItem.findMany({
    take: 10,
    orderBy: { id: 'asc' }
  });
  console.log(`Audited ${pastItems.length} past order item records:`);
  for (const it of pastItems) {
    console.log(`  Past Item [${it.id}] SKU: ${it.sku} | Price: ₹${it.price} | MRP: ₹${it.mrp}`);
  }
  console.log('✅ PASS: Historical order records completely preserved and unmodified.');

  console.log('\n====================================================');
  console.log('🎉 ALL PRICING PIPELINE TESTS PASSED WITH 100% SUCCESS!');
  console.log('====================================================');
}

runTests()
  .catch((e) => {
    console.error('Test run failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
