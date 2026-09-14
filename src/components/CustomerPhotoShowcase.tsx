"use client";

import React, { useMemo } from 'react';
import styles from './CustomerPhotoShowcase.module.css';
import { CustomerPhotoItem } from '@/lib/customer-photos-service';

interface CustomerPhotoShowcaseProps {
  initialRow1?: CustomerPhotoItem[];
  initialRow2?: CustomerPhotoItem[];
}

/**
 * Creates a duplicate array sequence ensuring the track is wide enough to loop
 * seamlessly with CSS translate3d(-50%) without any empty gaps or jumps.
 */
function prepareSeamlessTrack(items: CustomerPhotoItem[]): CustomerPhotoItem[] {
  if (!items || items.length === 0) return [];
  
  // Multiply list until minimum 6 items so track spans wider than viewport
  let repeated = [...items];
  while (repeated.length < 6) {
    repeated = [...repeated, ...items];
  }

  // Duplicate for the 50% translation loop
  return [...repeated, ...repeated];
}

export default function CustomerPhotoShowcase({
  initialRow1 = [],
  initialRow2 = [],
}: CustomerPhotoShowcaseProps) {
  const [row1Photos, setRow1Photos] = React.useState<CustomerPhotoItem[]>(initialRow1);
  const [row2Photos, setRow2Photos] = React.useState<CustomerPhotoItem[]>(initialRow2);

  React.useEffect(() => {
    let isMounted = true;
    fetch('/api/customer-photos')
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data && data.success) {
          if (Array.isArray(data.row1)) setRow1Photos(data.row1);
          if (Array.isArray(data.row2)) setRow2Photos(data.row2);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const row1Seamless = useMemo(() => prepareSeamlessTrack(row1Photos), [row1Photos]);
  const row2Seamless = useMemo(() => prepareSeamlessTrack(row2Photos), [row2Photos]);

  // If no customer photos exist across both rows, hide the section entirely
  if (row1Seamless.length === 0 && row2Seamless.length === 0) {
    return null;
  }

  return (
    <section className={styles.showcaseSection} aria-label="Customer Photo Showcase">
      <div className={styles.rowsContainer}>
        {/* ROW 1: Continuous movement from RIGHT -> LEFT */}
        {row1Seamless.length > 0 && (
          <div className={styles.marqueeRow} aria-hidden="true">
            <div className={`${styles.marqueeTrack} ${styles.rowSlideLeft}`}>
              {row1Seamless.map((photo, index) => (
                <div key={`r1-${photo.id}-${index}`} className={styles.photoCard}>
                  <img
                    src={photo.imageUrl}
                    alt=""
                    className={styles.photoImage}
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ROW 2: Continuous movement from LEFT -> RIGHT */}
        {row2Seamless.length > 0 && (
          <div className={styles.marqueeRow} aria-hidden="true">
            <div className={`${styles.marqueeTrack} ${styles.rowSlideRight}`}>
              {row2Seamless.map((photo, index) => (
                <div key={`r2-${photo.id}-${index}`} className={styles.photoCard}>
                  <img
                    src={photo.imageUrl}
                    alt=""
                    className={styles.photoImage}
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
