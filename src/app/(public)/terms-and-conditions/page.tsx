import { POLICY_CONFIG } from '@/config/policies';
import styles from '../policies.module.css';
import { Metadata } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.adrizo.com';

export const metadata: Metadata = {
  title: `${POLICY_CONFIG.companyName} Terms & Conditions — Terms of Service`,
  description: `Read the Terms & Conditions and Terms of Service for using the ADRIZO e-commerce website and purchasing menswear products online.`,
  alternates: {
    canonical: `${siteUrl}/terms-and-conditions`,
  },
  openGraph: {
    title: `${POLICY_CONFIG.companyName} Terms & Conditions`,
    description: `Terms and conditions for purchasing products on ADRIZO.`,
    url: `${siteUrl}/terms-and-conditions`,
    siteName: 'ADRIZO',
  },
};

export default function TermsAndConditions() {
  return (
    <div className={styles.policyContainer}>
      <header className={styles.policyHeader}>
        <h1 className={styles.policyTitle}>Terms & Conditions</h1>
        <p className={styles.lastUpdated}>Last Updated: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
      </header>

      <div className={styles.policySection}>
        <h2 className={styles.sectionTitle}>1. Acceptance of Terms</h2>
        <p className={styles.policyText}>
          By accessing or using the {POLICY_CONFIG.companyName} website, you agree to be bound by these Terms & Conditions. If you do not agree to all the terms and conditions set forth below, you must not access the website or use any of our services.
        </p>
      </div>

      <div className={styles.policySection}>
        <h2 className={styles.sectionTitle}>2. Website Usage</h2>
        <p className={styles.policyText}>
          You agree to use this website only for lawful purposes. You must not use our website to engage in any fraudulent activity, violate any local or international laws, or transmit any harmful code or viruses.
        </p>
        <h3 className={styles.subSectionTitle}>Website Access and Account</h3>
        <p className={styles.policyText}>
          We reserve the right to refuse service, terminate accounts, or cancel orders at our sole discretion if we believe that customer conduct violates applicable law or is harmful to our interests. You are responsible for maintaining the confidentiality of your account information (such as OTPs and passwords).
        </p>
      </div>

      <div className={styles.policySection}>
        <h2 className={styles.sectionTitle}>3. Intellectual Property Rights</h2>
        
        <h3 className={styles.subSectionTitle}>Website Design & Content Ownership</h3>
        <p className={styles.policyText}>
          All content on this website is the exclusive property of {POLICY_CONFIG.companyName} and is protected by copyright, trademark, and other intellectual property laws. This includes, but is not limited to:
        </p>
        <ul className={styles.policyList}>
          <li>Product images and photography</li>
          <li>Graphics, logos, and brand elements</li>
          <li>Videos and multimedia content</li>
          <li>Text, descriptions, and page design</li>
        </ul>

        <h3 className={styles.subSectionTitle}>User License</h3>
        <p className={styles.policyText}>
          We grant you a limited, non-exclusive, non-transferable license to access and use our website for your personal, non-commercial use only.
        </p>
      </div>

      <div className={styles.policySection}>
        <h2 className={styles.sectionTitle}>4. Restrictions on Use</h2>
        <p className={styles.policyText}>You are strictly prohibited from:</p>
        <ul className={styles.policyList}>
          <li>Copying, reproducing, distributing, or displaying our content without prior written consent.</li>
          <li>Commercial exploitation of our website, products, or brand identity.</li>
          <li>Using automated systems (such as bots, spiders, or scrapers) to extract data from our website.</li>
          <li>Creating derivative works based on our products or designs.</li>
          <li>Framing or embedding our website within other platforms or applications.</li>
        </ul>
      </div>

      <div className={styles.policySection}>
        <h2 className={styles.sectionTitle}>5. Changes to Terms</h2>
        <p className={styles.policyText}>
          We reserve the right, at our sole discretion, to update, change, or replace any part of these Terms & Conditions by posting updates and changes to our website. Your continued use of or access to our website following the posting of any changes constitutes acceptance of those changes.
        </p>
      </div>

      <div className={styles.policySection}>
        <h2 className={styles.sectionTitle}>Contact Us</h2>
        <p className={styles.policyText}>
          Questions about the Terms & Conditions should be sent to us at <a href={`mailto:${POLICY_CONFIG.supportEmail}`} className={styles.highlight}>{POLICY_CONFIG.supportEmail}</a> or by writing to:
        </p>
        <p className={styles.policyText} style={{ whiteSpace: 'pre-line' }}>
          {POLICY_CONFIG.address}
        </p>
      </div>
    </div>
  );
}
