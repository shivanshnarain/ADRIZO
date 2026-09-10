import dotenv from 'dotenv';
dotenv.config();
import { prisma } from '../src/lib/prisma';
import { buildVariantSku } from '../src/lib/sku';

async function main() {
  console.log('\n================================================================');
  console.log(' ADRIZO - SAFE IDEMPOTENT BACKFILL OF VARIANT SKUS');
  console.log('================================================================\n');

  const products = await prisma.product.findMany({
    include: { variants: true }
  });

  console.log(`Found ${products.length} products to audit.`);
  let updatedCount = 0;

  for (const product of products) {
    if (!product.variants || product.variants.length === 0) continue;

    for (let i = 0; i < product.variants.length; i++) {
      const variant = product.variants[i];
      const expectedSku = buildVariantSku(product.sku, variant.size, i);

      if (variant.sku !== expectedSku) {
        await prisma.productVariant.update({
          where: { id: variant.id },
          data: { sku: expectedSku }
        });
        updatedCount++;
        console.log(`  Updated variant ${variant.id} (${product.name} - ${variant.size}): "${variant.sku}" -> "${expectedSku}"`);
      }
    }
  }

  console.log(`\n✅ Backfill complete. Total variants updated: ${updatedCount}`);
  console.log('================================================================\n');
}

main().catch(console.error).finally(() => prisma.$disconnect());
