import { prisma } from '../src/lib/prisma';
import { buildProductConfigKey, normalizeConfigPart } from '../src/lib/sku';

async function main() {
  console.log('================================================================');
  console.log(' MIGRATION: REMOVE INVENTORY & BACKFILL PRODUCT CONFIG KEYS');
  console.log('================================================================\n');

  // 1. Fetch all products
  const products = await prisma.product.findMany({
    include: { category: true }
  });

  console.log(`Found ${products.length} products to audit and migrate.`);

  // 2. Audit existing configurations for duplicates
  const configMap = new Map<string, typeof products>();
  for (const p of products) {
    const key = buildProductConfigKey({
      categoryId: p.categoryId,
      productType: p.productType,
      color: p.color,
    });
    if (!configMap.has(key)) {
      configMap.set(key, []);
    }
    configMap.get(key)!.push(p);
  }

  const duplicates = Array.from(configMap.entries()).filter(([, list]) => list.length > 1);
  if (duplicates.length > 0) {
    console.error('CRITICAL: Duplicate configurations found in database:');
    for (const [key, list] of duplicates) {
      console.error(`  Conflict for [${key}]:`);
      for (const p of list) {
        console.error(`    - ID: ${p.id}, Name: ${p.name}, SKU: ${p.sku}`);
      }
    }
    throw new Error('Migration halted: Duplicate configurations must be resolved before proceeding.');
  }

  console.log(`Verified: All ${products.length} products have distinct unique configurations.`);

  // 3. Backfill configKey and unset obsolete inventory fields on Product collection
  console.log('\nUpdating products with canonical configKey and unsetting obsolete inventory fields...');
  for (const p of products) {
    const configKey = buildProductConfigKey({
      categoryId: p.categoryId,
      productType: p.productType,
      color: p.color,
    });

    // Ensure sizesRaw is preserved/populated
    const defaultSizes = JSON.stringify(['S', 'M', 'L', 'XL', 'XXL']);
    const sizesToSave = p.sizesRaw || defaultSizes;

    // Use raw MongoDB update to set configKey, ensure sizesRaw, and unset sizeWiseStock, stock, stockStatus, totalStock
    await prisma.$runCommandRaw({
      update: 'Product',
      updates: [
        {
          q: { _id: { $oid: p.id } },
          u: {
            $set: {
              configKey,
              sizes: sizesToSave
            },
            $unset: {
              sizeWiseStock: '',
              stock: '',
              stockStatus: '',
              totalStock: ''
            }
          }
        }
      ]
    });
    console.log(`  ✓ Product [${p.sku}] -> configKey: "${configKey}"`);
  }

  // 4. Unset stock and priceAdjustment on ProductVariant collection
  console.log('\nUnsetting stock and priceAdjustment fields on ProductVariant collection...');
  const variantRes = await prisma.$runCommandRaw({
    update: 'ProductVariant',
    updates: [
      {
        q: {},
        u: {
          $unset: {
            stock: '',
            priceAdjustment: ''
          }
        },
        multi: true
      }
    ]
  });
  console.log('ProductVariant unset result:', variantRes);

  console.log('\n================================================================');
  console.log(' DATABASE DATA MIGRATION COMPLETE');
  console.log(' Next step: Deploy updated Prisma schema with db push');
  console.log('================================================================');
}

main()
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
