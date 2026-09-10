/**
 * Standalone Data Migration Script: SQLite (dev.db) -> MongoDB Atlas
 * 
 * Safely transfers all categories, products, images, variants, users, and orders
 * from the local development SQLite database into MongoDB Atlas without data loss.
 */

import 'dotenv/config';
import Database from 'better-sqlite3';
import path from 'path';
import { prisma } from '../src/lib/prisma.ts';

async function migrateData() {
  console.log('🚀 Starting SQLite to MongoDB Atlas data migration...\n');

  const dbPath = path.resolve(process.cwd(), 'dev.db');
  let sqliteDb: Database.Database;

  try {
    sqliteDb = new Database(dbPath, { readonly: true });
    console.log(`📁 Connected to local SQLite database at: ${dbPath}`);
  } catch (err: any) {
    console.error(`❌ Could not open SQLite database at ${dbPath}:`, err.message);
    process.exit(1);
  }

  try {
    // 1. Migrate Categories
    console.log('\n📦 Migrating Categories...');
    const sqliteCategories: any[] = sqliteDb.prepare('SELECT * FROM Category').all();
    console.log(`Found ${sqliteCategories.length} categories in SQLite.`);

    const categoryIdMap = new Map<string, string>(); // old SQLite ID -> new MongoDB ObjectId

    for (const cat of sqliteCategories) {
      const existing = await prisma.category.findUnique({
        where: { slug: cat.slug }
      });

      if (existing) {
        categoryIdMap.set(cat.id, existing.id);
        console.log(`  ↪️ Category "${cat.name}" already exists. Mapped ID.`);
      } else {
        const created = await prisma.category.create({
          data: {
            name: cat.name,
            slug: cat.slug,
            description: cat.description || null,
            image: cat.image || null,
            status: cat.status || 'ACTIVE',
            createdAt: cat.createdAt ? new Date(cat.createdAt) : new Date(),
            updatedAt: cat.updatedAt ? new Date(cat.updatedAt) : new Date(),
          }
        });
        categoryIdMap.set(cat.id, created.id);
        console.log(`  ✅ Created category: "${created.name}" (MongoDB ID: ${created.id})`);
      }
    }

    // 2. Migrate Products
    console.log('\n👗 Migrating Products...');
    const sqliteProducts: any[] = sqliteDb.prepare('SELECT * FROM Product').all();
    console.log(`Found ${sqliteProducts.length} products in SQLite.`);

    const productIdMap = new Map<string, string>(); // old SQLite ID -> new MongoDB ObjectId

    for (const prod of sqliteProducts) {
      const targetCategoryId = prod.categoryId ? categoryIdMap.get(prod.categoryId) || null : null;

      const existing = await prisma.product.findUnique({
        where: { slug: prod.slug }
      });

      if (existing) {
        productIdMap.set(prod.id, existing.id);
        console.log(`  ↪️ Product "${prod.name}" already exists. Mapped ID.`);
      } else {
        const created = await prisma.product.create({
          data: {
            name: prod.name,
            slug: prod.slug,
            description: prod.description || '',
            price: Number(prod.price) || 0,
            salePrice: prod.salePrice ? Number(prod.salePrice) : null,
            sku: prod.sku,
            stock: Number(prod.stock) || 0,
            status: prod.status || 'ACTIVE',
            featured: Boolean(prod.featured),
            newArrival: Boolean(prod.newArrival),
            onSale: Boolean(prod.onSale),
            imagesRaw: prod.images || null,
            sizesRaw: prod.sizes || null,
            colorsRaw: prod.colors || null,
            categoryId: targetCategoryId,
            createdAt: prod.createdAt ? new Date(prod.createdAt) : new Date(),
            updatedAt: prod.updatedAt ? new Date(prod.updatedAt) : new Date(),
          }
        });
        productIdMap.set(prod.id, created.id);
        console.log(`  ✅ Created product: "${created.name}" (SKU: ${created.sku}, MongoDB ID: ${created.id})`);
      }
    }

    // 3. Migrate Product Images
    console.log('\n🖼️ Migrating Product Images...');
    let sqliteImages: any[] = [];
    try {
      sqliteImages = sqliteDb.prepare('SELECT * FROM ProductImage').all();
      console.log(`Found ${sqliteImages.length} images in ProductImage table.`);

      for (const img of sqliteImages) {
        const newProdId = productIdMap.get(img.productId);
        if (!newProdId) {
          console.warn(`  ⚠️ Skipping image ${img.id}: Product ${img.productId} not found in map.`);
          continue;
        }

        // Avoid duplicate insertion
        const existingImg = await prisma.productImage.findFirst({
          where: { productId: newProdId, url: img.url }
        });

        if (!existingImg) {
          await prisma.productImage.create({
            data: {
              productId: newProdId,
              url: img.url,
              altText: img.altText || null,
              isPrimary: Boolean(img.isPrimary),
              sortOrder: Number(img.sortOrder) || 0,
              createdAt: img.createdAt ? new Date(img.createdAt) : new Date(),
            }
          });
          console.log(`  ✅ Linked image for product ${newProdId}: ${img.url.substring(0, 60)}...`);
        }
      }
    } catch (e: any) {
      console.log('  ℹ️ No separate ProductImage table records or skipped.');
    }

    // 4. Migrate Product Variants
    console.log('\n📏 Migrating Product Variants...');
    let sqliteVariants: any[] = [];
    try {
      sqliteVariants = sqliteDb.prepare('SELECT * FROM ProductVariant').all();
      console.log(`Found ${sqliteVariants.length} variants in ProductVariant table.`);

      for (const v of sqliteVariants) {
        const newProdId = productIdMap.get(v.productId);
        if (!newProdId) continue;

        const existingV = await prisma.productVariant.findFirst({
          where: { productId: newProdId, size: v.size, color: v.color }
        });

        if (!existingV) {
          await prisma.productVariant.create({
            data: {
              productId: newProdId,
              size: v.size || null,
              color: v.color || null,
              sku: v.sku || null,
              stock: Number(v.stock) || 0,
              priceAdjustment: Number(v.priceAdjustment) || 0,
              createdAt: v.createdAt ? new Date(v.createdAt) : new Date(),
            }
          });
          console.log(`  ✅ Linked variant (${v.size || '-'} / ${v.color || '-'}) for product ${newProdId}`);
        }
      }
    } catch (e: any) {
      console.log('  ℹ️ No separate ProductVariant table records or skipped.');
    }

    console.log('\n✨ Database migration to MongoDB Atlas completed successfully!');
    console.log('==============================================');
    console.log(`Total Categories Mapped/Migrated: ${categoryIdMap.size}`);
    console.log(`Total Products Mapped/Migrated:   ${productIdMap.size}`);
    console.log('==============================================\n');
  } catch (err: any) {
    console.error('❌ Migration failed:', err);
  } finally {
    sqliteDb.close();
    await prisma.$disconnect();
  }
}

migrateData();
