"use client";

import React, { useState, useMemo } from 'react';
import ProductCard from './ProductCard';
import styles from '../app/(public)/page.module.css';

interface HomeProductSectionProps {
  products: any[];
}

type TabType = 'ALL' | 'MENS' | 'WOMEN' | 'TSHIRTS' | 'HOODIES';

const TABS: { id: TabType; label: string }[] = [
  { id: 'ALL', label: 'ALL' },
  { id: 'MENS', label: 'MEN’S' },
  { id: 'WOMEN', label: 'WOMEN' },
  { id: 'TSHIRTS', label: 'T-SHIRTS' },
  { id: 'HOODIES', label: 'HOODIES' },
];

export default function HomeProductSection({ products }: HomeProductSectionProps) {
  const [activeTab, setActiveTab] = useState<TabType>('ALL');

  const filteredProducts = useMemo(() => {
    if (activeTab === 'ALL') return products;

    return products.filter((p) => {
      const name = (p.name || '').toLowerCase();
      const desc = (p.description || '').toLowerCase();
      const type = (p.productType || '').toLowerCase();
      const catName = (p.category?.name || '').toLowerCase();
      const catSlug = (p.category?.slug || '').toLowerCase();

      // T-Shirts detection
      const isTShirt =
        catSlug.includes('t-shirt') ||
        catName.includes('t-shirt') ||
        type.includes('t-shirt') ||
        name.includes('t-shirt') ||
        type.includes('polo') ||
        name.includes('polo');

      // Hoodies detection
      const isHoodie =
        catSlug.includes('hoodie') ||
        catName.includes('hoodie') ||
        type.includes('hoodie') ||
        name.includes('hoodie');

      // Women's detection: Explicit women's naming or unisex
      const isWomenExplicit =
        name.includes('women') ||
        type.includes('women') ||
        catName.includes('women') ||
        catSlug.includes('women');
      const isUnisex =
        desc.includes('unisex') ||
        name.includes('unisex') ||
        type.includes('unisex');
      const isWomen = isWomenExplicit || isUnisex;

      // Men's detection: Explicit men's naming, polo/t-shirts, unisex, or standard collection
      const isMenExplicit =
        name.includes('men') ||
        type.includes('men') ||
        catName.includes('men') ||
        catSlug.includes('men');
      const isMen = isMenExplicit || isTShirt || isUnisex || !isWomenExplicit;

      switch (activeTab) {
        case 'MENS':
          return isMen;
        case 'WOMEN':
          return isWomen;
        case 'TSHIRTS':
          return isTShirt;
        case 'HOODIES':
          return isHoodie;
        default:
          return true;
      }
    });
  }, [products, activeTab]);

  return (
    <section className={styles.newArrivalsSection} aria-label="Our Collection">
      <div className={styles.newArrivalsHeader}>
        <h2 className={styles.newArrivalsTitle}>
          OUR COLLECTION
          <span className={styles.newArrivalsTitleLine} aria-hidden="true" />
        </h2>
      </div>

      {/* 5 Filter Tabs in exact required order: ALL → MEN’S → WOMEN → T-SHIRTS → HOODIES */}
      <div className={styles.filtersSection}>
        <div className={styles.filterTabs} role="tablist" aria-label="Product Categories">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id)}
                className={`${styles.filterTab} ${isActive ? styles.filterTabActive : ''}`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {filteredProducts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#888' }}>
          No products available in this category.
        </div>
      ) : (
        <div className={styles.featuredProductGrid}>
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </section>
  );
}
