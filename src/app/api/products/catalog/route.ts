import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rawProducts = await prisma.product.findMany({
      where: { status: 'ACTIVE' },
      include: {
        category: true,
        images: { orderBy: { sortOrder: 'asc' }, take: 1 },
        variants: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const products = rawProducts.map((p) => {
      let availableSizes: string[] = [];
      if (p.sizesRaw) {
        try {
          const parsed = JSON.parse(p.sizesRaw);
          if (Array.isArray(parsed)) availableSizes = parsed.filter(Boolean);
        } catch {
          availableSizes = [];
        }
      }

      if (availableSizes.length === 0 && p.variants && p.variants.length > 0) {
        availableSizes = p.variants
          .map((v) => v.size)
          .filter(Boolean) as string[];
      }

      if (availableSizes.length === 0) {
        availableSizes = ['S', 'M', 'L', 'XL', 'XXL'];
      }

      availableSizes = Array.from(new Set(availableSizes));

      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        sku: p.sku,
        price: Number(p.price),
        originalPrice: Number(p.originalPrice || p.price),
        image: p.images[0]?.url || '/placeholder.png',
        color: p.color || 'Standard',
        availableSizes,
        productType: p.productType || null,
        gender: (p as any).gender || null,
        categoryId: p.categoryId || null,
        category: p.category ? { id: p.category.id, name: p.category.name, slug: p.category.slug } : null,
      };
    }).filter((p) => p.availableSizes.length > 0);

    return NextResponse.json({
      success: true,
      products,
    });
  } catch (error: any) {
    console.error('[Catalog API Error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch products' },
      { status: 500 }
    );
  }
}
