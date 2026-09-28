import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActivePromotionOffers, getAllPromotionOffers, findMatchingOfferForProductOrCategory } from '@/lib/promotions';

export const dynamic = 'force-dynamic';

interface CacheEntry {
  timestamp: number;
  data: any;
}
const bogoServerCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 1000; // 60 seconds TTL

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryQuery = searchParams.get('category')?.toLowerCase().trim();
    const categoryIdQuery = searchParams.get('categoryId')?.trim();
    const productQuery = searchParams.get('productId')?.trim();

    const cacheKey = `${productQuery || ''}_${categoryIdQuery || ''}_${categoryQuery || ''}`;
    const cached = bogoServerCache.get(cacheKey);
    const now = Date.now();
    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      return NextResponse.json(cached.data, {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      });
    }

    const activeOffers = await getActivePromotionOffers();

    if (activeOffers.length === 0) {
      const allOffers = await getAllPromotionOffers();
      const first = allOffers[0];
      const emptyPayload = {
        success: true,
        active: false,
        promotion: first ? { ...first, active: false, status: 'INACTIVE' } : null,
        offers: [],
        products: [],
      };
      bogoServerCache.set(cacheKey, { timestamp: now, data: emptyPayload });
      return NextResponse.json(emptyPayload);
    }

    // Look up qualifying product if productId provided
    let qualifyingProduct: any = null;
    if (productQuery) {
      qualifyingProduct = await prisma.product.findUnique({
        where: { id: productQuery },
        include: { category: true },
      });
    }

    const targetCatId = qualifyingProduct?.categoryId || categoryIdQuery;
    const targetCatSlug = qualifyingProduct?.category?.slug?.toLowerCase().trim() || categoryQuery;
    const targetCatName = qualifyingProduct?.category?.name || '';
    const targetProductType = qualifyingProduct?.productType || '';

    // Resolve matching offer for this category / product
    let targetOffer = findMatchingOfferForProductOrCategory(activeOffers, {
      productId: productQuery,
      categorySlug: targetCatSlug,
      categoryName: targetCatName,
      productType: targetProductType,
    });

    if (!targetOffer) {
      targetOffer = activeOffers[0];
    }

    // STRICT SAME-CATEGORY ENFORCEMENT:
    // When a qualifying product or category is specified, free products MUST come
    // ONLY from that exact same category. Cross-category selection is strictly forbidden.
    const whereClause: any = {
      status: 'ACTIVE',
    };

    if (targetCatId) {
      whereClause.categoryId = targetCatId;
    } else if (targetCatSlug) {
      whereClause.OR = [
        { category: { slug: targetCatSlug } },
        { category: { name: { equals: targetCatSlug, mode: 'insensitive' } } },
        { productType: { equals: targetCatSlug, mode: 'insensitive' } },
      ];
    } else {
      // General storewide fallback filter based on offer
      const eligibleCategories = targetOffer.applicableCategories || ['all'];
      const isStorewide = eligibleCategories.includes('all');

      if (!isStorewide && eligibleCategories.length > 0) {
        whereClause.OR = [
          { category: { slug: { in: eligibleCategories } } },
          { category: { name: { in: eligibleCategories, mode: 'insensitive' } } },
        ];
        if (targetOffer.applicableProducts && targetOffer.applicableProducts.length > 0) {
          whereClause.OR.push({ id: { in: targetOffer.applicableProducts } });
        }
      }
    }

    // Query Active Products with variants and images (capped at 40 for optimal response latency)
    const rawProducts = await prisma.product.findMany({
      where: whereClause,
      include: {
        category: true,
        images: { orderBy: { sortOrder: 'asc' } },
        variants: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 40,
    });

    // Map products and resolve available sizes
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

      const primaryImage = p.images[0]?.url || '/adrizo-logo-transparent.png';
      const allImages = p.images && p.images.length > 0 
        ? p.images.map((img) => img.url).filter(Boolean) 
        : [primaryImage];

      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        sku: p.sku,
        price: p.price,
        originalPrice: p.originalPrice || p.price,
        image: primaryImage,
        images: allImages,
        color: p.color || 'Standard',
        availableSizes,
        category: p.category ? { id: p.category.id, name: p.category.name, slug: p.category.slug } : null,
        description: p.description || '',
        washCare: p.washCare || null,
        sizeFit: p.sizeFit || null,
        freeShippingText: p.freeShippingText || null,
        deliveryText: p.deliveryText || null,
        returnPolicyText: p.returnPolicyText || null,
      };
    }).filter((p) => p.availableSizes.length > 0);

    const isOfferActive = targetOffer ? targetOffer.status === 'ACTIVE' : false;

    const responsePayload = {
      success: true,
      active: isOfferActive,
      promotion: targetOffer ? { ...targetOffer, active: isOfferActive } : null,
      offers: activeOffers.map(o => ({ ...o, active: o.status === 'ACTIVE' })),
      qualifyingCategory: qualifyingProduct?.category ? {
        id: qualifyingProduct.category.id,
        name: qualifyingProduct.category.name,
        slug: qualifyingProduct.category.slug,
      } : (products[0]?.category || null),
      products,
    };

    bogoServerCache.set(cacheKey, { timestamp: now, data: responsePayload });

    return NextResponse.json(responsePayload, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    });
  } catch (error: any) {
    console.error('[Promotion API Error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch promotion data' },
      { status: 500 }
    );
  }
}
