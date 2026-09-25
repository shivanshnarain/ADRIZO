"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  Gift,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useCart, CartItem } from '../context/CartContext';
import { useRouter } from 'next/navigation';
import styles from './FreeProductSelectorModal.module.css';
import { launchRazorpayCheckout } from '@/lib/razorpay-direct';

// COLORFUL GIFT ICON SVG COMPONENT (Golden box, bright red ribbon & bow, crisp highlights)
function ColorfulGiftIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={styles.headerGiftIconSvg}
      aria-hidden="true"
    >
      {/* Box bottom with warm gradient/shadow */}
      <rect x="3.5" y="10" width="17" height="11" rx="2" fill="#F59E0B" />
      {/* Lid */}
      <rect x="2.5" y="6" width="19" height="4.5" rx="1.5" fill="#FBBF24" />
      {/* Vertical ribbon on box and lid */}
      <rect x="10.25" y="6" width="3.5" height="15" fill="#EF4444" />
      {/* Horizontal ribbon on lid */}
      <rect x="2.5" y="8" width="19" height="1.8" fill="#DC2626" opacity="0.4" />
      {/* Left bow loop */}
      <path
        d="M12 6.5C12 6.5 9.5 2 7 2.5C4.5 3 5.5 6.5 12 6.5Z"
        fill="#EF4444"
      />
      {/* Right bow loop */}
      <path
        d="M12 6.5C12 6.5 14.5 2 17 2.5C19.5 3 18.5 6.5 12 6.5Z"
        fill="#EF4444"
      />
      {/* Center ribbon knot */}
      <circle cx="12" cy="6.5" r="1.5" fill="#B91C1C" />
      {/* Subtle shine highlight on lid */}
      <line x1="4" y1="7.2" x2="8.5" y2="7.2" stroke="#FEF08A" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

interface FreeProductOption {
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
  category: { id: string; name: string; slug: string } | null;
  description?: string;
  washCare?: string | null;
  sizeFit?: string | null;
  freeShippingText?: string | null;
  deliveryText?: string | null;
  returnPolicyText?: string | null;
  stock?: number;
  totalStock?: number;
}

interface SelectedSlotItem {
  slotKey: string;
  productId: string;
  name: string;
  image: string;
  size: string;
  color: string;
  price: number; // Current Selling price
  originalPrice?: number; // Catalog MRP
  sku?: string;
  maxStock: number;
  category?: { id?: string; name?: string; slug?: string } | null;
  categorySlug?: string;
  categoryName?: string;
  buyQuantity?: number;
  freeQuantity?: number;
  promotionRule?: string;
}

function formatCategoryForFreeCount(catName: string, count: number): string {
  if (!catName) return count > 1 ? 'Items' : 'Item';
  const clean = catName.trim();
  if (count === 1) {
    if (
      clean.toLowerCase().endsWith('shirts') ||
      clean.toLowerCase().endsWith('hoodies') ||
      clean.toLowerCase().endsWith('pants')
    ) {
      if (clean.toLowerCase().endsWith('hoodies')) return 'Hoodie';
      if (clean.toLowerCase().endsWith('pants')) return 'Pants';
      return clean.replace(/s$/i, '');
    }
    return clean.replace(/s$/i, '');
  } else {
    if (!clean.endsWith('s') && !clean.endsWith('S')) return `${clean}s`;
    return clean;
  }
}

// =========================================================================
// CHILD COMPONENT: FREE PRODUCT CARD WITH INDEPENDENT IMAGE SLIDESHOW
// =========================================================================
interface FreeProductCardProps {
  product: FreeProductOption;
  index: number;
  isChecked: boolean;
  chosenSize?: string;
  onToggleSelect: (product: FreeProductOption) => void;
  onOpenDetails: (product: FreeProductOption) => void;
}

