import { POLICY_CONFIG } from '@/config/policies';
import styles from '../policies.module.css';
import { Metadata } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.adrizo.com';

export const metadata: Metadata = {
  title: `${POLICY_CONFIG.companyName} Refund & Return Policy — 7 Days Easy Returns`,
  description: `Official Refund and Return Policy for ADRIZO. Enjoy 7-day hassle-free returns and exchanges for all orders. Transparent and quick customer support.`,
  alternates: {
    canonical: `${siteUrl}/refund-return-policy`,
  },
  openGraph: {
    title: `${POLICY_CONFIG.companyName} Refund & Return Policy`,
    description: `Official Refund and Return Policy for ADRIZO. 7-day hassle-free returns and exchanges.`,
    url: `${siteUrl}/refund-return-policy`,
    siteName: 'ADRIZO',
  },
};

export default function RefundReturnPolicy() {
  return (
    <div className={styles.policyContainer}>
      <header className={styles.policyHeader}>
        <h1 className={styles.policyTitle}>Refund & Return Policy</h1>
        <p className={styles.lastUpdated}>Last Updated: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
      </header>

      <div className={styles.policySection}>
        <p className={styles.policyText}>
          At {POLICY_CONFIG.companyName}, we strive to ensure you have the best shopping experience possible. If you are not entirely satisfied with your purchase, we're here to help.
        </p>
      </div>

      <div className={styles.policySection}>
        <h2 className={styles.sectionTitle}>1. Return & Exchange Window</h2>
        <p className={styles.policyText}>
          You have <span className={styles.highlight}>{POLICY_CONFIG.returns.standardWindowDays} days</span> from the date of delivery to initiate a return or exchange for eligible items. Requests made after this period will not be accepted.
        </p>
      </div>

      <div className={styles.policySection}>
        <h2 className={styles.sectionTitle}>2. Incorrect / Missing / Damaged Items</h2>
        <p className={styles.policyText}>
          If you receive an incorrect, missing, or damaged item, you must report it to us within <span className={styles.highlight}>{POLICY_CONFIG.returns.damageReportWindowHours} hours</span> of delivery. 
        </p>
        {POLICY_CONFIG.returns.unboxingVideoRequired && (
          <p className={styles.policyText}>
            <span className={styles.highlight}>Important:</span> An unboxing video starting from the sealed package is mandatory to process claims for missing or damaged items. Please email the video and your Order ID to <a href={`mailto:${POLICY_CONFIG.supportEmail}`} className={styles.highlight}>{POLICY_CONFIG.supportEmail}</a>.
          </p>
        )}
      </div>

      <div className={styles.policySection}>
        <h2 className={styles.sectionTitle}>3. Return Eligibility</h2>
        <p className={styles.policyText}>To be eligible for a return, the following conditions must be met:</p>
        <ul className={styles.policyList}>
          <li>The product must be unused, unwashed, and in the same condition that you received it.</li>
          <li>Original tags must remain attached to the garment.</li>
          <li>The item must be in its original packaging.</li>
          <li>A valid proof of purchase or Order ID must be provided.</li>
        </ul>
        <h3 className={styles.subSectionTitle}>Non-returnable conditions</h3>
        <ul className={styles.policyList}>
          <li>Items marked as Final Sale or Clearance.</li>
          <li>Innerwear, swimwear, or accessories (for hygiene reasons).</li>
          <li>Items showing signs of wear, washing, perfume, or damage caused by the customer.</li>
        </ul>
      </div>

      <div className={styles.policySection}>
        <h2 className={styles.sectionTitle}>4. Reverse Pickup Process</h2>
        <p className={styles.policyText}>
          Once a return is approved, we will schedule a reverse pickup. Our courier partner will typically collect the package within {POLICY_CONFIG.shipping.processingTimeDays} business days. 
        </p>
        <h3 className={styles.subSectionTitle}>What happens if reverse pickup is unavailable?</h3>
        <p className={styles.policyText}>
          In rare cases where your PIN code is unserviceable for reverse pickup, you will need to self-ship the product to our facility. {POLICY_CONFIG.companyName} will reimburse standard shipping costs (up to a predefined limit) upon providing the courier receipt.
        </p>
      </div>

      <div className={styles.policySection}>
        <h2 className={styles.sectionTitle}>5. Refund Policy</h2>
        <p className={styles.policyText}>
          Refunds are processed after the returned product passes our quality inspection. 
        </p>
        <h3 className={styles.subSectionTitle}>Prepaid Orders</h3>
        <p className={styles.policyText}>
          Refunds will be issued to the {POLICY_CONFIG.refunds.prepaidMethod} within {POLICY_CONFIG.refunds.processingTimeDays} after quality check approval.
        </p>
        <h3 className={styles.subSectionTitle}>COD Orders</h3>
        <p className={styles.policyText}>
          For Cash on Delivery orders, refunds will be provided via {POLICY_CONFIG.refunds.codMethod}. You will receive an email requesting your bank account or UPI details.
        </p>
      </div>

      <div className={styles.policySection}>
        <h2 className={styles.sectionTitle}>6. Order Cancellation</h2>
        <p className={styles.policyText}>
          Orders can only be cancelled before they are dispatched. Once an order is handed over to our courier partner, it cannot be cancelled, and the standard return policy will apply.
        </p>
      </div>

      <div className={styles.policySection}>
        <h2 className={styles.sectionTitle}>Contact Us</h2>
        <p className={styles.policyText}>
          If you have any questions regarding your return, please contact our support team at <a href={`mailto:${POLICY_CONFIG.supportEmail}`} className={styles.highlight}>{POLICY_CONFIG.supportEmail}</a> or call us at <a href={`tel:${POLICY_CONFIG.supportPhone.replace(/\s+/g, '')}`} className={styles.highlight}>{POLICY_CONFIG.supportPhone}</a> during our business hours ({POLICY_CONFIG.businessHours}).
        </p>
      </div>
    </div>
  );
}
