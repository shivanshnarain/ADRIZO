import { prisma } from '../../../lib/prisma';
import ShopClient from './ShopClient';
import type { Metadata } from 'next';

export const revalidate = 60;

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.adrizo.com';

export const metadata: Metadata = {
  title: "Shop All Products — Premium Men's Clothing | ADRIZO",
  description: "Browse the complete collection of premium menswear at ADRIZO. Heavyweight fleece hoodies, luxury polo t-shirts, oversized tees & casual shirts with nationwide shipping.",
  alternates: {
    canonical: `${siteUrl}/shop`,
  },
  openGraph: {
    title: "Shop All Products — Premium Men's Clothing | ADRIZO",
    description: "Browse the complete collection of premium menswear at ADRIZO.",
    url: `${siteUrl}/shop`,
    siteName: 'ADRIZO',
    locale: 'en_IN',
    type: 'website',
    images: [
      {
        url: `${siteUrl}/adrizo_hero.jpg`,
        width: 1200,
        height: 630,
        alt: "ADRIZO Complete Collection",
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Shop All Products — Premium Men's Clothing | ADRIZO",
    description: "Browse the complete collection of premium menswear at ADRIZO.",
    images: [`${siteUrl}/adrizo_hero.jpg`],
  },
};

export default async function ShopPage() {
  let products: any[] = [];
  let categories: any[] = [];

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
      })
    ]);
    products = results[0] || [];
    categories = results[1] || [];
  } catch (err: any) {
    console.warn("Prisma error in Shop page:", err.message);
    categories = [];
    products = [];
  }

  return <ShopClient initialProducts={products} categories={categories} />;
}
