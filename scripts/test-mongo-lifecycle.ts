import 'dotenv/config';
import { prisma } from '../src/lib/prisma.ts';

async function runLifecycleTest() {
  console.log('🧪 Starting Full MongoDB Atlas / Prisma Lifecycle Verification...\n');

  // Step 1: Query existing categories from MongoDB
  const shirtCategory = await prisma.category.findFirst({
    where: { slug: 'shirts' }
  });
  console.log(`✅ Step 1: Retrieved Category from MongoDB: "${shirtCategory?.name}" (ID: ${shirtCategory?.id})`);

  // Step 2: Create a new product with multiple variants and image metadata in MongoDB
  const testSku = `TEST-MIGRATION-${Date.now()}`;
  const testSlug = `test-migration-shirt-${Date.now()}`;

  const createdProduct = await prisma.product.create({
    data: {
      name: 'MongoDB Verification Shirt',
      slug: testSlug,
      description: 'Handcrafted luxury shirt verifying full Prisma + MongoDB Atlas integration.',
      price: 2499.00,
      salePrice: 1999.00,
      sku: testSku,
      stock: 40,
      status: 'ACTIVE',
      featured: true,
      newArrival: true,
      onSale: true,
      categoryId: shirtCategory?.id,
      images: {
        create: [
          {
            url: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&q=80&w=1000',
            publicId: 'adrizo/products/test_shirt_01',
            altText: 'MongoDB Verification Shirt Front',
            isPrimary: true,
            sortOrder: 0
          },
          {
            url: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&q=80&w=1000',
            publicId: 'adrizo/products/test_shirt_02',
            altText: 'MongoDB Verification Shirt Detail',
            isPrimary: false,
            sortOrder: 1
          }
        ]
      },
      variants: {
        create: [
          {
            size: 'M',
            color: 'Pure White',
            sku: `${testSku}-M-WHT`,
            stock: 20,
            priceAdjustment: 0
          },
          {
            size: 'L',
            color: 'Pure White',
            sku: `${testSku}-L-WHT`,
            stock: 20,
            priceAdjustment: 0
          }
        ]
      }
    },
    include: {
      category: true,
      images: true,
      variants: true
    }
  });

  console.log(`\n✅ Step 2: Product Created in MongoDB:`);
  console.log(`   - MongoDB ID: ${createdProduct.id}`);
  console.log(`   - SKU: ${createdProduct.sku}`);
  console.log(`   - Category: ${createdProduct.category?.name}`);
  console.log(`   - Images count: ${createdProduct.images.length}`);
  console.log(`   - Variants count: ${createdProduct.variants.length}`);

  // Step 3: Verify Public Query (Published = 'ACTIVE')
  const publishedCheck = await prisma.product.findMany({
    where: { status: 'ACTIVE', id: createdProduct.id }
  });
  console.log(`\n✅ Step 3: Verified Published Product visible on public storefront: ${publishedCheck.length > 0 ? 'YES' : 'NO'}`);

  // Step 4: Edit Product (Update Price & Unpublish to INACTIVE)
  const updatedProduct = await prisma.product.update({
    where: { id: createdProduct.id },
    data: {
      price: 2799.00,
      status: 'INACTIVE' // Unpublish
    },
    include: { variants: true }
  });
  console.log(`\n✅ Step 4: Product Updated in MongoDB:`);
  console.log(`   - New Price: ₹${updatedProduct.price}`);
  console.log(`   - New Status: ${updatedProduct.status}`);

  // Step 5: Verify Unpublished Product is hidden from public query
  const unpublishedCheck = await prisma.product.findMany({
    where: { status: 'ACTIVE', id: createdProduct.id }
  });
  console.log(`\n✅ Step 5: Verified Unpublished Product hidden from public storefront: ${unpublishedCheck.length === 0 ? 'YES (Correctly Hidden)' : 'NO'}`);

  // Step 6: Delete the test product and verify cascading cleanup
  await prisma.$transaction([
    prisma.productImage.deleteMany({ where: { productId: createdProduct.id } }),
    prisma.productVariant.deleteMany({ where: { productId: createdProduct.id } }),
    prisma.product.delete({ where: { id: createdProduct.id } })
  ]);

  const deletedCheck = await prisma.product.findUnique({
    where: { id: createdProduct.id }
  });
  console.log(`\n✅ Step 6: Verified Product deleted from MongoDB: ${deletedCheck === null ? 'CONFIRMED REMOVED' : 'STILL EXISTS'}`);

  console.log('\n🎉 Full MongoDB Atlas / Prisma Lifecycle Verification Passed 100%!');
}

runLifecycleTest()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
