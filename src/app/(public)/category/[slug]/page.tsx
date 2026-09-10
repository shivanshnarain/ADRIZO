import { notFound } from 'next/navigation';
import { prisma } from '../../../../lib/prisma';
import ShopClient from '../../shop/ShopClient';

export const dynamic = 'force-dynamic';

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> | { slug: string } }) {
  const resolvedParams = await (params as any);
  const slug = resolvedParams.slug || (params as any)?.slug;

  let products: any[] = [];
  let categories: any[] = [];
  let category: any = null;

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
      }),
      prisma.category.findFirst({
        where: Boolean(slug && /^[0-9a-fA-F]{24}$/.test(slug))
          ? { OR: [{ id: slug }, { slug: slug }] }
          : { slug: slug }
      })
    ]);
    products = results[0] || [];
    categories = results[1] || [];
    category = results[2] || null;
  } catch (err: any) {
    console.warn("Prisma error in Category page:", err.message);
    products = [];
    categories = [];
    category = null;
  }

  if (!category) {
    notFound();
  }

  return (
    <ShopClient 
      initialProducts={products} 
      categories={categories} 
      initialCategory={category.id}
      titleOverride={category.name}
    />
  );
}
