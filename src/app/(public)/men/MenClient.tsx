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
  { id: 'ALL', label: 'ALL PRODUCTS' },
  { id: 'hoodies', label: 'HOODIES' },
  { id: 'zipper-polo', label: 'ZIPPER POLO T-SHIRTS' },
  { id: 'button-polo', label: 'BUTTON POLO T-SHIRTS' },
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
    setActiveCategory(catId);
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
        <h1 className={styles.pageTitle}>MEN&apos;S CLOTHING</h1>
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

      {/* 4. Section Heading */}
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>MEN&apos;S PRODUCTS</h2>
      </div>

      {/* 5. Product Grid */}
      <section className={styles.productGridSection} aria-label="Men's Clothing Products">
        {filteredProducts.length === 0 ? (
          <div className={styles.emptyState}>
            <h3 className={styles.emptyStateTitle}>No products found in this category</h3>
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
    </div>
  );
}
