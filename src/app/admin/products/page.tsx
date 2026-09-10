import { prisma } from '../../../lib/prisma';
import ProductsClient from './ProductsClient';

export const dynamic = 'force-dynamic';

export default async function AdminProducts() {
  let products: any[] = [];
  let categories: any[] = [];
  let colors: any[] = [];
  let sizes: any[] = [];

  try {
    const [dbProducts, dbCategories, dbColors, dbSizes] = await Promise.all([
      prisma.product.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          category: true,
          images: { orderBy: { sortOrder: 'asc' } },
          variants: true
        }
      }),
      prisma.category.findMany({
        orderBy: { sortOrder: 'asc' },
        include: {
          productTypes: {
            where: { status: 'ACTIVE' },
            orderBy: { sortOrder: 'asc' }
          }
        }
      }),
      prisma.productColor.findMany({
        where: { status: 'ACTIVE' },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }]
      }),
      prisma.productSize.findMany({
        where: { status: 'ACTIVE' },
        orderBy: { sortOrder: 'asc' }
      })
    ]);

    products = dbProducts;
    categories = dbCategories;
    colors = dbColors;
    sizes = dbSizes;
  } catch (err) {
    // DB unavailable - pass empty arrays
  }

  return (
    <ProductsClient
      initialProducts={products}
      categories={categories}
      initialColors={colors}
      initialSizes={sizes}
    />
  );
}
