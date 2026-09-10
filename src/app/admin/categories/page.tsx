import { prisma } from '../../../lib/prisma';
import CategoriesClient from './CategoriesClient';

export const dynamic = 'force-dynamic';

export default async function AdminCategories() {
  let categories: any[] = [];
  try {
    categories = await prisma.category.findMany({
      orderBy: { createdAt: 'desc' }
    });
  } catch {
    categories = [
      { id: 'cat-1', name: 'Polo T-Shirts', slug: 'polo-t-shirts', status: 'ACTIVE' },
      { id: 'cat-2', name: 'Regular T-Shirts', slug: 'regular-t-shirts', status: 'ACTIVE' },
      { id: 'cat-3', name: 'Hoodies & Sweatshirts', slug: 'hoodies', status: 'ACTIVE' },
      { id: 'cat-4', name: 'Caps & Accessories', slug: 'caps', status: 'ACTIVE' },
    ];
  }

  return <CategoriesClient initialCategories={categories} />;
}
