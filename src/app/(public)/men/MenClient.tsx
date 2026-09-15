"use client";

import { useState, useMemo } from 'react';
import Link from 'next/link';
import ProductCard from '@/components/ProductCard';
import { 
  isHoodieProduct, 
  isZipperPoloProduct, 
  isButtonPoloProduct, 
  ProductLike 
} from '@/lib/productFiltering';
import styles from './men.module.css';

interface MenClientProps {
  initialProducts: any[];
}

type CategoryFilter = 'ALL' | 'hoodies' | 'zipper-polo' | 'button-polo';

const CATEGORIES: Array<{ id: CategoryFilter; label: string }> = [
  { id: 'ALL', label: 'All' },
  { id: 'hoodies', label: 'Hoodies' },
  { id: 'zipper-polo', label: 'Zipper Polo T-Shirts' },
  { id: 'button-polo', label: 'Button Polo T-Shirts' },
];

export default function MenClient({ initialProducts }: MenClientProps) {
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('ALL');

  const filteredProducts = useMemo(() => {
    if (activeCategory === 'hoodies') {
      return initialProducts.filter((p) => isHoodieProduct(p));
    }
    if (activeCategory === 'zipper-polo') {
      return initialProducts.filter((p) => isZipperPoloProduct(p));
    }
    if (activeCategory === 'button-polo') {
      return initialProducts.filter((p) => isButtonPoloProduct(p));
    }
    return initialProducts;
  }, [activeCategory, initialProducts]);

  const handleCategoryClick = (catId: CategoryFilter) => {
    setActiveCategory((prev) => (prev === catId && catId !== 'ALL' ? 'ALL' : catId));
  };

  return (
    <div className={styles.pageContainer}>
      {/* 1. Breadcrumb */}
      <nav aria-label="Breadcrumb" className={styles.breadcrumbNav}>
        <Link href="/" className={styles.breadcrumbLink}>Home</Link>
        <span className={styles.breadcrumbSeparator}>&rsaquo;</span>
        <span className={styles.breadcrumbCurrent}>Men&apos;s Clothing</span>
      </nav>

      {/* 2. Men's Title */}
      <header className={styles.headerSection}>
        <h1 className={styles.pageTitle}>Men&apos;s Clothing</h1>
      </header>

      {/* 3. Simple Horizontal Category Filter Row */}
      <div 
        className={styles.categoryFilterRow} 
        role="tablist" 
        aria-label="Men's Clothing Categories"
      >
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`${styles.categoryPill} ${isActive ? styles.categoryPillActive : ''}`}
              onClick={() => handleCategoryClick(cat.id)}
              id={`men-cat-btn-${cat.id}`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* 4. Product Grid */}
      <section className={styles.productGridSection} aria-label="Men's Clothing Products">
        {filteredProducts.length === 0 ? (
          <div className={styles.emptyState}>
            <h2 className={styles.emptyStateTitle}>No products found in this category</h2>
            <button
              type="button"
              className={styles.categoryPill}
              onClick={() => setActiveCategory('ALL')}
            >
              View All Men&apos;s Products
            </button>
          </div>
        ) : (
          <div className={styles.productGrid}>
            {filteredProducts.map((p, idx) => (
              <ProductCard
                key={p.id}
                product={p}
                priority={idx < 4}
              />
            ))}
          </div>
        )}
      </section>

      {/* 5. Minimal Brand Note at End of Page (Section 15) */}
      <footer className={styles.pageFooterBrandNote}>
        <p className={styles.brandNoteText}>ADRIZO Men&apos;s</p>
      </footer>
    </div>
  );
}
