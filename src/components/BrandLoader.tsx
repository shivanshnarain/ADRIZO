import React from "react";
import Image from "next/image";
import styles from "./BrandLoader.module.css";

export default function BrandLoader() {
  return (
    <div className={styles.loaderContainer} role="status" aria-label="Loading">
      <div className={styles.logoWrapper}>
        <Image
          src="/adrizo-logo-dark.png"
          alt="ADRIZO"
          width={170}
          height={23}
          priority
          className={styles.logo}
        />
        <div className={styles.progressBarWrapper}>
          <div className={styles.progressBar} />
        </div>
      </div>
    </div>
  );
}
