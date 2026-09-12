import styles from "./product.module.css";

export default function ProductLoading() {
  return (
    <div className={styles.pageContainer} aria-busy="true" aria-label="Loading product details">
      <div className={styles.productLayout}>
        {/* Left Column: Gallery Skeleton */}
        <div className={styles.gallerySection}>
          <div className={`${styles.thumbnailColumn} ${styles.desktopThumbnailColumn}`}>
            <div className={styles.thumbnailList}>
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className={`${styles.thumbnailCard} ${styles.skeletonPulse}`} />
              ))}
            </div>
          </div>
          <div className={styles.mainImageWrapper}>
            <div className={`${styles.mainImageCard} ${styles.skeletonPulse}`} />
          </div>
        </div>

        {/* Right Column: Product Information Skeleton */}
        <div className={styles.productInfoSection}>
          <div className={styles.topInfoSection}>
            <div className={`${styles.skeletonLine} ${styles.skeletonTitle}`} />
            <div className={`${styles.skeletonLine} ${styles.skeletonPrice}`} />
            <div className={styles.sizeSection}>
              <div className={`${styles.skeletonLine} ${styles.skeletonLabel}`} />
              <div className={styles.sizeBoxesWrap}>
                {['S', 'M', 'L', 'XL', 'XXL'].map((s) => (
                  <div key={s} className={`${styles.sizeBox} ${styles.skeletonPulse}`} />
                ))}
              </div>
            </div>
            <div className={`${styles.skeletonLine} ${styles.skeletonBtn}`} />
          </div>
        </div>
      </div>
    </div>
  );
}
