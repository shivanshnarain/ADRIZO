import dotenv from 'dotenv';
dotenv.config();
import { prisma } from '../src/lib/prisma';

function fmtBytes(bytes: number) {
  if (!bytes || isNaN(bytes)) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0, val = bytes;
  while (val >= 1024 && i < units.length - 1) { val /= 1024; i++; }
  return `${val.toFixed(2)} ${units[i]}`;
}

async function main() {
  console.log('\n================================================================');
  console.log(' ADRIZO MONGODB ATLAS - COMPREHENSIVE STORAGE AUDIT');
  console.log('================================================================\n');

  const [
    productCount, productImageCount, productVariantCount, categoryCount,
    productTypeCount, productColorCount, productSizeCount, orderCount,
    orderItemCount, userCount, enquiryCount, storeSettingCount,
    productDraftCount, otpCount,
  ] = await Promise.all([
    prisma.product.count(), prisma.productImage.count(),
    prisma.productVariant.count(), prisma.category.count(),
    prisma.productType.count(), prisma.productColor.count(),
    prisma.productSize.count(), prisma.order.count(),
    prisma.orderItem.count(), prisma.user.count(),
    prisma.enquiry.count(), prisma.storeSetting.count(),
    prisma.productDraft.count(), prisma.otpVerification.count(),
  ]);

  const collections = [
    { name: 'Product', count: productCount },
    { name: 'ProductImage', count: productImageCount },
    { name: 'ProductVariant', count: productVariantCount },
    { name: 'Category', count: categoryCount },
    { name: 'ProductType', count: productTypeCount },
    { name: 'ProductColor', count: productColorCount },
    { name: 'ProductSize', count: productSizeCount },
    { name: 'Order', count: orderCount },
    { name: 'OrderItem', count: orderItemCount },
    { name: 'User', count: userCount },
    { name: 'Enquiry', count: enquiryCount },
    { name: 'StoreSetting', count: storeSettingCount },
    { name: 'ProductDraft', count: productDraftCount },
    { name: 'OtpVerification', count: otpCount },
  ];
  const totalDocs = collections.reduce((s, c) => s + c.count, 0);
  console.log('COLLECTION COUNTS:');
  for (const c of collections) console.log(`  ${c.name.padEnd(22)} ${String(c.count).padStart(5)} docs`);
  console.log(`  ${'TOTAL'.padEnd(22)} ${String(totalDocs).padStart(5)} docs\n`);

  const products = await prisma.product.findMany({
    select: {
      id: true, name: true, slug: true, sku: true, status: true, price: true,
      colorsRaw: true, sizesRaw: true, sizeWiseStock: true, description: true,
      _count: { select: { images: true, variants: true, orderItems: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  console.log('ALL PRODUCTS:');
  for (const p of products) {
    const colRaw = p.colorsRaw ? p.colorsRaw.length : 0;
    const szRaw = p.sizesRaw ? p.sizesRaw.length : 0;
    const sws = p.sizeWiseStock ? p.sizeWiseStock.length : 0;
    console.log(`  [${p.status}] ${p.name}`);
    console.log(`    slug:${p.slug}  sku:${p.sku}  price:${p.price}`);
    console.log(`    images:${p._count.images}  variants:${p._count.variants}  orderItems:${p._count.orderItems}`);
    console.log(`    rawFields: colorsRaw=${colRaw}B sizesRaw=${szRaw}B sizeWiseStock=${sws}B (imagesRaw REMOVED)`);
  }

  // SKU duplicates
  console.log('\nSKU CHECK:');
  const skuMap: Record<string, string[]> = {};
  for (const p of products) { if (!skuMap[p.sku]) skuMap[p.sku] = []; skuMap[p.sku].push(p.name); }
  const dupes = Object.entries(skuMap).filter(([, n]) => n.length > 1);
  if (dupes.length === 0) console.log('  No duplicate SKUs.');
  else dupes.forEach(([sku, names]) => console.log(`  DUPLICATE: ${sku} -> ${names.join(', ')}`));

  // Orphans
  const productIds = new Set(products.map(p => p.id));
  const allImages = await prisma.productImage.findMany({ select: { id: true, productId: true, url: true, publicId: true } });
  const allVariants = await prisma.productVariant.findMany({ select: { id: true, productId: true } });
  const orphanImages = allImages.filter(img => !productIds.has(img.productId));
  const orphanVariants = allVariants.filter(v => !productIds.has(v.productId));
  console.log('\nORPHAN RECORDS:');
  console.log(`  Images total:${allImages.length}  orphaned:${orphanImages.length}`);
  console.log(`  Variants total:${allVariants.length}  orphaned:${orphanVariants.length}`);
  if (orphanImages.length > 0) orphanImages.slice(0,5).forEach(i => console.log(`    orphan img: ${i.id} productId:${i.productId}`));

  // OTPs
  const now = new Date();
  const expiredOtps = await prisma.otpVerification.count({ where: { expiresAt: { lt: now } } });
  console.log(`\nOTPs: total:${otpCount}  expired:${expiredOtps}  active:${otpCount - expiredOtps}`);

  // Dummy detection
  const dummySlugs = [
    'oversized-contrast-tee','linen-blend-shirt','signature-hoodie','utility-jacket',
    'cargo-pants','ribbed-polo-t-shirt','relaxed-fit-jeans','classic-cap',
    'prod-urban-flex-pants','prod-1','prod-2','prod-3','black-zipper-polo-matty-lycra',
    'white-classic-heavyweight-cotton-polo','olive-green-minimalist-snap-polo',
    'urban-flex-pants','slug','ssdegr',
  ];
  const dummySkus = [
    'ADR-TEE-001','ADR-SHT-002','ADR-HOD-003','ADR-JKT-004','ADR-PNT-005',
    'ADR-POL-006','ADR-JNS-007','ADR-ACC-008','POLO-ZIP-BLK','POLO-WHT-01','POLO-OLV-02','ADR-PNT-UBF',
  ];
  const dummyProds = await prisma.product.findMany({
    where: { OR: [{ slug: { in: dummySlugs } }, { sku: { in: dummySkus } }] },
    select: { id: true, name: true, slug: true, sku: true, _count: { select: { orderItems: true } } },
  });
  console.log('\nDUMMY/SEED PRODUCTS:');
  if (dummyProds.length === 0) { console.log('  None found - database already clean'); }
  else dummyProds.forEach(d => console.log(`  [${d._count.orderItems === 0 ? 'SAFE DELETE' : 'HAS ORDERS'}] ${d.name} (${d.slug})`));

  // Drafts
  const drafts = await prisma.productDraft.findMany({ select: { id: true, updatedAt: true, data: true } });
  console.log('\nPRODUCT DRAFTS:');
  if (drafts.length === 0) console.log('  None');
  else drafts.forEach(d => console.log(`  ${d.id}  updated:${d.updatedAt.toISOString()}  size:${d.data.length}B`));

  // Field analysis
  let totColRaw = 0, totSzRaw = 0, totImgRaw = 0, totSws = 0;
  let wColRaw = 0, wSzRaw = 0, wImgRaw = 0;
  for (const p of products) {
    if (p.colorsRaw) { totColRaw += p.colorsRaw.length; wColRaw++; }
    if (p.sizesRaw) { totSzRaw += p.sizesRaw.length; wSzRaw++; }
    if (p.imagesRaw) { totImgRaw += p.imagesRaw.length; wImgRaw++; }
    if (p.sizeWiseStock) totSws += p.sizeWiseStock.length;
  }
  console.log('\nREDUNDANT FIELD SIZES:');
  console.log(`  colorsRaw:     ${wColRaw}/${products.length} products  ${fmtBytes(totColRaw)}`);
  console.log(`  sizesRaw:      ${wSzRaw}/${products.length} products  ${fmtBytes(totSzRaw)}`);
  console.log(`  imagesRaw:     ${wImgRaw}/${products.length} products  ${fmtBytes(totImgRaw)}`);
  console.log(`  sizeWiseStock: ${products.length}/${products.length} products  ${fmtBytes(totSws)}`);
  console.log(`  Total redundant (colorsRaw+sizesRaw+imagesRaw): ${fmtBytes(totColRaw + totSzRaw + totImgRaw)}`);

  // Cloudinary
  const imgSample = await prisma.productImage.findMany({ select: { url: true, publicId: true }, take: 200 });
  const cldCount = imgSample.filter(i => i.url.includes('cloudinary.com')).length;
  const unsplashCnt = imgSample.filter(i => i.url.includes('unsplash.com')).length;
  const withPubId = imgSample.filter(i => i.publicId).length;
  console.log('\nIMAGE STORAGE:');
  console.log(`  Sampled: ${imgSample.length}  Cloudinary: ${cldCount}  Unsplash(dummy): ${unsplashCnt}  HasPublicId: ${withPubId}`);

  // DB stats
  console.log('\nMONGODB ATLAS STATS:');
  try {
    const s: any = await prisma.$runCommandRaw({ dbStats: 1, scale: 1 });
    console.log(`  DB: ${s.db}  Collections: ${s.collections}  Documents: ${s.objects}`);
    console.log(`  DataSize (uncompressed): ${fmtBytes(s.dataSize)}`);
    console.log(`  StorageSize (on disk compressed): ${fmtBytes(s.storageSize)}`);
    console.log(`  IndexSize: ${fmtBytes(s.indexSize)}`);
    console.log(`  Total (data+index): ${fmtBytes(s.dataSize + s.indexSize)}`);
    if (s.freeStorageSize !== undefined) console.log(`  FreeStorage: ${fmtBytes(s.freeStorageSize)}`);
    if (s.totalSize !== undefined) console.log(`  TotalAllocated: ${fmtBytes(s.totalSize)}`);
    console.log(`  AvgObjSize: ${fmtBytes(s.avgObjSize)}  Indexes: ${s.indexes}`);
  } catch (e: any) {
    console.log(`  dbStats error: ${e.message}`);
  }

  // Per-collection
  console.log('\nPER-COLLECTION STATS:');
  const collNames = [
    'Product','ProductImage','ProductVariant','Category','ProductType',
    'ProductColor','ProductSize','Order','OrderItem','User',
    'Enquiry','StoreSetting','ProductDraft','OtpVerification',
  ];
  for (const coll of collNames) {
    try {
      const s: any = await prisma.$runCommandRaw({ collStats: coll, scale: 1 });
      const free = s.freeStorageSize ?? 0;
      console.log(`  ${coll.padEnd(22)} docs:${String(s.count??0).padStart(5)}  data:${fmtBytes(s.size??0).padStart(10)}  storage:${fmtBytes(s.storageSize??0).padStart(10)}  idx:${fmtBytes(s.totalIndexSize??0).padStart(10)}  free:${fmtBytes(free).padStart(8)}`);
    } catch (e: any) {
      console.log(`  ${coll.padEnd(22)} ERROR: ${e.message}`);
    }
  }

  // Indexes
  console.log('\nINDEX LISTING:');
  for (const coll of collNames) {
    try {
      const r: any = await prisma.$runCommandRaw({ listIndexes: coll });
      const idxs = r?.cursor?.firstBatch ?? [];
      if (idxs.length > 0) {
        console.log(`  ${coll} (${idxs.length} indexes):`);
        for (const idx of idxs) {
          const flags = [idx.unique ? 'UNIQUE' : '', idx.sparse ? 'SPARSE' : ''].filter(Boolean).join(',');
          console.log(`    ${(idx.name ?? '').padEnd(45)} ${JSON.stringify(idx.key).padEnd(25)} ${flags}`);
        }
      }
    } catch { /* skip */ }
  }

  console.log('\n================================================================');
  console.log(' SUMMARY');
  console.log('================================================================');
  console.log(`  Products: ${productCount}  Dummy: ${dummyProds.length}`);
  console.log(`  Images: ${productImageCount}  Orphaned: ${orphanImages.length}`);
  console.log(`  Variants: ${allVariants.length}  Orphaned: ${orphanVariants.length}`);
  console.log(`  Expired OTPs: ${expiredOtps}  Drafts: ${productDraftCount}`);
  console.log(`  Redundant raw fields: ${fmtBytes(totColRaw + totSzRaw + totImgRaw)}`);
  console.log(`  Non-Cloudinary images: ${unsplashCnt + imgSample.length - cldCount - unsplashCnt}`);
  console.log('\n  SAFE CLEANUP:');
  const safeDummies = dummyProds.filter(d => d._count.orderItems === 0);
  if (safeDummies.length > 0) console.log(`    DELETE ${safeDummies.length} dummy products (+ images/variants)`);
  if (orphanImages.length > 0) console.log(`    DELETE ${orphanImages.length} orphaned images`);
  if (orphanVariants.length > 0) console.log(`    DELETE ${orphanVariants.length} orphaned variants`);
  if (expiredOtps > 0) console.log(`    DELETE ${expiredOtps} expired OTPs`);
  if (productDraftCount > 0) console.log(`    DELETE ${productDraftCount} stale drafts`);
  console.log('================================================================\n');
}

main().catch(console.error).finally(() => prisma.$disconnect());
