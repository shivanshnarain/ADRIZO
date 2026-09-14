import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.adrizo.com';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/api/',
          '/checkout',
          '/account',
          '/order-success',
          '/order-failure',
          '/login',
          '/signup',
          '/wishlist',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
