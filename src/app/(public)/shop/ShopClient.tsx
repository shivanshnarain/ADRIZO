"use client";

import { useState, useMemo } from 'react';
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
import { filterProductsByCategory, normalizeCategoryKey, getOrderedProducts } from '@/lib/productFiltering';
import styles from './shop.module.css';

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Product {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  price: number;
  originalPrice?: number | null;
  salePrice?: number | null;
  categoryId?: string | null;
  category?: { id?: string; name: string; slug?: string } | null;
  gender?: string | null;
  productType?: string | null;
  color?: string | null;
  brand?: string;
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

interface CategoryOption {
  id: string;
  name: string;
  slug: string;
  indent?: boolean;
}

const CATEGORY_OPTIONS: CategoryOption[] = [
  { id: 'ALL', name: 'All Products', slug: 'all' },
  { id: 'VIEW_ALL', name: 'View All (Mixed)', slug: 'view-all' },
  { id: 'MEN', name: "Men's Collection", slug: 'men' },
  { id: 'WOMEN', name: "Women's Collection", slug: 'women' },
  { id: 'TSHIRTS', name: 'T-Shirts (All)', slug: 't-shirts' },
  { id: 'ZIPPER_POLO', name: 'Zipper Polo', slug: 'zipper-polo', indent: true },
  { id: 'BUTTON_POLO', name: 'Button Polo', slug: 'button-polo', indent: true },
  { id: 'HOODIES', name: 'Hoodies', slug: 'hoodies' },
  { id: 'MENS_HOODIE', name: "Men's Hoodie", slug: 'mens-hoodie', indent: true },
  { id: 'WOMENS_HOODIE', name: "Women's Hoodie", slug: 'womens-hoodie', indent: true },
];

export default function ShopClient({
  initialProducts,
  categories,
  initialCategory,
  titleOverride,
}: ShopClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Search query, sort, and category params from URL
  const queryParam = searchParams.get('q') || '';
  const sortParam = searchParams.get('sort') || '';
  const viewParam = searchParams.get('view') || '';
  const categoryParam = searchParams.get('category') || initialCategory || (viewParam === 'all' ? 'VIEW_ALL' : 'ALL');

  // Filter States
  const [selectedCategory, setSelectedCategory] = useState<string>(categoryParam);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string>(sortParam === 'new' ? 'NEWEST' : (viewParam === 'all' ? 'MIXED' : 'NEWEST'));
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Accordion toggle states
  const [isCategoryOpen, setIsCategoryOpen] = useState(true);
  const [isSizeOpen, setIsSizeOpen] = useState(true);

  // Synchronize category selection with URL changes (back/forward, direct links)
  const [prevCategoryParam, setPrevCategoryParam] = useState(categoryParam);
  if (categoryParam !== prevCategoryParam) {
    setPrevCategoryParam(categoryParam);
    setSelectedCategory(categoryParam);
  }

  // Available Sizes for filters
  const availableSizes = ['S', 'M', 'L', 'XL', 'XXL'];

  // Filtering Logic using centralized Engine
  const filteredProducts = useMemo(() => {
    // 1. Filter by category
    let prods = filterProductsByCategory(initialProducts, selectedCategory);

    // 2. Filter by search query if present
    if (queryParam) {
      const q = queryParam.toLowerCase();
      prods = prods.filter((p) => {
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesDesc = p.description?.toLowerCase().includes(q);
        const matchesCategory = p.category?.name?.toLowerCase().includes(q);
        const matchesType = p.productType?.toLowerCase().includes(q);
        return matchesName || matchesDesc || matchesCategory || matchesType;
      });
    }

    // 3. Filter by sizes
    if (selectedSizes.length > 0) {
      prods = prods.filter((product) => {
        let productSizes: string[] = [];
        if (product.sizesRaw) {
          try {
            productSizes = JSON.parse(product.sizesRaw);
          } catch {}
        } else if (product.variants) {
          productSizes = product.variants.map((v) => v.size || '').filter(Boolean);
        }
        return selectedSizes.some((s) => productSizes.includes(s));
      });
    }

    // 4. Sort
    if (sortBy && sortBy !== 'NEWEST' && sortBy !== 'MIXED') {
      return [...prods].sort((a, b) => {
        const pricingA = getProductPricing(a);
        const pricingB = getProductPricing(b);

        if (sortBy === 'PRICE_LOW_HIGH') return pricingA.sellingPrice - pricingB.sellingPrice;
        if (sortBy === 'PRICE_HIGH_LOW') return pricingB.sellingPrice - pricingA.sellingPrice;
        if (sortBy === 'NAME_ASC') return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
        if (sortBy === 'DISCOUNT') return pricingB.discountPercent - pricingA.discountPercent;
        return 0;
      });
    }

    // Default: Smart catalog variation and category-aware sorting
    return getOrderedProducts(prods, selectedCategory);
  }, [initialProducts, selectedCategory, queryParam, selectedSizes, sortBy]);

  // Page Heading & Category Name calculation
  const pageHeading = useMemo(() => {
    if (titleOverride) return titleOverride;
    const normalized = normalizeCategoryKey(selectedCategory);

    switch (normalized) {
      case 'MEN':
        return "MEN'S COLLECTION";
      case 'WOMEN':
        return "WOMEN'S COLLECTION";
      case 'TSHIRTS':
        return "T-SHIRTS";
      case 'ZIPPER_POLO':
        return "ZIPPER POLO T-SHIRTS";
      case 'BUTTON_POLO':
        return "BUTTON POLO T-SHIRTS";
      case 'HOODIES':
        return "HOODIES";
      case 'MENS_HOODIE':
        return "MEN'S HOODIES";
      case 'WOMENS_HOODIE':
        return "WOMEN'S HOODIES";
      case 'VIEW_ALL':
        return "CURATED COLLECTION";
      case 'ALL':
      default: {
        const matched = categories.find((c) => c.id === selectedCategory || c.slug === selectedCategory);
        return matched ? matched.name.toUpperCase() : 'ALL PRODUCTS';
      }
    }
  }, [titleOverride, selectedCategory, categories]);

  // Category Selection Handler with preserved URL State
  const handleCategorySelect = (opt: CategoryOption) => {
    const isCurrentlySelected =
      normalizeCategoryKey(selectedCategory) === normalizeCategoryKey(opt.id) ||
      selectedCategory.toLowerCase() === opt.slug.toLowerCase();

    const targetKey = isCurrentlySelected && opt.id !== 'ALL' ? 'ALL' : opt.id;
    setSelectedCategory(targetKey);

    const params = new URLSearchParams(searchParams.toString());
    if (targetKey === 'ALL') {
      params.delete('category');
      params.delete('view');
    } else if (targetKey === 'VIEW_ALL') {
      params.delete('category');
      params.set('view', 'all');
      setSortBy('MIXED');
    } else {
      params.delete('view');
      params.set('category', opt.slug);
    }

    const qs = params.toString();
    const newUrl = qs ? `/shop?${qs}` : '/shop';
    router.replace(newUrl, { scroll: false });
  };

  const isOptionActive = (opt: CategoryOption): boolean => {
    const normalizedSelected = normalizeCategoryKey(selectedCategory);
    const normalizedOpt = normalizeCategoryKey(opt.id);

    if (normalizedSelected === normalizedOpt) return true;
    if (selectedCategory.toLowerCase() === opt.slug.toLowerCase()) return true;
    return false;
  };

  const isWomenSelected =
    normalizeCategoryKey(selectedCategory) === 'WOMEN' ||
    normalizeCategoryKey(selectedCategory) === 'WOMENS_HOODIE';

  const toggleSizeFilter = (size: string) => {
    setSelectedSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    );
  };

  const handleClearFilters = () => {
    setSelectedCategory('ALL');
    setSelectedSizes([]);
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
            {selectedCategory !== 'ALL' && (
              <>
                <span className={styles.breadcrumbSeparator}>&rsaquo;</span>
                <span className={styles.breadcrumbCurrent}>{pageHeading}</span>
              </>
            )}
          </nav>

          <div className={styles.titleAndControlsRow}>
            <div>
              <h1 className={styles.pageTitle}>{pageHeading}</h1>
              {queryParam && (
                <p className={styles.productCountText}>
                  Results for &ldquo;{queryParam}&rdquo;
                </p>
              )}
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
                  {CATEGORY_OPTIONS.map((opt) => {
                    const active = isOptionActive(opt);
                    return (
                      <label
                        key={opt.id}
                        className={styles.checkboxLabel}
                        style={opt.indent ? { paddingLeft: '1.25rem' } : undefined}
                      >
                        <input
                          type="checkbox"
                          checked={active}
                          onChange={() => handleCategorySelect(opt)}
                          className={styles.customCheckbox}
                        />
                        <span
                          className={styles.checkboxText}
                          style={opt.indent ? { fontSize: '0.85rem', color: active ? '#111' : '#666' } : undefined}
                        >
                          {opt.name}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* B. SIZE ACCORDION */}
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
                <h3 className={styles.emptyStateTitle}>
                  {isWomenSelected ? "Women's Collection Coming Soon" : "No products found"}
                </h3>
                <p className={styles.emptyStateText}>
                  {isWomenSelected
                    ? "We are currently designing exclusive new pieces for our Women's line. Stay tuned for upcoming drops."
                    : "Try clearing your filters or searching for something else."}
                </p>
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className={styles.emptyStateClearBtn}
                >
                  {isWomenSelected ? "EXPLORE ALL PRODUCTS" : "CLEAR ALL FILTERS"}
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
