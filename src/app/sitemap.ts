import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';
import { INITIAL_CATEGORIES } from '@/lib/catalogueDefaults';

export const revalidate = 3600; // Revalidate every hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.adrizo.com';
  const currentDate = new Date();

  // 1. Static Core and Commercial Hub Pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/shop`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/men`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/men/hoodies`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/men/polo-t-shirts`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/men/t-shirts`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/men/shirts`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/shipping-policy`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/refund-return-policy`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/privacy-policy`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/terms-and-conditions`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/faq`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];

  // 2. Dynamic Categories from Database with Fallback
  let categoryEntries: MetadataRoute.Sitemap = [];
  try {
    const categories = await prisma.category.findMany({
      where: { status: 'ACTIVE' },
      select: { slug: true, updatedAt: true },
    });

    if (categories && categories.length > 0) {
      categoryEntries = categories.map((cat) => ({
        url: `${baseUrl}/category/${cat.slug}`,
        lastModified: cat.updatedAt || currentDate,
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      }));
    } else {
      categoryEntries = INITIAL_CATEGORIES.map((cat) => ({
        url: `${baseUrl}/category/${cat.slug}`,
        lastModified: currentDate,
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      }));
    }
  } catch {
    categoryEntries = INITIAL_CATEGORIES.map((cat) => ({
      url: `${baseUrl}/category/${cat.slug}`,
      lastModified: currentDate,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));
  }

  // 3. Dynamic Products from Database
  let productEntries: MetadataRoute.Sitemap = [];
  try {
    const products = await prisma.product.findMany({
      where: { status: 'ACTIVE' },
      select: { slug: true, updatedAt: true },
    });

    if (products && products.length > 0) {
      productEntries = products.map((prod) => ({
        url: `${baseUrl}/product/${prod.slug}`,
        lastModified: prod.updatedAt || currentDate,
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      }));
    }
  } catch {
    productEntries = [];
  }

  return [...staticPages, ...categoryEntries, ...productEntries];
}
