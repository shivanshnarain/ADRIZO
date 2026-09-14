import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import ProductCard from '@/components/ProductCard';
import { filterProductsByCategory } from '@/lib/productFiltering';
import type { Metadata } from 'next';

export const revalidate = 60;

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.adrizo.com';

interface PageProps {
  params: Promise<{ category: string }> | { category: string };
}

interface CategoryConfig {
  name: string;
  h1: string;
  title: string;
  description: string;
  editorial: string;
  filterKey?: string;
  categoryFilterKeywords: string[];
}

const CATEGORY_MAP: Record<string, CategoryConfig> = {
  hoodies: {
    name: "Men's Hoodies",
    h1: "Men's Hoodies & Heavyweight Fleece",
    title: "Men's Hoodies — Heavyweight Fleece & Zipper Hoodies | ADRIZO",
    description: "Shop premium men's hoodies at ADRIZO. Built with 380+ GSM heavyweight fleece, double-lined hoods, and modern relaxed fits. Free shipping above ₹999 across India.",
    editorial: "ADRIZO hoodies represent the pinnacle of Indian streetwear and winter layering. Engineered with ultra-soft fleece, durable ribbed cuffs, and structured hoods that retain shape through countless washes.",
    filterKey: 'MENS_HOODIE',
    categoryFilterKeywords: ['hoodie', 'hoodies', 'fleece'],
  },
  'polo-t-shirts': {
    name: "Men's Polo T-Shirts",
    h1: "Men's Polo T-Shirts — Zipper & Button Collars",
    title: "Men's Polo T-Shirts — Luxury Zipper & Button Polos | ADRIZO",
    description: "Shop luxury men's polo t-shirts at ADRIZO. Featuring minimalist metallic zippers, classic button plackets, and pique combed cotton. Free shipping in India.",
    editorial: "Elevate your smart-casual wardrobe with ADRIZO polo t-shirts. Designed with precision rib knit collars, structured shoulders, and pre-shrunk combed cotton for all-day breathability and sharp aesthetics.",
    filterKey: 'TSHIRTS',
    categoryFilterKeywords: ['polo', 'zipper polo', 'button polo'],
  },
  'zipper-polo': {
    name: "Men's Zipper Polo T-Shirts",
    h1: "Men's Zipper Polo T-Shirts",
    title: "Men's Zipper Polo T-Shirts — Minimalist Metallic Polos | ADRIZO",
    description: "Shop luxury men's zipper polo t-shirts at ADRIZO. Featuring minimalist metallic zippers and premium pique combed cotton.",
    editorial: "Elevate your smart-casual wardrobe with ADRIZO zipper polo t-shirts. Designed with precision metallic zippers, structured shoulders, and pre-shrunk combed cotton.",
    filterKey: 'ZIPPER_POLO',
    categoryFilterKeywords: ['zipper polo'],
  },
  'button-polo': {
    name: "Men's Button Polo T-Shirts",
    h1: "Men's Button Polo T-Shirts",
    title: "Men's Button Polo T-Shirts — Classic Collar Polos | ADRIZO",
    description: "Shop luxury men's button polo t-shirts at ADRIZO. Classic tailored button plackets and pique combed cotton.",
    editorial: "Classic sophistication meets modern comfort in ADRIZO button polo t-shirts. Refined collar structure and breathable weaves.",
    filterKey: 'BUTTON_POLO',
    categoryFilterKeywords: ['button polo'],
  },
  't-shirts': {
    name: "Men's T-Shirts",
    h1: "Men's T-Shirts — Heavyweight & Oversized Fits",
    title: "Men's T-Shirts — Premium Cotton & Oversized Tees | ADRIZO",
    description: "Discover premium men's t-shirts at ADRIZO. High-GSM breathable cotton, oversized drop-shoulder fits, and timeless crew necks made in India with free shipping above ₹999.",
    editorial: "Our men's t-shirts are crafted from premium long-staple cotton with reinforced necklines that never sag. Perfect for minimal everyday streetwear or effortless layering.",
    filterKey: 'TSHIRTS',
    categoryFilterKeywords: ['t-shirt', 't-shirts', 'tshirt', 'tee'],
  },
  shirts: {
    name: "Men's Shirts",
    h1: "Men's Casual & Formal Shirts",
    title: "Men's Shirts — Casual, Linen & Oxford Cotton Shirts | ADRIZO",
    description: "Explore men's casual and formal shirts at ADRIZO. Premium breathable fabrics, contemporary slim and regular fits, and durable tailoring for work and weekend.",
    editorial: "From weekend casuals to workday essentials, ADRIZO men's shirts combine breathable weaves with ergonomic tailoring for effortless comfort and distinguished style.",
    categoryFilterKeywords: ['shirt', 'shirts', 'oxford', 'linen'],
  },
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await (params as any);
  const catParam = resolvedParams.category || (params as any)?.category;
  const config = CATEGORY_MAP[catParam];

  if (!config) {
    const fallbackTitle = `${catParam.replace(/-/g, ' ').toUpperCase()} | Men's Collection | ADRIZO`;
    return {
      title: fallbackTitle,
      description: `Shop ${catParam.replace(/-/g, ' ')} for men at ADRIZO.`,
      alternates: { canonical: `${siteUrl}/men/${catParam}` },
    };
  }

  const canonicalUrl = `${siteUrl}/men/${catParam}`;

  return {
    title: config.title,
    description: config.description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: config.title,
      description: config.description,
      url: canonicalUrl,
      siteName: 'ADRIZO',
      locale: 'en_IN',
      type: 'website',
      images: [
        {
          url: `${siteUrl}/adrizo_hero.jpg`,
          width: 1200,
          height: 630,
          alt: config.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: config.title,
      description: config.description,
      images: [`${siteUrl}/adrizo_hero.jpg`],
    },
  };
}

export default async function MenCategoryPage({ params }: PageProps) {
  const resolvedParams = await (params as any);
  const catParam = resolvedParams.category || (params as any)?.category;
  const config = CATEGORY_MAP[catParam];

  if (!config) {
    notFound();
  }

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

    if (config.filterKey) {
      products = filterProductsByCategory(allActive, config.filterKey);
    } else {
      products = allActive.filter((p) => {
        const catSlug = (p.category?.slug || '').toLowerCase();
        const catName = (p.category?.name || '').toLowerCase();
        const prodType = (p.productType || '').toLowerCase();
        const prodName = (p.name || '').toLowerCase();

        return config.categoryFilterKeywords.some(
          (kw) =>
            catSlug.includes(kw) ||
            catName.includes(kw) ||
            prodType.includes(kw) ||
            prodName.includes(kw)
        );
      });
    }
  } catch (err: any) {
    console.warn("Prisma error in MenCategoryPage:", err.message);
    products = [];
  }

  const canonicalUrl = `${siteUrl}/men/${catParam}`;

  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": config.name,
    "description": config.description,
    "url": canonicalUrl,
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
      {
        "@type": "ListItem",
        "position": 3,
        "name": config.name,
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
          <Link href="/men" style={{ color: '#71717a', textDecoration: 'none' }}>Men&apos;s Clothing</Link>
          <span style={{ color: '#d4d4d8' }}>&rsaquo;</span>
          <span style={{ color: '#09090b', fontWeight: 600 }}>{config.name}</span>
        </nav>

        {/* Category Header */}
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
            {config.h1}
          </h1>
          <p
            style={{
              fontSize: '1rem',
              color: '#52525b',
              lineHeight: 1.65,
              maxWidth: '840px',
            }}
          >
            {config.editorial}
          </p>

          {/* Quick Sub-navigation */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.5rem',
              marginTop: '1.25rem',
            }}
          >
            {Object.entries(CATEGORY_MAP).map(([key, item]) => {
              const isActive = key === catParam;
              return (
                <Link
                  key={key}
                  href={`/men/${key}`}
                  style={{
                    padding: '0.45rem 0.9rem',
                    borderRadius: '20px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    textDecoration: 'none',
                    background: isActive ? '#09090b' : '#f4f4f5',
                    color: isActive ? '#ffffff' : '#52525b',
                    border: '1px solid',
                    borderColor: isActive ? '#09090b' : '#e4e4e7',
                  }}
                >
                  {item.name}
                </Link>
              );
            })}
          </div>
        </header>

        {/* Product Grid */}
        <section aria-label={`${config.name} Grid`}>
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
                fontSize: '1.1rem',
                fontWeight: 800,
                color: '#09090b',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Available Styles ({products.length})
            </h2>
            <Link
              href="/men"
              style={{
                fontSize: '0.85rem',
                fontWeight: 700,
                color: '#09090b',
                textDecoration: 'none',
              }}
            >
              All Men&apos;s &rarr;
            </Link>
          </div>

          {products.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '4rem 1.5rem',
              maxWidth: '480px',
              margin: '0 auto',
            }}>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: 700,
                color: '#09090b',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '0.5rem',
              }}>
                Coming Soon
              </h3>
              <p style={{
                fontSize: '0.9rem',
                color: '#71717a',
                lineHeight: 1.6,
                marginBottom: '1.5rem',
              }}>
                New styles are currently in production and will be available soon.
              </p>
              <Link
                href="/men"
                style={{
                  display: 'inline-block',
                  backgroundColor: '#09090b',
                  color: '#ffffff',
                  padding: '0.75rem 1.75rem',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  borderRadius: '4px',
                  textDecoration: 'none',
                }}
              >
                View All Men&apos;s Products
              </Link>
            </div>
          ) : (
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
          )}
        </section>
      </div>
    </>
  );
}
