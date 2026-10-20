import dotenv from 'dotenv';
dotenv.config();
import { prisma } from '../src/lib/prisma';
import { isHoodieCategory, isTShirtCategory } from '../src/lib/catalogueDefaults';
import { calculateDiscountPercentage, validatePricing } from '../src/lib/pricing';

async function main() {
  console.log('====================================================');
  console.log('ADRIZO - GLOBAL PRODUCT PRICE UPDATE EXECUTION');
  console.log('Target: T-Shirts -> ₹1,499 | Hoodies -> ₹2,499');
  console.log('====================================================\n');

  // Fetch all products with their category relations
  const allProducts = await prisma.product.findMany({
    include: {
      category: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`Total authoritative products in catalog: ${allProducts.length}`);

  const tshirtTargets: any[] = [];
  const hoodieTargets: any[] = [];
  const untouchedProducts: any[] = [];

  for (const p of allProducts) {
    const isHoodie = isHoodieCategory(p.category) || /hoodie/i.test(p.productType || '');
    const isTShirt = isTShirtCategory(p.category) || /t-?shirt|polo/i.test(p.productType || '');

    if (isHoodie && !isTShirt) {
      hoodieTargets.push(p);
    } else if (isTShirt && !isHoodie) {
      tshirtTargets.push(p);
    } else {
      untouchedProducts.push(p);
    }
  }

  console.log(`\nIdentified T-Shirt targets: ${tshirtTargets.length}`);
  console.log(`Identified Hoodie targets: ${hoodieTargets.length}`);
  console.log(`Untouched / Other products: ${untouchedProducts.length}`);

  let tshirtsUpdatedCount = 0;
  let hoodiesUpdatedCount = 0;
  const updateFailures: any[] = [];

  // 1. Update T-Shirt Products to ₹1,499
  console.log('\n--- 1. Updating T-Shirt Products (Target: ₹1,499) ---');
  for (const p of tshirtTargets) {
    const targetPrice = 1499;
    const mrp = p.originalPrice || 2999;

    // Validate pricing rule
    const validation = validatePricing(mrp, targetPrice);
    if (!validation.isValid) {
      console.error(`❌ Validation failed for T-shirt [${p.id}] ${p.name}: ${validation.error}`);
      updateFailures.push({ product: p, error: validation.error });
      continue;
    }

    const onSale = Boolean(mrp && mrp > targetPrice);

    await prisma.product.update({
      where: { id: p.id },
      data: {
        price: targetPrice,
        salePrice: null,
        onSale,
      },
    });

    const discount = calculateDiscountPercentage(mrp, targetPrice);
    console.log(`  ✅ [${p.id}] "${p.name}" (Type: ${p.productType}): ₹${p.price} -> ₹${targetPrice} (MRP: ₹${mrp}, Discount: ${discount}%)`);
    tshirtsUpdatedCount++;
  }

  // 2. Update Hoodie Products to ₹2,499
  console.log('\n--- 2. Updating Hoodie Products (Target: ₹2,499) ---');
  for (const p of hoodieTargets) {
    const targetPrice = 2499;
    const mrp = p.originalPrice || 3999;

    // Validate pricing rule
    const validation = validatePricing(mrp, targetPrice);
    if (!validation.isValid) {
      console.error(`❌ Validation failed for Hoodie [${p.id}] ${p.name}: ${validation.error}`);
      updateFailures.push({ product: p, error: validation.error });
      continue;
    }

    const onSale = Boolean(mrp && mrp > targetPrice);

    await prisma.product.update({
      where: { id: p.id },
      data: {
        price: targetPrice,
        salePrice: null,
        onSale,
      },
    });

    const discount = calculateDiscountPercentage(mrp, targetPrice);
    console.log(`  ✅ [${p.id}] "${p.name}" (Type: ${p.productType}): ₹${p.price} -> ₹${targetPrice} (MRP: ₹${mrp}, Discount: ${discount}%)`);
    hoodiesUpdatedCount++;
  }

  // 3. Post-Update Verification
  console.log('\n====================================================');
  console.log('POST-UPDATE DATABASE VERIFICATION AUDIT');
  console.log('====================================================\n');

  const refreshedProducts = await prisma.product.findMany({
    include: { category: true },
    orderBy: { createdAt: 'asc' },
  });

  let tshirtsAt1499 = 0;
  let hoodiesAt2499 = 0;
  let mispricedCount = 0;

  for (const p of refreshedProducts) {
    const isHoodie = isHoodieCategory(p.category) || /hoodie/i.test(p.productType || '');
    const isTShirt = isTShirtCategory(p.category) || /t-?shirt|polo/i.test(p.productType || '');

    if (isTShirt) {
      if (p.price === 1499) {
        tshirtsAt1499++;
      } else {
        mispricedCount++;
        console.error(`❌ T-Shirt NOT at ₹1,499: [${p.id}] ${p.name} -> ₹${p.price}`);
      }
    } else if (isHoodie) {
      if (p.price === 2499) {
        hoodiesAt2499++;
      } else {
        mispricedCount++;
        console.error(`❌ Hoodie NOT at ₹2,499: [${p.id}] ${p.name} -> ₹${p.price}`);
      }
    }
  }

  console.log(`\nAudit Summary:`);
  console.log(`- T-Shirts confirmed at ₹1,499: ${tshirtsAt1499} / ${tshirtTargets.length}`);
  console.log(`- Hoodies confirmed at ₹2,499: ${hoodiesAt2499} / ${hoodieTargets.length}`);
  console.log(`- Mispriced count: ${mispricedCount}`);
  console.log(`- Failures: ${updateFailures.length}`);

  if (mispricedCount > 0 || updateFailures.length > 0) {
    console.error('\n❌ DATABASE UPDATE HAD ERRORS');
    process.exit(1);
  } else {
    console.log('\n🎉 ALL PRODUCTS SUCCESSFULLY UPDATED IN AUTHORITATIVE DATABASE!');
  }
}

main()
  .catch((err) => {
    console.error('Fatal error executing price update:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
