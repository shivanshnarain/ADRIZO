import { prisma } from '../../../lib/prisma';
import ShopClient from './ShopClient';

export const dynamic = 'force-dynamic';

export default async function ShopPage() {
  let products: any[] = [];
  let categories: any[] = [];

  try {
    const results = await Promise.all([
      prisma.product.findMany({
        where: { status: 'ACTIVE' },
        include: { 
          category: true,
          images: { orderBy: { sortOrder: 'asc' } },
          variants: true,
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.category.findMany({
        where: { status: 'ACTIVE' },
        orderBy: { name: 'asc' }
      })
    ]);
    products = results[0] || [];
    categories = results[1] || [];
  } catch (err: any) {
    console.warn("Prisma error in Shop page:", err.message);
    categories = [];
    products = [];
  }

  return <ShopClient initialProducts={products} categories={categories} />;
}
