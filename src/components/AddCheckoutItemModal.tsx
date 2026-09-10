"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Search,
  Plus,
  Minus,
  Check,
  Gift,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import { useCart, CartItem } from '@/context/CartContext';
import styles from './AddCheckoutItemModal.module.css';

interface CatalogProduct {
  id: string;
  name: string;
  slug: string;
  sku: string;
  price: number;
  originalPrice: number;
  image: string;
  images?: string[];
  color: string;
  availableSizes: string[];
  category: { id?: string; name?: string; slug?: string } | any;
  stock?: number;
  totalStock?: number;
}

interface SelectedFreeItem {
  slotKey: string;
  productId: string;
  name: string;
  image: string;
  size: string;
  color: string;
  price: number;
  originalPrice: number;
  sku?: string;
  maxStock: number;
  category?: any;
}

interface AddCheckoutItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddItem?: (product: any) => void;
  itemToReplace?: any | null;
  existingBundle?: any | null;
}

const SYSTEMATIC_SIZES = ['S', 'M', 'L', 'XL', 'XXL'];

export default function AddCheckoutItemModal({
  isOpen,
  onClose,
  onAddItem,
  itemToReplace,
  existingBundle,
}: AddCheckoutItemModalProps) {
  const { cart, addPromoBundle, updatePromoBundle, addToCart, removeFromCart, bogoPromoConfig } = useCart();

  const [mounted, setMounted] = useState(false);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSizeFilter, setSelectedSizeFilter] = useState('all');
  const [selectedColorFilter, setSelectedColorFilter] = useState('all');
  const [selectedSort, setSelectedSort] = useState('default');

  // Multi-image slider index map per product: { [productId]: currentImageIndex }
  const [productImgIndices, setProductImgIndices] = useState<Record<string, number>>({});

  // Selected size per product card: { [productId]: selectedSize }
  const [cardSelectedSizes, setCardSelectedSizes] = useState<Record<string, string>>({});

  // Main Paid Product state
  const [mainProduct, setMainProduct] = useState<CatalogProduct | null>(null);
  const [mainProductSize, setMainProductSize] = useState<string>('M');
  const [paidQuantity, setPaidQuantity] = useState<number>(1);

  // Chosen Free Items pool
  const [chosenFreeItems, setChosenFreeItems] = useState<SelectedFreeItem[]>([]);

  // Track if we are editing an existing promo bundle from the cart
  const [activeBundleGroupId, setActiveBundleGroupId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll while modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Load products & initialize offer state when modal opens
  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    fetch('/api/promotions/bogo?category=t-shirts')
      .then((res) => res.json())
      .then((data) => {
        let prods: CatalogProduct[] = [];
        if (data && data.success && Array.isArray(data.products) && data.products.length > 0) {
          prods = data.products;
        }

        if (prods.length === 0) {
          // Fallback to general catalog
          return fetch('/api/products/catalog')
            .then((res) => res.json())
            .then((catData) => {
              if (catData && catData.success && Array.isArray(catData.products)) {
                return catData.products;
              }
              return [];
            });
        }
        return prods;
      })
      .then((loadedProducts: CatalogProduct[]) => {
        setProducts(loadedProducts);

        // Default sizes for cards
        const defaultSizes: Record<string, string> = {};
        loadedProducts.forEach((p) => {
          if (p.availableSizes && p.availableSizes.length > 0) {
            defaultSizes[p.id] = p.availableSizes[0];
          }
        });
        setCardSelectedSizes(defaultSizes);

        // Initialize Main Paid Product and Chosen Free Items
        // 1. Check if there's an existing promo bundle in the cart or passed in prop
        const existingBundleItems = existingBundle
          ? existingBundle.items
          : cart.filter((i) => Boolean(i.promoGroupId));

        if (existingBundleItems.length > 0) {
          const groupId = existingBundle?.groupId || existingBundleItems[0]?.promoGroupId;
          setActiveBundleGroupId(groupId || null);

          const bundleItems = cart.filter((i) => i.promoGroupId === groupId);
          const paidItems = bundleItems.filter((i) => i.isPaidPromoItem);
          const freeItems = bundleItems.filter((i) => !i.isPaidPromoItem && i.isFree);

          const initialPaidQty = Math.max(1, paidItems.length || 1);
          setPaidQuantity(initialPaidQty);

          const refPaid = paidItems[0] || bundleItems[0];
          if (refPaid) {
            // Find in loaded products or create from cart item
            const match = loadedProducts.find((p) => p.id === refPaid.productId);
            if (match) {
              setMainProduct(match);
            } else {
              setMainProduct({
                id: refPaid.productId,
                name: refPaid.name,
                slug: (refPaid as any).slug || '',
                sku: refPaid.sku || '',
                price: Number(refPaid.price),
                originalPrice: Number(refPaid.originalPrice || refPaid.price),
                image: refPaid.image,
                color: refPaid.color || 'Standard',
                availableSizes: refPaid.size ? [refPaid.size] : SYSTEMATIC_SIZES,
                category: refPaid.category || null,
              });
            }
            setMainProductSize(refPaid.size || 'M');
          }

          // Pre-populate free items
          const initialFree: SelectedFreeItem[] = freeItems.map((f, idx) => ({
            slotKey: `existing-free-${f.productId}-${f.size}-${idx}`,
            productId: f.productId,
            name: f.name.replace(/^\[FREE\]\s*/i, ''),
            image: f.image,
            size: f.size || 'Standard',
            color: f.color || 'Standard',
            price: Number(f.price || 0),
            originalPrice: Number(f.originalPrice || f.price || 0),
            sku: f.sku,
            maxStock: f.maxStock || 10,
            category: f.category,
          }));
          setChosenFreeItems(initialFree);
        } else if (itemToReplace) {
          // If replacing an existing item, set that as the main product
          setActiveBundleGroupId(null);
          setPaidQuantity(itemToReplace.quantity || 1);
          const match = loadedProducts.find((p) => p.id === itemToReplace.productId);
          if (match) {
            setMainProduct(match);
          } else {
            setMainProduct({
              id: itemToReplace.productId,
              name: itemToReplace.name,
              slug: itemToReplace.slug || '',
              sku: itemToReplace.sku || '',
              price: Number(itemToReplace.price),
              originalPrice: Number(itemToReplace.originalPrice || itemToReplace.price),
              image: itemToReplace.image,
              color: itemToReplace.color || 'Standard',
              availableSizes: itemToReplace.size ? [itemToReplace.size] : SYSTEMATIC_SIZES,
              category: itemToReplace.category || null,
            });
          }
          setMainProductSize(itemToReplace.size || 'M');
          setChosenFreeItems([]);
        } else {
          // Fresh offer initiation: default to first available T-shirt
          setActiveBundleGroupId(null);
          setPaidQuantity(1);
          setChosenFreeItems([]);
          if (loadedProducts.length > 0) {
            const first = loadedProducts[0];
            setMainProduct(first);
            setMainProductSize(first.availableSizes[0] || 'M');
          }
        }
      })
      .catch((err) => console.error('[AddCheckoutItemModal] Failed to load products', err))
      .finally(() => setLoading(false));
  }, [isOpen, existingBundle, itemToReplace]);

  // Derived offer entitlements
  // 1 paid -> 2 free
  // 2 paid -> 4 free
  // 3 paid -> 6 free
  const freeMultiplier = 2;
  const freeQuantity = paidQuantity * freeMultiplier;
  const remainingCount = Math.max(0, freeQuantity - chosenFreeItems.length);
  const isComplete = chosenFreeItems.length === freeQuantity;

  // Handle Paid Qty change
  const handlePaidQtyChange = (delta: number) => {
    const next = Math.max(1, Math.min(10, paidQuantity + delta));
    if (next === paidQuantity) return;

    setPaidQuantity(next);
    const nextFreeQuota = next * freeMultiplier;

    // If reduced, trim chosenFreeItems to new quota
    if (chosenFreeItems.length > nextFreeQuota) {
      setChosenFreeItems((prev) => prev.slice(0, nextFreeQuota));
    }
  };

  // Color options extracted dynamically from products
  const availableColors = useMemo(() => {
    const colors = new Set<string>();
    products.forEach((p) => {
      if (p.color && p.color.trim()) {
        colors.add(p.color.trim());
      }
    });
    return Array.from(colors);
  }, [products]);

  // Filtered & sorted products list
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesName = p.name.toLowerCase().includes(q);
          const matchesSku = p.sku.toLowerCase().includes(q);
          const matchesColor = p.color && p.color.toLowerCase().includes(q);
          if (!matchesName && !matchesSku && !matchesColor) return false;
        }

        // Size filter
        if (selectedSizeFilter !== 'all') {
          const hasSize = p.availableSizes.some(
            (sz) => sz.toUpperCase() === selectedSizeFilter.toUpperCase()
          );
          if (!hasSize) return false;
        }

        // Color filter
        if (selectedColorFilter !== 'all') {
          if (!p.color || p.color.toLowerCase() !== selectedColorFilter.toLowerCase()) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (selectedSort === 'price-low') return a.price - b.price;
        if (selectedSort === 'price-high') return b.price - a.price;
        return 0;
      });
  }, [products, searchQuery, selectedSizeFilter, selectedColorFilter, selectedSort]);

  // Image carousel next/prev
  const handleNextImage = (productId: string, totalImages: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setProductImgIndices((prev) => ({
      ...prev,
      [productId]: ((prev[productId] || 0) + 1) % totalImages,
    }));
  };

  const handlePrevImage = (productId: string, totalImages: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setProductImgIndices((prev) => ({
      ...prev,
      [productId]: ((prev[productId] || 0) - 1 + totalImages) % totalImages,
    }));
  };

  // Free item selection handlers
  const handleSelectFreeItem = (product: CatalogProduct) => {
    if (chosenFreeItems.length >= freeQuantity) return;

    const size = cardSelectedSizes[product.id] || product.availableSizes[0] || 'M';
    const slotKey = `free-${product.id}-${size}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    const newItem: SelectedFreeItem = {
      slotKey,
      productId: product.id,
      name: product.name,
      image: product.image,
      size,
      color: product.color || 'Standard',
      price: 0,
      originalPrice: product.originalPrice || product.price,
      sku: `${product.sku}-${size}`,
      maxStock: product.totalStock || 10,
      category: product.category,
    };

    setChosenFreeItems((prev) => [...prev, newItem]);
  };

  const handleRemoveFreeItem = (slotKey: string) => {
    setChosenFreeItems((prev) => prev.filter((item) => item.slotKey !== slotKey));
  };

  const handleIncrementSameProduct = (productId: string) => {
    if (chosenFreeItems.length >= freeQuantity) return;

    const existing = chosenFreeItems.find((f) => f.productId === productId);
    if (!existing) return;

    const slotKey = `free-${existing.productId}-${existing.size}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setChosenFreeItems((prev) => [...prev, { ...existing, slotKey }]);
  };

  const handleDecrementSameProduct = (productId: string) => {
    // Remove the last instance of this product
    setChosenFreeItems((prev) => {
      const idx = [...prev].reverse().findIndex((f) => f.productId === productId);
      if (idx === -1) return prev;
      const actualIdx = prev.length - 1 - idx;
      return prev.filter((_, i) => i !== actualIdx);
    });
  };

  // Pricing & Summary calculations
  const summaryCalculations = useMemo(() => {
    const paidUnitSellingPrice = mainProduct ? Number(mainProduct.price) : 0;
    const paidUnitMrp = mainProduct ? Number(mainProduct.originalPrice || mainProduct.price) : 0;

    const paidTotalSelling = paidUnitSellingPrice * paidQuantity;
    const paidTotalMrp = paidUnitMrp * paidQuantity;

    const freeMrpSum = chosenFreeItems.reduce(
      (acc, it) => acc + (it.originalPrice || it.price || 0),
      0
    );

    const totalCatalog = paidTotalMrp + freeMrpSum;

    // Automatic Tiered Bundle Discount:
    // 1 paid + 2 free -> ₹0
    // 2 paid + 4 free -> ₹100
    // 3 paid + 6 free -> ₹200
    const is9ProductTier = paidQuantity >= 3 && chosenFreeItems.length >= 6;
    const is6ProductTier = paidQuantity >= 2 && chosenFreeItems.length >= 4;
    const tierDiscount = is9ProductTier
      ? Math.min(200, paidTotalSelling)
      : is6ProductTier
      ? Math.min(100, paidTotalSelling)
      : 0;

    const payablePrice = Math.max(0, paidTotalSelling - tierDiscount);
    const youSave = Math.max(0, totalCatalog - payablePrice);

    return {
      totalCatalog,
      youSave,
      payablePrice,
      paidTotalSelling,
      tierDiscount,
      is6ProductTier,
      is9ProductTier,
    };
  }, [mainProduct, paidQuantity, chosenFreeItems]);

  // Primary CTA Submit Handler
  const handleConfirmOffer = () => {
    if (!isComplete || !mainProduct) return;

    const promoRuleName = bogoPromoConfig?.name || 'BUY 1 GET 2 FREE';

    // Prepare bundle items
    const bundleItems: CartItem[] = [];

    // 1. Paid Product instances (paidQuantity)
    for (let i = 0; i < paidQuantity; i++) {
      bundleItems.push({
        id: `bundle-${mainProduct.id}-${mainProductSize}-paid-${Date.now()}-${i}`,
        productId: mainProduct.id,
        name: mainProduct.name,
        price: Number(mainProduct.price),
        originalPrice: Number(mainProduct.originalPrice || mainProduct.price),
        image: mainProduct.image,
        size: mainProductSize,
        color: mainProduct.color || 'Standard',
        quantity: 1,
        sku: `${mainProduct.sku}-${mainProductSize}`,
        maxStock: mainProduct.totalStock || 10,
        isFree: false,
        isPaidPromoItem: true,
        category: mainProduct.category,
        categorySlug: mainProduct.category?.slug,
        categoryName: mainProduct.category?.name,
        buyQuantity: paidQuantity,
        freeQuantity: freeQuantity,
        promotionRule: promoRuleName,
      });
    }

    // 2. Free Product instances
    chosenFreeItems.forEach((f, idx) => {
      bundleItems.push({
        id: `bundle-${f.productId}-${f.size}-free-${Date.now()}-${idx}`,
        productId: f.productId,
        name: `[FREE] ${f.name.replace(/^\[FREE\]\s*/i, '')}`,
        price: 0,
        originalPrice: Number(f.originalPrice || f.price),
        image: f.image,
        size: f.size,
        color: f.color || 'Standard',
        quantity: 1,
        sku: f.sku || `${f.productId}-${f.size}`,
        maxStock: f.maxStock || 10,
        isFree: true,
        isPaidPromoItem: false,
        category: f.category,
        buyQuantity: paidQuantity,
        freeQuantity: freeQuantity,
        promotionRule: promoRuleName,
      });
    });

    if (itemToReplace) {
      removeFromCart(itemToReplace.id);
    }

    if (activeBundleGroupId) {
      updatePromoBundle(activeBundleGroupId, bundleItems);
    } else {
      addPromoBundle(bundleItems);
    }

    onClose();
  };

  // Skip Offer Handler: Buy only paid product
  const handleSkipOffer = () => {
    if (!mainProduct) return;

    if (itemToReplace) {
      removeFromCart(itemToReplace.id);
    }

    if (onAddItem) {
      onAddItem({
        id: `${mainProduct.id}-${mainProductSize}`,
        productId: mainProduct.id,
        name: mainProduct.name,
        price: mainProduct.price,
        originalPrice: mainProduct.originalPrice || mainProduct.price,
        image: mainProduct.image,
        size: mainProductSize,
        color: mainProduct.color || 'Standard',
        quantity: paidQuantity,
        sku: `${mainProduct.sku}-${mainProductSize}`,
        maxStock: mainProduct.totalStock || 99,
      });
    } else {
      addToCart({
        id: `${mainProduct.id}-${mainProductSize}`,
        productId: mainProduct.id,
        name: mainProduct.name,
        price: mainProduct.price,
        originalPrice: mainProduct.originalPrice || mainProduct.price,
        image: mainProduct.image,
        size: mainProductSize,
        color: mainProduct.color || 'Standard',
        quantity: paidQuantity,
        sku: `${mainProduct.sku}-${mainProductSize}`,
        maxStock: mainProduct.totalStock || 99,
        isFree: false,
      });
    }

    onClose();
  };

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
        {/* =========================================================================
            1. HEADER SECTION
            ========================================================================= */}
        <div className={styles.modalHeader}>
          <div className={styles.headerLeft}>
            <div className={styles.headerBadgesRow}>
              <span className={styles.specialOfferBadge}>
                <Gift size={13} color="#09090b" />
                <span>SPECIAL OFFER</span>
              </span>
              <span className={styles.offerTagPill}>
                BUY 1 GET 2 FREE
              </span>
            </div>

            <h2 className={styles.modalTitle}>
              Choose {freeQuantity} T-Shirts FREE
            </h2>

            <p className={styles.modalSubtitle}>
              <span>
                Buy {paidQuantity} eligible paid {paidQuantity === 1 ? 'T-Shirt' : 'T-Shirts'} • Get {freeQuantity} FREE
              </span>
              <span>• Selected: <strong>{chosenFreeItems.length}/{freeQuantity}</strong></span>
              <span>• Remaining: <strong>{remainingCount}</strong></span>
            </p>
          </div>

          <div className={styles.headerRight}>
            <span
              className={`${styles.selectedCounterBadge} ${
                isComplete ? styles.selectedCounterBadgeComplete : ''
              }`}
            >
              {isComplete && <Check size={14} color="#16a34a" />}
              <span>Selected: {chosenFreeItems.length}/{freeQuantity}</span>
            </span>

            <button
              type="button"
              className={styles.closeBtn}
              onClick={onClose}
              title="Close popup"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* =========================================================================
            SCROLLABLE BODY
            ========================================================================= */}
        <div className={styles.modalBody}>
          {/* =========================================================================
              2. MAIN PAID PRODUCT SECTION
              ========================================================================= */}
          {mainProduct && (
            <div className={styles.mainProductCard}>
              <div className={styles.mainProductLeft}>
                <span className={styles.sectionBadge}>
                  MAIN PRODUCT (PAID)
                </span>

                <div className={styles.mainProductInfoRow}>
                  <div className={styles.mainProductThumb}>
                    {mainProduct.image ? (
                      <img src={mainProduct.image} alt={mainProduct.name} />
                    ) : (
                      <ShoppingBag size={22} color="#a1a1aa" style={{ margin: '22px auto' }} />
                    )}
                  </div>

                  <div className={styles.mainProductMeta}>
                    <h4 className={styles.mainProductTitle} title={mainProduct.name}>
                      {mainProduct.name}
                    </h4>

                    <div className={styles.mainProductPriceRow}>
                      <span className={styles.mainProductPrice}>
                        ₹{mainProduct.price.toLocaleString('en-IN')}
                      </span>
                      {mainProduct.originalPrice > mainProduct.price && (
                        <span className={styles.mainProductMrp}>
                          ₹{mainProduct.originalPrice.toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>

                    <div className={styles.mainProductAttributes}>
                      <span>Color: <strong>{mainProduct.color ? mainProduct.color.toUpperCase() : 'STANDARD'}</strong></span>
                      <span>•</span>
                      <span>Size:</span>
                      <div className={styles.mainProductSizePills}>
                        {(mainProduct.availableSizes.length > 0
                          ? mainProduct.availableSizes
                          : SYSTEMATIC_SIZES
                        ).map((sz) => (
                          <button
                            key={sz}
                            type="button"
                            className={`${styles.mainSizeBtn} ${
                              mainProductSize === sz ? styles.mainSizeBtnSelected : ''
                            }`}
                            onClick={() => setMainProductSize(sz)}
                          >
                            {sz}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Paid Qty Stepper */}
              <div className={styles.mainProductQtySection}>
                <span className={styles.qtyLabel}>Paid Qty</span>
                <div className={styles.stepperContainer}>
                  <button
                    type="button"
                    className={styles.stepperBtn}
                    onClick={() => handlePaidQtyChange(-1)}
                    disabled={paidQuantity <= 1}
                    aria-label="Decrease paid quantity"
                  >
                    <Minus size={14} />
                  </button>
                  <span className={styles.stepperValue}>{paidQuantity}</span>
                  <button
                    type="button"
                    className={styles.stepperBtn}
                    onClick={() => handlePaidQtyChange(1)}
                    aria-label="Increase paid quantity"
                  >
                    <Plus size={14} />
                  </button>
                </div>
                <span className={styles.stepperHint}>
                  +{freeMultiplier} FREE T-Shirts per paid unit
                </span>
              </div>
            </div>
          )}

          {/* =========================================================================
              3. FREE PRODUCTS SECTION
              ========================================================================= */}
          <div>
            <div className={styles.freeProductsHeader}>
              <div className={styles.freeProductsTitleRow}>
                <h3 className={styles.freeProductsTitle}>
                  Select {freeQuantity} different T-Shirts
                </h3>
                <p className={styles.freeProductsSubtitle}>
                  Choose from below • All promotional T-shirts are 100% FREE (₹0)
                </p>
              </div>
            </div>

            {/* Filters & Search Toolbar */}
            <div className={styles.filterToolbar} style={{ marginTop: '0.65rem' }}>
              <div className={styles.searchBox}>
                <Search size={15} className={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="Search by product name, color, SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={styles.searchInput}
                />
              </div>

              <span className={styles.categoryPillActive}>
                T-Shirts
              </span>

              <div className={styles.sizeFilterPills}>
                <button
                  type="button"
                  onClick={() => setSelectedSizeFilter('all')}
                  className={`${styles.sizeFilterPill} ${
                    selectedSizeFilter === 'all' ? styles.sizeFilterPillActive : ''
                  }`}
                >
                  All Sizes
                </button>
                {SYSTEMATIC_SIZES.map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => setSelectedSizeFilter(sz)}
                    className={`${styles.sizeFilterPill} ${
                      selectedSizeFilter === sz ? styles.sizeFilterPillActive : ''
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>

              {availableColors.length > 0 && (
                <select
                  value={selectedColorFilter}
                  onChange={(e) => setSelectedColorFilter(e.target.value)}
                  className={styles.filterSelect}
                  aria-label="Filter by color"
                >
                  <option value="all">All Colors</option>
                  {availableColors.map((c) => (
                    <option key={c} value={c.toLowerCase()}>
                      {c.toUpperCase()}
                    </option>
                  ))}
                </select>
              )}

              <select
                value={selectedSort}
                onChange={(e) => setSelectedSort(e.target.value)}
                className={styles.filterSelect}
                aria-label="Sort products"
              >
                <option value="default">Default Sort</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
              </select>
            </div>

            {/* Product Cards Grid */}
            <div className={styles.productGrid}>
              {loading ? (
                <div className={styles.emptyState}>
                  <p>Loading eligible T-shirts...</p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className={styles.emptyState}>
                  <p>No eligible T-shirts found matching your filters.</p>
                </div>
              ) : (
                filteredProducts.map((p) => {
                  const currentSize = cardSelectedSizes[p.id] || p.availableSizes[0] || 'M';
                  const allImages = p.images && p.images.length > 0 ? p.images : (p.image ? [p.image] : []);
                  const curImgIdx = (productImgIndices[p.id] || 0) % (allImages.length || 1);
                  const displayImg = allImages[curImgIdx] || p.image;

                  // Check if this product is currently selected in chosenFreeItems
                  const matchingSelected = chosenFreeItems.filter((f) => f.productId === p.id);
                  const isSelected = matchingSelected.length > 0;
                  const selectedQty = matchingSelected.length;

                  return (
                    <div
                      key={p.id}
                      className={`${styles.productCard} ${
                        isSelected ? styles.productCardSelected : ''
                      }`}
                    >
                      {/* Image Container with FREE badge & carousel */}
                      <div className={styles.cardImageContainer}>
                        <span className={styles.freeBadgeOnImage}>FREE</span>

                        {isSelected && (
                          <span className={styles.selectedCheckmarkBadge}>
                            <Check size={12} />
                            <span>{selectedQty > 1 ? `${selectedQty} Selected` : 'Selected'}</span>
                          </span>
                        )}

                        {displayImg ? (
                          <img
                            src={displayImg}
                            alt={p.name}
                            className={styles.cardImage}
                            loading="lazy"
                          />
                        ) : (
                          <ShoppingBag
                            size={32}
                            color="#a1a1aa"
                            style={{ margin: 'auto', display: 'block', height: '100%' }}
                          />
                        )}

                        {allImages.length > 1 && (
                          <>
                            <button
                              type="button"
                              className={`${styles.imageArrowBtn} ${styles.imageArrowLeft}`}
                              onClick={(e) => handlePrevImage(p.id, allImages.length, e)}
                              aria-label="Previous image"
                            >
                              <ChevronLeft size={16} />
                            </button>
                            <button
                              type="button"
                              className={`${styles.imageArrowBtn} ${styles.imageArrowRight}`}
                              onClick={(e) => handleNextImage(p.id, allImages.length, e)}
                              aria-label="Next image"
                            >
                              <ChevronRight size={16} />
                            </button>
                          </>
                        )}
                      </div>

                      {/* Card Content */}
                      <div className={styles.cardContent}>
                        <h4 className={styles.cardTitle} title={p.name}>
                          {p.name}
                        </h4>

                        <div className={styles.cardPriceRow}>
                          <span className={styles.cardFreePrice}>FREE (₹0)</span>
                          <span className={styles.cardOriginalPrice}>
                            ₹{(p.originalPrice || p.price).toLocaleString('en-IN')}
                          </span>
                        </div>

                        {p.color && (
                          <span className={styles.cardColorMeta}>
                            Color: {p.color}
                          </span>
                        )}

                        {/* Size Selector */}
                        <div className={styles.cardSizeRow}>
                          <span className={styles.cardSizeLabel}>Select Size:</span>
                          <div className={styles.cardSizePills}>
                            {SYSTEMATIC_SIZES.map((sz) => {
                              const isAvailable = p.availableSizes.includes(sz);
                              const isCur = currentSize === sz;

                              return (
                                <button
                                  key={sz}
                                  type="button"
                                  disabled={!isAvailable}
                                  onClick={() =>
                                    setCardSelectedSizes((prev) => ({
                                      ...prev,
                                      [p.id]: sz,
                                    }))
                                  }
                                  className={`${styles.cardSizeBtn} ${
                                    isCur && isAvailable ? styles.cardSizeBtnSelected : ''
                                  } ${!isAvailable ? styles.cardSizeBtnDisabled : ''}`}
                                  title={isAvailable ? `Size ${sz}` : `Size ${sz} out of stock`}
                                >
                                  {sz}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Action Row */}
                        <div className={styles.cardActionRow}>
                          {isSelected ? (
                            <div className={styles.selectedCardStepperRow}>
                              <div className={styles.selectedCardStepper}>
                                <button
                                  type="button"
                                  className={styles.selectedCardStepperBtn}
                                  onClick={() => handleDecrementSameProduct(p.id)}
                                  aria-label="Decrease quantity"
                                >
                                  <Minus size={12} />
                                </button>
                                <span className={styles.selectedCardStepperVal}>
                                  {selectedQty}
                                </span>
                                <button
                                  type="button"
                                  className={styles.selectedCardStepperBtn}
                                  onClick={() => handleIncrementSameProduct(p.id)}
                                  disabled={chosenFreeItems.length >= freeQuantity}
                                  aria-label="Increase quantity"
                                >
                                  <Plus size={12} />
                                </button>
                              </div>

                              <button
                                type="button"
                                className={styles.unselectBtn}
                                onClick={() => {
                                  setChosenFreeItems((prev) =>
                                    prev.filter((f) => f.productId !== p.id)
                                  );
                                }}
                              >
                                Remove
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className={styles.selectItemBtn}
                              disabled={chosenFreeItems.length >= freeQuantity}
                              onClick={() => handleSelectFreeItem(p)}
                            >
                              <Plus size={14} />
                              <span>Select Free T-Shirt</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* =========================================================================
            4. BOTTOM SUMMARY BAR (REQUIREMENTS 12, 13, 14)
            ========================================================================= */}
        <div className={styles.footerBar}>
          <div className={styles.footerMetrics}>
            <div className={styles.metricBlock}>
              <span className={styles.metricLabel}>CATALOG VALUE</span>
              <span className={styles.metricCatalogValue}>
                ₹{summaryCalculations.totalCatalog.toLocaleString('en-IN')}
              </span>
            </div>

            <div className={styles.metricBlock}>
              <span className={styles.metricLabel}>YOU SAVE</span>
              <div className={styles.metricSavingsRow}>
                <span className={styles.metricSavings}>
                  ₹{summaryCalculations.youSave.toLocaleString('en-IN')}
                </span>
                {summaryCalculations.is9ProductTier && (
                  <span className={styles.bonusBadge}>+₹200 BUNDLE OFF</span>
                )}
                {!summaryCalculations.is9ProductTier && summaryCalculations.is6ProductTier && (
                  <span className={styles.bonusBadge}>+₹100 BUNDLE OFF</span>
                )}
              </div>
            </div>

            <div className={styles.metricBlock}>
              <span className={styles.metricLabel}>PAYABLE PRICE</span>
              <span className={styles.metricPayable}>
                ₹{summaryCalculations.payablePrice.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          <div className={styles.footerActions}>
            <button
              type="button"
              className={styles.skipOfferBtn}
              onClick={handleSkipOffer}
            >
              Skip offer & buy item only (₹{summaryCalculations.paidTotalSelling.toLocaleString('en-IN')})
            </button>

            <button
              type="button"
              disabled={!isComplete}
              onClick={handleConfirmOffer}
              className={`${styles.primaryCtaBtn} ${
                isComplete ? styles.primaryCtaBtnActive : styles.primaryCtaBtnDisabled
              }`}
            >
              <span>
                {isComplete
                  ? activeBundleGroupId
                    ? `Update Offer →`
                    : `Add ${freeQuantity} Free T-Shirts →`
                  : `Please select ${remainingCount} more ${
                      remainingCount === 1 ? 'T-Shirt' : 'T-Shirts'
                    } →`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}
