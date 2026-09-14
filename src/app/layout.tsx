import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from '@/context/AuthContext';

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.adrizo.com';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "ADRIZO | Premium Indian Men's Clothing & Essentials",
    template: "%s | ADRIZO",
  },
  description: "ADRIZO is a premium Indian menswear brand specializing in heavyweight hoodies, luxury polo t-shirts, oversized tees, and timeless casual wear. Crafted in India with superior fabric quality and all-day comfort.",
  applicationName: "ADRIZO",
  keywords: [
    "men's clothing",
    "men's fashion",
    "men's t-shirts",
    "men's polo t-shirts",
    "polo t-shirts",
    "men's hoodies",
    "hoodies for men",
    "men's shirts",
    "casual wear for men",
    "premium men's clothing",
    "Indian men's clothing",
    "men's fashion India",
    "ADRIZO",
  ],
  authors: [{ name: "ADRIZO" }],
  creator: "ADRIZO",
  publisher: "ADRIZO",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: siteUrl,
    siteName: "ADRIZO",
    title: "ADRIZO | Premium Indian Men's Clothing & Essentials",
    description: "Shop premium Indian men's clothing, heavyweight fleece hoodies, zipper and button polo t-shirts with free shipping across India.",
    images: [
      {
        url: `${siteUrl}/adrizo_hero.jpg`,
        width: 1200,
        height: 630,
        alt: "ADRIZO — Premium Men's Clothing & Essentials",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ADRIZO | Premium Indian Men's Clothing & Essentials",
    description: "Shop premium Indian men's clothing, heavyweight fleece hoodies, zipper and button polo t-shirts with free shipping across India.",
    images: [`${siteUrl}/adrizo_hero.jpg`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
  },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "ADRIZO",
  legalName: "Unique India Garments",
  url: siteUrl,
  logo: `${siteUrl}/logo-transparent.png`,
  image: `${siteUrl}/adrizo_hero.jpg`,
  description: "Premium Indian clothing brand specializing in high-quality men's fashion, heavyweight hoodies, polo t-shirts, and casual wear.",
  email: "care.adrizo@gmail.com",
  sameAs: [
    "https://www.instagram.com/adrizo_official",
  ],
  contactPoint: [
    {
      "@type": "ContactPoint",
      contactType: "customer service",
      email: "care.adrizo@gmail.com",
      availableLanguage: ["English", "Hindi"],
    },
  ],
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "ADRIZO",
  url: siteUrl,
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${siteUrl}/shop?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
      </head>
      <body suppressHydrationWarning>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

