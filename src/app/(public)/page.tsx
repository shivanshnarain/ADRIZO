import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Truck, RefreshCw, Award } from "lucide-react";
import styles from "./page.module.css";
import { prisma } from '../../lib/prisma';
import HomeProductSection from '../../components/HomeProductSection';
import CustomerPhotoShowcase from '@/components/CustomerPhotoShowcase';
import { getCustomerPhotos } from '@/lib/customer-photos-service';
import type { Metadata } from 'next';

export const revalidate = 60;

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.adrizo.com';

export const metadata: Metadata = {
  title: "ADRIZO | Premium Indian Men's Clothing & Essentials",
  description: "Discover ADRIZO — Premium Indian menswear brand. Shop heavyweight fleece hoodies, luxury polo t-shirts, oversized tees & casual wear with free shipping in India.",
  alternates: {
    canonical: siteUrl,
  },
};

// Static category data — exactly 4 items in required order:
// ZIPPER POLO → BUTTON POLO → MEN'S HOODIE → WOMEN'S HOODIE
const CATEGORIES = [
  { name: 'ZIPPER POLO', slug: 'zipper-polo', href: '/men/polo-t-shirts' },
  { name: 'BUTTON POLO', slug: 'button-polo', href: '/men/polo-t-shirts' },
  { name: "MEN'S HOODIE", slug: 'mens-hoodie', href: '/men/hoodies' },
  { name: "WOMEN'S HOODIE", slug: 'womens-hoodie', href: '/shop?category=hoodies' },
];

const DEFAULT_CATEGORY_IMAGES: Record<string, string> = {
  'zipper-polo': 'https://res.cloudinary.com/zytsxasx/image/upload/v1788418791/adrizo/products/ngydvzqdl0nrk54ib5cf.png', // Jet Black Zipper Polo
  'button-polo': 'https://res.cloudinary.com/zytsxasx/image/upload/v1788855707/adrizo/products/i9vscqrg4puufvbgdytj.png', // Olive Green Button Polo
  'mens-hoodie': 'https://res.cloudinary.com/zytsxasx/image/upload/v1789076190/adrizo/products/m3cabwopcf8hwa74nx8c.png', // Chocolate Brown Unisex Hoodie (Men's representation)
  'womens-hoodie': 'https://res.cloudinary.com/zytsxasx/image/upload/v1789075295/adrizo/products/aymd0p7wdwpb5fc0vquz.png', // White Unisex Hoodie (Women's representation)
};

export default async function Home() {
  let allProducts: any[] = [];

  try {
    allProducts = await prisma.product.findMany({
      where: { status: 'ACTIVE' },
      include: {
        category: true,
        images: { orderBy: { sortOrder: 'asc' } },
        variants: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  } catch (err: any) {
    console.warn("Prisma query failed on Home page:", err.message);
    allProducts = [];
  }

  let row1Photos: any[] = [];
  let row2Photos: any[] = [];
  try {
    const photoData = await getCustomerPhotos();
    row1Photos = photoData.row1;
    row2Photos = photoData.row2;
  } catch (photoErr) {
    console.warn("Prisma/Firestore customer photos load notice:", photoErr);
  }

  // Exact category images from project assets with guaranteed fallbacks
  const categoryImages: Record<string, string> = { ...DEFAULT_CATEGORY_IMAGES };

  return (
    <>
      {/* =====================================================================
          MOBILE HERO — visible ONLY on phones (max-width: 767px)
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
         ===================================================================== */}
      <section className={styles.desktopHeroSection} aria-label="ADRIZO Hero">
        {/* Semantic H1 for Desktop Crawlers & Accessibility */}
        <h1 className="sr-only">ADRIZO — Premium Indian Men&apos;s Clothing &amp; Essentials</h1>

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

      {/* ===================== PRODUCTS COLLECTION ===================== */}
      <HomeProductSection products={JSON.parse(JSON.stringify(allProducts))} />

      {/* ===================== CUSTOMER PHOTO SHOWCASE ===================== */}
      <CustomerPhotoShowcase initialRow1={row1Photos} initialRow2={row2Photos} />

      {/* ===================== TRUST STRIP / BENEFITS ===================== */}
      {/* Moved to the bottom of the homepage, immediately above the footer/about section */}
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
    </>
  );
}
