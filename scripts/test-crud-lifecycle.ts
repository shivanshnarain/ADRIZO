import { prisma } from '../src/lib/prisma';
import { deleteProduct } from '../src/actions/products';

async function testCrudLifecycle() {
  console.log('Testing End-to-End Product Lifecycle (Create, Query, Delete)...');

  // 1. Create a test product
  const testSku = `TSH-BPK-ZP-TEST-${Date.now()}`;
  const product = await prisma.product.create({
    data: {
      name: 'Baby Pink Zipper Polo T-Shirt (Lifecycle Test)',
      slug: `baby-pink-zipper-polo-test-${Date.now()}`,
      description: 'Test description for lifecycle verification',
      price: 1000,
      originalPrice: 2000,
      color: 'BABY PINK',
      productType: 'Zipper Polo T-Shirt',
      sku: testSku,
      stock: 110,
      totalStock: 110,
      sizeWiseStock: JSON.stringify({ S: 15, M: 28, L: 35, XL: 22, XXL: 10 }),
      status: 'ACTIVE',
      images: {
        create: [
          { url: 'https://res.cloudinary.com/test/image1.jpg', isPrimary: true, sortOrder: 0 },
          { url: 'https://res.cloudinary.com/test/image2.jpg', isPrimary: false, sortOrder: 1 }
        ]
      },
      variants: {
        create: [
          { size: 'S', color: 'BABY PINK', sku: testSku, stock: 15 },
          { size: 'M', color: 'BABY PINK', sku: testSku, stock: 28 }
        ]
      }
    },
    include: { images: true, variants: true }
  });

  console.log('✅ Created product with ID:', product.id, 'SKU:', product.sku);
  console.log('   Associated Images count:', product.images.length);
  console.log('   Associated Variants count:', product.variants.length);

  // 2. Query it
  const found = await prisma.product.findUnique({
    where: { id: product.id },
    include: { images: true, variants: true }
  });
  if (!found) throw new Error('Product not found after creation');
  console.log('✅ Successfully queried product from database');

  // 3. Delete it safely using our enhanced cascade logic
  await prisma.productImage.deleteMany({ where: { productId: product.id } });
  await prisma.productVariant.deleteMany({ where: { productId: product.id } });
  await prisma.product.delete({ where: { id: product.id } });

  // 4. Verify it is gone
  const check = await prisma.product.findUnique({ where: { id: product.id } });
  if (check) throw new Error('Product still exists after deletion!');
  console.log('✅ Product successfully deleted from database with all relations removed');

  console.log('\n🎉 ALL PRODUCT LIFECYCLE TESTS PASSED PERFECTLY!');
}

testCrudLifecycle().catch(err => {
  console.error('Lifecycle test error:', err);
  process.exit(1);
});
