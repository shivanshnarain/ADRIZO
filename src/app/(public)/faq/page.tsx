import { POLICY_CONFIG } from '@/config/policies';
import { Metadata } from 'next';
import FaqClient from './FaqClient';

export const metadata: Metadata = {
  title: `${POLICY_CONFIG.companyName} Frequently Asked Questions`,
  description: `Find answers to common questions about ${POLICY_CONFIG.companyName} orders, shipping, and returns.`,
};

export default function FAQ() {
  return <FaqClient />;
}
