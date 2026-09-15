import styles from './product.module.css';

export default function ProductLoading() {
  return (
    <div className={styles.pageContainer} aria-busy="true" aria-label="Loading product details">
      <div className={styles.productLayout}>
        {/* Left Side: Product Image Showcase Skeleton */}
        <div className={styles.gallerySection}>
          <div className={styles.mainImageWrapper}>
            <div className={`${styles.mainImageCard} ${styles.skeletonPulse}`} />
          </div>
        </div>

        {/* Right Side: Product Details Skeleton */}
        <div className={styles.productInfoSection}>
          <div className={styles.topInfoSection}>
            <div className={`${styles.skeletonLine} ${styles.skeletonTitle}`} />
            <div className={`${styles.skeletonLine} ${styles.skeletonPrice}`} />
            <div className={`${styles.skeletonLine} ${styles.skeletonLabel}`} />
            <div className={`${styles.skeletonLine} ${styles.skeletonBtn}`} />
          </div>
        </div>
      </div>
    </div>
  );
}
