import { prisma } from '../../../lib/prisma';
import WishlistClient from './WishlistClient';

export const dynamic = 'force-dynamic';

export default async function WishlistPage() {
  let products: any[] = [];
  try {
    products = await prisma.product.findMany({
      where: { status: 'ACTIVE' },
      include: {
        category: true,
        images: { orderBy: { sortOrder: 'asc' } },
        variants: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  } catch (err: any) {
    console.warn("Prisma error in Wishlist page, using fallback data:", err.message);
    products = [
      {
        id: 'prod-1',
        name: 'Black Zipper Polo – Matty Lycra Fabric',
        slug: 'black-zipper-polo-matty-lycra',
        productType: 'Polo T-Shirts',
        categoryId: 'cat-1',
        sku: 'POLO-ZIP-BLK',
        price: 1000,
        originalPrice: 2000,
        status: 'ACTIVE',
        images: [{ url: 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?auto=format&fit=crop&q=80&w=600', isPrimary: true }],
        variants: [{ size: 'S' }, { size: 'M' }, { size: 'L' }, { size: 'XL' }, { size: 'XXL' }],
        category: { id: 'cat-1', name: 'Polo T-Shirts' }
      },
      {
        id: 'prod-2',
        name: 'White Classic Heavyweight Cotton Polo',
        slug: 'white-classic-heavyweight-cotton-polo',
        productType: 'Polo T-Shirts',
        categoryId: 'cat-1',
        sku: 'POLO-WHT-01',
        price: 1200,
        originalPrice: 2400,
        status: 'ACTIVE',
        images: [{ url: 'https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?auto=format&fit=crop&q=80&w=600', isPrimary: true }],
        variants: [{ size: 'M' }, { size: 'L' }, { size: 'XL' }],
        category: { id: 'cat-1', name: 'Polo T-Shirts' }
      }
    ];
  }

  return <WishlistClient allProducts={products} />;
}
