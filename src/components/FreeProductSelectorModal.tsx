"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Check,
  Gift,
  Search,
  ArrowRight,
  Minus,
  Plus,
  Info,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useCart, CartItem } from '../context/CartContext';
import { useRouter } from 'next/navigation';
import styles from './FreeProductSelectorModal.module.css';

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
    addToCart,
    bogoPromoConfig,
  } = useCart();

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [products, setProducts] = useState<FreeProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSizeFilter, setSelectedSizeFilter] = useState('all');
  const [selectedColorFilter, setSelectedColorFilter] = useState('all');
  const [selectedSort, setSelectedSort] = useState('default');
  const [chosenFreeItems, setChosenFreeItems] = useState<SelectedSlotItem[]>([]);
  const [modalOffer, setModalOffer] = useState<any>(null);
  const [qualifyingCategory, setQualifyingCategory] = useState<any>(null);
  const [paidQuantity, setPaidQuantity] = useState(1);
  const [sameProductStepperQty, setSameProductStepperQty] = useState(1);
  const [limitWarning, setLimitWarning] = useState(false);

  // Multi-image slider index map per product: { [productId]: currentImageIndex }
  const [productImgIndices, setProductImgIndices] = useState<Record<string, number>>({});

  // Size selection popup state
  const [sizeModalProduct, setSizeModalProduct] = useState<FreeProductOption | null>(null);
  const [sizeModalSelectedSize, setSizeModalSelectedSize] = useState<string>('');

  const productGridRef = useRef<HTMLDivElement>(null);

  // Systematic Size Order: All Sizes -> S -> M -> L -> XL -> XXL
  const SYSTEMATIC_SIZES = useMemo(() => ['S', 'M', 'L', 'XL', 'XXL'], []);

  // Derive the original triggering product that qualified for the offer
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

    // Fallback: first non-free, non-bundled paid item from cart
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

  // Combine trigger product + all chosen free items into the bundle candidate pool
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

  // Sort candidate items by actual selling price descending (highest price becomes PAID)
  const sortedCandidateItems: SelectedSlotItem[] = useMemo(() => {
    return [...allCandidateItems].sort((a, b) => b.price - a.price);
  }, [allCandidateItems]);

  // The currently viewed product must always become the paid/main product when opening the offer directly from its product page
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

      // Main product size initially influences free product filter if valid
      if (triggerProduct?.size && SYSTEMATIC_SIZES.includes(triggerProduct.size.toUpperCase())) {
        setSelectedSizeFilter(triggerProduct.size.toUpperCase());
      } else {
        setSelectedSizeFilter('all');
      }

      // If editing an existing bundle, pre-populate free items and paid quantity
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
      setSearchQuery('');
      setSelectedSizeFilter('all');
      setSelectedColorFilter('all');
      setSelectedSort('default');
      setSizeModalProduct(null);
    }
  }, [
    isBogoSelectorOpen,
    editingPromoGroupId,
    triggerProduct?.productId,
    triggerProduct?.categorySlug,
    triggerProduct?.size,
    cart,
    SYSTEMATIC_SIZES,
  ]);

  const availableColorsList = useMemo(() => {
    const colorSet = new Set<string>();
    products.forEach((p) => {
      if (p.color && p.color !== 'Standard' && p.color !== 'Default') {
        colorSet.add(p.color.trim());
      }
    });
    return Array.from(colorSet).sort((a, b) => a.localeCompare(b));
  }, [products]);

  // Filter & Sort products strictly within the eligible category
  const filteredAndSortedProducts = useMemo(() => {
    let result = products.filter((p) => {
      const matchSearch =
        !searchQuery.trim() ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.color?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchSize =
        selectedSizeFilter === 'all' ||
        p.availableSizes?.some(
          (sz) => sz.toUpperCase().trim() === selectedSizeFilter.toUpperCase().trim()
        );

      const matchColor =
        selectedColorFilter === 'all' ||
        p.color?.toLowerCase().trim() === selectedColorFilter.toLowerCase().trim();

      return matchSearch && matchSize && matchColor;
    });

    if (selectedSort === 'price-low') {
      result = [...result].sort((a, b) => a.price - b.price);
    } else if (selectedSort === 'price-high') {
      result = [...result].sort((a, b) => b.price - a.price);
    } else if (selectedSort === 'newest') {
      result = [...result].reverse();
    } else if (selectedSort === 'name-asc') {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    }

    return result;
  }, [products, searchQuery, selectedSizeFilter, selectedColorFilter, selectedSort]);

  // DYNAMIC PRICING CALCULATION (strictly based on HIGHEST SELLING PRICE):
  const { youPay, youSave, totalCatalog, is6ProductBonusEligible, is9ProductBonusEligible } = useMemo(() => {
    const basePrice = triggerProduct?.price || (mainPaidProduct ? mainPaidProduct.price : 1999);
    const rawPaidSum = basePrice * paidQuantity;

    // Check 9-product and 6-product bundle conditions:
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
    // For unselected free slots, estimate based on main product's originalPrice (MRP)
    const unchosenSlotsCount = Math.max(0, freeQuantity - chosenFreeItems.length);
    const estimatedRemainingMrp = unchosenSlotsCount * mainMrp;
    const catSum = (mainMrp * paidQuantity) + freeMrpSum + estimatedRemainingMrp;
    const savings = Math.max(0, catSum - finalPayable);

    return {
      youPay: finalPayable,
      youSave: savings,
      totalCatalog: catSum,
      is6ProductBonusEligible,
      is9ProductBonusEligible,
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

  // Toggle selection of a product from the grid (Option B)
  const handleToggleProductSelection = (product: FreeProductOption) => {
    const existingIndex = chosenFreeItems.findIndex((f) => f.productId === product.id);

    if (existingIndex !== -1) {
      // Deselect immediately -> counter decrements cleanly
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

    // If product requires size selection, open the Size Selection Popup
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

  // Multi-image slider navigation
  const handlePrevImage = (productId: string, totalImages: number) => {
    setProductImgIndices((prev) => {
      const current = prev[productId] || 0;
      const nextIdx = (current - 1 + totalImages) % totalImages;
      return { ...prev, [productId]: nextIdx };
    });
  };

  const handleNextImage = (productId: string, totalImages: number) => {
    setProductImgIndices((prev) => {
      const current = prev[productId] || 0;
      const nextIdx = (current + 1) % totalImages;
      return { ...prev, [productId]: nextIdx };
    });
  };

  // Close modal safely without corrupting cart
  const handleCloseModal = () => {
    setIsBogoSelectorOpen(false);
    setBuyNowPromoItem(null);
    setDirectOfferItem(null);
    setEditingPromoGroupId(null);
    setChosenFreeItems([]);
    setSizeModalProduct(null);
  };

  // Skip offer & buy only the paid item
  const handleSkipPromotion = () => {
    if (buyNowPromoItem) {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('adrizo_buy_now', JSON.stringify(buyNowPromoItem));
      }
      setIsBogoSelectorOpen(false);
      setBuyNowPromoItem(null);
      setDirectOfferItem(null);
      setEditingPromoGroupId(null);
      router.push(
        `/checkout?buyNow=1&productId=${buyNowPromoItem.productId}&size=${encodeURIComponent(
          buyNowPromoItem.size || 'Standard'
        )}&qty=1`
      );
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

    // Build atomic bundle items: `paidQuantity` paid items + `freeQuantity` free items
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

    const isBuyNow = Boolean(buyNowPromoItem);
    const isFromDirectOffer = Boolean(directOfferItem);

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

    if (isBuyNow || isFromDirectOffer) {
      router.push('/checkout');
    }
  };

  const totalBundleItemsCount = buyQuantity + freeQuantity;

  const modalContent = (
    <div className={styles.modalOverlay} onClick={handleCloseModal}>
      <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
        {/* =========================================================================
            SECTION 1: SPECIAL OFFER SINGLE-LINE HEADER
            ========================================================================= */}
        <div className={styles.modalHeader}>
          <div className={styles.singleLineOfferTitle}>
            <Gift size={16} className={styles.headerGiftIcon} />
            <span className={styles.specialOfferText}>SPECIAL OFFER</span>
            <span className={styles.headerDash}>—</span>
            <span className={styles.bogoOfferText}>
              BUY {buyQuantity} GET {freeQuantity} FREE
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
            SCROLLABLE MODAL CONTENT
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

          {/* SECTION 6: Pricing Summary — Single Compact Row */}
          <div className={styles.pricingRowCard}>
            <div className={styles.pricingMetricCol}>
              <span className={styles.metricLabel}>
                CATALOG VALUE ({totalBundleItemsCount} ITEMS)
              </span>
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

          {/* SECTION 9 & 10: Free Product Grid (Search, Size, Color, Sort REMOVED completely!) */}
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
              products.map((product) => {
                const isChecked = chosenFreeItems.some((f) => f.productId === product.id);
                const isOutOfStock = product.availableSizes && product.availableSizes.length === 0;

                const productImages =
                  product.images && product.images.length > 0 ? product.images : [product.image];
                const activeImgIdx = productImgIndices[product.id] || 0;
                const currentImg = productImages[activeImgIdx] || product.image;
                const hasMultipleImages = productImages.length > 1;

                return (
                  <div
                    key={product.id}
                    className={`${styles.productCard} ${
                      isChecked ? styles.productCardActive : ''
                    }`}
                    onClick={() => !isOutOfStock && handleToggleProductSelection(product)}
                  >
                    {/* Free Ribbon Top Left */}
                    <div className={styles.freeRibbon}>FREE</div>

                    {/* Square Checkbox Top Right with Green Checkmark */}
                    <div
                      className={`${styles.cardCheckbox} ${
                        isChecked ? styles.cardCheckboxChecked : ''
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isOutOfStock) handleToggleProductSelection(product);
                      }}
                    >
                      {isChecked && <Check size={12} strokeWidth={3} />}
                    </div>

                    {/* Product Image */}
                    <div className={styles.cardImageWrapper}>
                      <img
                        src={currentImg}
                        alt={product.name}
                        className={styles.cardImage}
                        loading="lazy"
                      />
                      {hasMultipleImages && (
                        <>
                          <button
                            type="button"
                            className={`${styles.imgSliderBtn} ${styles.imgSliderPrev}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePrevImage(product.id, productImages.length);
                            }}
                            aria-label="Previous image"
                          >
                            <ChevronLeft size={12} />
                          </button>
                          <button
                            type="button"
                            className={`${styles.imgSliderBtn} ${styles.imgSliderNext}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNextImage(product.id, productImages.length);
                            }}
                            aria-label="Next image"
                          >
                            <ChevronRight size={12} />
                          </button>
                          <div className={styles.imgSliderDots}>
                            {productImages.map((_, idx) => (
                              <span
                                key={idx}
                                className={`${styles.imgSliderDot} ${
                                  idx === activeImgIdx ? styles.imgSliderDotActive : ''
                                }`}
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Product Details */}
                    <div className={styles.cardBody}>
                      <h4 className={styles.cardTitle} title={product.name}>
                        {product.name}
                      </h4>

                      {isChecked && (() => {
                        const chosen = chosenFreeItems.find((f) => f.productId === product.id);
                        return chosen?.size && chosen.size !== 'Standard' ? (
                          <div className={styles.selectedSizeTag}>
                            Size: <strong>{chosen.size}</strong>
                          </div>
                        ) : null;
                      })()}

                      {/* Price Row */}
                      <div className={styles.cardPriceRow}>
                        <span className={styles.struckPrice}>
                          ₹{product.price.toLocaleString('en-IN')}
                        </span>
                        <span className={styles.freePriceText}>₹0 FREE</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* SECTION 11: Size Selection Modal */}
        {sizeModalProduct && (
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
                  <span className={styles.sizeSelectLabel}>Available:</span>
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

        {/* SECTION 11: Sticky Footer Bar */}
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
                isComplete ? styles.continueBtnActive : styles.continueBtnDisabled
              }`}
              onClick={handleConfirmBundle}
              disabled={!isComplete}
            >
              {isComplete
                ? editingPromoGroupId
                  ? `Update Offer →`
                  : `Continue to Checkout →`
                : `Please select ${remainingCount} more ${categorySingular} →`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return mounted && typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}
