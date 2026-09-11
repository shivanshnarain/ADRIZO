import Link from 'next/link';
import styles from './Footer.module.css';
import AdrizoLogo from './AdrizoLogo';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className="container">
        {/* Brand Section */}
        <div className={styles.brand}>
          <div className={styles.brandName}>
            <AdrizoLogo height={26} accentColor="#FFC800" wordmarkColor="#f0f0f0" />
          </div>
          <p className={styles.brandDesc}>
            Premium Indian clothing brand specializing in high-quality men&apos;s and women&apos;s fashion. Style that defines you.
          </p>
        </div>

        {/* Footer Navigation Columns: 1 row on Desktop (4 cols), 2x2 grid on Mobile */}
        <div className={styles.contentGrid}>
          {/* 1. POLICY */}
          <div className={styles.column}>
            <h4 className={styles.columnTitle}>POLICY</h4>
            <div className={styles.linkList}>
              <Link href="/refund-return-policy">Refund &amp; Return Policy</Link>
              <Link href="/shipping-policy">Shipping Policy</Link>
              <Link href="/privacy-policy">Privacy Policy</Link>
              <Link href="/terms-and-conditions">Terms and Conditions</Link>
            </div>
          </div>

          {/* 2. QUICK LINKS */}
          <div className={styles.column}>
            <h4 className={styles.columnTitle}>QUICK LINKS</h4>
            <div className={styles.linkList}>
              <Link href="/">Home</Link>
              <Link href="/shop">Shop</Link>
              <Link href="/about">About</Link>
              <Link href="/contact">Contact</Link>
            </div>
          </div>

          {/* 3. SUPPORT */}
          <div className={styles.column}>
            <h4 className={styles.columnTitle}>SUPPORT</h4>
            <div className={styles.linkList}>
              <Link href="/contact">Contact Us</Link>
              <Link href="/faq">FAQs</Link>
            </div>
          </div>

          {/* 4. FOLLOW US */}
          <div className={styles.column}>
            <h4 className={styles.columnTitle}>FOLLOW US</h4>
            <div className={styles.linkList}>
              <div className={styles.emailItem}>
                <span className={styles.emailLabel}>Email: </span>
                <a href="mailto:care.adrizo@gmail.com" className={styles.emailLink}>
                  care.adrizo@gmail.com
                </a>
              </div>
              <div>
                <a
                  href="https://www.instagram.com/adrizo_official?igsi=d3QwMjIwNHI4dGpm"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.instagramLink}
                >
                  Instagram
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className={styles.bottomBar}>
          <div className={styles.bottomContent}>
            <p className={styles.copyright}>
              &copy; {new Date().getFullYear()} ADRIZO. All rights reserved.
            </p>
            <p className={styles.developerCredit}>
              Designed &amp; Developed By{' '}
              <a
                href="https://shivanshnarain.me"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.developerLink}
              >
                SHIVANSHNARAIN.me
              </a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
