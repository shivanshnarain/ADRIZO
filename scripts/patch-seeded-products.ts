import { prisma } from '../src/lib/prisma';
import { resolveColorCode, resolveProductTypeCode } from '../src/lib/sku';
import { calculateTotalStock, calculateStockStatus } from '../src/lib/inventory';

async function main() {
  console.log('Enriching all products in MongoDB Atlas with complete catalogue fields...');

  const products = await prisma.product.findMany({
    include: { category: true, variants: true }
  });

  for (const p of products) {
    const sizeWiseMap: Record<string, number> = {
      'S': 15, 'M': 28, 'L': 35, 'XL': 22, 'XXL': 10
    };
    if (p.variants && p.variants.length > 0) {
      for (const v of p.variants) {
        if (v.size) {
          sizeWiseMap[v.size] = (sizeWiseMap[v.size] || 0) + (v.stock || 10);
        }
      }
    }

    const computedTotalStock = calculateTotalStock(sizeWiseMap);
    const resolvedProductType = p.productType || (
      p.name.includes('Tee') ? 'Oversized T-Shirt' :
      p.name.includes('Shirt') ? 'Linen Shirt' :
      p.name.includes('Hoodie') ? 'Signature Hoodie' :
      p.name.includes('Jacket') ? 'Utility Jacket' :
      p.name.includes('Pants') ? 'Cargo Pants' :
      p.name.includes('Polo') ? 'Zipper Polo T-Shirt' :
      p.name.includes('Jeans') ? 'Straight Jeans' :
      p.name.includes('Cap') ? 'Baseball Cap' : 'Standard Garment'
    );

    const resolvedColor = p.color || (
      p.name.includes('Black') ? 'JET BLACK' :
      p.name.includes('White') ? 'WHITE' :
      p.name.includes('Green') ? 'BOTTLE GREEN' :
      p.name.includes('Pink') ? 'BABY PINK' :
      p.name.includes('Oversized') ? 'JET BLACK' :
      p.name.includes('Linen') ? 'SLATE GRAY' :
      p.name.includes('Signature') ? 'JET BLACK' :
      p.name.includes('Utility') ? 'ECRU' :
      p.name.includes('Cargo') ? 'SAGE GREEN' :
      p.name.includes('Jeans') ? 'VINTAGE INDIGO' : 'JET BLACK'
    );

    const mrp = p.originalPrice || Math.round(p.price * 2 - 1);

    await prisma.product.update({
      where: { id: p.id },
      data: {
        originalPrice: mrp,
        productType: resolvedProductType,
        color: resolvedColor,
        totalStock: computedTotalStock,
        stock: computedTotalStock,
        sizeWiseStock: JSON.stringify(sizeWiseMap),
        stockStatus: 'IN_STOCK',
        status: p.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
        washCare: p.washCare || 'Cold and gentle machine wash. Do not bleach.',
        freeShippingText: p.freeShippingText || 'Free shipping across India on all prepaid & COD orders.',
        deliveryText: p.deliveryText || 'Estimated delivery in 2–5 business days.',
        returnPolicyText: p.returnPolicyText || '7 Days Doorstep Return & Exchange.'
      }
    });
  }

  console.log(`Successfully enriched ${products.length} products with full inventory, color, and pricing!`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
