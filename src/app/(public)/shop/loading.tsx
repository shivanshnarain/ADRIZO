import styles from "./shop.module.css";
import cardStyles from "@/components/ProductCard.module.css";

export default function ShopLoading() {
  return (
    <div className={styles.shopPageWrapper} aria-busy="true" aria-label="Loading catalog">
      <div className={styles.shopContainer}>
        <div className={styles.headerSection}>
          <div style={{ width: 120, height: 16, backgroundColor: '#F3F4F6', borderRadius: 4, marginBottom: '0.85rem' }} />
          <div style={{ width: 220, height: 32, backgroundColor: '#F3F4F6', borderRadius: 4 }} />
        </div>
        <div className={styles.shopLayout}>
          <main className={styles.mainContent}>
            <div className={styles.productGrid}>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className={cardStyles.productCard} style={{ pointerEvents: 'none' }}>
                  <div className={cardStyles.imageContainer} style={{ backgroundColor: '#F3F4F6' }} />
                  <div style={{ padding: '12px 4px 4px' }}>
                    <div style={{ width: '80%', height: 16, backgroundColor: '#F3F4F6', borderRadius: 4, marginBottom: 8 }} />
                    <div style={{ width: '40%', height: 18, backgroundColor: '#F3F4F6', borderRadius: 4 }} />
                  </div>
                </div>
              ))}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
