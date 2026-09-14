"use client";

import React, { useState, useMemo } from 'react';
import ProductCard from './ProductCard';
import styles from '../app/(public)/page.module.css';
import { filterProductsByCategory } from '@/lib/productFiltering';

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
    switch (activeTab) {
      case 'MENS':
        return filterProductsByCategory(products, 'MEN');
      case 'WOMEN':
        return filterProductsByCategory(products, 'WOMEN');
      case 'TSHIRTS':
        return filterProductsByCategory(products, 'TSHIRTS');
      case 'HOODIES':
        return filterProductsByCategory(products, 'HOODIES');
      case 'ALL':
      default:
        return filterProductsByCategory(products, 'ALL');
    }
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
        <div style={{
          textAlign: 'center',
          padding: '3.5rem 1.5rem',
          maxWidth: '520px',
          margin: '0 auto',
        }}>
          <h3 style={{
            fontSize: '1.2rem',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#111111',
            marginBottom: '0.5rem'
          }}>
            {activeTab === 'WOMEN' ? "Women's Collection Coming Soon" : "Coming Soon"}
          </h3>
          <p style={{
            fontSize: '0.875rem',
            color: '#666666',
            lineHeight: 1.6,
            marginBottom: '1.5rem'
          }}>
            {activeTab === 'WOMEN'
              ? "We're currently crafting new luxury pieces for our Women's collection. Stay tuned for upcoming drops."
              : "New products are coming soon."}
          </p>
          <button
            type="button"
            onClick={() => setActiveTab('ALL')}
            style={{
              display: 'inline-block',
              backgroundColor: '#111111',
              color: '#FFFFFF',
              padding: '0.7rem 1.6rem',
              fontSize: '0.8rem',
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              borderRadius: '4px',
              cursor: 'pointer',
              border: 'none',
              transition: 'all 0.2s ease',
            }}
          >
            Explore All Products
          </button>
        </div>
      ) : (
        <div className={styles.featuredProductGrid}>
          {filteredProducts.map((product, idx) => (
            <ProductCard key={product.id} product={product} priority={idx < 4} />
          ))}
        </div>
      )}
    </section>
  );
}
