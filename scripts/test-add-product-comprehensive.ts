import { prisma } from '../src/lib/prisma';
import { SignJWT } from 'jose';
import { validatePricing } from '../src/lib/pricing';
import { calculateTotalStock, calculateStockStatus } from '../src/lib/inventory';
import { resolveColorCode, resolveProductTypeCode } from '../src/lib/sku';

async function main() {
  console.log('🚀 Running Comprehensive Add Product End-to-End Test...\n');

  // 1. Fetch category
  const category = await prisma.category.findFirst({ where: { slug: 't-shirts' } });
  if (!category) {
    throw new Error('T-Shirts category not found');
  }

  // 2. Prepare product creation payload matching exact schema
  const name = 'Emerald Green Luxury Zipper Polo';
  const slug = `emerald-green-luxury-zipper-polo-${Date.now()}`;
  const description = 'Crafted from luxury Matty Lycra with sleek metallic zipper and tailored fit.';
  const price = 999;
  const originalPrice = 1999;
  const productType = 'Zipper Polo T-Shirt';
  const productTypeCode = resolveProductTypeCode(productType);
  const color = 'BOTTLE GREEN';
  const colorCode = resolveColorCode(color);
  const sku = `TSH-BGR-ZP-${Math.floor(1000 + Math.random() * 9000)}`;
  const sizeWiseStock = { 'S': 15, 'M': 28, 'L': 35, 'XL': 22, 'XXL': 10 };
  const totalStock = calculateTotalStock(sizeWiseStock);
  const stockStatus = calculateStockStatus(totalStock, 10);

  const imagesData = [
    { url: 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?auto=format&fit=crop&q=80&w=800', isPrimary: true, sortOrder: 0, altText: 'Front View' },
    { url: 'https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?auto=format&fit=crop&q=80&w=800', isPrimary: false, sortOrder: 1, altText: 'Side View' }
  ];

  const variantsData = Object.entries(sizeWiseStock).map(([sizeKey, sizeStock]) => ({
    size: sizeKey,
    color: color,
    sku: sku,
    stock: sizeStock,
    priceAdjustment: 0
  }));

  console.log('Executing prisma.product.create() with verified schema payload (NO productTypeId)...');

  const createdProduct = await prisma.product.create({
    data: {
      name,
      slug,
      description,
      price,
      salePrice: null,
      originalPrice,
      productType,
      color,
      sku,
      stock: totalStock,
      sizeWiseStock: JSON.stringify(sizeWiseStock),
      stockStatus,
      status: 'ACTIVE',
      featured: true,
      newArrival: true,
      onSale: true,
      showSizeChart: true,
      sizeFit: 'Slim tapered fit. True to size.',
      washCare: 'Machine wash cold. Do not bleach.',
      freeShippingText: 'Free shipping across India.',
      deliveryText: 'Estimated delivery within 2-4 business days.',
      returnPolicyText: '7-day doorstep return and exchange.',
      colorsRaw: JSON.stringify([color]),
      sizesRaw: JSON.stringify(['S', 'M', 'L', 'XL', 'XXL']),
      category: { connect: { id: category.id } },
      images: {
        create: imagesData.map(img => ({
          url: img.url,
          isPrimary: img.isPrimary,
          sortOrder: img.sortOrder,
          altText: img.altText
        }))
      },
      variants: {
        create: variantsData.map((v) => ({
          size: v.size,
          color: v.color,
          sku: `${sku}-${v.size}`,
          stock: v.stock,
          priceAdjustment: v.priceAdjustment
        }))
      }
    },
    include: {
      category: true,
      images: { orderBy: { sortOrder: 'asc' } },
      variants: true
    }
  });

  console.log('✅ PASSED: prisma.product.create() succeeded with 0 errors!');
  console.log(`   - ID: ${createdProduct.id}`);
  console.log(`   - Name: ${createdProduct.name}`);
  console.log(`   - SKU: ${createdProduct.sku}`);
  console.log(`   - Product Type: ${createdProduct.productType}`);
  console.log(`   - Category: ${createdProduct.category?.name}`);
  console.log(`   - Images count: ${createdProduct.images.length}`);
  console.log(`   - Variants count: ${createdProduct.variants.length}`);
  console.log(`   - Total Stock: ${createdProduct.stock}`);

  // 3. Verify storefront query
  const storefrontProduct = await prisma.product.findFirst({
    where: {
      OR: [{ id: createdProduct.id }, { slug: createdProduct.slug }],
      status: 'ACTIVE'
    },
    include: { category: true, images: true, variants: true }
  });

  if (!storefrontProduct) {
    throw new Error('Storefront query failed to find active product');
  }
  console.log('✅ PASSED: Storefront lookup (by ID and slug) returned complete product.');

  // 4. Test deletion
  console.log('\nCleaning up test product...');
  await prisma.productImage.deleteMany({ where: { productId: createdProduct.id } });
  await prisma.productVariant.deleteMany({ where: { productId: createdProduct.id } });
  await prisma.product.delete({ where: { id: createdProduct.id } });

  const checkDeleted = await prisma.product.findUnique({ where: { id: createdProduct.id } });
  if (checkDeleted) throw new Error('Product was not deleted');
  console.log('✅ PASSED: Product permanently deleted from database.');

  console.log('\n🎉 ALL CREATION AND PERSISTENCE TESTS PASSED FLAWLESSLY!');
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
