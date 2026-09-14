import type { Metadata } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.adrizo.com';

export const metadata: Metadata = {
  title: 'Contact Us | ADRIZO Customer Support',
  description: 'Get in touch with the ADRIZO customer support team. Reach us at care.adrizo@gmail.com for help with orders, tracking, exchanges, and product sizing inquiries.',
  alternates: {
    canonical: `${siteUrl}/contact`,
  },
  openGraph: {
    title: 'Contact Us | ADRIZO Customer Support',
    description: 'Get in touch with the ADRIZO team for order support, product sizing, and assistance.',
    url: `${siteUrl}/contact`,
    siteName: 'ADRIZO',
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
