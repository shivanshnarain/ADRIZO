import { POLICY_CONFIG } from '@/config/policies';
import styles from '../policies.module.css';
import { Metadata } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.adrizo.com';

export const metadata: Metadata = {
  title: `${POLICY_CONFIG.companyName} Privacy Policy — Customer Data Protection`,
  description: `Official Privacy Policy for ADRIZO. Learn how we protect customer data, secure transactions, and ensure your personal information remains confidential.`,
  alternates: {
    canonical: `${siteUrl}/privacy-policy`,
  },
  openGraph: {
    title: `${POLICY_CONFIG.companyName} Privacy Policy`,
    description: `Learn how ADRIZO protects your personal information and secures online purchases.`,
    url: `${siteUrl}/privacy-policy`,
    siteName: 'ADRIZO',
  },
};

export default function PrivacyPolicy() {
  return (
    <div className={styles.policyContainer}>
      <header className={styles.policyHeader}>
        <h1 className={styles.policyTitle}>Privacy Policy</h1>
        <p className={styles.lastUpdated}>Last Updated: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
      </header>

      <div className={styles.policySection}>
        <p className={styles.policyText}>
          {POLICY_CONFIG.companyName} values your privacy. This Privacy Policy explains how we collect, use, and share your personal information when you visit or make a purchase from our website.
        </p>
      </div>

      <div className={styles.policySection}>
        <h2 className={styles.sectionTitle}>1. Information We Collect</h2>
        
        <h3 className={styles.subSectionTitle}>Personal Information</h3>
        <p className={styles.policyText}>
          When you create an account, place an order, subscribe to our newsletter, or contact customer support, we collect the following personal information:
        </p>
        <ul className={styles.policyList}>
          <li>Name</li>
          <li>Email address</li>
          <li>Phone number</li>
          <li>Billing and Shipping addresses</li>
          <li>Payment information (processed securely by our payment gateway partners)</li>
        </ul>

        <h3 className={styles.subSectionTitle}>Non-Personal Information</h3>
        <p className={styles.policyText}>
          When you browse our website, we automatically collect certain non-identifying information about your device and interaction with our site, including:
        </p>
        <ul className={styles.policyList}>
          <li>IP address</li>
          <li>Browser type and device information</li>
          <li>Pages visited and referring links</li>
          <li>Visit date and time</li>
        </ul>

        <h3 className={styles.subSectionTitle}>Cookies</h3>
        <p className={styles.policyText}>
          We use cookies and similar tracking technologies to track activity on our website and hold certain information. Cookies help us improve your shopping experience, remember your cart items, and understand website traffic.
        </p>
      </div>

      <div className={styles.policySection}>
        <h2 className={styles.sectionTitle}>2. How We Use Your Information</h2>
        <p className={styles.policyText}>We use the collected information for various purposes:</p>
        <ul className={styles.policyList}>
          <li>To process and fulfill your orders (including sending delivery updates).</li>
          <li>To manage and maintain your customer account.</li>
          <li>To provide customer support and respond to inquiries.</li>
          <li>To screen our orders for potential risk or fraud.</li>
          <li>To improve and optimize our website and products.</li>
          <li>To send you marketing communications, promotions, and surveys (if you have opted in).</li>
        </ul>
      </div>

      <div className={styles.policySection}>
        <h2 className={styles.sectionTitle}>3. Sharing Your Information</h2>
        <p className={styles.policyText}>
          We do not sell your personal information. We only share it with trusted third-party service providers who assist us in operating our business:
        </p>
        <ul className={styles.policyList}>
          <li><span className={styles.highlight}>Payment Gateways:</span> To process secure transactions.</li>
          <li><span className={styles.highlight}>Courier & Logistics Partners:</span> To deliver your orders.</li>
          <li><span className={styles.highlight}>Technology Providers:</span> For website hosting, analytics, and marketing platforms.</li>
          <li><span className={styles.highlight}>Legal Authorities:</span> When required by law, subpoena, or other lawful request to protect our rights.</li>
        </ul>
      </div>

      <div className={styles.policySection}>
        <h2 className={styles.sectionTitle}>4. Data Security</h2>
        <p className={styles.policyText}>
          We take reasonable administrative, technical, and physical precautions to protect your personal information against unauthorized access, loss, or alteration. Please note that while we use industry-standard measures, no method of transmission over the Internet is entirely risk-free.
        </p>
      </div>

      <div className={styles.policySection}>
        <h2 className={styles.sectionTitle}>5. User Privacy Rights</h2>
        <p className={styles.policyText}>You have the right to:</p>
        <ul className={styles.policyList}>
          <li><span className={styles.highlight}>Access:</span> Request a copy of the personal data we hold about you.</li>
          <li><span className={styles.highlight}>Correction:</span> Request updates or corrections to your personal information.</li>
          <li><span className={styles.highlight}>Deletion:</span> Request that we delete your personal data, subject to certain legal obligations (like tax or fraud prevention requirements).</li>
          <li><span className={styles.highlight}>Withdraw Consent:</span> Opt out of marketing communications at any time by clicking the "unsubscribe" link in our emails or updating your account preferences.</li>
        </ul>
      </div>
      
      <div className={styles.policySection}>
        <h2 className={styles.sectionTitle}>6. Third-Party Links</h2>
        <p className={styles.policyText}>
          Our website may contain links to third-party sites. We are not responsible for the privacy practices or content of these external sites. We encourage you to review their respective privacy policies.
        </p>
      </div>

      <div className={styles.policySection}>
        <h2 className={styles.sectionTitle}>7. Changes to This Policy</h2>
        <p className={styles.policyText}>
          We may update this Privacy Policy from time to time to reflect changes to our practices or for other operational, legal, or regulatory reasons. Changes will be posted on this page with an updated "Last Updated" date.
        </p>
      </div>

      <div className={styles.policySection}>
        <h2 className={styles.sectionTitle}>Contact Us</h2>
        <p className={styles.policyText}>
          For any questions, concerns, or data requests related to your privacy, please contact our Data Protection team at <a href={`mailto:${POLICY_CONFIG.supportEmail}`} className={styles.highlight}>{POLICY_CONFIG.supportEmail}</a> or write to us at:
        </p>
        <p className={styles.policyText} style={{ whiteSpace: 'pre-line' }}>
          {POLICY_CONFIG.address}
        </p>
      </div>
    </div>
  );
}