function FreeProductCard({
  product,
  index,
  isChecked,
  chosenSize,
  onToggleSelect,
  onOpenDetails,
}: FreeProductCardProps) {
  const images = useMemo(() => {
    if (product.images && product.images.length > 0) {
      return product.images;
    }
    return [product.image];
  }, [product.images, product.image]);

  const [activeImgIdx, setActiveImgIdx] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const manualTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autoTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isPausedRef = useRef(false);

  // Automatic slideshow with independent timer and staggered start
  useEffect(() => {
    if (images.length <= 1) return;

    // Stagger initial start per card so cards don't flip simultaneously
    const initialDelay = 1000 + ((index * 650) % 2400);

    const startInterval = () => {
      autoTimerRef.current = setInterval(() => {
        if (!isPausedRef.current) {
          setActiveImgIdx((prev) => (prev + 1) % images.length);
        }
      }, 3500);
    };

    const initialTimeout = setTimeout(() => {
      startInterval();
    }, initialDelay);

    return () => {
      clearTimeout(initialTimeout);
      if (autoTimerRef.current) clearInterval(autoTimerRef.current);
      if (manualTimerRef.current) clearTimeout(manualTimerRef.current);
    };
  }, [images.length, index]);

  // Pause on manual user action, then resume after 4s of inactivity
  const pauseTemporarily = useCallback(() => {
    isPausedRef.current = true;
    if (manualTimerRef.current) clearTimeout(manualTimerRef.current);
    manualTimerRef.current = setTimeout(() => {
      isPausedRef.current = false;
    }, 4000);
  }, []);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    pauseTemporarily();
    setActiveImgIdx((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    pauseTemporarily();
    setActiveImgIdx((prev) => (prev + 1) % images.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;
    if (Math.abs(diff) > 35) {
      pauseTemporarily();
      if (diff > 0) {
        // Swiped left -> next image
        setActiveImgIdx((prev) => (prev + 1) % images.length);
      } else {
        // Swiped right -> prev image
        setActiveImgIdx((prev) => (prev - 1 + images.length) % images.length);
      }
    }
    setTouchStartX(null);
  };

  const isOutOfStock = product.availableSizes && product.availableSizes.length === 0;

  return (
    <div
      className={`${styles.productCard} ${isChecked ? styles.productCardActive : ''}`}
      onClick={() => onOpenDetails(product)}
    >
      {/* Free Ribbon Top Left */}
      <div className={styles.freeRibbon}>FREE</div>

      {/* Checkbox Top Right */}
      <button
        type="button"
        className={`${styles.cardCheckbox} ${isChecked ? styles.cardCheckboxChecked : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          if (!isOutOfStock) onToggleSelect(product);
        }}
        title={isChecked ? 'Deselect hoodie' : 'Select as free hoodie'}
        aria-label={isChecked ? 'Deselect hoodie' : 'Select as free hoodie'}
      >
        {isChecked ? <Check size={12} strokeWidth={3} /> : null}
      </button>

      {/* Product Image with Slideshow & Touch Swipe */}
      <div
        className={styles.cardImageWrapper}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <img
          src={images[activeImgIdx] || product.image}
          alt={product.name}
          className={styles.cardImage}
          loading="lazy"
        />

        {images.length > 1 && (
          <>
            <button
              type="button"
              className={`${styles.imgSliderBtn} ${styles.imgSliderPrev}`}
              onClick={handlePrev}
              aria-label="Previous image"
            >
              <ChevronLeft size={13} />
            </button>
            <button
              type="button"
              className={`${styles.imgSliderBtn} ${styles.imgSliderNext}`}
              onClick={handleNext}
              aria-label="Next image"
            >
              <ChevronRight size={13} />
            </button>

            {/* Dots */}
            <div className={styles.imgSliderDots}>
              {images.map((_, dotIdx) => (
                <span
                  key={dotIdx}
                  className={`${styles.imgSliderDot} ${
                    dotIdx === activeImgIdx ? styles.imgSliderDotActive : ''
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Card Body */}
      <div className={styles.cardBody}>
        <h4 className={styles.cardTitle} title={product.name}>
          {product.name}
        </h4>

        {isChecked && chosenSize && chosenSize !== 'Standard' && (
          <div className={styles.selectedSizeTag}>
            Size: <strong>{chosenSize}</strong>
          </div>
        )}

        <div className={styles.cardPriceRow}>
          <span className={styles.struckPrice}>
            ₹{product.price.toLocaleString('en-IN')}
          </span>
          <span className={styles.freePriceText}>₹0 FREE</span>
        </div>

        <div className={styles.cardDetailsHint}>
          <span>Tap for details →</span>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// MAIN MODAL COMPONENT
// =========================================================================
export default function FreeProductSelectorModal() {
  const router = useRouter();
  const {
    isBogoSelectorOpen,
    setIsBogoSelectorOpen,
    buyNowPromoItem,
    setBuyNowPromoItem,
    directOfferItem,
    setDirectOfferItem,
    activeBogoParentId,
    addPromoBundle,
    updatePromoBundle,
    editingPromoGroupId,
    setEditingPromoGroupId,
    cart,
    bogoPromoConfig,
    setIsCartOpen,
  } = useCart();

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [products, setProducts] = useState<FreeProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [chosenFreeItems, setChosenFreeItems] = useState<SelectedSlotItem[]>([]);
  const [modalOffer, setModalOffer] = useState<any>(null);
  const [qualifyingCategory, setQualifyingCategory] = useState<any>(null);
  const [paidQuantity, setPaidQuantity] = useState(1);
  const [limitWarning, setLimitWarning] = useState(false);
  const [buyNowPaymentMode, setBuyNowPaymentMode] = useState<'ONLINE_RAZORPAY' | 'COD'>('ONLINE_RAZORPAY');
  const [isLaunchingPayment, setIsLaunchingPayment] = useState(false);
  const isBuyNow = Boolean(buyNowPromoItem);

  // Full Product Details Sheet state
  const [detailProduct, setDetailProduct] = useState<FreeProductOption | null>(null);
  const [detailSelectedSize, setDetailSelectedSize] = useState<string>('');
  const [detailActiveImgIdx, setDetailActiveImgIdx] = useState<number>(0);

  // Quick Size Selection modal state (for direct checkbox clicks on multi-size items)
  const [sizeModalProduct, setSizeModalProduct] = useState<FreeProductOption | null>(null);
  const [sizeModalSelectedSize, setSizeModalSelectedSize] = useState<string>('');

  const productGridRef = useRef<HTMLDivElement>(null);

  // Systematic Size Order: All Sizes -> S -> M -> L -> XL -> XXL
  const SYSTEMATIC_SIZES = useMemo(() => ['S', 'M', 'L', 'XL', 'XXL'], []);

  // =========================================================================
  // REQUIREMENT 3: ROCK-SOLID BACKGROUND SCROLL LOCK (iOS SAFARI COMPATIBLE)
  // =========================================================================
  useEffect(() => {
    if (!isBogoSelectorOpen) return;

    // 1. Capture exact current window scroll position
    const scrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;

    // 2. Snapshot existing body styles
    const originalBodyPosition = document.body.style.position;
    const originalBodyTop = document.body.style.top;
    const originalBodyLeft = document.body.style.left;
    const originalBodyRight = document.body.style.right;
    const originalBodyWidth = document.body.style.width;
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;

    // 3. Freeze body firmly at current offset
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      // 4. Restore original styles cleanly
      document.body.style.position = originalBodyPosition;
      document.body.style.top = originalBodyTop;
      document.body.style.left = originalBodyLeft;
      document.body.style.right = originalBodyRight;
      document.body.style.width = originalBodyWidth;
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;

      // 5. Restore exact scroll offset instantly with zero jump
      window.scrollTo({
        top: scrollY,
        left: 0,
        behavior: 'instant' as ScrollBehavior,
      });
    };
  }, [isBogoSelectorOpen]);

  // =========================================================================
  // REQUIREMENT 8: BROWSER BACK BUTTON INTEGRATION FOR PRODUCT DETAILS
  // =========================================================================
  useEffect(() => {
    const handlePopState = () => {
      if (detailProduct) {
        setDetailProduct(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [detailProduct]);

  // Derive original triggering product that qualified for offer
  const triggerProduct: SelectedSlotItem | null = useMemo(() => {
    if (editingPromoGroupId) {
      const bundleItems = cart.filter((i) => i.promoGroupId === editingPromoGroupId);
      const paid = bundleItems.find((i) => i.isPaidPromoItem) || bundleItems[0];
      if (paid) {
        return {
          slotKey: `main-${paid.productId}-${paid.size}`,
          productId: paid.productId,
          name: paid.name.replace(/^\[FREE\]\s*/i, ''),
          image: paid.image,
          size: paid.size || 'Standard',
          color: paid.color || 'Standard',
          price: Number(paid.price),
          originalPrice: Number(paid.originalPrice || paid.price),
          sku: paid.sku,
          maxStock: paid.maxStock || 10,
          category: paid.category,
          categorySlug: paid.categorySlug,
          categoryName: paid.categoryName,
          buyQuantity: paid.buyQuantity,
          freeQuantity: paid.freeQuantity,
          promotionRule: paid.promotionRule,
        };
      }
    }

    if (directOfferItem) {
      return {
        slotKey: `main-${directOfferItem.productId}-${directOfferItem.size}`,
        productId: directOfferItem.productId,
        name: directOfferItem.name,
        image: directOfferItem.image,
        size: directOfferItem.size || 'Standard',
        color: directOfferItem.color || 'Standard',
        price: Number(directOfferItem.price),
        originalPrice: Number(directOfferItem.originalPrice || directOfferItem.price),
        sku: directOfferItem.sku,
        maxStock: directOfferItem.maxStock || 10,
        category: directOfferItem.category,
        categorySlug: directOfferItem.categorySlug,
        categoryName: directOfferItem.categoryName,
        buyQuantity: directOfferItem.buyQuantity,
        freeQuantity: directOfferItem.freeQuantity,
        promotionRule: directOfferItem.promotionRule,
      };
    }

    if (buyNowPromoItem) {
      return {
        slotKey: `main-${buyNowPromoItem.productId}-${buyNowPromoItem.size}`,
        productId: buyNowPromoItem.productId,
        name: buyNowPromoItem.name,
        image: buyNowPromoItem.image,
        size: buyNowPromoItem.size || 'Standard',
        color: buyNowPromoItem.color || 'Standard',
        price: Number(buyNowPromoItem.price),
        originalPrice: Number(buyNowPromoItem.originalPrice || buyNowPromoItem.price),
        sku: buyNowPromoItem.sku,
        maxStock: buyNowPromoItem.maxStock || 10,
        category: buyNowPromoItem.category,
        categorySlug: buyNowPromoItem.categorySlug,
        categoryName: buyNowPromoItem.categoryName,
        buyQuantity: buyNowPromoItem.buyQuantity,
        freeQuantity: buyNowPromoItem.freeQuantity,
        promotionRule: buyNowPromoItem.promotionRule,
      };
    }

    if (activeBogoParentId) {
      const parent = cart.find((i) => i.id === activeBogoParentId);
      if (parent) {
        return {
          slotKey: `main-${parent.productId}-${parent.size}`,
          productId: parent.productId,
          name: parent.name,
          image: parent.image,
          size: parent.size || 'Standard',
          color: parent.color || 'Standard',
          price: Number(parent.price),
          originalPrice: Number(parent.originalPrice || parent.price),
          sku: parent.sku,
          maxStock: parent.maxStock || 10,
          category: parent.category,
          categorySlug: parent.categorySlug,
          categoryName: parent.categoryName,
          buyQuantity: parent.buyQuantity,
          freeQuantity: parent.freeQuantity,
          promotionRule: parent.promotionRule,
        };
      }
    }

    const firstPaid = cart.find((i) => !i.isFree && !i.promoGroupId);
    if (firstPaid) {
      return {
        slotKey: `main-${firstPaid.productId}-${firstPaid.size}`,
        productId: firstPaid.productId,
        name: firstPaid.name,
        image: firstPaid.image,
        size: firstPaid.size || 'Standard',
        color: firstPaid.color || 'Standard',
        price: Number(firstPaid.price),
        originalPrice: Number(firstPaid.originalPrice || firstPaid.price),
        sku: firstPaid.sku,
        maxStock: firstPaid.maxStock || 10,
        category: firstPaid.category,
        categorySlug: firstPaid.categorySlug,
        categoryName: firstPaid.categoryName,
        buyQuantity: firstPaid.buyQuantity,
        freeQuantity: firstPaid.freeQuantity,
        promotionRule: firstPaid.promotionRule,
      };
    }

    return null;
  }, [editingPromoGroupId, directOfferItem, buyNowPromoItem, activeBogoParentId, cart]);

  // Determine active offer quantities & category scope dynamically
  const effectiveOffer = modalOffer || bogoPromoConfig;
  const freeMultiplier = effectiveOffer?.freeQuantity ?? 1;
  const buyQuantity = paidQuantity;
  const freeQuantity = paidQuantity * freeMultiplier;
  const promoName = triggerProduct?.promotionRule || effectiveOffer?.name || 'SPECIAL OFFER';
  const categoryDisplayName =
    qualifyingCategory?.name ||
    triggerProduct?.categoryName ||
    products[0]?.category?.name ||
    'Hoodies';
  const categorySingular = formatCategoryForFreeCount(categoryDisplayName, 1);
  const categoryPlural = formatCategoryForFreeCount(categoryDisplayName, 2);

  const allCandidateItems: SelectedSlotItem[] = useMemo(() => {
    const pool: SelectedSlotItem[] = [];
    if (triggerProduct) {
      for (let i = 0; i < paidQuantity; i++) {
        pool.push(triggerProduct);
      }
    }
    chosenFreeItems.forEach((f) => pool.push(f));
    return pool;
  }, [triggerProduct, paidQuantity, chosenFreeItems]);

  const sortedCandidateItems: SelectedSlotItem[] = useMemo(() => {
    return [...allCandidateItems].sort((a, b) => b.price - a.price);
  }, [allCandidateItems]);

  const mainPaidProduct: SelectedSlotItem | null = useMemo(() => {
    if (triggerProduct) {
      return triggerProduct;
    }
    if (sortedCandidateItems.length > 0) {
      return sortedCandidateItems[0];
    }
    return null;
  }, [sortedCandidateItems, triggerProduct]);

  // Fetch eligible promotional products strictly from same category
  useEffect(() => {
    if (isBogoSelectorOpen) {
      setLoading(true);
      const params = new URLSearchParams();
      if (triggerProduct?.productId) params.set('productId', triggerProduct.productId);
      if (triggerProduct?.categorySlug) params.set('category', triggerProduct.categorySlug);
      if (triggerProduct?.category?.id) params.set('categoryId', triggerProduct.category.id);

      fetch(`/api/promotions/bogo?${params.toString()}`)
        .then((res) => res.json())
        .then((data) => {
          if (data && data.success) {
            if (data.promotion) setModalOffer(data.promotion);
            if (data.qualifyingCategory) setQualifyingCategory(data.qualifyingCategory);
            if (Array.isArray(data.products)) {
              setProducts(data.products);
            }
          }
        })
        .catch((err) => console.error('Failed to load eligible promotional products', err))
        .finally(() => setLoading(false));

      // Pre-populate if editing existing bundle
      if (editingPromoGroupId) {
        const bundleItems = cart.filter((i) => i.promoGroupId === editingPromoGroupId);
        const paidItemsInBundle = bundleItems.filter((i) => i.isPaidPromoItem);
        const initialPaid = Math.max(1, paidItemsInBundle.length || 1);
        setPaidQuantity(initialPaid);

        const paidItem = paidItemsInBundle[0] || bundleItems[0];
        const freeItems = bundleItems.filter((i) => !i.isPaidPromoItem && i.id !== paidItem?.id);
        const initialFree: SelectedSlotItem[] = freeItems.map((f, idx) => ({
          slotKey: `existing-free-${f.productId}-${f.size}-${idx}`,
          productId: f.productId,
          name: f.name.replace(/^\[FREE\]\s*/i, ''),
          image: f.image,
          size: f.size || 'Standard',
          color: f.color || 'Standard',
          price: Number(f.price),
          originalPrice: Number(f.originalPrice || f.price),
          sku: f.sku,
          maxStock: f.maxStock || 10,
          category: f.category,
          categorySlug: f.categorySlug,
          categoryName: f.categoryName,
        }));
        setChosenFreeItems(initialFree);
      } else {
        const initialPaid = Math.max(1, directOfferItem?.quantity || buyNowPromoItem?.quantity || 1);
        setPaidQuantity(initialPaid);
      }
    } else {
      setChosenFreeItems([]);
      setPaidQuantity(1);
      setModalOffer(null);
      setQualifyingCategory(null);
      setSizeModalProduct(null);
      setDetailProduct(null);
    }
  }, [
    isBogoSelectorOpen,
    editingPromoGroupId,
    triggerProduct?.productId,
    triggerProduct?.categorySlug,
    cart,
  ]);

  // DYNAMIC PRICING CALCULATION
  const { youPay, youSave, totalCatalog } = useMemo(() => {
    const basePrice = triggerProduct?.price || (mainPaidProduct ? mainPaidProduct.price : 1999);
    const rawPaidSum = basePrice * paidQuantity;

    const is9ProductBonusEligible = paidQuantity >= 3 && chosenFreeItems.length >= 6;
    const is6ProductBonusEligible = paidQuantity >= 2 && chosenFreeItems.length >= 4;
    const bonusDiscount = is9ProductBonusEligible
      ? Math.min(200, rawPaidSum)
      : is6ProductBonusEligible
      ? Math.min(100, rawPaidSum)
      : 0;
    const finalPayable = Math.max(0, rawPaidSum - bonusDiscount);

    // Total Catalog MRP sum
    const mainMrp = triggerProduct?.originalPrice || triggerProduct?.price || (basePrice * 2);
    const freeMrpSum = chosenFreeItems.reduce(
      (acc, it) => acc + (it.originalPrice || it.price || mainMrp),
      0
    );
    const unchosenSlotsCount = Math.max(0, freeQuantity - chosenFreeItems.length);
    const estimatedRemainingMrp = unchosenSlotsCount * mainMrp;
    const catSum = (mainMrp * paidQuantity) + freeMrpSum + estimatedRemainingMrp;
    const savings = Math.max(0, catSum - finalPayable);

    return {
      youPay: finalPayable,
      youSave: savings,
      totalCatalog: catSum,
    };
  }, [triggerProduct, mainPaidProduct, paidQuantity, chosenFreeItems, freeQuantity]);

  if (!isBogoSelectorOpen) return null;

  const freeCount = chosenFreeItems.length;
  const isComplete = freeCount === freeQuantity;
  const remainingCount = Math.max(0, freeQuantity - freeCount);

  // OPTION A: Increase quantity of this exact product
  const handleOptionAAddSameProduct = () => {
    const baseProduct = triggerProduct || mainPaidProduct;
    if (!baseProduct) return;
    const sameItems: SelectedSlotItem[] = [];
    for (let i = 0; i < freeQuantity; i++) {
      sameItems.push({
        slotKey: `same-free-${baseProduct.productId}-${baseProduct.size}-${i}-${Date.now()}`,
        productId: baseProduct.productId,
        name: baseProduct.name,
        image: baseProduct.image,
        size: baseProduct.size,
        color: baseProduct.color,
        price: baseProduct.price,
        originalPrice: baseProduct.originalPrice || baseProduct.price,
        sku: baseProduct.sku,
        maxStock: baseProduct.maxStock,
        category: baseProduct.category,
        categorySlug: baseProduct.categorySlug,
        categoryName: baseProduct.categoryName,
      });
    }
    setChosenFreeItems(sameItems);
  };

  // Add free product item with confirmed size
  const addFreeItemWithChosenSize = (product: FreeProductOption, chosenSize: string) => {
    const newFreeItem: SelectedSlotItem = {
      slotKey: `free-${product.id}-${chosenSize}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 6)}`,
      productId: product.id,
      name: product.name,
      image: product.image,
      size: chosenSize,
      color: product.color || 'Standard',
      price: product.price,
      originalPrice: product.originalPrice || product.price,
      sku: product.sku,
      maxStock: 99,
      category: product.category,
      categorySlug: product.category?.slug,
      categoryName: product.category?.name,
    };

    setChosenFreeItems((prev) => [...prev, newFreeItem]);
  };

  // Toggle selection from the grid
  const handleToggleProductSelection = (product: FreeProductOption) => {
    const existingIndex = chosenFreeItems.findIndex((f) => f.productId === product.id);

    if (existingIndex !== -1) {
      // Deselect immediately
      setChosenFreeItems((prev) => prev.filter((_, idx) => idx !== existingIndex));
      return;
    }

    if (chosenFreeItems.length >= freeQuantity) {
      if (freeQuantity === 1) {
        if (product.availableSizes && product.availableSizes.length > 1) {
          const triggerSize = triggerProduct?.size || 'M';
          const initialSize = product.availableSizes.includes(triggerSize)
            ? triggerSize
            : product.availableSizes[0];

          setSizeModalSelectedSize(initialSize);
          setSizeModalProduct(product);
        } else {
          const sz = product.availableSizes?.[0] || 'Standard';
          setChosenFreeItems([]);
          addFreeItemWithChosenSize(product, sz);
        }
        return;
      }

      setLimitWarning(true);
      setTimeout(() => setLimitWarning(false), 1200);
      return;
    }

    if (product.availableSizes && product.availableSizes.length > 1) {
      const triggerSize = triggerProduct?.size || 'M';
      const initialSize = product.availableSizes.includes(triggerSize)
        ? triggerSize
        : product.availableSizes[0];

      setSizeModalSelectedSize(initialSize);
      setSizeModalProduct(product);
    } else {
      const sz = product.availableSizes?.[0] || 'Standard';
      addFreeItemWithChosenSize(product, sz);
    }
  };

  // Open full product details view
  const handleOpenDetails = (product: FreeProductOption) => {
    setDetailProduct(product);
    setDetailActiveImgIdx(0);

    const existing = chosenFreeItems.find((f) => f.productId === product.id);
    if (existing?.size && existing.size !== 'Standard') {
      setDetailSelectedSize(existing.size);
    } else {
      const triggerSize = triggerProduct?.size || 'M';
      const initialSize = product.availableSizes.includes(triggerSize)
        ? triggerSize
        : product.availableSizes[0] || 'M';
      setDetailSelectedSize(initialSize);
    }

    if (typeof window !== 'undefined') {
      window.history.pushState({ adrizoBogoDetail: true, productId: product.id }, '');
    }
  };

  // Close full product details view with browser history alignment
  const handleCloseDetailModal = () => {
    if (typeof window !== 'undefined' && window.history.state?.adrizoBogoDetail) {
      window.history.back();
    } else {
      setDetailProduct(null);
    }
  };

  // Close main modal safely without corrupting cart
  const handleCloseModal = () => {
    setIsBogoSelectorOpen(false);
    setBuyNowPromoItem(null);
    setDirectOfferItem(null);
    setEditingPromoGroupId(null);
    setChosenFreeItems([]);
    setSizeModalProduct(null);
    setDetailProduct(null);
  };

  // Skip offer & buy only the paid item
  const handleSkipPromotion = () => {
    if (buyNowPromoItem) {
      setIsLaunchingPayment(true);
      launchRazorpayCheckout({
        items: [{
          productId: buyNowPromoItem.productId,
          size: buyNowPromoItem.size || 'Standard',
          color: buyNowPromoItem.color || 'Standard',
          quantity: 1,
          name: buyNowPromoItem.name,
          price: buyNowPromoItem.price,
          categorySlug: buyNowPromoItem.categorySlug,
          categoryName: buyNowPromoItem.categoryName,
          category: buyNowPromoItem.category,
          isFree: false,
        }],
        paymentMethod: buyNowPaymentMode,
        onSuccess: ({ orderId, orderNumber }) => {
          setIsLaunchingPayment(false);
          handleCloseModal();
          router.push(`/order-success?orderId=${orderId}&orderNumber=${orderNumber}`);
        },
        onDismiss: () => {
          setIsLaunchingPayment(false);
        },
        onError: (errMsg) => {
          setIsLaunchingPayment(false);
          alert(errMsg || 'Failed to initialize payment.');
        }
      });
    } else {
      handleCloseModal();
    }
  };

  // Confirm complete promotional bundle
  const handleConfirmBundle = () => {
    const baseProduct = triggerProduct || mainPaidProduct;
    if (!baseProduct) {
      alert('Main product is missing.');
      return;
    }

    if (chosenFreeItems.length !== freeQuantity) {
      alert(
        `Please select exactly ${freeQuantity} free ${formatCategoryForFreeCount(
          categoryDisplayName,
          freeQuantity
        )} to complete your promotion.`
      );
      return;
    }

    const bundleItemsToSubmit: CartItem[] = [];

    // 1. Paid items
    for (let i = 0; i < paidQuantity; i++) {
      bundleItemsToSubmit.push({
        id: `paid-${baseProduct.productId}-${baseProduct.size}-${i}-${Date.now()}`,
        productId: baseProduct.productId,
        name: baseProduct.name,
        price: baseProduct.price,
        originalPrice: baseProduct.originalPrice || baseProduct.price,
        image: baseProduct.image,
        size: baseProduct.size,
        color: baseProduct.color,
        quantity: 1,
        maxStock: baseProduct.maxStock,
        sku: baseProduct.sku,
        category: baseProduct.category,
        categorySlug: baseProduct.categorySlug,
        categoryName: baseProduct.categoryName,
        buyQuantity: paidQuantity,
        freeQuantity: freeQuantity,
        promotionRule: promoName,
        isPaidPromoItem: true,
        isFree: false,
      });
    }

    // 2. Free items
    for (let i = 0; i < chosenFreeItems.length; i++) {
      const item = chosenFreeItems[i];
      bundleItemsToSubmit.push({
        id: `free-${item.productId}-${item.size}-${i}-${Date.now()}`,
        productId: item.productId,
        name: item.name.startsWith('[FREE]') ? item.name : `[FREE] ${item.name}`,
        price: 0,
        originalPrice: item.originalPrice || item.price,
        image: item.image,
        size: item.size,
        color: item.color,
        quantity: 1,
        maxStock: item.maxStock,
        sku: item.sku,
        category: item.category,
        categorySlug: item.categorySlug,
        categoryName: item.categoryName,
        buyQuantity: paidQuantity,
        freeQuantity: freeQuantity,
        promotionRule: promoName,
        isPaidPromoItem: false,
        isFree: true,
      });
    }

    if (isBuyNow) {
      setIsLaunchingPayment(true);
      launchRazorpayCheckout({
        items: bundleItemsToSubmit.map(i => ({
          productId: i.productId,
          size: i.size,
          color: i.color,
          quantity: 1,
          name: i.name,
          price: i.isFree ? 0 : i.price,
          categorySlug: i.categorySlug,
          categoryName: i.categoryName,
          category: i.category,
          isFree: i.isFree,
          promotionRule: i.promotionRule,
          parentId: i.parentId,
          promoGroupId: i.promoGroupId,
        })),
        paymentMethod: buyNowPaymentMode,
        onSuccess: ({ orderId, orderNumber }) => {
          setIsLaunchingPayment(false);
          handleCloseModal();
          router.push(`/order-success?orderId=${orderId}&orderNumber=${orderNumber}`);
        },
        onDismiss: () => {
          setIsLaunchingPayment(false);
        },
        onError: (errMsg) => {
          setIsLaunchingPayment(false);
          alert(errMsg || 'Failed to initialize payment.');
        }
      });
      return;
    }

    if (editingPromoGroupId) {
      updatePromoBundle(editingPromoGroupId, bundleItemsToSubmit);
    } else {
      addPromoBundle(bundleItemsToSubmit);
    }

    setIsBogoSelectorOpen(false);
    setBuyNowPromoItem(null);
    setDirectOfferItem(null);
    setEditingPromoGroupId(null);
    setChosenFreeItems([]);
    setIsCartOpen(true);
  };

  const totalBundleItemsCount = buyQuantity + freeQuantity;

  // Detail product image list
  const detailImages = detailProduct
    ? (detailProduct.images && detailProduct.images.length > 0
        ? detailProduct.images
        : [detailProduct.image])
    : [];

  const isDetailProductSelected = detailProduct
    ? chosenFreeItems.some((f) => f.productId === detailProduct.id)
    : false;

  const modalContent = (
    <div className={styles.modalOverlay} onClick={handleCloseModal}>
      <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
        {/* =========================================================================
            REQUIREMENT 1: SPECIAL OFFER HEADER WITH COLORFUL GIFT & CUSTOM BADGE
            ========================================================================= */}
        <div className={styles.modalHeader}>
          <div className={styles.singleLineOfferTitle}>
            <ColorfulGiftIcon size={18} />
            <span className={styles.specialOfferText}>SPECIAL OFFER</span>
            <span className={styles.headerDash}>—</span>
            <span className={styles.bogoOfferPhrase}>
              <span className={styles.bogoBuyText}>BUY</span>
              <span className={styles.bogoDigitBox}>{buyQuantity}</span>
              <span className={styles.bogoGetText}>GET</span>
              <span className={styles.bogoFreeText}>{freeQuantity} FREE</span>
            </span>
          </div>

          <button
            type="button"
            className={styles.closeBtn}
            onClick={handleCloseModal}
            title="Close"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* =========================================================================
            REQUIREMENT 4: SCROLLABLE MODAL BODY (INDEPENDENT INTERNAL SCROLL)
            ========================================================================= */}
        <div className={styles.modalBody}>
          {/* SECTION 2: Selected Status immediately below the header */}
          <div className={styles.selectedStatusRow}>
            <span className={styles.selectedStatusText}>
              Selected: <strong>{freeCount}/{freeQuantity}</strong>
            </span>
          </div>

          {/* SECTION 3: Main Title */}
          <div className={styles.titleSection}>
            <h2 className={styles.modalTitle}>
              Choose {freeQuantity} {categorySingular} for{' '}
              <span className={styles.greenHighlight}>Free</span>
            </h2>
            <p className={styles.modalSubtitle}>
              Buy {buyQuantity} Eligible Paid {categorySingular} &bull; Get {freeQuantity} Free
            </p>
          </div>

          {/* SECTION 4 & 5: Main Paid Product Card (Simplified, Paid Qty removed) */}
          <div className={styles.mainProductCard}>
            <div className={styles.mainProductTopRow}>
              <span className={styles.mainProductBadge}>MAIN PRODUCT (PAID)</span>
            </div>

            {mainPaidProduct ? (
              <div className={styles.mainProductBody}>
                <div className={styles.mainProductThumb}>
                  <img src={mainPaidProduct.image} alt={mainPaidProduct.name} />
                </div>
                <div className={styles.mainProductDetails}>
                  <h4 className={styles.mainProductTitle} title={mainPaidProduct.name}>
                    {mainPaidProduct.name}
                  </h4>
                  <div className={styles.mainProductPrice}>
                    ₹{mainPaidProduct.price.toLocaleString('en-IN')}
                  </div>
                  <div className={styles.mainProductMeta}>
                    Color: {mainPaidProduct.color?.toUpperCase() || 'STANDARD'}
                    {mainPaidProduct.size && mainPaidProduct.size !== 'Standard' && (
                      <span> &bull; Size: {mainPaidProduct.size.toUpperCase()}</span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className={styles.loadingPlaceholder}>Loading product...</div>
            )}

            {/* SECTION 5: Increase quantity section */}
            <div className={styles.increaseQtySection}>
              <div className={styles.increaseQtyTexts}>
                <div className={styles.increaseQtyTitle}>
                  Increase quantity of this {categorySingular}?
                </div>
                <div className={styles.increaseQtySubtitle}>
                  Get next {freeQuantity} quantity free
                </div>
              </div>
              <button
                type="button"
                className={styles.addFreeWithThisBtn}
                onClick={handleOptionAAddSameProduct}
              >
                Add {freeQuantity} Free with this
              </button>
            </div>
          </div>

          {/* =========================================================================
              REQUIREMENT 2: CATALOG VALUE FIX — PERFECTLY CENTERED, NO OVERFLOW
              ========================================================================= */}
          <div className={styles.pricingRowCard}>
            <div className={styles.pricingMetricCol}>
              <span className={styles.metricLabel}>CATALOG VALUE</span>
              <span className={styles.metricCatalogPrice}>
                ₹{totalCatalog.toLocaleString('en-IN')}
              </span>
            </div>

            <div className={styles.pricingDivider} />

            <div className={styles.pricingMetricCol}>
              <span className={styles.metricLabel}>YOU SAVE</span>
              <span className={styles.metricSavingsPrice}>
                ₹{youSave.toLocaleString('en-IN')}
              </span>
            </div>

            <div className={styles.pricingDivider} />

            <div className={styles.pricingMetricCol}>
              <span className={styles.metricLabel}>PAYABLE PRICE</span>
              <span className={styles.metricPayablePrice}>
                ₹{youPay.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* SECTION 7: Buy 1 + 1 Free Green Badge */}
          <div className={styles.greenOfferBadge}>
            <Gift size={14} className={styles.greenGiftIcon} />
            <span>Buy {buyQuantity} + {freeQuantity} Free</span>
          </div>

          {/* =========================================================================
              REQUIREMENTS 5, 6, 9: FREE PRODUCT GRID WITH INDEPENDENT SLIDESHOWS
              ========================================================================= */}
          <div ref={productGridRef} className={styles.productGrid}>
            {loading ? (
              <div className={styles.gridEmptyMessage}>
                Loading eligible {categoryPlural}...
              </div>
            ) : products.length === 0 ? (
              <div className={styles.gridEmptyMessage}>
                No eligible {categoryPlural} available.
              </div>
            ) : (
              products.map((product, idx) => {
                const isChecked = chosenFreeItems.some((f) => f.productId === product.id);
                const chosenItem = chosenFreeItems.find((f) => f.productId === product.id);

                return (
                  <FreeProductCard
                    key={product.id}
                    product={product}
                    index={idx}
                    isChecked={isChecked}
                    chosenSize={chosenItem?.size}
                    onToggleSelect={handleToggleProductSelection}
                    onOpenDetails={handleOpenDetails}
                  />
                );
              })
            )}
          </div>
        </div>

        {/* =========================================================================
            REQUIREMENTS 7 & 8: FULL PRODUCT DETAILS SHEET WITH BROWSER BACK SUPPORT
            ========================================================================= */}
        {detailProduct && (
          <div className={styles.detailSheetOverlay} onClick={handleCloseDetailModal}>
            <div
              className={styles.detailSheetContainer}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Detail Sheet Header */}
              <div className={styles.detailSheetHeader}>
                <button
                  type="button"
                  className={styles.detailBackBtn}
                  onClick={handleCloseDetailModal}
                  title="Back to offer"
                >
                  <ChevronLeft size={20} />
                  <span>Back to Offer</span>
                </button>
                <button
                  type="button"
                  className={styles.detailCloseBtn}
                  onClick={handleCloseDetailModal}
                  aria-label="Close product details"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Detail Sheet Scrollable Body */}
              <div className={styles.detailSheetBody}>
                {/* Full Image Gallery Carousel */}
                <div className={styles.detailGallery}>
                  <div className={styles.detailMainImageWrap}>
                    <img
                      src={detailImages[detailActiveImgIdx] || detailProduct.image}
                      alt={detailProduct.name}
                      className={styles.detailMainImage}
                    />
                    {detailImages.length > 1 && (
                      <>
                        <button
                          type="button"
                          className={`${styles.detailImgNavBtn} ${styles.detailImgPrev}`}
                          onClick={() =>
                            setDetailActiveImgIdx(
                              (prev) => (prev - 1 + detailImages.length) % detailImages.length
                            )
                          }
                          aria-label="Previous image"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <button
                          type="button"
                          className={`${styles.detailImgNavBtn} ${styles.detailImgNext}`}
                          onClick={() =>
                            setDetailActiveImgIdx((prev) => (prev + 1) % detailImages.length)
                          }
                          aria-label="Next image"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </>
                    )}
                  </div>

                  {/* Thumbnail Row */}
                  {detailImages.length > 1 && (
                    <div className={styles.detailThumbRow}>
                      {detailImages.map((imgUrl, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className={`${styles.detailThumbBtn} ${
                            idx === detailActiveImgIdx ? styles.detailThumbBtnActive : ''
                          }`}
                          onClick={() => setDetailActiveImgIdx(idx)}
                        >
                          <img src={imgUrl} alt={`Thumb ${idx + 1}`} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Product Info Section */}
                <div className={styles.detailInfoSection}>
                  <div className={styles.detailBadgeRow}>
                    <span className={styles.detailFreeBadge}>ELIGIBLE FREE HOODIE</span>
                    {detailProduct.category?.name && (
                      <span className={styles.detailCategoryBadge}>
                        {detailProduct.category.name}
                      </span>
                    )}
                  </div>

                  <h3 className={styles.detailTitle}>{detailProduct.name}</h3>

                  <div className={styles.detailPriceRow}>
                    <span className={styles.detailStruckPrice}>
                      ₹{detailProduct.price.toLocaleString('en-IN')}
                    </span>
                    <span className={styles.detailFreePrice}>₹0 FREE</span>
                    <span className={styles.detailSaveTag}>100% OFF</span>
                  </div>

                  {detailProduct.color && detailProduct.color !== 'Standard' && (
                    <div className={styles.detailColorRow}>
                      Color: <strong>{detailProduct.color.toUpperCase()}</strong>
                    </div>
                  )}
                </div>

                {/* Size Selection Section */}
                <div className={styles.detailSizeSection}>
                  <div className={styles.detailSizeHeader}>
                    <span className={styles.detailSectionLabel}>Select Size:</span>
                    {detailSelectedSize && (
                      <span className={styles.detailCurrentSize}>
                        Selected: <strong>{detailSelectedSize}</strong>
                      </span>
                    )}
                  </div>
                  <div className={styles.detailSizeGrid}>
                    {SYSTEMATIC_SIZES.filter((sz) =>
                      detailProduct.availableSizes.some(
                        (s) => s.toUpperCase() === sz.toUpperCase()
                      )
                    ).map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        className={`${styles.detailSizeBtn} ${
                          detailSelectedSize === sz ? styles.detailSizeBtnActive : ''
                        }`}
                        onClick={() => setDetailSelectedSize(sz)}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Product Description */}
                {detailProduct.description && (
                  <div className={styles.detailAccordionItem}>
                    <h4 className={styles.detailAccordionTitle}>Product Description</h4>
                    <p className={styles.detailDescriptionText}>{detailProduct.description}</p>
                  </div>
                )}

                {/* Features & Wash Care */}
                <div className={styles.detailAccordionItem}>
                  <h4 className={styles.detailAccordionTitle}>Features &amp; Care</h4>
                  <ul className={styles.detailFeatureList}>
                    <li>100% Super-combed Premium Heavyweight Cotton Fleece</li>
                    <li>Double-stitched reinforced seams for long-lasting comfort</li>
                    <li>Machine wash cold with similar colors, tumble dry low</li>
                    <li>Pre-shrunk fabric to preserve fit and silhouette</li>
                  </ul>
                </div>

                {/* Shipping & Delivery Guarantee */}
                <div className={styles.detailAccordionItem}>
                  <h4 className={styles.detailAccordionTitle}>Shipping &amp; Returns</h4>
                  <p className={styles.detailDeliveryText}>
                    ✓ Free Express Shipping across India (2–5 Days Delivery)<br />
                    ✓ 7 Days Easy Returns &amp; Exchanges Policy
                  </p>
                </div>
              </div>

              {/* Detail Sheet Sticky Action Footer */}
              <div className={styles.detailSheetFooter}>
                <button
                  type="button"
                  className={styles.detailSecondaryBtn}
                  onClick={handleCloseDetailModal}
                >
                  ← Back to Offer
                </button>

                {isDetailProductSelected ? (
                  <button
                    type="button"
                    className={styles.detailRemoveBtn}
                    onClick={() => {
                      handleToggleProductSelection(detailProduct);
                      handleCloseDetailModal();
                    }}
                  >
                    Remove Free Selection
                  </button>
                ) : (
                  <button
                    type="button"
                    className={styles.detailSelectBtn}
                    disabled={!detailSelectedSize}
                    onClick={() => {
                      if (!detailSelectedSize) return;
                      if (freeQuantity === 1 && chosenFreeItems.length >= 1) {
                        setChosenFreeItems([]);
                      }
                      addFreeItemWithChosenSize(detailProduct, detailSelectedSize);
                      handleCloseDetailModal();
                    }}
                  >
                    {detailSelectedSize
                      ? `Select Size ${detailSelectedSize} & Add Free`
                      : 'Please Select a Size'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Direct Size Selection Modal (Quick selector for checkbox clicks) */}
        {sizeModalProduct && !detailProduct && (
          <div
            className={styles.sizeModalOverlay}
            onClick={() => setSizeModalProduct(null)}
          >
            <div
              className={styles.sizeModalCard}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.sizeModalHeader}>
                <div className={styles.sizeModalHeaderInfo}>
                  <h3 className={styles.sizeModalTitle}>Select Size</h3>
                  <p className={styles.sizeModalSubtitle}>{sizeModalProduct.name}</p>
                </div>
                <button
                  type="button"
                  className={styles.sizeModalCloseBtn}
                  onClick={() => setSizeModalProduct(null)}
                  aria-label="Close size modal"
                >
                  <X size={16} />
                </button>
              </div>

              <div className={styles.sizeModalBody}>
                <div className={styles.sizeModalProductRow}>
                  <img
                    src={sizeModalProduct.image}
                    alt={sizeModalProduct.name}
                    className={styles.sizeModalThumb}
                  />
                  <div className={styles.sizeModalMeta}>
                    <div className={styles.sizeModalColorText}>
                      Color: <span>{sizeModalProduct.color || 'Standard'}</span>
                    </div>
                    <div className={styles.sizeModalPriceText}>
                      ₹{sizeModalProduct.price.toLocaleString('en-IN')}{' '}
                      <span className={styles.sizeModalFreeTag}>FREE with offer</span>
                    </div>
                  </div>
                </div>

                <div className={styles.sizeSelectionArea}>
                  <span className={styles.sizeSelectLabel}>Available Sizes:</span>
                  <div className={styles.sizePillGrid}>
                    {SYSTEMATIC_SIZES.filter((sz) =>
                      sizeModalProduct.availableSizes.some(
                        (s) => s.toUpperCase() === sz.toUpperCase()
                      )
                    ).map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        className={`${styles.sizePillBtn} ${
                          sizeModalSelectedSize === sz ? styles.sizePillBtnActive : ''
                        }`}
                        onClick={() => setSizeModalSelectedSize(sz)}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className={styles.sizeModalFooter}>
                <button
                  type="button"
                  className={styles.sizeModalCancelBtn}
                  onClick={() => setSizeModalProduct(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={styles.sizeModalConfirmBtn}
                  disabled={!sizeModalSelectedSize}
                  onClick={() => {
                    if (sizeModalProduct && sizeModalSelectedSize) {
                      if (freeQuantity === 1 && chosenFreeItems.length >= 1) {
                        setChosenFreeItems([]);
                      }
                      addFreeItemWithChosenSize(sizeModalProduct, sizeModalSelectedSize);
                      setSizeModalProduct(null);
                    }
                  }}
                >
                  Select {sizeModalSelectedSize} &amp; Add Free
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            REQUIREMENT 4: FIXED BOTTOM SUMMARY & CTA TRAY
            ========================================================================= */}
        <div className={styles.footerBar}>
          <div className={styles.footerInfoRow}>
            <span className={styles.footerLabel}>
              Total payable for all {totalBundleItemsCount} items:
            </span>
            <div className={styles.footerPriceWrap}>
              <span className={styles.footerPayable}>₹{youPay.toLocaleString('en-IN')}</span>
              <span className={styles.footerSavings}>
                (Save ₹{youSave.toLocaleString('en-IN')})
              </span>
            </div>
          </div>

          <div className={styles.footerActions}>
            {isBuyNow && isComplete && (
              <div style={{ display: 'flex', gap: '0.45rem', width: '100%', marginBottom: '0.2rem' }}>
                <button
                  type="button"
                  onClick={() => setBuyNowPaymentMode('ONLINE_RAZORPAY')}
                  style={{
                    flex: 1,
                    padding: '0.45rem 0.5rem',
                    borderRadius: '6px',
                    border: buyNowPaymentMode === 'ONLINE_RAZORPAY' ? '1.5px solid #09090b' : '1px solid #d1d5db',
                    background: buyNowPaymentMode === 'ONLINE_RAZORPAY' ? '#09090b' : '#ffffff',
                    color: buyNowPaymentMode === 'ONLINE_RAZORPAY' ? '#ffffff' : '#111827',
                    fontSize: '0.725rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem'
                  }}
                >
                  <span>Pay Online</span>
                  <span style={{ 
                    background: buyNowPaymentMode === 'ONLINE_RAZORPAY' ? '#FFC800' : '#fef08a', 
                    color: '#000000', 
                    fontSize: '0.65rem', 
                    fontWeight: 800, 
                    padding: '0.1rem 0.35rem', 
                    borderRadius: '3px' 
                  }}>
                    -₹50 Extra
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setBuyNowPaymentMode('COD')}
                  style={{
                    flex: 1,
                    padding: '0.45rem 0.5rem',
                    borderRadius: '6px',
                    border: buyNowPaymentMode === 'COD' ? '1.5px solid #09090b' : '1px solid #d1d5db',
                    background: buyNowPaymentMode === 'COD' ? '#09090b' : '#ffffff',
                    color: buyNowPaymentMode === 'COD' ? '#ffffff' : '#111827',
                    fontSize: '0.725rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem'
                  }}
                >
                  <span>Cash on Delivery</span>
                  <span style={{ 
                    color: buyNowPaymentMode === 'COD' ? '#a1a1aa' : '#71717a', 
                    fontSize: '0.65rem', 
                    fontWeight: 600 
                  }}>
                    (₹99 Advance)
                  </span>
                </button>
              </div>
            )}

            <button
              type="button"
              className={styles.skipOfferLink}
              onClick={handleSkipPromotion}
            >
              Skip offer &amp; buy {buyQuantity} item only (₹
              {(((triggerProduct || mainPaidProduct)?.price || 0) * buyQuantity).toLocaleString(
                'en-IN'
              )}
              )
            </button>

            <button
              type="button"
              className={`${styles.continueBtn} ${
                isComplete && !isLaunchingPayment ? styles.continueBtnActive : styles.continueBtnDisabled
              }`}
              onClick={handleConfirmBundle}
              disabled={!isComplete || isLaunchingPayment}
            >
              {isLaunchingPayment
                ? `Connecting to Secure Razorpay...`
                : isComplete
                  ? isBuyNow
                    ? buyNowPaymentMode === 'ONLINE_RAZORPAY'
                      ? `Proceed to Pay ₹${Math.max(0, youPay - 50).toLocaleString('en-IN')} Online →`
                      : `Pay ₹99 Advance & Confirm COD →`
                    : editingPromoGroupId
                      ? `Update Offer →`
                      : `Add Bundle to Cart →`
                  : `Please select ${remainingCount} more ${categorySingular} →`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return mounted && typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : null;
}
