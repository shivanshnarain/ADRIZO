import dotenv from 'dotenv';
dotenv.config();
import { prisma } from '../src/lib/prisma';

function fmtBytes(bytes: number): string {
  if (!bytes || isNaN(bytes)) return '0 B';
  const units = ['B','KB','MB','GB'];
  let i = 0, val = bytes;
  while (val >= 1024 && i < units.length - 1) { val /= 1024; i++; }
  return `${val.toFixed(2)} ${units[i]}`;
}

async function main() {
  console.log('\n================================================================');
  console.log(' ADRIZO - REMOVE imagesRaw + totalStock FROM MongoDB Documents');
  console.log('================================================================\n');

  const productsBefore = await prisma.product.findMany({ select: { id: true, name: true, stock: true } });
  console.log(`Products in DB: ${productsBefore.length}`);

  // Unset imagesRaw (stored as 'images' due to @map) and totalStock
  const r: any = await prisma.$runCommandRaw({
    update: 'Product',
    updates: [{ q: {}, u: { $unset: { images: '', totalStock: '' } }, multi: true }]
  });
  console.log(`\nUpdate result: nModified=${r?.nModified ?? r?.n ?? JSON.stringify(r)}`);

  const after = await prisma.product.findMany({ include: { images: true, variants: true } });
  console.log('\nAll products after cleanup:');
  for (const p of after) {
    console.log(`  [OK] ${p.name}  sku:${p.sku}  stock:${p.stock}  images:${p.images.length}  variants:${p.variants.length}`);
    const cldImages = p.images.filter(i => i.url.includes('cloudinary.com'));
    console.log(`       Cloudinary: ${cldImages.length}/${p.images.length}  publicIds: ${p.images.filter(i=>i.publicId).length}`);
  }

  const dbStats: any = await prisma.$runCommandRaw({ dbStats: 1, scale: 1 });
  console.log('\nAtlas DB Stats (AFTER):');
  console.log(`  DataSize (uncompressed): ${fmtBytes(dbStats.dataSize)}`);
  console.log(`  StorageSize (on disk):   ${fmtBytes(dbStats.storageSize)}`);
  console.log(`  IndexSize:               ${fmtBytes(dbStats.indexSize)}`);
  console.log(`  Total (data+index):      ${fmtBytes(dbStats.dataSize + dbStats.indexSize)}`);

  const ps: any = await prisma.$runCommandRaw({ collStats: 'Product', scale: 1 });
  console.log(`\nProduct collection:`);
  console.log(`  docs:${ps.count}  data:${fmtBytes(ps.size)}  storage:${fmtBytes(ps.storageSize)}  idx:${fmtBytes(ps.totalIndexSize)}`);

  console.log('\n  Done. Fields imagesRaw and totalStock removed from all Product documents.');
  console.log('================================================================\n');
}

main().catch(console.error).finally(() => prisma.$disconnect());
