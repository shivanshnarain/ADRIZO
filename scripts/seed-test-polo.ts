import 'dotenv/config';
import { prisma } from '../src/lib/prisma.ts';

async function seedTestPolo() {
  const shirtCat = await prisma.category.findFirst({ where: { slug: 'shirts' } });
  
  const polo = await prisma.product.upsert({
    where: { slug: 'black-zipper-polo-matty-lycra' },
    update: {
      name: 'Black Zipper Polo – Matty Lycra',
      productType: 'Polo T-Shirts',
      price: 1000.00,
      originalPrice: 2000.00,
      sku: 'polo-3A',
      stock: 50,
      status: 'ACTIVE',
      showSizeChart: true,
      sizeChart: JSON.stringify({
        S: { length: '26', chest: '38', shoulder: '16' },
        M: { length: '27', chest: '38.5', shoulder: '17' },
        L: { length: '28', chest: '41', shoulder: '17.5' },
        XL: { length: '28', chest: '42', shoulder: '18' },
        XXL: { length: '29', chest: '44', shoulder: '18.5' }
      }),
      colorsRaw: JSON.stringify(['JET BLACK', 'WHITE', 'NAVY BLUE']),
      sizesRaw: JSON.stringify(['S', 'M', 'L', 'XL', 'XXL']),
      description: 'Engineered from high-grade Matty Lycra fabric with premium concealed metallic quarter zipper, structured ribbed collar, and superior 4-way stretch breathability.',
      sizeFit: 'Regular fit. Model is 6\'1" with a 40" chest wearing size L. True to Indian size standards.',
      washCare: 'Cold and gentle machine wash inside-out. Do not bleach. Do not iron directly on metal zipper. Use mild detergent only.',
      freeShippingText: 'Free shipping across India on all prepaid & COD orders.',
      dispatchText: 'All orders are dispatched within 1–2 business days from our fulfillment center.',
      deliveryText: 'Metros: 2–3 business days. Rest of India: 3–5 business days.',
      returnPolicyText: 'Eligible for exchange or return within 7 days of delivery.',
      freeExchangesText: 'We offer 100% free exchanges for size, color, or style replacement.',
      easyReturnsText: 'Hassle-free reverse pickups arranged from your doorstep. Unboxing video required for refunds.',
      exchangeElseText: 'Choose any alternative product from our catalog with seamless balance adjustment.',
      categoryId: shirtCat?.id,
    },
    create: {
      name: 'Black Zipper Polo – Matty Lycra',
      slug: 'black-zipper-polo-matty-lycra',
      productType: 'Polo T-Shirts',
      price: 1000.00,
      originalPrice: 2000.00,
      sku: 'polo-3A',
      stock: 50,
      status: 'ACTIVE',
      showSizeChart: true,
      sizeChart: JSON.stringify({
        S: { length: '26', chest: '38', shoulder: '16' },
        M: { length: '27', chest: '38.5', shoulder: '17' },
        L: { length: '28', chest: '41', shoulder: '17.5' },
        XL: { length: '28', chest: '42', shoulder: '18' },
        XXL: { length: '29', chest: '44', shoulder: '18.5' }
      }),
      colorsRaw: JSON.stringify(['JET BLACK', 'WHITE', 'NAVY BLUE']),
      sizesRaw: JSON.stringify(['S', 'M', 'L', 'XL', 'XXL']),
      description: 'Engineered from high-grade Matty Lycra fabric with premium concealed metallic quarter zipper, structured ribbed collar, and superior 4-way stretch breathability.',
      sizeFit: 'Regular fit. Model is 6\'1" with a 40" chest wearing size L. True to Indian size standards.',
      washCare: 'Cold and gentle machine wash inside-out. Do not bleach. Do not iron directly on metal zipper. Use mild detergent only.',
      freeShippingText: 'Free shipping across India on all prepaid & COD orders.',
      dispatchText: 'All orders are dispatched within 1–2 business days from our fulfillment center.',
      deliveryText: 'Metros: 2–3 business days. Rest of India: 3–5 business days.',
      returnPolicyText: 'Eligible for exchange or return within 7 days of delivery.',
      freeExchangesText: 'We offer 100% free exchanges for size, color, or style replacement.',
      easyReturnsText: 'Hassle-free reverse pickups arranged from your doorstep. Unboxing video required for refunds.',
      exchangeElseText: 'Choose any alternative product from our catalog with seamless balance adjustment.',
      categoryId: shirtCat?.id,
      images: {
        create: [
          {
            url: 'https://images.unsplash.com/photo-1625910513413-7fc751f80720?auto=format&fit=crop&q=80&w=1200',
            publicId: 'adrizo/products/polo_black_01',
            altText: 'Black Zipper Polo Front',
            isPrimary: true,
            sortOrder: 0
          },
          {
            url: 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?auto=format&fit=crop&q=80&w=1200',
            publicId: 'adrizo/products/polo_black_02',
            altText: 'Black Zipper Polo Detail',
            isPrimary: false,
            sortOrder: 1
          }
        ]
      },
      variants: {
        create: [
          { size: 'S', color: 'JET BLACK', sku: 'polo-3A-S', stock: 10, priceAdjustment: 0 },
          { size: 'M', color: 'JET BLACK', sku: 'polo-3A-M', stock: 10, priceAdjustment: 0 },
          { size: 'L', color: 'JET BLACK', sku: 'polo-3A-L', stock: 10, priceAdjustment: 0 },
          { size: 'XL', color: 'JET BLACK', sku: 'polo-3A-XL', stock: 10, priceAdjustment: 0 },
          { size: 'XXL', color: 'JET BLACK', sku: 'polo-3A-XXL', stock: 10, priceAdjustment: 0 }
        ]
      }
    }
  });

  console.log('✅ Created / Upserted Polo Product with ID:', polo.id);
}

seedTestPolo().catch(console.error).finally(() => prisma.$disconnect());
