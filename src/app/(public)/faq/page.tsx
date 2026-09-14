import { POLICY_CONFIG } from '@/config/policies';
import { Metadata } from 'next';
import FaqClient from './FaqClient';

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.adrizo.com';

export const metadata: Metadata = {
  title: `${POLICY_CONFIG.companyName} FAQs — Frequently Asked Questions`,
  description: `Find answers to common questions about ADRIZO orders, size guides, delivery timelines, COD payments, returns, and exchanges.`,
  alternates: {
    canonical: `${siteUrl}/faq`,
  },
  openGraph: {
    title: `${POLICY_CONFIG.companyName} FAQs`,
    description: `Answers to common questions about ADRIZO clothing, shipping, returns, and ordering online.`,
    url: `${siteUrl}/faq`,
    siteName: 'ADRIZO',
  },
};

export default function FAQ() {
  return <FaqClient />;
}
