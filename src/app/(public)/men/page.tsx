import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import ProductCard from '@/components/ProductCard';
import type { Metadata } from 'next';
import styles from '../shop/shop.module.css';

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

const SUB_CATEGORIES = [
  { name: "Men's Hoodies", slug: 'hoodies', href: '/men/hoodies', desc: 'Heavyweight fleece & zipper hoodies' },
  { name: "Men's Polo T-Shirts", slug: 'polo-t-shirts', href: '/men/polo-t-shirts', desc: 'Luxury zipper & button collar polos' },
  { name: "Men's T-Shirts", slug: 't-shirts', href: '/men/t-shirts', desc: 'Oversized & everyday classic cotton tees' },
  { name: "Men's Shirts", slug: 'shirts', href: '/men/shirts', desc: 'Casual, oxford & linen shirts' },
];

export default async function MenHubPage() {
  let products: any[] = [];
  try {
    products = await prisma.product.findMany({
      where: { status: 'ACTIVE' },
      include: {
        category: true,
        images: { orderBy: { sortOrder: 'asc' } },
        variants: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 24,
    });
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
      "itemListElement": products.slice(0, 12).map((p, idx) => ({
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

      <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '1.5rem 1.5rem 4rem' }}>
        {/* Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.825rem',
            color: '#71717a',
            marginBottom: '1rem',
          }}
        >
          <Link href="/" style={{ color: '#71717a', textDecoration: 'none' }}>Home</Link>
          <span style={{ color: '#d4d4d8' }}>&rsaquo;</span>
          <span style={{ color: '#09090b', fontWeight: 600 }}>Men&apos;s Clothing</span>
        </nav>

        {/* Commercial Category Header & Editorial Copy */}
        <header style={{ marginBottom: '2.5rem' }}>
          <h1
            style={{
              fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)',
              fontWeight: 900,
              letterSpacing: '-0.03em',
              color: '#09090b',
              marginBottom: '0.75rem',
              textTransform: 'uppercase',
            }}
          >
            Men&apos;s Clothing &amp; Essentials
          </h1>
          <p
            style={{
              fontSize: '1rem',
              color: '#52525b',
              lineHeight: 1.65,
              maxWidth: '820px',
            }}
          >
            Explore ADRIZO&apos;s signature Indian menswear collection. From luxury 380+ GSM heavyweight fleece hoodies and precision-crafted zipper polo t-shirts to everyday oversized cotton tees, our pieces are tailored for durable elegance, breathable comfort, and a contemporary silhouette.
          </p>

          {/* Subcategory Quick Links */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1rem',
              marginTop: '1.75rem',
            }}
          >
            {SUB_CATEGORIES.map((sub) => (
              <Link
                key={sub.slug}
                href={sub.href}
                style={{
                  padding: '1rem 1.25rem',
                  borderRadius: '10px',
                  background: '#f4f4f5',
                  textDecoration: 'none',
                  border: '1px solid #e4e4e7',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem',
                }}
              >
                <span style={{ fontWeight: 700, color: '#09090b', fontSize: '0.95rem' }}>
                  {sub.name} &rarr;
                </span>
                <span style={{ fontSize: '0.8rem', color: '#71717a' }}>{sub.desc}</span>
              </Link>
            ))}
          </div>
        </header>

        {/* Product Grid */}
        <section aria-label="Men's Clothing Products">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              borderBottom: '1px solid #e4e4e7',
              paddingBottom: '0.75rem',
              marginBottom: '1.5rem',
            }}
          >
            <h2
              style={{
                fontSize: '1.15rem',
                fontWeight: 800,
                color: '#09090b',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Featured Men&apos;s Collection ({products.length})
            </h2>
            <Link
              href="/shop"
              style={{
                fontSize: '0.85rem',
                fontWeight: 700,
                color: '#09090b',
                textDecoration: 'none',
              }}
            >
              View Full Shop &rarr;
            </Link>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: '1.5rem',
            }}
          >
            {products.map((p, idx) => (
              <ProductCard
                key={p.id}
                product={p}
                priority={idx < 4}
              />
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
