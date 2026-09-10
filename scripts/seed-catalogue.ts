/**
 * ADRIZO Catalogue Seeder
 * Seeds categories, product types, colors, and sizes into MongoDB via Prisma upsert.
 * Safe to run multiple times — existing records are preserved.
 * Run: npx tsx scripts/seed-catalogue.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const COLORS = [
  { name: 'JET BLACK',    code: 'JBL', hex: '#111111' },
  { name: 'BOTTLE GREEN', code: 'BGR', hex: '#134611' },
  { name: 'ROYAL BLUE',   code: 'RBL', hex: '#1D4ED8' },
  { name: 'FROZI BLUE',   code: 'FBL', hex: '#48CAE4' },
  { name: 'WHITE',        code: 'WHT', hex: '#FFFFFF' },
  { name: 'ROSE PINK',    code: 'RPK', hex: '#E07A5F' },
  { name: 'RED',          code: 'RED', hex: '#D92323' },
  { name: 'NAVY BLUE',    code: 'NVY', hex: '#14213D' },
  { name: 'SKY BLUE',     code: 'SKY', hex: '#8ECAE6' },
  { name: 'MEHRON',       code: 'MHR', hex: '#721121' },
  { name: '5% MELANGE',   code: '5ML', hex: '#D8D8D8' },
  { name: 'MUSTARD',      code: 'MST', hex: '#DDA15E' },
  { name: 'PARROT GREEN', code: 'PGR', hex: '#60B246' },
  { name: 'OLIVE GREEN',  code: 'OLV', hex: '#588157' },
  { name: '15% MELANGE',  code: '15M', hex: '#A8A8A8' },
  { name: 'BABY PINK',    code: 'BPK', hex: '#F4ACB7' },
  { name: 'YELLOW',       code: 'YLW', hex: '#FAB800' },
];

const SIZES = [
  { name: 'XS', code: 'XS', sortOrder: 1 },
  { name: 'S', code: 'S', sortOrder: 2 },
  { name: 'M', code: 'M', sortOrder: 3 },
  { name: 'L', code: 'L', sortOrder: 4 },
  { name: 'XL', code: 'XL', sortOrder: 5 },
  { name: 'XXL', code: 'XXL', sortOrder: 6 },
  { name: 'XXXL', code: '3XL', sortOrder: 7 },
  { name: '4XL', code: '4XL', sortOrder: 8 },
  { name: '5XL', code: '5XL', sortOrder: 9 },
  { name: 'Free Size', code: 'FS', sortOrder: 10 },
];

const CATEGORIES = [
  { name: 'T-Shirt',  slug: 't-shirt',  code: 'TSH', sortOrder: 1, description: 'Premium heavyweight and oversized t-shirts' },
  { name: 'Shirt',    slug: 'shirt',    code: 'SHT', sortOrder: 2, description: 'Casual, formal, and linen shirts' },
  { name: 'Hoodie',   slug: 'hoodie',   code: 'HOD', sortOrder: 3, description: 'Signature heavyweight fleece and zipper hoodies' },
  { name: 'Jacket',   slug: 'jacket',   code: 'JKT', sortOrder: 4, description: 'Denim, bomber, puffer, and varsity jackets' },
  { name: 'Jeans',    slug: 'jeans',    code: 'JNS', sortOrder: 5, description: 'Slim, straight, relaxed, and baggy denim' },
  { name: 'Pant',     slug: 'pant',     code: 'PNT', sortOrder: 6, description: 'Cargo, chino, track, and jogger pants' },
  { name: 'Trouser',  slug: 'trouser',  code: 'TRS', sortOrder: 7, description: 'Formal, pleated, and tailored trousers' },
];

const PRODUCT_TYPES = [
  { categorySlug: 't-shirt', name: 'Polo T-Shirt',          code: 'PO',  sortOrder: 1 },
  { categorySlug: 't-shirt', name: 'Zipper Polo T-Shirt',   code: 'ZP',  sortOrder: 2 },
  { categorySlug: 't-shirt', name: 'Button Polo T-Shirt',   code: 'BP',  sortOrder: 3 },
  { categorySlug: 't-shirt', name: 'Round Neck T-Shirt',    code: 'RN',  sortOrder: 4 },
  { categorySlug: 't-shirt', name: 'V-Neck T-Shirt',        code: 'VN',  sortOrder: 5 },
  { categorySlug: 't-shirt', name: 'Oversized T-Shirt',     code: 'OS',  sortOrder: 6 },
  { categorySlug: 't-shirt', name: 'Regular Fit T-Shirt',   code: 'RF',  sortOrder: 7 },
  { categorySlug: 't-shirt', name: 'Slim Fit T-Shirt',      code: 'SF',  sortOrder: 8 },
  { categorySlug: 't-shirt', name: 'Henley T-Shirt',        code: 'HEN', sortOrder: 9 },
  { categorySlug: 't-shirt', name: 'Half Sleeve T-Shirt',   code: 'HS',  sortOrder: 10 },
  { categorySlug: 't-shirt', name: 'Full Sleeve T-Shirt',   code: 'FL',  sortOrder: 11 },
  { categorySlug: 'shirt', name: 'Casual Shirt',   code: 'CS',  sortOrder: 1 },
  { categorySlug: 'shirt', name: 'Formal Shirt',   code: 'FRM', sortOrder: 2 },
  { categorySlug: 'shirt', name: 'Oxford Shirt',   code: 'OX',  sortOrder: 3 },
  { categorySlug: 'shirt', name: 'Linen Shirt',    code: 'LN',  sortOrder: 4 },
  { categorySlug: 'shirt', name: 'Denim Shirt',    code: 'DN',  sortOrder: 5 },
  { categorySlug: 'shirt', name: 'Overshirt',      code: 'OVS', sortOrder: 6 },
  { categorySlug: 'shirt', name: 'Checked Shirt',  code: 'CHK', sortOrder: 7 },
  { categorySlug: 'shirt', name: 'Printed Shirt',  code: 'PR',  sortOrder: 8 },
  { categorySlug: 'shirt', name: 'Solid Shirt',    code: 'SLD', sortOrder: 9 },
  { categorySlug: 'hoodie', name: 'Unisex Hoodie', code: 'UH', sortOrder: 1 },
  { categorySlug: 'hoodie', name: 'Regular Fit',   code: 'RF', sortOrder: 2 },
  { categorySlug: 'hoodie', name: 'Slim Fit',      code: 'SF', sortOrder: 3 },
  { categorySlug: 'jacket', name: 'Denim Jacket',     code: 'DN',  sortOrder: 1 },
  { categorySlug: 'jacket', name: 'Bomber Jacket',    code: 'BM',  sortOrder: 2 },
  { categorySlug: 'jacket', name: 'Puffer Jacket',    code: 'PF',  sortOrder: 3 },
  { categorySlug: 'jacket', name: 'Varsity Jacket',   code: 'VR',  sortOrder: 4 },
  { categorySlug: 'jacket', name: 'Leather Jacket',   code: 'LTH', sortOrder: 5 },
  { categorySlug: 'jacket', name: 'Windbreaker',      code: 'WB',  sortOrder: 6 },
  { categorySlug: 'jacket', name: 'Overshirt Jacket', code: 'OJ',  sortOrder: 7 },
  { categorySlug: 'jeans', name: 'Slim Fit Jeans',     code: 'SF', sortOrder: 1 },
  { categorySlug: 'jeans', name: 'Skinny Jeans',       code: 'SK', sortOrder: 2 },
  { categorySlug: 'jeans', name: 'Straight Fit Jeans', code: 'ST', sortOrder: 3 },
  { categorySlug: 'jeans', name: 'Relaxed Fit Jeans',  code: 'RL', sortOrder: 4 },
  { categorySlug: 'jeans', name: 'Baggy Jeans',        code: 'BG', sortOrder: 5 },
  { categorySlug: 'jeans', name: 'Tapered Jeans',      code: 'TP', sortOrder: 6 },
  { categorySlug: 'jeans', name: 'Bootcut Jeans',      code: 'BC', sortOrder: 7 },
  { categorySlug: 'jeans', name: 'Regular Fit Jeans',  code: 'RG', sortOrder: 8 },
  { categorySlug: 'pant', name: 'Slim Fit Pant',     code: 'SF', sortOrder: 1 },
  { categorySlug: 'pant', name: 'Regular Fit Pant',  code: 'RF', sortOrder: 2 },
  { categorySlug: 'pant', name: 'Straight Fit Pant', code: 'ST', sortOrder: 3 },
  { categorySlug: 'pant', name: 'Relaxed Fit Pant',  code: 'RX', sortOrder: 4 },
  { categorySlug: 'pant', name: 'Cargo Pant',        code: 'CG', sortOrder: 5 },
  { categorySlug: 'pant', name: 'Chino Pant',        code: 'CH', sortOrder: 6 },
  { categorySlug: 'pant', name: 'Track Pant',        code: 'TR', sortOrder: 7 },
  { categorySlug: 'pant', name: 'Jogger Pant',       code: 'JG', sortOrder: 8 },
  { categorySlug: 'trouser', name: 'Slim Fit Trouser',     code: 'SF', sortOrder: 1 },
  { categorySlug: 'trouser', name: 'Regular Fit Trouser',  code: 'RF', sortOrder: 2 },
  { categorySlug: 'trouser', name: 'Straight Fit Trouser', code: 'ST', sortOrder: 3 },
  { categorySlug: 'trouser', name: 'Relaxed Fit Trouser',  code: 'RX', sortOrder: 4 },
  { categorySlug: 'trouser', name: 'Formal Trouser',       code: 'FM', sortOrder: 5 },
  { categorySlug: 'trouser', name: 'Pleated Trouser',      code: 'PL', sortOrder: 6 },
];

async function main() {
  console.log('\n🌱 ADRIZO Catalogue Seeder\n');

  console.log('1/3  Seeding Colors...');
  for (let i = 0; i < COLORS.length; i++) {
    const c = COLORS[i];
    await prisma.productColor.upsert({
      where: { name: c.name },
      update: { code: c.code, hex: c.hex, sortOrder: i + 1 },
      create: { name: c.name, code: c.code, hex: c.hex, isCustom: false, sortOrder: i + 1, status: 'ACTIVE' },
    });
  }
  console.log(`     ✓ ${await prisma.productColor.count()} colors in DB`);

  console.log('2/3  Seeding Sizes...');
  for (const s of SIZES) {
    await prisma.productSize.upsert({
      where: { name: s.name },
      update: { code: s.code, sortOrder: s.sortOrder },
      create: { name: s.name, code: s.code, sortOrder: s.sortOrder, status: 'ACTIVE' },
    });
  }
  console.log(`     ✓ ${await prisma.productSize.count()} sizes in DB`);

  console.log('3/3  Seeding Categories & Product Types...');
  const catIdMap: Record<string, string> = {};

  for (const cat of CATEGORIES) {
    const record = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, code: cat.code, sortOrder: cat.sortOrder, description: cat.description },
      create: { name: cat.name, slug: cat.slug, code: cat.code, description: cat.description, sortOrder: cat.sortOrder, status: 'ACTIVE' },
    });
    catIdMap[cat.slug] = record.id;
    console.log(`     ✓ Category "${cat.name}" -> _id: ${record.id}`);
  }

  let ptCreated = 0; let ptSkipped = 0;
  for (const pt of PRODUCT_TYPES) {
    const categoryId = catIdMap[pt.categorySlug];
    if (!categoryId) { console.warn(`     Warning: No category for slug: ${pt.categorySlug}`); continue; }
    const slug = pt.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const existing = await prisma.productType.findFirst({ where: { categoryId, name: pt.name } });
    if (existing) { ptSkipped++; }
    else {
      await prisma.productType.create({ data: { categoryId, name: pt.name, code: pt.code, slug, sortOrder: pt.sortOrder, status: 'ACTIVE' } });
      ptCreated++;
    }
  }
  console.log(`     ✓ ${ptCreated} product types created, ${ptSkipped} already existed (${await prisma.productType.count()} total)`);
  console.log('\n✅  Seeding complete! All catalogue data is now in MongoDB.\n');
}

main()
  .catch(e => { console.error('Seeder error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
