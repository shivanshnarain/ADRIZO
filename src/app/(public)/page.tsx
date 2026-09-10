import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Truck, RefreshCw, Award } from "lucide-react";
import styles from "./page.module.css";
import { prisma } from '../../lib/prisma';
import ProductCard from '../../components/ProductCard';

export const dynamic = 'force-dynamic';

// Static category data — links to existing shop filters
const CATEGORIES = [
  { name: 'T-SHIRTS', slug: 't-shirts', href: '/shop?category=t-shirts' },
  { name: 'HOODIES',  slug: 'hoodies',  href: '/shop?category=hoodies'  },
  { name: 'SHIRTS',   slug: 'shirts',   href: '/shop?category=shirts'   },
  { name: 'PANTS',    slug: 'pants',    href: '/shop?category=pants'    },
];

const DEFAULT_CATEGORY_IMAGES: Record<string, string> = {
  't-shirts': 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&q=80&w=800',
  'hoodies':  'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&q=80&w=800',
  'shirts':   'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&q=80&w=800',
  'pants':    'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&q=80&w=800',
};

export default async function Home() {
  let featuredProducts: any[] = [];

  try {
    featuredProducts = await prisma.product.findMany({
      where: { status: 'ACTIVE' },
      take: 8,
      include: {
        category: true,
        images: { orderBy: { sortOrder: 'asc' } },
        variants: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  } catch (err: any) {
    console.warn("Prisma query failed on Home page:", err.message);
    featuredProducts = [];
  }

  // Build per-category image from product data with high quality fallbacks
  const categoryImages: Record<string, string> = {};
  for (const cat of CATEGORIES) {
    const match = featuredProducts.find(
      (p) => p.category?.slug?.toLowerCase().includes(cat.slug) ||
             p.category?.name?.toLowerCase().includes(cat.slug.replace('-', ''))
    );
    categoryImages[cat.slug] = match?.images?.[0]?.url || DEFAULT_CATEGORY_IMAGES[cat.slug];
  }

  return (
    <>
      {/* =====================================================================
          MOBILE HERO — visible ONLY on phones (max-width: 767px)
          Matches target Reference Image 1: natural artwork, black typography,
          yellow accent dash below label, no dark overlay, controlled height.
         ===================================================================== */}
      <section className={styles.mobileHeroSection} aria-label="ADRIZO Hero">
        {/* Background photo */}
        <div className={styles.heroBg}>
          <Image
            src="/hero-mobile-bg.jpg"
            alt="ADRIZO — Good Outfits Better Days"
            fill
            priority
            sizes="100vw"
            className={styles.heroBgImg}
          />
        </div>

        {/* Text content placed over clean natural light area */}
        <div className={styles.heroContent}>
          {/* Editorial label: BLACK text with yellow accent dash below */}
          <p className={styles.heroLabel} aria-hidden="true">
            WEAR<br />
            A BETTER<br />
            TOMORROW
            <span className={styles.heroLabelAccentLine} />
          </p>

          {/* Main heading: More Than Clothes (black) A Better (black) You. (yellow) */}
          <h1 className={styles.heroHeading}>
            More<br />
            Than<br />
            Clothes.<br />
            A Better{' '}
            <em className={styles.heroHeadingAccent}>You.</em>
          </h1>


        </div>
      </section>

      {/* =====================================================================
          DESKTOP + TABLET HERO — visible on tablet/desktop (min-width: 768px)
          Original design: grayscale /hero-bg.png, SALE clip-text, BUY 1 GET 2
          FREE offer text, animated SHOP NOW button.
         ===================================================================== */}
      <section className={styles.desktopHeroSection} aria-label="ADRIZO Hero">
        {/* Layer 1: Fixed Grayscale Background */}
        <div className={styles.bgGrayscale}></div>

        {/* Hero Content Group */}
        <div className={styles.desktopHeroContent}>
          {/* Layer 2: White Translucent Panel & Colored Mask Text */}
          <div className={styles.whitePanelContainer}>
            <div className={styles.whitePanel}>
              <span className={styles.saleText}>SALE</span>
            </div>
          </div>

          {/* Layer 3: Foreground Text & Button */}
          <div className={styles.heroForeground}>
            <p className={styles.heroOfferText}>
              <span className={styles.offerPrefix}>BUY 1</span>
              <span className={styles.offerPercent}>GET 2</span>
              <span className={styles.offerSuffix}>FREE</span>
            </p>
            <Link href="/shop" className={styles.shopBtn} id="hero-shop-now-btn-desktop">
              <span className={styles.shopBtnText}>SHOP NOW</span>
              <span className={styles.shopBtnArrowCircle}>
                <ArrowRight size={16} strokeWidth={2.4} className={styles.shopBtnArrow} />
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* ===================== CATEGORIES ===================== */}
      <section className={styles.categorySection} aria-label="Shop by Category">
        <div className={styles.categorySectionHeader}>
          <span className={styles.categorySectionTitle}>
            SHOP BY CATEGORY
            <span className={styles.categorySectionTitleLine} aria-hidden="true" />
          </span>
          <Link href="/shop" className={styles.categoryViewAll}>
            View All <ArrowRight size={12} strokeWidth={2.5} />
          </Link>
        </div>

        <div className={styles.categoryScroll} role="list">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              href={cat.href}
              className={styles.categoryCard}
              role="listitem"
              aria-label={`Shop ${cat.name}`}
            >
              <div className={styles.categoryCardImageWrap}>
                <img
                  src={categoryImages[cat.slug] || DEFAULT_CATEGORY_IMAGES[cat.slug]}
                  alt={cat.name}
                  className={styles.categoryCardImage}
                  loading="lazy"
                />
                <div className={styles.categoryCardArrow} aria-hidden="true">
                  <ArrowRight size={14} strokeWidth={2.5} color="#000000" />
                </div>
              </div>
              <span className={styles.categoryCardLabel}>{cat.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ===================== TRUST STRIP / BENEFITS ===================== */}
      <div className={styles.trustStrip}>
        <div className={styles.trustStripContent}>
          <div className={styles.trustItem}>
            <div className={styles.trustIconWrap}>
              <Truck size={20} strokeWidth={1.8} />
            </div>
            <div className={styles.trustText}>
              <div className={styles.trustTextTitle}>Free Shipping</div>
              <div className={styles.trustTextSub}>On orders above ₹999</div>
            </div>
          </div>

          <div className={styles.trustItem}>
            <div className={styles.trustIconWrap}>
              <RefreshCw size={18} strokeWidth={1.8} />
            </div>
            <div className={styles.trustText}>
              <div className={styles.trustTextTitle}>7 Days Easy Returns</div>
              <div className={styles.trustTextSub}>Hassle-free</div>
            </div>
          </div>

          <div className={styles.trustItem}>
            <div className={styles.trustIconWrap}>
              <Award size={20} strokeWidth={1.8} />
            </div>
            <div className={styles.trustText}>
              <div className={styles.trustTextTitle}>Premium Quality</div>
              <div className={styles.trustTextSub}>Built to Last</div>
            </div>
          </div>
        </div>
      </div>

      {/* ===================== NEW ARRIVALS / PRODUCTS ===================== */}
      <section className={styles.newArrivalsSection} aria-label="New Arrivals">
        <div className={styles.newArrivalsHeader}>
          <h2 className={styles.newArrivalsTitle}>
            NEW ARRIVALS
            <span className={styles.newArrivalsTitleLine} aria-hidden="true" />
          </h2>
          <Link href="/shop?sort=new" className={styles.newArrivalsViewAll}>
            View All <ArrowRight size={12} strokeWidth={2.5} />
          </Link>
        </div>

        {/* Filter tabs */}
        <div className={styles.filtersSection}>
          <div className={styles.filterTabs}>
            <Link href="/shop" className={`${styles.filterTab} ${styles.filterTabActive}`}>ALL</Link>
            <Link href="/shop?category=men" className={styles.filterTab}>MEN</Link>
            <Link href="/shop?category=women" className={styles.filterTab}>WOMEN</Link>
            <Link href="/shop?category=t-shirts" className={styles.filterTab}>T-SHIRTS</Link>
            <Link href="/shop?category=hoodies" className={styles.filterTab}>HOODIES</Link>
            <Link href="/shop?sort=new" className={styles.filterTab}>NEW ARRIVALS</Link>
          </div>
        </div>

        {featuredProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#888' }}>
            No products available yet.
          </div>
        ) : (
          <div className={styles.featuredProductGrid}>
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
