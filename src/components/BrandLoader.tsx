import React from "react";
import styles from "./BrandLoader.module.css";
import AdrizoLogo from "./AdrizoLogo";

export default function BrandLoader() {
  return (
    <div className={styles.loaderContainer} role="status" aria-label="Loading">
      <div className={styles.logoWrapper}>
        {/* Same ADRIZO wordmark as the navbar — yellow A, white DRIZO */}
        <AdrizoLogo
          height={36}
          accentColor="#FFC800"
          wordmarkColor="#111111"
        />
      </div>
    </div>
  );
}
