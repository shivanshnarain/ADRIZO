import { prisma } from '@/lib/prisma';
import MenClient from './MenClient';
import { isMenProduct, getOrderedProducts } from '@/lib/productFiltering';
import type { Metadata } from 'next';

export const revalidate = 60;

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.adrizo.com';

export const metadata: Metadata = {
  title: "Men's Clothing — Premium Indian Menswear & Essentials | ADRIZO",
  description: "Shop premium Indian men's clothing at ADRIZO. Heavyweight fleece hoodies, luxury zipper & button polo t-shirts, oversized tees, and casual shirts designed for modern comfort. Free shipping above ₹999.",
  alternates: {
    canonical: `${siteUrl}/men`,
  },
  openGraph: {
    title: "Men's Clothing — Premium Indian Menswear & Essentials | ADRIZO",
    description: "Shop premium Indian men's clothing at ADRIZO. Heavyweight fleece hoodies, luxury zipper & button polo t-shirts, oversized tees, and casual shirts.",
    url: `${siteUrl}/men`,
    siteName: 'ADRIZO',
    locale: 'en_IN',
    type: 'website',
    images: [
      {
        url: `${siteUrl}/adrizo_hero.jpg`,
        width: 1200,
        height: 630,
        alt: "ADRIZO Men's Clothing Collection",
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Men's Clothing — Premium Indian Menswear | ADRIZO",
    description: "Heavyweight fleece hoodies, luxury polo t-shirts, and casual menswear made in India.",
    images: [`${siteUrl}/adrizo_hero.jpg`],
  },
};

export default async function MenHubPage() {
  let products: any[] = [];
  try {
    const allActive = await prisma.product.findMany({
      where: { status: 'ACTIVE' },
      include: {
        category: true,
        images: { orderBy: { sortOrder: 'asc' } },
        variants: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    // All Men's products with smart variation
    products = getOrderedProducts(allActive.filter(isMenProduct), 'ALL');
  } catch (err: any) {
    console.warn("Prisma error loading men's products:", err.message);
    products = [];
  }

  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "Men's Clothing Collection",
    "description": "Premium Indian men's clothing, heavyweight hoodies, polo t-shirts, and casual menswear.",
    "url": `${siteUrl}/men`,
    "mainEntity": {
      "@type": "ItemList",
      "itemListElement": products.slice(0, 15).map((p, idx) => ({
        "@type": "ListItem",
        "position": idx + 1,
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
        "name": "Men's Clothing",
        "item": `${siteUrl}/men`,
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
      <MenClient initialProducts={products} />
    </>
  );
}
