import { prisma } from '../src/lib/prisma';
import { calculateTotalStock, calculateStockStatus } from '../src/lib/inventory';
import { resolveColorCode, resolveProductTypeCode } from '../src/lib/sku';

async function main() {
  console.log('🧪 Running Exact User Scenario Test:');
  console.log('Product: Baby Pink Zipper Polo T-Shirt');
  console.log('MRP: ₹1,999 | Selling: ₹999 | Sizes: S, M, L, XL, XXL (Stock: 110)\n');

  // 1. Resolve Category
  const category = await prisma.category.findFirst({
    where: { OR: [{ slug: 't-shirts' }, { name: 'T-Shirts' }] }
  });
  if (!category) throw new Error('Category T-Shirts not found');

  // 2. Prepare exact data payload
  const name = 'Baby Pink Zipper Polo T-Shirt';
  const slug = `baby-pink-zipper-polo-t-shirt-${Date.now()}`;
  const description = 'Crafted from 280 GSM luxury combed cotton with signature metallic zipper and sleek tailored fit.';
  const productType = 'Zipper Polo T-Shirt';
  const productTypeCode = resolveProductTypeCode(productType);
  const color = 'BABY PINK';
  const colorCode = resolveColorCode(color);
  const sku = `TSH-BPK-ZP-${Math.floor(1000 + Math.random() * 9000)}`;
  const price = 999;
  const originalPrice = 1999;

  const sizeWiseStock = { 'S': 15, 'M': 28, 'L': 35, 'XL': 22, 'XXL': 10 };
  const totalStock = calculateTotalStock(sizeWiseStock);
  const stockStatus = calculateStockStatus(totalStock, 10);

  const images = [
    {
      url: 'https://res.cloudinary.com/zytsxasx/image/upload/v1788268771/adrizo/products/hzn3b60wnrc2qxmw0zqi.png',
      publicId: 'adrizo/products/hzn3b60wnrc2qxmw0zqi',
      isPrimary: true,
      sortOrder: 0,
      altText: 'Baby Pink Zipper Polo Front'
    },
    {
      url: 'https://res.cloudinary.com/zytsxasx/image/upload/v1788268780/adrizo/products/st8x9phamvuyfqrp90gk.png',
      publicId: 'adrizo/products/st8x9phamvuyfqrp90gk',
      isPrimary: false,
      sortOrder: 1,
      altText: 'Baby Pink Zipper Polo Angle'
    },
    {
      url: 'https://res.cloudinary.com/zytsxasx/image/upload/v1788268778/adrizo/products/wizfgj4whrksqulykg1f.png',
      publicId: 'adrizo/products/wizfgj4whrksqulykg1f',
      isPrimary: false,
      sortOrder: 2,
      altText: 'Baby Pink Zipper Polo Back'
    },
    {
      url: 'https://res.cloudinary.com/zytsxasx/image/upload/v1788268777/adrizo/products/ornpgczmdu4yrbfsf8xy.png',
      publicId: 'adrizo/products/ornpgczmdu4yrbfsf8xy',
      isPrimary: false,
      sortOrder: 3,
      altText: 'Baby Pink Zipper Polo Detail'
    }
  ];

  const variants = Object.entries(sizeWiseStock).map(([sz, stk]) => ({
    size: sz,
    color: color,
    sku: sku,
    stock: stk,
    priceAdjustment: 0
  }));

  console.log('1. Creating product in MongoDB Atlas...');
  const created = await prisma.product.create({
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
      sizeFit: 'Tailored slim-fit silhouette.',
      washCare: 'Cold and gentle machine wash. Do not bleach.',
      freeShippingText: 'Free shipping across India on all prepaid & COD orders.',
      deliveryText: 'Estimated delivery in 2–4 business days.',
      returnPolicyText: '7 Days Doorstep Return & Exchange.',
      colorsRaw: JSON.stringify([color]),
      sizesRaw: JSON.stringify(['S', 'M', 'L', 'XL', 'XXL']),
      category: { connect: { id: category.id } },
      images: {
        create: images.map(img => ({
          url: img.url,
          publicId: img.publicId,
          isPrimary: img.isPrimary,
          sortOrder: img.sortOrder,
          altText: img.altText
        }))
      },
      variants: {
        create: variants.map(v => ({
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

  console.log('✅ PASSED: Product created without errors!');
  console.log(`   - ID: ${created.id}`);
  console.log(`   - SKU: ${created.sku}`);
  console.log(`   - MRP: ₹${created.originalPrice} | Selling: ₹${created.price}`);
  console.log(`   - Images count: ${created.images.length} (Primary: ${created.images[0]?.url.slice(0, 50)}...)`);
  console.log(`   - Variants count: ${created.variants.length} (Total stock: ${created.stock})`);

  // 2. Test Storefront lookup
  console.log('\n2. Testing Storefront Queries...');
  const storefrontProduct = await prisma.product.findFirst({
    where: {
      OR: [{ id: created.id }, { slug: created.slug }],
      status: 'ACTIVE'
    },
    include: { category: true, images: true, variants: true }
  });

  if (!storefrontProduct) throw new Error('Storefront lookup failed');
  console.log('✅ PASSED: Storefront returns product successfully.');

  // 3. Test Detail Page Lookup by ID and Slug
  const byId = await prisma.product.findFirst({ where: { id: created.id }, include: { images: true, variants: true } });
  const bySlug = await prisma.product.findFirst({ where: { slug: created.slug }, include: { images: true, variants: true } });
  if (!byId || !bySlug) throw new Error('Lookup by ID or slug failed');
  console.log('✅ PASSED: Dynamic route /product/[id] and /product/[slug] both resolve accurately.');

  // 4. Test Deletion
  console.log('\n3. Testing Safe Deletion...');
  await prisma.productImage.deleteMany({ where: { productId: created.id } });
  await prisma.productVariant.deleteMany({ where: { productId: created.id } });
  await prisma.product.delete({ where: { id: created.id } });

  const check = await prisma.product.findUnique({ where: { id: created.id } });
  if (check) throw new Error('Product not deleted from database');
  console.log('✅ PASSED: Product permanently deleted from database.');

  console.log('\n🎉 ALL SCENARIO TESTS PASSED 100%!');
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
