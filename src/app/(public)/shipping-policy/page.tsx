import { POLICY_CONFIG } from '@/config/policies';
import styles from '../policies.module.css';
import { Metadata } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.adrizo.com';

export const metadata: Metadata = {
  title: `${POLICY_CONFIG.companyName} Shipping Policy — Delivery Timelines & Charges`,
  description: `Official Shipping Policy for ADRIZO. Free express shipping on orders above ₹${POLICY_CONFIG.shipping.freeShippingThreshold} across India. Estimated delivery 2–4 business days in metro cities.`,
  alternates: {
    canonical: `${siteUrl}/shipping-policy`,
  },
  openGraph: {
    title: `${POLICY_CONFIG.companyName} Shipping Policy`,
    description: `Official Shipping Policy for ADRIZO. Free shipping above ₹${POLICY_CONFIG.shipping.freeShippingThreshold} across India.`,
    url: `${siteUrl}/shipping-policy`,
    siteName: 'ADRIZO',
  },
};

export default function ShippingPolicy() {
  return (
    <div className={styles.policyContainer}>
      <header className={styles.policyHeader}>
        <h1 className={styles.policyTitle}>Shipping Policy</h1>
        <p className={styles.lastUpdated}>Last Updated: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
      </header>

      <div className={styles.policySection}>
        <h2 className={styles.sectionTitle}>1. Shipping Charges</h2>
        <p className={styles.policyText}>
          We offer <span className={styles.highlight}>Free Shipping</span> on all prepaid and COD orders above ₹{POLICY_CONFIG.shipping.freeShippingThreshold}. 
          For orders below ₹{POLICY_CONFIG.shipping.freeShippingThreshold}, a flat shipping fee of ₹{POLICY_CONFIG.shipping.standardFee} applies.
        </p>
        <p className={styles.policyText}>
          Cash on Delivery (COD) is available across most PIN codes in India. {POLICY_CONFIG.shipping.codHandlingFee > 0 ? `A COD handling fee of ₹${POLICY_CONFIG.shipping.codHandlingFee} applies to all COD orders.` : 'We currently do not charge an additional handling fee for COD orders.'}
        </p>
      </div>

      <div className={styles.policySection}>
        <h2 className={styles.sectionTitle}>2. Order Processing Time</h2>
        <p className={styles.policyText}>
          All orders are typically processed within <span className={styles.highlight}>{POLICY_CONFIG.shipping.processingTimeDays} business days</span> (excluding weekends and public holidays) after receiving your order confirmation email. You will receive another notification when your order has shipped.
        </p>
      </div>

      <div className={styles.policySection}>
        <h2 className={styles.sectionTitle}>3. Delivery Timelines</h2>
        <p className={styles.policyText}>Once dispatched, estimated delivery timelines are as follows:</p>
        <ul className={styles.policyList}>
          <li><span className={styles.highlight}>Metro Cities:</span> {POLICY_CONFIG.shipping.deliveryMetroDays} business days</li>
          <li><span className={styles.highlight}>Rest of India:</span> {POLICY_CONFIG.shipping.deliveryRestOfIndiaDays} business days</li>
        </ul>
        <p className={styles.policyText}>
          Please note that delivery times are estimates and may be subject to delays beyond our control, such as severe weather, natural disasters, or logistical issues with courier partners.
        </p>
      </div>

      <div className={styles.policySection}>
        <h2 className={styles.sectionTitle}>4. Tracking Information</h2>
        <p className={styles.policyText}>
          Once your order has shipped, you will receive an email and SMS containing your tracking number and a link to trace your package. Please allow up to 24 hours for the tracking portal to update.
        </p>
      </div>

      <div className={styles.policySection}>
        <h2 className={styles.sectionTitle}>5. Delivery Exceptions</h2>
        
        <h3 className={styles.subSectionTitle}>Lost Shipments</h3>
        <p className={styles.policyText}>
          If your tracking shows as "delivered" but you haven't received your package, please report this to us within 48 hours. We will raise an investigation with our courier partner.
        </p>
        
        <h3 className={styles.subSectionTitle}>Incorrect Shipping Address</h3>
        <p className={styles.policyText}>
          {POLICY_CONFIG.companyName} is not responsible for orders delivered to incorrect addresses provided by the customer. Please verify your shipping address during checkout.
        </p>
        
        <h3 className={styles.subSectionTitle}>Damaged Parcels / Wrong Items</h3>
        <p className={styles.policyText}>
          If your parcel appears tampered with or heavily damaged upon arrival, please refuse the delivery and contact us immediately. For wrong or missing items inside an intact package, please refer to our Refund & Return Policy and submit an unboxing video.
        </p>

        <h3 className={styles.subSectionTitle}>Refused / Unaccepted Deliveries</h3>
        <p className={styles.policyText}>
          Repeated refusal of COD orders will result in the customer's account being permanently restricted to Prepaid orders only.
        </p>
      </div>

      <div className={styles.policySection}>
        <h2 className={styles.sectionTitle}>Contact Support</h2>
        <p className={styles.policyText}>
          For shipping-related queries, reach out to us at <a href={`mailto:${POLICY_CONFIG.supportEmail}`} className={styles.highlight}>{POLICY_CONFIG.supportEmail}</a> or <a href={`tel:${POLICY_CONFIG.supportPhone.replace(/\s+/g, '')}`} className={styles.highlight}>{POLICY_CONFIG.supportPhone}</a>.
        </p>
      </div>
    </div>
  );
}
