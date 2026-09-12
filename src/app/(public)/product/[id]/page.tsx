import { prisma } from '../../../../lib/prisma';
import ProductClient from './ProductClient';
import { notFound } from 'next/navigation';
import { getOptimizedImageUrl } from '@/lib/image-utils';

export const revalidate = 60;

export default async function ProductDetailsPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const resolvedParams = await (params as any);
  const id = resolvedParams.id || (params as any)?.id;
  let product: any = null;
  let relatedProducts: any[] = [];

  try {
    const isObjectId = Boolean(id && /^[0-9a-fA-F]{24}$/.test(id));
    const whereClause: any = isObjectId
      ? { OR: [{ id }, { slug: id }, { sku: id }] }
      : { OR: [{ slug: id }, { sku: id }] };

    product = await prisma.product.findFirst({
      where: whereClause,
      include: { 
        category: true,
        images: { orderBy: { sortOrder: 'asc' } },
        variants: true
      }
    });

    if (product) {
      try {
        relatedProducts = await prisma.product.findMany({
          where: {
            status: 'ACTIVE',
            id: { not: product.id }
          },
          include: { 
            category: true,
            images: { orderBy: { sortOrder: 'asc' } },
            variants: true
          },
          orderBy: { createdAt: 'desc' },
          take: 12
        });
      } catch (relErr) {
        console.warn("Could not load related products from DB:", relErr);
      }
    }
  } catch (err: any) {
    console.warn("Prisma error in ProductDetailsPage:", err.message);
  }

  if (!product || product.status !== 'ACTIVE') {
    notFound();
  }

  // Preload primary hero image in HTML head
  let primaryHeroUrl: string | null = null;
  if (product.images && product.images.length > 0) {
    const first = product.images[0];
    const rawUrl = typeof first === 'string' ? first : (first?.url || first?.secure_url || '');
    if (rawUrl) {
      primaryHeroUrl = getOptimizedImageUrl(rawUrl, { width: 1000, quality: 'auto', format: 'auto' });
    }
  } else if (product.imagesRaw) {
    try {
      const parsed = JSON.parse(product.imagesRaw || '[]');
      if (Array.isArray(parsed) && parsed[0]) {
        const first = parsed[0];
        const rawUrl = typeof first === 'string' ? first : (first?.url || first?.secure_url || '');
        if (rawUrl) {
          primaryHeroUrl = getOptimizedImageUrl(rawUrl, { width: 1000, quality: 'auto', format: 'auto' });
        }
      }
    } catch {
      // ignore
    }
  }

  return (
    <>
      {primaryHeroUrl && (
        <link
          rel="preload"
          as="image"
          href={primaryHeroUrl}
          fetchPriority="high"
        />
      )}
      <ProductClient product={product} initialRelatedProducts={relatedProducts} />
    </>
  );
}
