import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('Permanently removing all dummy/demo/placeholder products from MongoDB Atlas...');

  const dummySlugs = [
    'oversized-contrast-tee',
    'linen-blend-shirt',
    'signature-hoodie',
    'utility-jacket',
    'cargo-pants',
    'ribbed-polo-t-shirt',
    'relaxed-fit-jeans',
    'classic-cap',
    'prod-urban-flex-pants',
    'prod-1',
    'prod-2',
    'prod-3',
    'black-zipper-polo-matty-lycra',
    'white-classic-heavyweight-cotton-polo',
    'olive-green-minimalist-snap-polo',
    'urban-flex-pants',
    'slug',
    'ssdegr'
  ];

  const dummyProducts = await prisma.product.findMany({
    where: {
      OR: [
        { slug: { in: dummySlugs } },
        { sku: { in: ['ADR-TEE-001', 'ADR-SHT-002', 'ADR-HOD-003', 'ADR-JKT-004', 'ADR-PNT-005', 'ADR-POL-006', 'ADR-JNS-007', 'ADR-ACC-008', 'POLO-ZIP-BLK', 'POLO-WHT-01', 'POLO-OLV-02', 'ADR-PNT-UBF'] } }
      ]
    }
  });

  console.log(`Found ${dummyProducts.length} dummy/demo products to delete.`);

  for (const dp of dummyProducts) {
    console.log(`Deleting dummy product: ${dp.name} (${dp.slug} / ${dp.id})`);
    await prisma.productImage.deleteMany({ where: { productId: dp.id } }).catch(() => null);
    await prisma.productVariant.deleteMany({ where: { productId: dp.id } }).catch(() => null);
    await prisma.orderItem.deleteMany({ where: { productId: dp.id } }).catch(() => null);
    await prisma.product.delete({ where: { id: dp.id } }).catch(() => null);
  }

  const remainingProducts = await prisma.product.findMany({
    include: { images: true, category: true }
  });

  console.log(`\nRemaining genuine products in database (${remainingProducts.length}):`);
  for (const rp of remainingProducts) {
    console.log(`- ${rp.name} | SKU: ${rp.sku} | Price: ₹${rp.price} | Images: ${rp.images.length}`);
  }

  console.log('\nAll dummy products permanently purged from database.');
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
