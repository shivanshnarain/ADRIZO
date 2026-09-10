import { prisma } from '../src/lib/prisma';
import { calculateDiscountPercentage } from '../src/lib/pricing';

function assert(condition: boolean, msg: string, data?: any) {
  if (!condition) {
    console.error(`❌ FAILED: ${msg}`, data ? JSON.stringify(data) : '');
    throw new Error(`Assertion failed: ${msg}`);
  }
  console.log(`✅ PASSED: ${msg}`);
}

async function runSyncVerification() {
  console.log('🔄 STARTING ADMIN -> STOREFRONT PRODUCT SYNC VERIFICATION...\n');

  // Step 1: Find or resolve an active category
  let category = await prisma.category.findFirst({ where: { status: 'ACTIVE' } });
  if (!category) {
    category = await prisma.category.create({
      data: {
        name: 'T-Shirts',
        slug: 't-shirts',
        code: 'TSH',
        status: 'ACTIVE'
      }
    });
  }
  console.log(`Using Category: ${category.name} (${category.id})`);

  const uniqueSuffix = `SYNC-${Date.now()}`;
  const initialName = `Test Sync Polo ${uniqueSuffix}`;
  const initialSlug = `test-sync-polo-${uniqueSuffix.toLowerCase()}`;
  const initialSku = `TSH-BPK-ZP-${uniqueSuffix}`;

  // Step 2: Create product in DB (simulating Admin Add Product)
  console.log('\n--- Step 1: Admin Creates Product with Default MRP ₹1,999 & Selling ₹999 ---');
  const created = await prisma.product.create({
    data: {
      name: initialName,
      slug: initialSlug,
      description: 'Admin created product test description with luxury finish.',
      price: 999,
      originalPrice: 1999,
      productType: 'Zipper Polo T-Shirt',
      color: 'BABY PINK',
      sku: initialSku,
      status: 'ACTIVE',
      stock: 110,
      totalStock: 110,
      sizeWiseStock: JSON.stringify({ S: 15, M: 28, L: 35, XL: 22, XXL: 10 }),
      stockStatus: 'IN_STOCK',
      washCare: 'Cold machine wash.',
      freeShippingText: 'Free shipping on all orders.',
      deliveryText: '2–5 days delivery.',
      returnPolicyText: '7 days return policy.',
      categoryId: category.id,
      images: {
        create: [
          { url: 'https://res.cloudinary.com/demo/image/upload/sample.jpg', isPrimary: true, sortOrder: 0, altText: initialName }
        ]
      },
      variants: {
        create: [
          { size: 'S', color: 'BABY PINK', sku: initialSku, stock: 15 },
          { size: 'M', color: 'BABY PINK', sku: initialSku, stock: 28 },
          { size: 'L', color: 'BABY PINK', sku: initialSku, stock: 35 },
          { size: 'XL', color: 'BABY PINK', sku: initialSku, stock: 22 },
          { size: 'XXL', color: 'BABY PINK', sku: initialSku, stock: 10 },
        ]
      }
    },
    include: {
      category: true,
      images: true,
      variants: true
    }
  });

  assert(Boolean(created.id), 'Product created successfully with MongoDB ObjectId', { id: created.id });
  assert(created.price === 999 && created.originalPrice === 1999, 'Product has default MRP ₹1,999 and Selling Price ₹999');
  
  const discount = calculateDiscountPercentage(created.originalPrice, created.price);
  assert(discount === 50, 'Discount calculates to 50% OFF');
  assert((created.originalPrice! - created.price) === 1000, 'Savings calculate to ₹1,000');

  // Step 3: Customer Storefront Query Simulation (Home & Shop)
  console.log('\n--- Step 2: Customer Storefront Query (Home & Shop) ---');
  const storefrontProducts = await prisma.product.findMany({
    where: { status: 'ACTIVE' },
    include: { category: true, images: true, variants: true }
  });
  const foundInShop = storefrontProducts.find(p => p.id === created.id);
  assert(Boolean(foundInShop), 'Newly created active product immediately appears on customer storefront query', {
    id: foundInShop?.id,
    name: foundInShop?.name
  });

  // Step 4: Customer Product Detail Query Simulation (by ID and by Slug)
  console.log('\n--- Step 3: Customer Storefront Product Detail Query ---');
  // Query by ID
  const queryById = await prisma.product.findFirst({
    where: { OR: [{ id: created.id }, { slug: created.id }] },
    include: { category: true, images: true, variants: true }
  });
  assert(queryById?.id === created.id, 'Product Detail page successfully loads by ID');

  // Safe Query by Slug (without ObjectId crash)
  const isObjectId = /^[0-9a-fA-F]{24}$/.test(created.slug);
  const whereSlugClause = isObjectId ? { OR: [{ id: created.slug }, { slug: created.slug }] } : { slug: created.slug };
  const queryBySlug = await prisma.product.findFirst({
    where: whereSlugClause,
    include: { category: true, images: true, variants: true }
  });
  assert(queryBySlug?.id === created.id, 'Product Detail page safely loads by Slug');

  // Step 5: Admin Updates Product (Editing details)
  console.log('\n--- Step 4: Admin Updates Product Properties ---');
  const updatedName = `Updated ${initialName}`;
  const updatedPrice = 1199;
  const updatedOriginalPrice = 2499;

  await prisma.$transaction([
    prisma.productImage.deleteMany({ where: { productId: created.id } }),
    prisma.productVariant.deleteMany({ where: { productId: created.id } }),
    prisma.product.update({
      where: { id: created.id },
      data: {
        name: updatedName,
        price: updatedPrice,
        originalPrice: updatedOriginalPrice,
        images: {
          create: [{ url: 'https://res.cloudinary.com/demo/image/upload/updated.jpg', isPrimary: true, sortOrder: 0, altText: updatedName }]
        },
        variants: {
          create: [{ size: 'M', color: 'BABY PINK', sku: initialSku, stock: 50 }]
        }
      }
    })
  ]);

  const storefrontAfterUpdate = await prisma.product.findUnique({
    where: { id: created.id },
    include: { category: true, images: true, variants: true }
  });
  assert(storefrontAfterUpdate?.name === updatedName, 'Storefront reflects updated product name');
  assert(storefrontAfterUpdate?.price === 1199, 'Storefront reflects updated Selling Price (₹1,199)');
  assert(storefrontAfterUpdate?.originalPrice === 2499, 'Storefront reflects updated MRP (₹2,499)');

  // Step 6: Visibility Control (Toggle to INACTIVE)
  console.log('\n--- Step 5: Admin Toggles Visibility to INACTIVE ---');
  await prisma.product.update({
    where: { id: created.id },
    data: { status: 'INACTIVE' }
  });

  // Admin still sees it:
  const adminProductList = await prisma.product.findMany();
  const foundInAdmin = adminProductList.find(p => p.id === created.id);
  assert(Boolean(foundInAdmin), 'Inactive product remains visible and manageable inside Admin Panel');

  // Storefront excludes it:
  const storefrontActiveOnly = await prisma.product.findMany({
    where: { status: 'ACTIVE' }
  });
  const foundInStorefrontWhenInactive = storefrontActiveOnly.find(p => p.id === created.id);
  assert(!foundInStorefrontWhenInactive, 'Inactive product is strictly HIDDEN from customer-facing storefront');

  // Step 7: Visibility Control (Toggle back to ACTIVE)
  console.log('\n--- Step 6: Admin Toggles Visibility back to ACTIVE ---');
  await prisma.product.update({
    where: { id: created.id },
    data: { status: 'ACTIVE' }
  });

  const storefrontActiveAgain = await prisma.product.findMany({
    where: { status: 'ACTIVE' }
  });
  assert(Boolean(storefrontActiveAgain.find(p => p.id === created.id)), 'Product is immediately visible again after toggling back to ACTIVE');

  // Step 8: Clean up test product
  console.log('\n--- Step 7: Cleaning up test product ---');
  await prisma.productImage.deleteMany({ where: { productId: created.id } });
  await prisma.productVariant.deleteMany({ where: { productId: created.id } });
  await prisma.product.delete({ where: { id: created.id } });
  console.log('Test product cleanly removed from database.');

  console.log('\n🎉 ALL ADMIN <-> STOREFRONT SYNC AND VISIBILITY TESTS PASSED PERFECTLY!\n');
}

runSyncVerification().catch(err => {
  console.error(err);
  process.exit(1);
}).finally(() => prisma.$disconnect());
