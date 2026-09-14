"use client";

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import styles from './CustomerPhotoShowcase.module.css';
import { CustomerPhotoItem } from '@/lib/customer-photos-service';

interface CustomerPhotoShowcaseProps {
  initialRow1?: CustomerPhotoItem[];
  initialRow2?: CustomerPhotoItem[];
}

/**
 * Ensures the items array is long enough to span the full viewport
 * before duplicating across the seamless double-track marquee.
 */
function prepareTrackItems(items: CustomerPhotoItem[]): CustomerPhotoItem[] {
  if (!items || items.length === 0) return [];
  
  let repeated = [...items];
  while (repeated.length < 6) {
    repeated = [...repeated, ...items];
  }

  return repeated;
}

export default function CustomerPhotoShowcase({
  initialRow1 = [],
  initialRow2 = [],
}: CustomerPhotoShowcaseProps) {
  const [row1Photos, setRow1Photos] = useState<CustomerPhotoItem[]>(initialRow1);
  const [row2Photos, setRow2Photos] = useState<CustomerPhotoItem[]>(initialRow2);

  // Revalidate photos from API to reflect additions and deletions in realtime
  const refreshPhotos = useCallback(() => {
    fetch(`/api/customer-photos?t=${Date.now()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.success) {
          if (Array.isArray(data.row1)) setRow1Photos(data.row1);
          if (Array.isArray(data.row2)) setRow2Photos(data.row2);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    // Only fetch immediately if initial photos weren't provided via SSR
    if (initialRow1.length === 0 && initialRow2.length === 0) {
      refreshPhotos();
    }

    // Refresh when user returns to tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshPhotos();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Periodic lightweight background sync (every 60s)
    const intervalId = setInterval(refreshPhotos, 60000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(intervalId);
    };
  }, [refreshPhotos, initialRow1.length, initialRow2.length]);

  const row1Items = useMemo(() => prepareTrackItems(row1Photos), [row1Photos]);
  const row2Items = useMemo(() => prepareTrackItems(row2Photos), [row2Photos]);

  // If no customer photos exist across both rows, hide section entirely
  if (row1Items.length === 0 && row2Items.length === 0) {
    return null;
  }

  const renderCard = (photo: CustomerPhotoItem, keySuffix: string) => {
    return (
      <div
        key={`${photo.id}-${keySuffix}`}
        className={styles.photoCard}
        draggable={false}
        onDragStart={(e) => e.preventDefault()}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        {/* Transparent protection shield preventing direct image drag / right-click */}
        <div className={styles.photoShield} aria-hidden="true" />
        <img
          src={photo.imageUrl}
          alt="ADRIZO customer outfit"
          className={styles.photoImage}
          loading="eager"
          decoding="async"
          draggable={false}
          onError={(e) => {
            const target = e.currentTarget;
            if (photo.imageUrl.startsWith('/uploads/customer-photos/')) {
              const filename = photo.imageUrl.replace('/uploads/customer-photos/', '');
              const altSrc = `/api/customer-photos/image/${filename}`;
              if (!target.src.includes('/api/customer-photos/image/')) {
                target.src = altSrc;
                return;
              }
            }
            // Gracefully hide card if image is broken so no question mark ever displays
            if (target.parentElement) {
              target.parentElement.style.display = 'none';
            }
          }}
        />
      </div>
    );
  };

  return (
    <section
      className={styles.showcaseSection}
      aria-label="Customer Photo Showcase"
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className={styles.rowsContainer}>
        {/* ROW 1: Continuous movement from RIGHT -> LEFT */}
        {row1Items.length > 0 && (
          <div className={styles.marqueeRow} aria-hidden="true">
            {/* Primary Track */}
            <div className={`${styles.marqueeTrack} ${styles.rowSlideLeft}`}>
              {row1Items.map((photo, index) => renderCard(photo, `r1-a-${index}`))}
            </div>
            {/* Seamless Duplicate Track for zero-jump continuous looping */}
            <div className={`${styles.marqueeTrack} ${styles.rowSlideLeft}`} aria-hidden="true">
              {row1Items.map((photo, index) => renderCard(photo, `r1-b-${index}`))}
            </div>
          </div>
        )}

        {/* ROW 2: Continuous movement from LEFT -> RIGHT */}
        {row2Items.length > 0 && (
          <div className={styles.marqueeRow} aria-hidden="true">
            {/* Primary Track */}
            <div className={`${styles.marqueeTrack} ${styles.rowSlideRight}`}>
              {row2Items.map((photo, index) => renderCard(photo, `r2-a-${index}`))}
            </div>
            {/* Seamless Duplicate Track for zero-jump continuous looping */}
            <div className={`${styles.marqueeTrack} ${styles.rowSlideRight}`} aria-hidden="true">
              {row2Items.map((photo, index) => renderCard(photo, `r2-b-${index}`))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
