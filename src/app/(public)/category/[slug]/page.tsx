import { notFound, permanentRedirect } from 'next/navigation';
import { prisma } from '../../../../lib/prisma';
import ShopClient from '../../shop/ShopClient';
import type { Metadata } from 'next';

export const revalidate = 60;

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.adrizo.com';

interface PageProps {
  params: Promise<{ slug: string }> | { slug: string };
}

async function getCategoryData(slug: string) {
  try {
    const isObjectId = Boolean(slug && /^[0-9a-fA-F]{24}$/.test(slug));
    const category = await prisma.category.findFirst({
      where: isObjectId
        ? { OR: [{ id: slug }, { slug: slug }] }
        : { slug: slug },
    });
    return category;
  } catch (err: any) {
    console.warn("Prisma error in getCategoryData:", err.message);
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await (params as any);
  const slug = resolvedParams.slug || (params as any)?.slug;

  if (slug === 'men') {
    return {
      title: "Men's Clothing — Premium Indian Menswear | ADRIZO",
      description: "Shop premium Indian men's clothing at ADRIZO. Heavyweight fleece hoodies, luxury zipper & button polo t-shirts, oversized tees & casual shirts.",
      alternates: { canonical: `${siteUrl}/men` },
    };
  }

  const category = await getCategoryData(slug);

  if (!category) {
    return {
      title: 'Category Not Found | ADRIZO',
      description: 'The requested category could not be found.',
      robots: { index: false, follow: false },
    };
  }

  const title = `${category.name} — Premium Men's Collection | ADRIZO`;
  const description = category.description
    ? `${category.description} Shop online at ADRIZO with free shipping across India and 7-day hassle-free returns.`
    : `Explore our collection of ${category.name.toLowerCase()} at ADRIZO. Premium Indian menswear crafted with heavyweight cotton, precision stitching, and modern comfort.`;

  const canonicalUrl = `${siteUrl}/category/${category.slug}`;

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
          url: category.image || `${siteUrl}/adrizo_hero.jpg`,
          width: 1200,
          height: 630,
          alt: `ADRIZO ${category.name}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [category.image || `${siteUrl}/adrizo_hero.jpg`],
    },
  };
}

export default async function CategoryPage({ params }: PageProps) {
  const resolvedParams = await (params as any);
  const slug = resolvedParams.slug || (params as any)?.slug;

  if (slug === 'men') {
    permanentRedirect('/men');
  }

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
        orderBy: { createdAt: 'desc' },
      }),
      prisma.category.findMany({
        where: { status: 'ACTIVE' },
        orderBy: { name: 'asc' },
      }),
      getCategoryData(slug),
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

  // Filter products belonging to this category
  const filteredCategoryProducts = products.filter(
    (p) => p.categoryId === category.id || (p.category && p.category.slug === category.slug)
  );

  const canonicalUrl = `${siteUrl}/category/${category.slug}`;

  // Schema.org CollectionPage & ItemList JSON-LD
  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": `${category.name} Collection`,
    "description": `Shop ${category.name} at ADRIZO.`,
    "url": canonicalUrl,
    "mainEntity": {
      "@type": "ItemList",
      "itemListElement": filteredCategoryProducts.slice(0, 15).map((p, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "url": `${siteUrl}/product/${p.slug || p.id}`,
        "name": p.name,
      })),
    },
  };

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
        "name": category.name,
        "item": canonicalUrl,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <ShopClient
        initialProducts={products}
        categories={categories}
        initialCategory={category.id}
        titleOverride={category.name}
      />
    </>
  );
}
