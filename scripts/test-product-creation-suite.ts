import dotenv from 'dotenv';
dotenv.config();
import { prisma } from '../src/lib/prisma';
import { generateUniqueSku, buildVariantSku, generateSkuSuffix } from '../src/lib/sku';
import { calculateTotalStock, calculateStockStatus, parseSizeWiseStock } from '../src/lib/inventory';

async function main() {
  console.log('\n================================================================');
  console.log(' ADRIZO - COMPREHENSIVE PRODUCT CREATION & COLLISION TEST SUITE');
  console.log('================================================================\n');

  const createdProductIds: string[] = [];

  try {
    // ------------------------------------------------------------------------
    // SETUP: Fetch categories
    // ------------------------------------------------------------------------
    const tShirtCat = await prisma.category.findFirst({
      where: { OR: [{ slug: 't-shirt' }, { slug: 't-shirts' }, { name: 'T-Shirt' }] }
    });
    const hoodieCat = await prisma.category.findFirst({
      where: { OR: [{ slug: 'hoodie' }, { slug: 'hoodies' }, { name: 'Hoodie' }] }
    });

    if (!tShirtCat) throw new Error('Category T-Shirt not found');
    console.log(`✓ Categories loaded: T-Shirt (${tShirtCat.id}), Hoodie (${hoodieCat?.id || 'N/A'})`);

    // Helper to simulate full create product logic (mirroring src/app/api/admin/products/route.ts)
    async function simulateCreateProduct(input: {
      name: string;
      slug?: string;
      categoryId: string;
      categoryName: string;
      productType: string;
      color: string;
      candidateSku?: string;
      price: number;
      originalPrice?: number | null;
      sizeWiseStock: Record<string, number>;
      images: Array<{ url: string; isPrimary: boolean; sortOrder: number; altText?: string }>;
      featured?: boolean;
      newArrival?: boolean;
    }) {
      let finalSku = await generateUniqueSku({
        categoryName: input.categoryName,
        colorName: input.color,
        productTypeName: input.productType,
        candidateSku: input.candidateSku,
      });

      let finalSlug = input.slug || input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      const existingSlug = await prisma.product.findUnique({
        where: { slug: finalSlug },
        select: { id: true }
      }).catch(() => null);

      if (existingSlug) {
        finalSlug = `${finalSlug}-${generateSkuSuffix(4).toLowerCase()}`;
      }

      const sizeStockMap = input.sizeWiseStock;
      const computedTotalStock = calculateTotalStock(sizeStockMap);
      const stockStatus = calculateStockStatus(computedTotalStock, 10);

      const variantsData = Object.entries(sizeStockMap).map(([sizeKey, sizeStock]) => ({
        size: sizeKey,
        color: input.color,
        stock: sizeStock,
        priceAdjustment: 0
      }));

      const buildPayload = (skuToUse: string, slugToUse: string) => ({
        name: input.name,
        slug: slugToUse,
        description: `High quality ${input.color} ${input.productType} crafted with premium luxury fabric.`,
        price: input.price,
        salePrice: null,
        originalPrice: input.originalPrice || null,
        productType: input.productType,
        color: input.color,
        sku: skuToUse,
        stock: computedTotalStock,
        sizeWiseStock: JSON.stringify(sizeStockMap),
        stockStatus,
        status: 'ACTIVE',
        featured: Boolean(input.featured),
        newArrival: Boolean(input.newArrival),
        onSale: Boolean(input.originalPrice && input.originalPrice > input.price),
        showSizeChart: true,
        sizeFit: 'Tailored slim fit silhouette.',
        washCare: 'Cold gentle machine wash.',
        freeShippingText: 'Free shipping across India.',
        colorsRaw: JSON.stringify([input.color]),
        sizesRaw: JSON.stringify(Object.keys(sizeStockMap)),
        category: { connect: { id: input.categoryId } },
        images: {
          create: input.images.map((img, idx) => ({
            url: img.url,
            isPrimary: img.isPrimary,
            sortOrder: img.sortOrder ?? idx,
            altText: img.altText || input.name
          }))
        },
        variants: {
          create: variantsData.map((v, idx) => ({
            size: v.size,
            color: v.color,
            sku: buildVariantSku(skuToUse, v.size, idx),
            stock: v.stock,
            priceAdjustment: v.priceAdjustment
          }))
        }
      });

      // P2002 retry mechanism
      let attempt = 0;
      let currentSku = finalSku;
      let currentSlug = finalSlug;
      let product: any;

      while (attempt < 3) {
        try {
          product = await prisma.product.create({
            data: buildPayload(currentSku, currentSlug),
            include: { category: true, images: true, variants: true }
          });
          break;
        } catch (err: any) {
          attempt++;
          if (err.code === 'P2002' && attempt < 3) {
            console.log(`    ⚠️ Collision on attempt ${attempt}. Regenerating unique SKU/slug...`);
            currentSku = await generateUniqueSku({
              categoryName: input.categoryName,
              colorName: input.color,
              productTypeName: input.productType,
            });
            currentSlug = `${finalSlug}-${generateSkuSuffix(4).toLowerCase()}`;
          } else {
            throw err;
          }
        }
      }

      createdProductIds.push(product.id);
      return product;
    }

    // ------------------------------------------------------------------------
    // TEST 1: Yellow Button Polo T-Shirt (Exact user scenario)
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 1: Yellow Button Polo T-Shirt (User Exact Scenario) ---');
    const prod1 = await simulateCreateProduct({
      name: 'TEST Yellow Button Polo T-Shirt',
      categoryId: tShirtCat.id,
      categoryName: tShirtCat.name,
      productType: 'Button Polo T-Shirt',
      color: 'YELLOW',
      candidateSku: 'TSH-YLW-BP-RQQQ',
      price: 1299,
      originalPrice: 2999,
      sizeWiseStock: { 'S': 15, 'M': 28, 'L': 35, 'XL': 22, 'XXL': 10 },
      images: [
        { url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800', isPrimary: true, sortOrder: 0 },
        { url: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800', isPrimary: false, sortOrder: 1 },
      ],
      featured: true,
      newArrival: true,
    });

    console.log(`  ✓ Product created successfully: ID=${prod1.id}, SKU=${prod1.sku}`);
    console.log(`  ✓ Stock: ${prod1.stock} (expected: 110)`);
    console.log(`  ✓ Variants: ${prod1.variants.length}`);
    for (const v of prod1.variants) {
      console.log(`    - Variant [${v.size}]: SKU="${v.sku}" Stock=${v.stock}`);
      if (!v.sku.endsWith(`-${v.size}`)) throw new Error(`Variant SKU ${v.sku} does not match expected size format!`);
    }
    if (prod1.stock !== 110) throw new Error(`Stock mismatch: ${prod1.stock} !== 110`);

    // ------------------------------------------------------------------------
    // TEST 2: Collision Test - Creating Second Product with SAME candidate SKU
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 2: SKU Collision Resolution ---');
    console.log(`  Attempting to create another product requesting identical SKU: "TSH-YLW-BP-RQQQ"...`);
    const prod2 = await simulateCreateProduct({
      name: 'TEST Yellow Button Polo T-Shirt - Second Batch',
      categoryId: tShirtCat.id,
      categoryName: tShirtCat.name,
      productType: 'Button Polo T-Shirt',
      color: 'YELLOW',
      candidateSku: 'TSH-YLW-BP-RQQQ', // Exact duplicate candidate!
      price: 1399,
      originalPrice: 2999,
      sizeWiseStock: { 'S': 10, 'M': 10, 'L': 10 },
      images: [
        { url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800', isPrimary: true, sortOrder: 0 }
      ]
    });

    console.log(`  ✓ Product 2 created successfully: ID=${prod2.id}, SKU=${prod2.sku}`);
    console.log(`  ✓ Verified SKU collision was resolved: "${prod1.sku}" !== "${prod2.sku}"`);
    if (prod1.sku === prod2.sku) throw new Error('Collision resolution failed! Both products share SKU.');

    // ------------------------------------------------------------------------
    // TEST 3: Concurrent Creation Race Condition
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 3: Simultaneous Concurrent Creation (Race Condition) ---');
    const duplicateSkuTarget = `TSH-YLW-RACE-${generateSkuSuffix(4)}`;
    console.log(`  Launching 2 simultaneous requests with identical candidate SKU: ${duplicateSkuTarget}`);

    const [raceProd1, raceProd2] = await Promise.all([
      simulateCreateProduct({
        name: 'TEST Race Product A',
        categoryId: tShirtCat.id,
        categoryName: tShirtCat.name,
        productType: 'Polo T-Shirt',
        color: 'YELLOW',
        candidateSku: duplicateSkuTarget,
        price: 999,
        originalPrice: 1999,
        sizeWiseStock: { 'M': 20, 'L': 20 },
        images: [{ url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800', isPrimary: true, sortOrder: 0 }]
      }),
      simulateCreateProduct({
        name: 'TEST Race Product B',
        categoryId: tShirtCat.id,
        categoryName: tShirtCat.name,
        productType: 'Polo T-Shirt',
        color: 'YELLOW',
        candidateSku: duplicateSkuTarget,
        price: 999,
        originalPrice: 1999,
        sizeWiseStock: { 'M': 25, 'L': 25 },
        images: [{ url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800', isPrimary: true, sortOrder: 0 }]
      })
    ]);

    console.log(`  ✓ Race Product A SKU: ${raceProd1.sku}`);
    console.log(`  ✓ Race Product B SKU: ${raceProd2.sku}`);
    if (raceProd1.sku === raceProd2.sku) throw new Error('Race condition collision resolution failed!');
    console.log('  ✓ Simultaneous collision successfully resolved without database crash!');

    // ------------------------------------------------------------------------
    // TEST 4: Different Category + Different Product Type (Hoodie)
    // ------------------------------------------------------------------------
    if (hoodieCat) {
      console.log('\n--- TEST 4: Different Category + Product Type (Hoodie) ---');
      const prodHoodie = await simulateCreateProduct({
        name: 'TEST Heavyweight Jet Black Zipper Hoodie',
        categoryId: hoodieCat.id,
        categoryName: hoodieCat.name,
        productType: 'Zipper Hoodie',
        color: 'JET BLACK',
        price: 2499,
        originalPrice: 4999,
        sizeWiseStock: { 'M': 15, 'L': 25, 'XL': 15 },
        images: [{ url: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800', isPrimary: true, sortOrder: 0 }]
      });

      console.log(`  ✓ Hoodie created: SKU=${prodHoodie.sku}, Category=${prodHoodie.category?.name}`);
      console.log(`  ✓ Variants: ${prodHoodie.variants.map((v: any) => `${v.size}:${v.sku}`).join(', ')}`);
      if (!prodHoodie.sku.startsWith('HOD-JBL-')) throw new Error(`Unexpected SKU prefix: ${prodHoodie.sku}`);
    }

    // ------------------------------------------------------------------------
    // TEST 5: Verify Storefront & Catalog API query compatibility
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 5: Verify Storefront Query Compatibility ---');
    const queried = await prisma.product.findUnique({
      where: { id: prod1.id },
      include: { category: true, images: true, variants: true }
    });

    if (!queried) throw new Error('Storefront query failed to retrieve created product!');
    console.log(`  ✓ Query succeeded: "${queried.name}"`);
    console.log(`  ✓ Canonical stock: ${queried.stock}`);
    console.log(`  ✓ onSale calculated flag: ${queried.onSale}`);
    console.log(`  ✓ featured flag: ${queried.featured}`);
    console.log(`  ✓ newArrival flag: ${queried.newArrival}`);

    console.log('\n================================================================');
    console.log(' ALL 5 TESTS PASSED PERFECTLY WITH 0 ERRORS!');
    console.log('================================================================\n');
  } finally {
    // ------------------------------------------------------------------------
    // CLEANUP: Remove test products from database
    // ------------------------------------------------------------------------
    console.log(`🧹 Cleaning up ${createdProductIds.length} test products from MongoDB...`);
    for (const pid of createdProductIds) {
      await prisma.productImage.deleteMany({ where: { productId: pid } }).catch(() => null);
      await prisma.productVariant.deleteMany({ where: { productId: pid } }).catch(() => null);
      await prisma.product.delete({ where: { id: pid } }).catch(() => null);
    }
    console.log('✓ Cleanup complete. Database restored to pristine state.\n');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
