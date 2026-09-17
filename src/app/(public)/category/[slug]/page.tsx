import { notFound, permanentRedirect } from 'next/navigation';
import { prisma } from '../../../../lib/prisma';
import ShopClient from '../../shop/ShopClient';
import { filterProductsByCategory } from '@/lib/productFiltering';
import type { Metadata } from 'next';

export const revalidate = 60;

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.adrizo.com';

interface PageProps {
  params: Promise<{ slug: string }> | { slug: string };
}

const VIRTUAL_CATEGORIES: Record<string, { name: string; title: string; desc: string; image?: string }> = {
  women: {
    name: "Women's Collection",
    title: "Women's Clothing — Premium Indian Fashion | ADRIZO",
    desc: "Explore luxury women's fashion at ADRIZO. Modern silhouettes, heavyweight fabrics, and contemporary aesthetics.",
    image: 'https://res.cloudinary.com/zytsxasx/image/upload/v1789463967/adrizo/products/pvfr1iyiibkvau4xkwu1.png',
  },
  'womens': {
    name: "Women's Collection",
    title: "Women's Clothing — Premium Indian Fashion | ADRIZO",
    desc: "Explore luxury women's fashion at ADRIZO. Modern silhouettes, heavyweight fabrics, and contemporary aesthetics.",
    image: 'https://res.cloudinary.com/zytsxasx/image/upload/v1789463967/adrizo/products/pvfr1iyiibkvau4xkwu1.png',
  },
  'zipper-polo': {
    name: 'Zipper Polo T-Shirts',
    title: 'Zipper Polo T-Shirts — Minimalist Luxury Polos | ADRIZO',
    desc: 'Explore ADRIZO luxury zipper polo t-shirts crafted from high-GSM combed cotton with metallic zippers.',
  },
  'button-polo': {
    name: 'Button Polo T-Shirts',
    title: 'Button Polo T-Shirts — Classic Collar Polos | ADRIZO',
    desc: 'Discover premium button polo t-shirts at ADRIZO. Tailored collars, refined plackets, and ultra-comfortable fits.',
  },
  'mens-hoodie': {
    name: "Men's Hoodies",
    title: "Men's Hoodies — Heavyweight Fleece Streetwear | ADRIZO",
    desc: "Shop premium men's hoodies at ADRIZO with 380+ GSM heavyweight fleece, double-lined hoods, and modern relaxed fits.",
  },
  'womens-hoodie': {
    name: "Women's Hoodies",
    title: "Women's Hoodies — Luxury Streetwear & Layering | ADRIZO",
    desc: "Discover women's hoodies at ADRIZO. Engineered for superior warmth, oversized comfort, and minimal elegance.",
    image: 'https://res.cloudinary.com/zytsxasx/image/upload/v1789463967/adrizo/products/pvfr1iyiibkvau4xkwu1.png',
  },
  't-shirts': {
    name: 'T-Shirts',
    title: 'T-Shirts Collection — Luxury Polos & Tees | ADRIZO',
    desc: 'Shop luxury zipper & button polo t-shirts and premium cotton tees at ADRIZO.',
  },
  'hoodies': {
    name: 'Hoodies',
    title: 'Hoodies Collection — Heavyweight Fleece | ADRIZO',
    desc: 'Shop premium heavyweight fleece hoodies at ADRIZO with free shipping across India.',
  },
};

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

  const virtualConfig = VIRTUAL_CATEGORIES[slug];
  if (virtualConfig) {
    return {
      title: virtualConfig.title,
      description: virtualConfig.desc,
      alternates: { canonical: `${siteUrl}/category/${slug}` },
      openGraph: {
        title: virtualConfig.title,
        description: virtualConfig.desc,
        url: `${siteUrl}/category/${slug}`,
        siteName: 'ADRIZO',
        locale: 'en_IN',
        type: 'website',
        images: [{ url: virtualConfig.image || `${siteUrl}/adrizo_hero.jpg`, width: 1200, height: 630, alt: virtualConfig.name }],
      },
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

  // Handle virtual categories (women, zipper-polo, button-polo, mens-hoodie, womens-hoodie)
  const virtualConfig = VIRTUAL_CATEGORIES[slug];
  if (!category && virtualConfig) {
    category = {
      id: slug,
      name: virtualConfig.name,
      slug: slug,
      description: virtualConfig.desc,
      image: virtualConfig.image,
    };
  }

  if (!category) {
    notFound();
  }

  // Use centralized filtering logic
  const filteredCategoryProducts = filterProductsByCategory(products, slug);

  const canonicalUrl = `${siteUrl}/category/${category.slug}`;

  // Schema.org CollectionPage & ItemList JSON-LD
  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": `${category.name} Collection`,
    "description": category.description || `Shop ${category.name} at ADRIZO.`,
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
        initialCategory={category.slug || category.id}
        titleOverride={category.name}
      />
    </>
  );
}
