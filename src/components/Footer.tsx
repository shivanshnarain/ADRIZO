import Link from 'next/link';
import styles from './Footer.module.css';
import AdrizoLogo from './AdrizoLogo';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className="container">
        <div className={styles.footerGrid}>
          {/* Brand Column */}
          <div className={styles.brand}>
            <div className={styles.brandName}>
              <AdrizoLogo height={26} accentColor="#FFC800" wordmarkColor="#f0f0f0" />
            </div>
            <p className={styles.brandDesc}>
              Premium Indian clothing brand specializing in high-quality men's and women's fashion. Style that defines you.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className={styles.columnTitle}>Quick Links</h4>
            <div className={styles.linkList}>
              <Link href="/">Home</Link>
              <Link href="/shop">Shop</Link>
              <Link href="/about">About Us</Link>
              <Link href="/contact">Contact</Link>
            </div>
          </div>

          {/* Support */}
          <div>
            <h4 className={styles.columnTitle}>Support</h4>
            <div className={styles.linkList}>
              <Link href="/contact">Contact Us</Link>
              <Link href="/faq">FAQs</Link>
            </div>
          </div>

          {/* Policies */}
          <div>
            <h4 className={styles.columnTitle}>Policies</h4>
            <div className={styles.linkList}>
              <Link href="/refund-return-policy">Refund & Return Policy</Link>
              <Link href="/shipping-policy">Shipping Policy</Link>
              <Link href="/privacy-policy">Privacy Policy</Link>
              <Link href="/terms-and-conditions">Terms & Conditions</Link>
            </div>
          </div>

          {/* Social */}
          <div>
            <h4 className={styles.columnTitle}>Connect With Us</h4>
            <div className={styles.socialList}>
              <a href="#" aria-label="Instagram">
                IG
              </a>
              <a href="#" aria-label="Facebook">
                FB
              </a>
              <a href="#" aria-label="WhatsApp">
                WA
              </a>
            </div>
          </div>
        </div>

        <div className={styles.bottomBar}>
          &copy; {new Date().getFullYear()} ADRIZO. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
