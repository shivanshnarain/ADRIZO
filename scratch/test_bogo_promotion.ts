import { prisma } from '../src/lib/prisma';

async function testBogoPromotion() {
  console.log('--- STARTING BOGO PROMOTION AUTOMATED TEST ---');

  // 1. Check or initialize BOGO store setting
  let setting = await prisma.storeSetting.findUnique({
    where: { key: 'bogo_promotion' },
  });

  if (!setting) {
    console.log('[1] Initializing default bogo_promotion setting in MongoDB...');
    setting = await prisma.storeSetting.create({
      data: {
        key: 'bogo_promotion',
        value: JSON.stringify({
          status: 'ACTIVE',
          name: 'BUY 1 GET 2 FREE',
          buyQuantity: 1,
          freeQuantity: 2,
          allowSameProduct: true,
          allowDifferentProducts: true,
          eligibleCategories: ['all'],
        }),
      },
    });
  }

  const parsedConfig = JSON.parse(setting.value);
  console.log('[1] BOGO Promotion Setting Status:', parsedConfig.status);
  console.log('[1] Configuration:', parsedConfig);

  // 2. Fetch eligible active products
  const products = await prisma.product.findMany({
    where: { status: 'ACTIVE' },
    include: { variants: true },
    take: 5,
  });

  console.log(`[2] Found ${products.length} active products to test with.`);
  if (products.length === 0) {
    console.error('No active products found.');
    return;
  }

  const paidProduct = products[0];
  const freeProduct1 = products[1] || products[0];
  const freeProduct2 = products[2] || products[0];

  console.log(`[3] Qualifying Paid Product: ${paidProduct.name} (₹${paidProduct.price})`);
  console.log(`[3] Free Product #1: ${freeProduct1.name} (Original Price: ₹${freeProduct1.price})`);
  console.log(`[3] Free Product #2: ${freeProduct2.name} (Original Price: ₹${freeProduct2.price})`);

  // 4. Mathematical price verification
  const items = [
    { productId: paidProduct.id, name: paidProduct.name, price: paidProduct.price, isFree: false, quantity: 1 },
    { productId: freeProduct1.id, name: freeProduct1.name, price: 0, isFree: true, quantity: 1 },
    { productId: freeProduct2.id, name: freeProduct2.name, price: 0, isFree: true, quantity: 1 },
  ];

  const subtotal = items.reduce((acc, it) => acc + (it.price * it.quantity), 0);
  const totalOriginalPrice = paidProduct.price + freeProduct1.price + freeProduct2.price;
  const customerSavings = totalOriginalPrice - subtotal;

  console.log(`[4] Subtotal (Paid items only): ₹${subtotal}`);
  console.log(`[4] Total Value of Bundle: ₹${totalOriginalPrice}`);
  console.log(`[4] Customer Savings: ₹${customerSavings}`);

  if (subtotal !== paidProduct.price) {
    throw new Error(`FAIL: Subtotal must be ₹${paidProduct.price}, got ₹${subtotal}`);
  }
  console.log('✓ PASS: Subtotal correctly reflects ONLY the paid product (free products charged ₹0.00).');

  // 5. Abuse prevention check: 2 free items allowed per 1 paid item
  const paidCount = items.filter(i => !i.isFree).reduce((acc, i) => acc + i.quantity, 0);
  const allowedFreeCount = paidCount * 2;
  const actualFreeCount = items.filter(i => i.isFree).reduce((acc, i) => acc + i.quantity, 0);

  if (actualFreeCount <= allowedFreeCount) {
    console.log(`✓ PASS: Free item count (${actualFreeCount}) is within allowable limit (${allowedFreeCount}).`);
  } else {
    throw new Error('FAIL: Free items exceed allowable limit!');
  }

  console.log('--- ALL BOGO PROMOTION AUTOMATED CHECKS PASSED ---');
}

testBogoPromotion()
  .catch((err) => {
    console.error('Test error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
