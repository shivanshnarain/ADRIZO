import { prisma } from '../../../../lib/prisma';
import ProductClient from './ProductClient';
import { notFound, permanentRedirect } from 'next/navigation';
import { getOptimizedImageUrl, getResponsiveImageSrcSet } from '@/lib/image-utils';
import type { Metadata } from 'next';

export const revalidate = 60;

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.adrizo.com';

interface PageProps {
  params: Promise<{ id: string }> | { id: string };
}

async function getProductData(id: string) {
  try {
    const isObjectId = Boolean(id && /^[0-9a-fA-F]{24}$/.test(id));
    const whereClause: any = isObjectId
      ? { OR: [{ id }, { slug: id }, { sku: id }] }
      : { OR: [{ slug: id }, { sku: id }] };

    const product = await prisma.product.findFirst({
      where: whereClause,
      include: {
        category: true,
        images: { orderBy: { sortOrder: 'asc' } },
        variants: true,
      },
    });

    return product;
  } catch (err: any) {
    console.warn("Prisma error in getProductData:", err.message);
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await (params as any);
  const id = resolvedParams.id || (params as any)?.id;
  const product = await getProductData(id);

  if (!product || product.status !== 'ACTIVE') {
    return {
      title: 'Product Not Found | ADRIZO',
      description: 'The requested product could not be found.',
      robots: { index: false, follow: false },
    };
  }

  const categoryName = product.category?.name || product.productType || "Men's Clothing";
  const primaryColor = product.color ? ` - ${product.color}` : '';
  const priceDisplay = product.salePrice && product.salePrice > 0 ? product.salePrice : product.price;

  // Title structure: [Product Name] | ADRIZO
  const title = `${product.name} | ADRIZO`;

  // Natural descriptive meta description
  const description = `Buy ${product.name}${primaryColor} for ₹${priceDisplay} at ADRIZO. Premium Indian ${categoryName.toLowerCase()} crafted with high-grade fabrics, superior comfort, and durable construction. Free shipping above ₹999 & easy 7-day returns.`;

  const canonicalUrl = `${siteUrl}/product/${product.slug || product.id}`;

  let ogImageUrl = `${siteUrl}/adrizo_hero.jpg`;
  if (product.images && product.images.length > 0) {
    const firstImg = product.images[0];
    const raw = typeof firstImg === 'string' ? firstImg : (firstImg?.url || (firstImg as any)?.secure_url);
    if (raw) {
      ogImageUrl = getOptimizedImageUrl(raw, { width: 1200, quality: 'auto', format: 'auto' });
    }
  }

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: 'ADRIZO',
      locale: 'en_IN',
      type: 'website',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `ADRIZO ${product.name}${primaryColor}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function ProductDetailsPage({ params }: PageProps) {
  const resolvedParams = await (params as any);
  const id = resolvedParams.id || (params as any)?.id;

  const product = await getProductData(id);

  if (!product || product.status !== 'ACTIVE') {
    notFound();
  }

  // 308 Permanent Redirect from Mongo ObjectId to canonical SEO slug URL
  const isObjectId = Boolean(id && /^[0-9a-fA-F]{24}$/.test(id));
  if (isObjectId && product.slug && product.slug !== id) {
    permanentRedirect(`/product/${product.slug}`);
  }

  // Query related products and approved reviews concurrently for minimum latency
  let relatedProducts: any[] = [];
  let approvedReviews: any[] = [];

  try {
    const [relatedRes, reviewsRes] = await Promise.allSettled([
      prisma.product.findMany({
        where: {
          status: 'ACTIVE',
          id: { not: product.id },
        },
        include: {
          category: true,
          images: { orderBy: { sortOrder: 'asc' } },
          variants: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
      prisma.review.findMany({
        where: {
          productId: product.id,
          status: 'approved',
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    if (relatedRes.status === 'fulfilled') {
      relatedProducts = relatedRes.value || [];
    }
    if (reviewsRes.status === 'fulfilled') {
      approvedReviews = reviewsRes.value || [];
    }
  } catch (secondaryErr) {
    console.warn("Secondary data fetching error in ProductDetailsPage:", secondaryErr);
  }

  // Preload primary hero image in HTML head
  let primaryHeroUrl: string | null = null;
  let primaryHeroSrcSet: string | null = null;
  const allImageUrls: string[] = [];
  if (product.images && product.images.length > 0) {
    product.images.forEach((img: any) => {
      const raw = typeof img === 'string' ? img : (img?.url || img?.secure_url || '');
      if (raw) allImageUrls.push(raw);
    });
    if (allImageUrls[0]) {
      primaryHeroUrl = getOptimizedImageUrl(allImageUrls[0], { width: 950, crop: 'limit', quality: 'auto', format: 'auto' });
      primaryHeroSrcSet = getResponsiveImageSrcSet(allImageUrls[0], [450, 750, 1050]);
    }
  }

  // Calculate actual ratings only if real customer reviews exist
  const totalReviews = approvedReviews.length;
  const averageRating = totalReviews > 0
    ? approvedReviews.reduce((sum, r) => sum + (r.rating || 5), 0) / totalReviews
    : 0;

  const sellingPrice = product.salePrice && product.salePrice > 0 ? product.salePrice : product.price;
  const canonicalProductUrl = `${siteUrl}/product/${product.slug || product.id}`;
  const categorySlug = product.category?.slug || 'men';
  const categoryName = product.category?.name || "Men's Collection";

  // Schema.org Product JSON-LD structured data
  const productSchema: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.name,
    "image": allImageUrls.length > 0 ? allImageUrls : [`${siteUrl}/adrizo_hero.jpg`],
    "description": product.description || `Shop ${product.name} at ADRIZO.`,
    "sku": product.sku || product.id,
    "brand": {
      "@type": "Brand",
      "name": "ADRIZO",
    },
    "category": categoryName,
    ...(product.color ? { "color": product.color } : {}),
    "offers": {
      "@type": "Offer",
      "url": canonicalProductUrl,
      "priceCurrency": "INR",
      "price": sellingPrice,
      "priceValidUntil": "2027-12-31",
      "itemCondition": "https://schema.org/NewCondition",
      "availability": "https://schema.org/InStock",
      "seller": {
        "@type": "Organization",
        "name": "ADRIZO",
      },
    },
  };

  // Google Search Guidelines: ONLY include aggregateRating and reviews if real customer reviews exist
  if (totalReviews > 0) {
    productSchema.aggregateRating = {
      "@type": "AggregateRating",
      "ratingValue": averageRating.toFixed(1),
      "reviewCount": totalReviews,
      "bestRating": "5",
      "worstRating": "1",
    };
    productSchema.review = approvedReviews.slice(0, 5).map((r) => ({
      "@type": "Review",
      "author": {
        "@type": "Person",
        "name": r.customerName || "Customer",
      },
      "datePublished": r.createdAt ? new Date(r.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      "reviewBody": r.reviewText,
      "reviewRating": {
        "@type": "Rating",
        "ratingValue": r.rating,
        "bestRating": "5",
        "worstRating": "1",
      },
    }));
  }

  // BreadcrumbList Schema
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": siteUrl,
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Shop",
        "item": `${siteUrl}/shop`,
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": categoryName,
        "item": `${siteUrl}/category/${categorySlug}`,
      },
      {
        "@type": "ListItem",
        "position": 4,
        "name": product.name,
        "item": canonicalProductUrl,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {primaryHeroUrl && (
        <link
          rel="preload"
          as="image"
          href={primaryHeroUrl}
          imageSrcSet={primaryHeroSrcSet || undefined}
          imageSizes="(max-width: 768px) 100vw, 55vw"
          fetchPriority="high"
        />
      )}
      <ProductClient
        product={product}
        initialRelatedProducts={relatedProducts}
      />
    </>
  );
}
