"use client";

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  ChevronDown, 
  ChevronUp, 
  SlidersHorizontal, 
  X, 
  ShieldCheck, 
  RotateCcw, 
  Truck, 
  Award 
} from 'lucide-react';
import ProductCard from '../../../components/ProductCard';
import { getProductPricing } from '../../../lib/pricing';
import styles from './shop.module.css';

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  originalPrice?: number | null;
  salePrice?: number | null;
  categoryId?: string | null;
  category?: Category | null;
  images?: Array<{ url: string; altText?: string | null }>;
  imagesRaw?: string | null;
  colorsRaw?: string | null;
  sizesRaw?: string | null;
  variants?: Array<{ size?: string | null; color?: string | null; stock?: number }>;
  newArrival?: boolean;
  onSale?: boolean;
  featured?: boolean;
  stock?: number;
  createdAt: string | Date;
}

interface ShopClientProps {
  initialProducts: Product[];
  categories: Category[];
  initialCategory?: string;
  titleOverride?: string;
}

export default function ShopClient({
  initialProducts,
  categories,
  initialCategory,
  titleOverride,
}: ShopClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Search query & sort params from URL
  const queryParam = searchParams.get('q') || '';
  const sortParam = searchParams.get('sort') || '';
  const categoryParam = searchParams.get('category') || initialCategory || 'ALL';

  // Filter States
  const [selectedCategory, setSelectedCategory] = useState<string>(categoryParam);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<number>(5000);
  const [minPrice, setMinPrice] = useState<number>(0);
  const [sortBy, setSortBy] = useState<string>(sortParam === 'new' ? 'NEWEST' : 'NEWEST');
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Accordion toggle states
  const [isCategoryOpen, setIsCategoryOpen] = useState(true);
  const [isPriceOpen, setIsPriceOpen] = useState(true);
  const [isSizeOpen, setIsSizeOpen] = useState(true);
  const [isColorOpen, setIsColorOpen] = useState(true);

  // Update selected category if categoryParam changes
  useEffect(() => {
    if (categoryParam) {
      // Find category by slug or id
      const matched = categories.find((c) => c.slug === categoryParam || c.id === categoryParam);
      if (matched) {
        setSelectedCategory(matched.id);
      } else if (categoryParam === 'ALL') {
        setSelectedCategory('ALL');
      }
    }
  }, [categoryParam, categories]);

  // Available Sizes & Colors for filters
  const availableSizes = ['S', 'M', 'L', 'XL', 'XXL'];
  const availableColors = [
    { name: 'Black', hex: '#111111' },
    { name: 'White', hex: '#FFFFFF' },
    { name: 'Navy', hex: '#1E293B' },
    { name: 'Beige', hex: '#E5DCC5' },
    { name: 'Olive', hex: '#4B5320' },
    { name: 'Charcoal', hex: '#4A4A4A' },
  ];

  // Filtering Logic
  const filteredProducts = useMemo(() => {
    return initialProducts.filter((product) => {
      // Category filter
      if (selectedCategory !== 'ALL') {
        const catObj = categories.find((c) => c.id === selectedCategory || c.slug === selectedCategory);
        if (catObj && product.categoryId !== catObj.id) {
          return false;
        }
      }

      // Search query filter
      if (queryParam) {
        const q = queryParam.toLowerCase();
        const matchesName = product.name.toLowerCase().includes(q);
        const matchesDesc = product.description?.toLowerCase().includes(q);
        const matchesCategory = product.category?.name?.toLowerCase().includes(q);
        if (!matchesName && !matchesDesc && !matchesCategory) return false;
      }

      // Price filter (based on true selling price)
      const pricing = getProductPricing(product);
      if (pricing.sellingPrice > priceRange) return false;

      // Size filter
      if (selectedSizes.length > 0) {
        let productSizes: string[] = [];
        if (product.sizesRaw) {
          try {
            productSizes = JSON.parse(product.sizesRaw);
          } catch (e) {}
        } else if (product.variants) {
          productSizes = product.variants.map((v) => v.size || '').filter(Boolean);
        }
        const hasSize = selectedSizes.some((s) => productSizes.includes(s));
        if (!hasSize) return false;
      }

      // Color filter
      if (selectedColors.length > 0) {
        let productColors: string[] = [];
        if (product.colorsRaw) {
          try {
            productColors = JSON.parse(product.colorsRaw);
          } catch (e) {}
        } else if (product.variants) {
          productColors = product.variants.map((v) => v.color || '').filter(Boolean);
        }
        const hasColor = selectedColors.some((c) =>
          productColors.some((pc) => pc.toLowerCase().includes(c.toLowerCase()) || pc === c)
        );
        if (!hasColor) return false;
      }

      return true;
    }).sort((a, b) => {
      const pricingA = getProductPricing(a);
      const pricingB = getProductPricing(b);

      if (sortBy === 'PRICE_LOW_HIGH') return pricingA.sellingPrice - pricingB.sellingPrice;
      if (sortBy === 'PRICE_HIGH_LOW') return pricingB.sellingPrice - pricingA.sellingPrice;
      if (sortBy === 'NAME_ASC') return a.name.localeCompare(b.name);
      if (sortBy === 'DISCOUNT') {
        return pricingB.discountPercent - pricingA.discountPercent;
      }
      // NEWEST
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [initialProducts, selectedCategory, queryParam, priceRange, selectedSizes, selectedColors, sortBy, categories]);

  // Active Category Name
  const activeCategoryObj = categories.find((c) => c.id === selectedCategory || c.slug === selectedCategory);
  const pageHeading = titleOverride || (activeCategoryObj ? activeCategoryObj.name : 'ALL PRODUCTS');

  const toggleSizeFilter = (size: string) => {
    setSelectedSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    );
  };

  const toggleColorFilter = (hex: string) => {
    setSelectedColors((prev) =>
      prev.includes(hex) ? prev.filter((c) => c !== hex) : [...prev, hex]
    );
  };

  const handleClearFilters = () => {
    setSelectedCategory('ALL');
    setSelectedSizes([]);
    setSelectedColors([]);
    setPriceRange(5000);
    setSortBy('NEWEST');
    router.push('/shop');
  };

  return (
    <div className={styles.shopPageWrapper}>
      <div className={styles.shopContainer}>
        {/* =========================================
            1. BREADCRUMB & HEADER SECTION
           ========================================= */}
        <div className={styles.headerSection}>
          <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
            <Link href="/" className={styles.breadcrumbLink}>Home</Link>
            <span className={styles.breadcrumbSeparator}>&rsaquo;</span>
            <Link href="/shop" className={styles.breadcrumbLink}>Shop</Link>
            {activeCategoryObj && (
              <>
                <span className={styles.breadcrumbSeparator}>&rsaquo;</span>
                <span className={styles.breadcrumbCurrent}>{activeCategoryObj.name}</span>
              </>
            )}
          </nav>

          <div className={styles.titleAndControlsRow}>
            <div>
              <h1 className={styles.pageTitle}>{pageHeading}</h1>
              <p className={styles.productCountText}>
                Showing 1–{filteredProducts.length} of {initialProducts.length} products
                {queryParam && <span> for &ldquo;{queryParam}&rdquo;</span>}
              </p>
            </div>

            <div className={styles.sortAndMobileRow}>
              {/* Mobile Filter Trigger Button */}
              <button
                type="button"
                className={styles.mobileFilterToggleBtn}
                onClick={() => setIsMobileFilterOpen(true)}
              >
                <SlidersHorizontal size={16} />
                <span>Filters</span>
              </button>

              {/* Sort By Dropdown */}
              <div className={styles.sortContainer}>
                <label htmlFor="shop-sort" className={styles.sortLabel}>Sort by:</label>
                <select
                  id="shop-sort"
                  className={styles.sortSelect}
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="NEWEST">Newest First</option>
                  <option value="PRICE_LOW_HIGH">Price: Low to High</option>
                  <option value="PRICE_HIGH_LOW">Price: High to Low</option>
                  <option value="DISCOUNT">Biggest Discount</option>
                  <option value="NAME_ASC">Name: A–Z</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================
            2. MAIN CONTENT: SIDEBAR + PRODUCT GRID
           ========================================= */}
        <div className={styles.mainLayout}>
          {/* -----------------------------------------
              LEFT FILTER SIDEBAR
             ----------------------------------------- */}
          <aside
            className={`${styles.filterSidebar} ${isMobileFilterOpen ? styles.filterSidebarMobileOpen : ''}`}
          >
            <div className={styles.sidebarHeader}>
              <h3 className={styles.sidebarTitle}>FILTERS</h3>
              <button
                type="button"
                className={styles.sidebarCloseBtn}
                onClick={() => setIsMobileFilterOpen(false)}
                aria-label="Close filters"
              >
                <X size={20} />
              </button>
            </div>

            {/* A. CATEGORIES ACCORDION */}
            <div className={styles.filterGroup}>
              <button
                type="button"
                className={styles.filterGroupHeader}
                onClick={() => setIsCategoryOpen(!isCategoryOpen)}
              >
                <span>CATEGORIES</span>
                {isCategoryOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {isCategoryOpen && (
                <div className={styles.filterGroupBody}>
                  {/* All option */}
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={selectedCategory === 'ALL'}
                      onChange={() => setSelectedCategory('ALL')}
                      className={styles.customCheckbox}
                    />
                    <span className={styles.checkboxText}>All</span>
                  </label>

                  {categories.map((category) => (
                    <label key={category.id} className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={selectedCategory === category.id || selectedCategory === category.slug}
                        onChange={() => {
                          if (selectedCategory === category.id || selectedCategory === category.slug) {
                            setSelectedCategory('ALL');
                          } else {
                            setSelectedCategory(category.id);
                          }
                        }}
                        className={styles.customCheckbox}
                      />
                      <span className={styles.checkboxText}>{category.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* B. PRICE RANGE ACCORDION */}
            <div className={styles.filterGroup}>
              <button
                type="button"
                className={styles.filterGroupHeader}
                onClick={() => setIsPriceOpen(!isPriceOpen)}
              >
                <span>PRICE RANGE</span>
                {isPriceOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {isPriceOpen && (
                <div className={styles.filterGroupBody}>
                  <div className={styles.priceSliderContainer}>
                    <input
                      type="range"
                      min="399"
                      max="5000"
                      step="100"
                      value={priceRange}
                      onChange={(e) => setPriceRange(Number(e.target.value))}
                      className={styles.priceSlider}
                    />
                    <div className={styles.priceRangeLabels}>
                      <span>₹399</span>
                      <span className={styles.priceMaxLabel}>₹{priceRange.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* C. SIZE ACCORDION */}
            <div className={styles.filterGroup}>
              <button
                type="button"
                className={styles.filterGroupHeader}
                onClick={() => setIsSizeOpen(!isSizeOpen)}
              >
                <span>SIZE</span>
                {isSizeOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {isSizeOpen && (
                <div className={styles.filterGroupBody}>
                  <div className={styles.sizePillGrid}>
                    {availableSizes.map((size) => {
                      const isSelected = selectedSizes.includes(size);
                      return (
                        <button
                          key={size}
                          type="button"
                          className={`${styles.filterSizePill} ${isSelected ? styles.filterSizePillSelected : ''}`}
                          onClick={() => toggleSizeFilter(size)}
                        >
                          {size}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* D. COLOR ACCORDION */}
            <div className={styles.filterGroup}>
              <button
                type="button"
                className={styles.filterGroupHeader}
                onClick={() => setIsColorOpen(!isColorOpen)}
              >
                <span>COLOR</span>
                {isColorOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {isColorOpen && (
                <div className={styles.filterGroupBody}>
                  <div className={styles.colorSwatchRow}>
                    {availableColors.map((color) => {
                      const isSelected = selectedColors.includes(color.hex);
                      return (
                        <button
                          key={color.name}
                          type="button"
                          className={`${styles.filterColorBtn} ${isSelected ? styles.filterColorBtnSelected : ''}`}
                          onClick={() => toggleColorFilter(color.hex)}
                          title={color.name}
                        >
                          <span
                            className={styles.filterColorCircle}
                            style={{ backgroundColor: color.hex }}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar Actions */}
            <div className={styles.sidebarActions}>
              <button
                type="button"
                className={styles.applyFiltersBtn}
                onClick={() => setIsMobileFilterOpen(false)}
              >
                APPLY FILTERS
              </button>
              <button
                type="button"
                className={styles.clearAllBtn}
                onClick={handleClearFilters}
              >
                CLEAR ALL
              </button>
            </div>
          </aside>

          {/* -----------------------------------------
              MAIN 4-COLUMN PRODUCT GRID
             ----------------------------------------- */}
          <main className={styles.productGridContainer}>
            {filteredProducts.length === 0 ? (
              <div className={styles.emptyState}>
                <h3 className={styles.emptyStateTitle}>No products found</h3>
                <p className={styles.emptyStateText}>
                  Try clearing your filters or searching for something else.
                </p>
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className={styles.emptyStateClearBtn}
                >
                  CLEAR ALL FILTERS
                </button>
              </div>
            ) : (
              <div className={styles.productGrid}>
                {filteredProducts.map((product, idx) => (
                  <ProductCard key={product.id} product={product} priority={idx < 6} />
                ))}
              </div>
            )}
          </main>
        </div>

        {/* =========================================
            3. TRUST / VALUE PROPOSITIONS BAR
           ========================================= */}
        <section className={styles.trustBarSection}>
          <div className={styles.trustItem}>
            <div className={styles.trustIconWrapper}>
              <Award size={20} className={styles.trustIcon} />
            </div>
            <div>
              <h4 className={styles.trustTitle}>PREMIUM QUALITY</h4>
              <p className={styles.trustSubtitle}>Finest materials & craftsmanship</p>
            </div>
          </div>

          <div className={styles.trustItem}>
            <div className={styles.trustIconWrapper}>
              <RotateCcw size={20} className={styles.trustIcon} />
            </div>
            <div>
              <h4 className={styles.trustTitle}>EASY RETURNS</h4>
              <p className={styles.trustSubtitle}>Hassle-free 7 days returns</p>
            </div>
          </div>

          <div className={styles.trustItem}>
            <div className={styles.trustIconWrapper}>
              <ShieldCheck size={20} className={styles.trustIcon} />
            </div>
            <div>
              <h4 className={styles.trustTitle}>SECURE PAYMENT</h4>
              <p className={styles.trustSubtitle}>100% secure payment</p>
            </div>
          </div>

          <div className={styles.trustItem}>
            <div className={styles.trustIconWrapper}>
              <Truck size={20} className={styles.trustIcon} />
            </div>
            <div>
              <h4 className={styles.trustTitle}>FAST DELIVERY</h4>
              <p className={styles.trustSubtitle}>Quick delivery pan India</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
