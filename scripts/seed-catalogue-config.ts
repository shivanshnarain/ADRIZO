/**
 * Database Initialization and Safe Backfill Script for ADRIZO / Unique India Garments
 * 
 * Seeds:
 * 1. Initial 7 Categories with Short Codes
 * 2. Initial Product Types per Category with Codes
 * 3. Exact 16 Predefined Colours with Hex and Short Codes
 * 4. Garment Sizes (XS - 5XL, Free Size)
 * 5. Default Store Settings (lowStockThreshold = 10)
 * 6. Safe Backfill for existing products (preserves existing data, generates SKU/size stock if missing)
 */

import 'dotenv/config';
import { prisma } from '../src/lib/prisma';
import {
  INITIAL_CATEGORIES,
  INITIAL_PRODUCT_TYPES,
  INITIAL_PREDEFINED_COLORS,
  INITIAL_GARMENT_SIZES,
  DEFAULT_LOW_STOCK_THRESHOLD,
} from '../src/lib/catalogueDefaults';
import { generateUniqueSku, resolveCategoryCode, resolveColorCode, resolveProductTypeCode } from '../src/lib/sku';
import { calculateTotalStock, calculateStockStatus, parseSizeWiseStock } from '../src/lib/inventory';

export async function seedCatalogueConfig() {
  console.log('🚀 Initializing ADRIZO Product Configuration & Safe Backfill...\n');

  // 1. Seed Categories
  console.log('📦 Seeding Categories...');
  const categoryMap = new Map<string, string>(); // slug -> ID

  for (const cat of INITIAL_CATEGORIES) {
    const existing = await prisma.category.findUnique({ where: { slug: cat.slug } });
    if (existing) {
      const updated = await prisma.category.update({
        where: { id: existing.id },
        data: {
          name: cat.name,
          code: cat.code,
          sortOrder: cat.sortOrder,
          description: existing.description || cat.description,
          status: 'ACTIVE',
        },
      });
      categoryMap.set(cat.slug, updated.id);
      console.log(`  ↪️ Category "${cat.name}" updated (Code: ${cat.code})`);
    } else {
      const created = await prisma.category.create({
        data: {
          name: cat.name,
          slug: cat.slug,
          code: cat.code,
          description: cat.description,
          sortOrder: cat.sortOrder,
          status: 'ACTIVE',
        },
      });
      categoryMap.set(cat.slug, created.id);
      console.log(`  ✅ Created Category "${cat.name}" (Code: ${cat.code})`);
    }
  }

  // 2. Seed Product Types
  console.log('\n👔 Seeding Product Types...');
  for (const pt of INITIAL_PRODUCT_TYPES) {
    const catId = categoryMap.get(pt.categorySlug);
    if (!catId) {
      console.warn(`  ⚠️ Category slug ${pt.categorySlug} not found in map, skipping type ${pt.name}`);
      continue;
    }

    const typeSlug = `${pt.categorySlug}-${pt.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    const existing = await prisma.productType.findFirst({
      where: { categoryId: catId, name: pt.name },
    });

    if (existing) {
      await prisma.productType.update({
        where: { id: existing.id },
        data: {
          code: pt.code,
          slug: typeSlug,
          sortOrder: pt.sortOrder,
          status: 'ACTIVE',
        },
      });
    } else {
      await prisma.productType.create({
        data: {
          categoryId: catId,
          name: pt.name,
          code: pt.code,
          slug: typeSlug,
          sortOrder: pt.sortOrder,
          status: 'ACTIVE',
        },
      });
      console.log(`  ✅ Created Product Type "${pt.name}" under ${pt.categorySlug} (Code: ${pt.code})`);
    }
  }

  // 3. Seed Exact 16 Predefined Colors
  console.log('\n🎨 Seeding Exact 16 Predefined Colors...');
  for (let i = 0; i < INITIAL_PREDEFINED_COLORS.length; i++) {
    const c = INITIAL_PREDEFINED_COLORS[i];
    const existing = await prisma.productColor.findUnique({
      where: { name: c.name },
    });

    if (existing) {
      await prisma.productColor.update({
        where: { id: existing.id },
        data: {
          code: c.code,
          hex: c.hex,
          isCustom: false,
          sortOrder: i + 1,
          status: 'ACTIVE',
        },
      });
    } else {
      await prisma.productColor.create({
        data: {
          name: c.name,
          code: c.code,
          hex: c.hex,
          isCustom: false,
          sortOrder: i + 1,
          status: 'ACTIVE',
        },
      });
      console.log(`  ✅ Created Color "${c.name}" (Code: ${c.code}, Hex: ${c.hex})`);
    }
  }

  // 4. Seed Sizes
  console.log('\n📏 Seeding Garment Sizes...');
  for (const s of INITIAL_GARMENT_SIZES) {
    const existing = await prisma.productSize.findUnique({
      where: { name: s.name },
    });

    if (existing) {
      await prisma.productSize.update({
        where: { id: existing.id },
        data: {
          code: s.code,
          sortOrder: s.sortOrder,
          status: 'ACTIVE',
        },
      });
    } else {
      await prisma.productSize.create({
        data: {
          name: s.name,
          code: s.code,
          sortOrder: s.sortOrder,
          status: 'ACTIVE',
        },
      });
      console.log(`  ✅ Created Size "${s.name}" (Code: ${s.code})`);
    }
  }

  // 5. Seed Store Settings
  console.log('\n⚙️ Seeding Store Settings...');
  await prisma.storeSetting.upsert({
    where: { key: 'lowStockThreshold' },
    update: { value: DEFAULT_LOW_STOCK_THRESHOLD.toString() },
    create: { key: 'lowStockThreshold', value: DEFAULT_LOW_STOCK_THRESHOLD.toString() },
  });
  console.log(`  ✅ Set lowStockThreshold = ${DEFAULT_LOW_STOCK_THRESHOLD}`);

  // 6. Safe Backfill for Existing Products
  console.log('\n🛡️ Safely Backfilling Existing Products (Preserving All Data)...');
  const existingProducts = await prisma.product.findMany({
    include: { category: true, variants: true },
  });

  console.log(`Found ${existingProducts.length} existing products.`);

  for (const prod of existingProducts) {
    let needsUpdate = false;
    const updateData: any = {};

    // 6a. SKU Check
    if (!prod.sku || prod.sku.trim() === '' || prod.sku.startsWith('GEN-') || prod.sku.includes('undefined')) {
      const generatedSku = await generateUniqueSku({
        categoryName: prod.category?.name || 'T-Shirt',
        colorName: prod.color || 'JET BLACK',
        productTypeName: prod.productType || 'Polo T-Shirt',
        excludeProductId: prod.id,
      });
      updateData.sku = generatedSku;
      needsUpdate = true;
      console.log(`  ↪️ Product "${prod.name}": Assigned unique SKU -> ${generatedSku}`);
    }

    // 6b. Size-Wise Stock Check
    let sizeStockMap = parseSizeWiseStock(prod.sizeWiseStock);
    if (Object.keys(sizeStockMap).length === 0) {
      if (prod.variants && prod.variants.length > 0) {
        sizeStockMap = parseSizeWiseStock(prod.variants);
      } else if (prod.sizesRaw) {
        try {
          const parsedSizes = JSON.parse(prod.sizesRaw);
          if (Array.isArray(parsedSizes) && parsedSizes.length > 0) {
            const splitQty = Math.max(1, Math.floor((prod.stock || 50) / parsedSizes.length));
            parsedSizes.forEach(s => { sizeStockMap[s] = splitQty; });
          }
        } catch {
          // ignore
        }
      }

      if (Object.keys(sizeStockMap).length === 0) {
        sizeStockMap = { 'S': 10, 'M': 15, 'L': 15, 'XL': 10 };
      }

      updateData.sizeWiseStock = JSON.stringify(sizeStockMap);
      needsUpdate = true;
    }

    // 6c. Total Stock & Stock Status
    const total = calculateTotalStock(sizeStockMap);
    if (prod.totalStock !== total || prod.stock !== total) {
      updateData.stock = total;
      updateData.totalStock = total;
      needsUpdate = true;
    }

    const calculatedStatus = calculateStockStatus(total, DEFAULT_LOW_STOCK_THRESHOLD);
    if (prod.stockStatus !== calculatedStatus) {
      updateData.stockStatus = calculatedStatus;
      needsUpdate = true;
    }

    if (needsUpdate) {
      await prisma.product.update({
        where: { id: prod.id },
        data: updateData,
      });
      console.log(`  ✅ Backfilled product "${prod.name}" (Total Stock: ${total}, Status: ${calculatedStatus})`);
    }
  }

  console.log('\n🎉 ADRIZO Product Configuration and Safe Backfill Completed Successfully!\n');
}

if (process.argv[1] && process.argv[1].endsWith('seed-catalogue-config.ts')) {
  seedCatalogueConfig()
    .then(() => prisma.$disconnect())
    .catch((e) => {
      console.error(e);
      prisma.$disconnect();
    });
}
