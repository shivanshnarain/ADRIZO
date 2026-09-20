import Link from 'next/link';
import type { Metadata } from 'next';
import styles from '../policies.module.css';

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.adrizo.com';

export const metadata: Metadata = {
  title: "About ADRIZO — Premium Indian Men's Clothing & Brand Story",
  description: "Learn about ADRIZO, a premium Indian menswear brand dedicated to heavyweight fleece hoodies, luxury polo t-shirts, and timeless everyday essentials. Crafted with pride in India.",
  alternates: {
    canonical: `${siteUrl}/about`,
  },
  openGraph: {
    title: "About ADRIZO — Premium Indian Men's Clothing & Brand Story",
    description: "Learn about ADRIZO, a premium Indian menswear brand dedicated to heavyweight fleece hoodies, luxury polo t-shirts, and timeless everyday essentials.",
    url: `${siteUrl}/about`,
    siteName: 'ADRIZO',
    locale: 'en_IN',
    type: 'website',
    images: [
      {
        url: `${siteUrl}/adrizo_hero.jpg`,
        width: 1200,
        height: 630,
        alt: "About ADRIZO — Indian Menswear",
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: "About ADRIZO — Premium Indian Men's Clothing",
    description: "Heavyweight fleece hoodies, luxury polo t-shirts, and enduring menswear crafted in India.",
    images: [`${siteUrl}/adrizo_hero.jpg`],
  },
};

export default function AboutPage() {
  return (
    <div className={styles.policyContainer}>
      <div className={styles.policyHeader}>
        <h1 className={styles.policyTitle}>ABOUT ADRIZO</h1>
        <p className={styles.lastUpdated}>Wear A Better Tomorrow — Good Outfits, Better Days</p>
      </div>

      <div className={styles.policySection}>
        <h2 className={styles.sectionTitle}>1. Our Story</h2>
        <p className={styles.policyText}>
          ADRIZO (by Unique India Garments) was founded with a singular conviction: men&apos;s essentials in India deserve uncompromising quality, modern silhouettes, and enduring fabrics. Rather than pursuing fleeting fast-fashion cycles, we focus on building wardrobe cornerstones that look refined, feel substantial, and stand the test of time.
        </p>
      </div>

      <div className={styles.policySection}>
        <h2 className={styles.sectionTitle}>2. Fabric Standards &amp; Craftsmanship</h2>
        <p className={styles.policyText}>
          Every garment bearing the ADRIZO label is manufactured with meticulous attention to detail:
        </p>
        <ul className={styles.policyList}>
          <li>
            <strong>Heavyweight Fleece Hoodies:</strong> Tailored from 380+ GSM ultra-soft fleece featuring double-lined structured hoods, heavy-gauge ribbed trims, and durable stitching.
          </li>
          <li>
            <strong>Polo T-Shirts:</strong> Made from rich pique combed cotton with custom metallic zip plackets and classic button configurations that maintain collar crispness wear after wear.
          </li>
          <li>
            <strong>Oversized &amp; Classic Tees:</strong> Knitted from premium pre-shrunk combed cotton designed with reinforced necklines that resist stretching or warping.
          </li>
        </ul>
      </div>

      <div className={styles.policySection}>
        <h2 className={styles.sectionTitle}>3. Proudly Made in India</h2>
        <p className={styles.policyText}>
          Our garments are designed, sourced, and manufactured in India. By maintaining direct relationships with skilled artisans and specialized textile mills, we ensure ethical production standards and superior finish across our entire catalogue.
        </p>
      </div>

      <div className={styles.policySection}>
        <h2 className={styles.sectionTitle}>4. The ADRIZO Promise</h2>
        <p className={styles.policyText}>
          We stand firmly behind our products. Every order placed on ADRIZO is backed by:
        </p>
        <ul className={styles.policyList}>
          <li>Free express shipping on all orders above ₹999 across India.</li>
          <li>7-day hassle-free returns and exchanges for complete peace of mind.</li>
          <li>Transparent customer care reachable directly via phone, WhatsApp, and email.</li>
        </ul>
      </div>

      <div className={styles.policySection}>
        <h2 className={styles.sectionTitle}>5. Contact Our Team</h2>
        <p className={styles.policyText}>
          Have a question about sizing, styling, or your order? We are here to help.
        </p>
        <p className={styles.policyText} style={{ marginTop: '0.75rem' }}>
          <strong>Email:</strong>{' '}
          <a href="mailto:care.adrizo@gmail.com" style={{ color: '#09090b', textDecoration: 'underline' }}>
            care.adrizo@gmail.com
          </a>
          <br />
          <strong>Phone:</strong>{' '}
          <a href="tel:+919773777410" style={{ color: '#09090b', textDecoration: 'underline' }}>
            +91 9773777410
          </a>
          <br />
          <strong>Support Hours:</strong> Monday – Saturday, 10:00 AM – 7:00 PM IST
        </p>
        <p className={styles.policyText} style={{ marginTop: '1.25rem' }}>
          <Link href="/shop" style={{ fontWeight: 700, color: '#09090b', textDecoration: 'underline' }}>
            &larr; Explore the Collection
          </Link>
        </p>
      </div>
    </div>
  );
}
