"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Minus, 
  Plus, 
  ShoppingCart,
  Zap,
  Ruler,
  Share2,
  Check,
  ChevronLeft,
  ChevronRight,
  X,
  FileText,
  ShieldCheck,
  Feather,
  Gift,
} from 'lucide-react';
import styles from './product.module.css';
import { useCart } from '../../../../context/CartContext';
import { getOptimizedImageUrl } from '@/lib/image-utils';
import SizeChartModal from '@/components/SizeChartModal';
import ProductCard from '@/components/ProductCard';
import { getProductPricing, calculateDiscountPercentage, formatCurrency } from '@/lib/pricing';

export const COLOR_HEX_MAP: Record<string, string> = {
  'JET BLACK': '#111111',
  'BLACK': '#111111',
  'WHITE': '#FFFFFF',
  'PURE WHITE': '#FFFFFF',
  'RED': '#D92323',
  'NAVY BLUE': '#14213D',
  'NAVY': '#14213D',
  'MEHRON': '#721121',
  'MAROON': '#721121',
  'MUSTARD': '#DDA15E',
  'PARROT GREEN': '#60B246',
  'OLIVE GREEN': '#588157',
  'OLIVE': '#588157',
  'BOTTLE GREEN': '#134611',
  'ROSE PINK': '#E07A5F',
  'SKY BLUE': '#8ECAE6',
  '5% MELANGE': '#D8D8D8',
  '15% MELANGE': '#A8A8A8',
  'BABY PINK': '#F4ACB7',
  'YELLOW': '#FAB800',
  'ROYAL BLUE': '#1D4ED8',
  'FROZI BLUE': '#48CAE4',
  'LIGHT INDIGO': '#4F81BD',
  'DARK INDIGO': '#2C4D75',
  'WASHED BLACK': '#333333',
  'CHARCOAL': '#374151',
  'GOLD': '#D4AF37',
  'SLATE GRAY': '#64748B',
  'SAND': '#D2B48C',
  'DEEP NAVY': '#0F172A',
  'ECRU / OFF-WHITE': '#F5F5DC',
  'OFF-WHITE': '#F8F8F6',
  'SAGE GREEN': '#8A9A86',
};

const LIGHT_YELLOW_ICON_COLOR = "#F6D060";

interface ProductClientProps {
  product: any;
  initialRelatedProducts?: any[];
}

export default function ProductClient({ product, initialRelatedProducts = [] }: ProductClientProps) {
  const { addToCart, openBogoSelectorFor, openBuyNowPromoModal, bogoPromoConfig, activeOffers } = useCart();
  const router = useRouter();

  // 1. Resolve Images List
  let imagesList: string[] = [];
  if (product.images && product.images.length > 0) {
    imagesList = product.images.map((img: any) => getOptimizedImageUrl(img.url, { width: 1400 }));
  } else if (product.imagesRaw) {
    try {
      const parsed = JSON.parse(product.imagesRaw || '[]');
      if (Array.isArray(parsed) && parsed.length > 0) {
        imagesList = parsed.map((url: string) => getOptimizedImageUrl(url, { width: 1400 }));
      }
    } catch {
      imagesList = [];
    }
  }

  if (imagesList.length === 0) {
    imagesList = ['https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&q=80&w=1200'];
  }

  // 2. Resolve Sizes (e.g. S, M, L, XL, XXL or 28, 30, 32, 34, 36, 38)
  let sizes: string[] = [];
  if (product.sizesRaw) {
    try {
      const parsed = JSON.parse(product.sizesRaw);
      if (Array.isArray(parsed)) {
        sizes = parsed.filter(Boolean);
      }
    } catch (e) {
      sizes = [];
    }
  }

  if (sizes.length === 0 && product.variants && product.variants.length > 0) {
    const sizeSet = new Set<string>();
    product.variants.forEach((v: any) => {
      if (v.size) sizeSet.add(v.size);
    });
    sizes = Array.from(sizeSet);
  }

  // Ensure standard available sizes S, M, L, XL, XXL are present
  if (sizes.length === 0) {
    sizes = ['S', 'M', 'L', 'XL', 'XXL'];
  }

  // Default selected size: select 'M' or '30' if present, otherwise first size
  const defaultSize = sizes.includes('M') ? 'M' : (sizes.includes('30') ? '30' : sizes[0] || 'M');
  const hasSizing = sizes.length > 0;

  // State
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isSlideshowPaused, setIsSlideshowPaused] = useState(false);
  const [selectedSize, setSelectedSize] = useState(defaultSize);
  const quantity = 1;
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [addedSuccess, setAddedSuccess] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  // Exclusive accordion state: only ONE accordion can ever be open at a time
  const [activeAccordion, setActiveAccordion] = useState<string | null>(null);

  const toggleAccordion = (key: string) => {
    setActiveAccordion((prev) => (prev === key ? null : key));
  };

  // "You May Also Like" Related Products State & Dynamic Exclusion
  const [relatedProducts, setRelatedProducts] = useState<any[]>(initialRelatedProducts);

  // Client-side fallback if initialRelatedProducts is empty
  useEffect(() => {
    if (!initialRelatedProducts || initialRelatedProducts.length === 0) {
      fetch('/api/promotions/bogo')
        .then((res) => res.json())
        .then((data) => {
          if (data.products && Array.isArray(data.products)) {
            setRelatedProducts(data.products);
          }
        })
        .catch(() => {});
    }
  }, [initialRelatedProducts]);

  // CRITICAL REQUIREMENT: Strictly exclude currently opened product
  const filteredRelatedProducts = useMemo(() => {
    return (relatedProducts || []).filter((p: any) => p.id !== product.id);
  }, [relatedProducts, product.id]);

  // Authoritative dynamic offer resolution for this product & category
  const currentProductOffer = useMemo(() => {
    const prodCatSlug = (product.category?.slug || '').toLowerCase().trim();
    const prodCatName = (product.category?.name || '').toLowerCase().trim();
    const prodType = (product.productType || '').toLowerCase().trim();

    const offersToSearch = (activeOffers && activeOffers.length > 0)
      ? activeOffers
      : (bogoPromoConfig ? [bogoPromoConfig] : []);

    // 1. Explicit product match
    const prodMatch = offersToSearch.find((o: any) => 
      (o.status === 'ACTIVE' || o.active) && 
      (o.applicableProducts?.includes(product.id) || o.applicableProductIds?.includes(product.id))
    );
    if (prodMatch) return prodMatch;

    // 2. Specific category match (not 'all')
    const catMatch = offersToSearch.find((o: any) => {
      if (o.status !== 'ACTIVE' && !o.active) return false;
      const cats = o.applicableCategories || o.eligibleCategories || [];
      return cats.some((c: string) => {
        const low = c.toLowerCase().trim();
        if (!low || low === 'all') return false;
        return (
          low === prodCatSlug ||
          low === prodCatName ||
          low === prodType ||
          low.replace(/s$/, '') === prodCatSlug.replace(/s$/, '') ||
          low.replace(/s$/, '') === prodType.replace(/s$/, '') ||
          (prodType && prodType.includes(low)) ||
          (prodCatName && prodCatName.includes(low))
        );
      });
    });
    if (catMatch) return catMatch;

    // 3. Fallback to storewide 'all' offer
    const storewideMatch = offersToSearch.find((o: any) => 
      (o.status === 'ACTIVE' || o.active) && 
      ((o.applicableCategories && o.applicableCategories.includes('all')) || 
       (o.eligibleCategories && o.eligibleCategories.includes('all')) ||
       !o.applicableCategories || o.applicableCategories.length === 0)
    );
    return storewideMatch || null;
  }, [activeOffers, bogoPromoConfig, product]);

  const isProductPromoEligible = useMemo(() => {
    return Boolean(currentProductOffer);
  }, [currentProductOffer]);


  // Carousel scroll navigation
  const carouselTrackRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = useCallback(() => {
    const el = carouselTrackRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 10);
  }, []);

  useEffect(() => {
    const el = carouselTrackRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [checkScroll, filteredRelatedProducts.length]);

  const handleScrollPrev = () => {
    if (carouselTrackRef.current) {
      carouselTrackRef.current.scrollBy({ left: -340, behavior: 'smooth' });
    }
  };

  const handleScrollNext = () => {
    if (carouselTrackRef.current) {
      carouselTrackRef.current.scrollBy({ left: 340, behavior: 'smooth' });
    }
  };

  // Automatic Image Slideshow
  useEffect(() => {
    if (imagesList.length <= 1 || isSlideshowPaused || isLightboxOpen) return;

    const interval = setInterval(() => {
      setActiveImageIndex((prev) => (prev + 1) % imagesList.length);
    }, 3800);

    return () => clearInterval(interval);
  }, [imagesList.length, isSlideshowPaused, isLightboxOpen]);

  // Dynamic Authoritative Pricing & Discount Calculation
  const pricing = getProductPricing(product);
  const baseSellingPrice = pricing.sellingPrice;
  const originalPrice = pricing.mrp;

  let currentPrice = baseSellingPrice;
  let maxStock = 99;

  if (product.variants && product.variants.length > 0) {
    const selectedVariant = product.variants.find((v: any) => 
      (v.size === selectedSize || (!v.size && !selectedSize))
    );
    if (selectedVariant) {
      if (selectedVariant.priceAdjustment) currentPrice += selectedVariant.priceAdjustment;
    }
  }

  // Auto-calculated discount percentage: ((MRP - Selling Price) / MRP) * 100
  const discountPercentage = originalPrice && originalPrice > currentPrice
    ? parseFloat((((originalPrice - currentPrice) / originalPrice) * 100).toFixed(2))
    : (pricing.hasDiscount ? pricing.discountPercent : 0);


  // Gallery Navigation (Lightbox)
  const handlePrevImage = useCallback(() => {
    setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : imagesList.length - 1));
  }, [imagesList.length]);

  const handleNextImage = useCallback(() => {
    setActiveImageIndex((prev) => (prev < imagesList.length - 1 ? prev + 1 : 0));
  }, [imagesList.length]);

  // Keyboard navigation for Lightbox
  useEffect(() => {
    if (!isLightboxOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsLightboxOpen(false);
      if (e.key === 'ArrowLeft') handlePrevImage();
      if (e.key === 'ArrowRight') handleNextImage();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen, handlePrevImage, handleNextImage]);

  // Prevent body scroll when lightbox is open
  useEffect(() => {
    if (isLightboxOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isLightboxOpen]);

  // Cart & Buy Now Handlers
  const handleAddToCart = () => {
    if (maxStock <= 0) {
      alert("This selected item/size is currently out of stock.");
      return;
    }
    if (hasSizing && !selectedSize) {
      alert("Please select a size.");
      return;
    }
    
    const cartItemId = `${product.id}-${selectedSize || 'standard'}`;
    addToCart({
      id: cartItemId,
      productId: product.id,
      name: product.name,
      price: currentPrice,
      originalPrice: originalPrice || product.price,
      image: imagesList[activeImageIndex] || imagesList[0],
      size: selectedSize || 'Standard',
      color: product.color || 'Default',
      quantity,
      maxStock,
      category: product.category ? { id: product.category.id, name: product.category.name, slug: product.category.slug } : null,
      categorySlug: product.category?.slug,
      categoryName: product.category?.name,
      buyQuantity: currentProductOffer?.buyQuantity,
      freeQuantity: currentProductOffer?.freeQuantity,
      promotionRule: currentProductOffer?.name,
    });

    setAddedSuccess(true);
    setTimeout(() => setAddedSuccess(false), 2500);

    // Open promotion selector modal only if product qualifies for active promotion
    if (isProductPromoEligible) {
      setTimeout(() => {
        openBogoSelectorFor(cartItemId);
      }, 400);
    }
  };

  const handleBuyNow = () => {
    if (maxStock <= 0) {
      alert("This selected item/size is currently out of stock.");
      return;
    }
    if (hasSizing && !selectedSize) {
      alert("Please select a size to proceed.");
      return;
    }

    if (isProductPromoEligible) {
      // Open the promotion modal with the chosen item pre-selected as Main Product
      openBuyNowPromoModal({
        id: `${product.id}-${selectedSize || 'standard'}`,
        productId: product.id,
        name: product.name,
        price: currentPrice,
        originalPrice: originalPrice || product.price,
        image: imagesList[activeImageIndex] || imagesList[0],
        size: selectedSize || 'Standard',
        color: product.color || 'Default',
        quantity: 1,
        maxStock,
        sku: product.sku,
        category: product.category ? { id: product.category.id, name: product.category.name, slug: product.category.slug } : null,
        categorySlug: product.category?.slug,
        categoryName: product.category?.name,
        buyQuantity: currentProductOffer?.buyQuantity,
        freeQuantity: currentProductOffer?.freeQuantity,
        promotionRule: currentProductOffer?.name,
      });
      return;
    }

    // Normal 1-item Buy Now fallback if promotion is explicitly disabled in store settings
    const buyNowPayload = {
      productId: product.id,
      name: product.name,
      price: currentPrice,
      originalPrice: originalPrice || product.price,
      discountPercentage,
      image: imagesList[activeImageIndex] || imagesList[0],
      size: selectedSize || 'Standard',
      color: product.color || 'Default',
      quantity,
      sku: product.sku,
      maxStock
    };

    if (typeof window !== 'undefined') {
      sessionStorage.setItem('adrizo_buy_now', JSON.stringify(buyNowPayload));
    }

    router.push(`/checkout?buyNow=1&productId=${product.id}&size=${encodeURIComponent(selectedSize || 'Standard')}&qty=${quantity}`);
  };

  const handleViewOfferDetails = () => {
    openBogoSelectorFor({
      id: `${product.id}-${selectedSize || defaultSize || 'standard'}`,
      productId: product.id,
      name: product.name,
      price: currentPrice,
      originalPrice: originalPrice || product.price,
      image: imagesList[activeImageIndex] || imagesList[0] || product.image,
      size: selectedSize || defaultSize || 'Standard',
      color: product.color || 'Default',
      quantity: 1,
      maxStock: maxStock > 0 ? maxStock : 10,
      sku: product.sku,
      category: product.category ? { id: product.category.id, name: product.category.name, slug: product.category.slug } : null,
      categorySlug: product.category?.slug,
      categoryName: product.category?.name,
      buyQuantity: currentProductOffer?.buyQuantity,
      freeQuantity: currentProductOffer?.freeQuantity,
      promotionRule: currentProductOffer?.name,
    });
  };

  // Dynamic Canonical Product Share Handler
  const handleShare = async () => {
    const shareUrl = typeof window !== 'undefined' ? window.location.href : `https://adrizo.com/product/${product.slug || product.id}`;
    const shareData = {
      title: product.name,
      text: `Check out ${product.name} on ADRIZO`,
      url: shareUrl,
    };

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share(shareData);
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }
    }

    // Fallback to clipboard copy
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopiedShare(true);
        setTimeout(() => setCopiedShare(false), 2500);
      } catch (e) {
        prompt('Copy product link:', shareUrl);
      }
    }
  };

  const formattedSellingPrice = formatCurrency(currentPrice);
  const formattedOriginalPrice = originalPrice ? formatCurrency(originalPrice) : null;

  // Fit / Model information text
  const fitModelText = product.sizeFit || "Regular fit. Model is 6'1\" wearing size L.";

  return (
    <div className={styles.pageContainer}>
      <div className={styles.productLayout}>
        {/* ========================================================= */}
        {/* LEFT COLUMN: VERTICAL THUMBNAILS + FIXED FRAME HERO IMAGE */}
        {/* ========================================================= */}
        <div className={styles.gallerySection}>
          {/* Vertical Thumbnail Strip */}
          <div className={styles.thumbnailColumn}>
            <div className={styles.thumbnailList}>
              {imagesList.map((img: string, idx: number) => {
                const isActive = activeImageIndex === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    className={`${styles.thumbnailCard} ${isActive ? styles.thumbnailActive : ''}`}
                    onClick={() => setActiveImageIndex(idx)}
                    onMouseEnter={() => setIsSlideshowPaused(true)}
                    onMouseLeave={() => setIsSlideshowPaused(false)}
                    aria-label={`View image ${idx + 1}`}
                  >
                    <img 
                      src={img} 
                      alt={`${product.name} thumbnail ${idx + 1}`} 
                      className={styles.thumbImg}
                      loading="lazy"
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Frameless Hero Main Image with Fixed Container Frame and Smooth Internal Hover Zoom */}
          <div 
            className={styles.mainImageWrapper}
            onMouseEnter={() => setIsSlideshowPaused(true)}
            onMouseLeave={() => setIsSlideshowPaused(false)}
          >
            <div 
              className={styles.mainImageCard}
              onClick={() => setIsLightboxOpen(true)}
              role="button"
              tabIndex={0}
              aria-label="Click to enlarge image"
            >
              {imagesList.map((img: string, idx: number) => {
                const isCurrent = activeImageIndex === idx;
                return (
                  <img 
                    key={idx}
                    src={img} 
                    alt={`${product.name} view ${idx + 1}`}
                    className={`${styles.mainHeroImg} ${isCurrent ? styles.mainHeroImgActive : styles.mainHeroImgHidden}`}
                    loading={idx === 0 ? "eager" : "lazy"}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 2. PRODUCT INFORMATION COLUMN — RIGHT SIDE               */}
        {/* ========================================================= */}
        <div className={styles.productInfoSection}>
          {/* Top Fixed Information Zone */}
          <div className={styles.topInfoSection}>
            {/* 1. Product Title (Prominent at top, no breadcrumbs) */}
            <h1 className={styles.productTitle}>{product.name.toUpperCase()}</h1>

            {/* 2. Pricing Row: Selling Price + Crossed MRP + Dynamic Discount Badge */}
            <div className={styles.priceRow}>
              <span className={styles.mainPrice}>{formattedSellingPrice}</span>
              {formattedOriginalPrice && discountPercentage > 0 && (
                <span className={styles.originalPrice}>{formattedOriginalPrice}</span>
              )}
              {discountPercentage > 0 && (
                <span className={styles.discountBadge}>{discountPercentage}% OFF</span>
              )}
            </div>

            {/* 3. SIZE & Size Chart (Directly after pricing) */}
            <div className={styles.sizeSection}>
              <div className={styles.selectorHeaderRow}>
                <label className={styles.selectorTitle}>SIZE</label>
                <button
                  type="button"
                  className={styles.sizeGuideTrigger}
                  onClick={() => setIsSizeGuideOpen(true)}
                  aria-label="Open Size Chart"
                >
                  <Ruler size={14} />
                  <span>Size Chart</span>
                </button>
              </div>
              <div className={styles.sizeBoxesWrap}>
                {sizes.map((sizeKey) => {
                  const isSelected = selectedSize === sizeKey;
                  return (
                    <button
                      key={sizeKey}
                      type="button"
                      className={`${styles.sizeBox} ${isSelected ? styles.sizeBoxSelected : ''}`}
                      onClick={() => setSelectedSize(sizeKey)}
                    >
                      {sizeKey}
                    </button>
                  );
                })}
              </div>

              {/* Fit / Model Information subtle text style directly below size buttons */}
              {fitModelText && (
                <div className={styles.fitModelNote}>
                  {fitModelText}
                </div>
              )}
            </div>
          </div>

          {/* Dedicated Scrollable Accordion Area */}
          <div className={styles.accordionScrollArea}>
            <div className={styles.accordionContainer}>
              {/* 1. Product Description */}
              <div className={styles.accordionItem}>
                <button 
                  type="button" 
                  className={styles.accordionHeader}
                  onClick={() => toggleAccordion('description')}
                  aria-expanded={activeAccordion === 'description'}
                >
                  <div className={styles.accordionTitleGroup}>
                    <FileText size={18} className={styles.accordionIconLeft} color={LIGHT_YELLOW_ICON_COLOR} />
                    <span>Product Description</span>
                  </div>
                  <span className={styles.accordionToggleIcon}>{activeAccordion === 'description' ? '−' : '+'}</span>
                </button>
                {activeAccordion === 'description' && (
                  <div className={styles.accordionBody}>
                    <p>{product.description || 'Premium matty Lycra polo t-shirt engineered for breathable comfort, sharp silhouette, and long-lasting durability. The ' + product.name + ' delivers a perfect blend of style, stretch, and durability.'}</p>
                  </div>
                )}
              </div>

              {/* 2. Wash Care */}
              <div className={styles.accordionItem}>
                <button 
                  type="button" 
                  className={styles.accordionHeader}
                  onClick={() => toggleAccordion('washCare')}
                  aria-expanded={activeAccordion === 'washCare'}
                >
                  <div className={styles.accordionTitleGroup}>
                    {/* Wash Tub SVG Icon */}
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={LIGHT_YELLOW_ICON_COLOR} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.accordionIconLeft}>
                      <path d="M3 6h18l-2 13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L3 6z" />
                      <path d="M3 11c2.5-2 5.5 2 8 0s5.5 2 8 0" />
                    </svg>
                    <span>Wash Care</span>
                  </div>
                  <span className={styles.accordionToggleIcon}>{activeAccordion === 'washCare' ? '−' : '+'}</span>
                </button>
                {activeAccordion === 'washCare' && (
                  <div className={styles.accordionBody}>
                    <p>{product.washCare || 'Machine wash cold with like colors. Do not bleach. Tumble dry low or hang dry in shade. Warm iron if needed.'}</p>
                  </div>
                )}
              </div>

              {/* 3. Free Shipping */}
              <div className={styles.accordionItem}>
                <button 
                  type="button" 
                  className={styles.accordionHeader}
                  onClick={() => toggleAccordion('shipping')}
                  aria-expanded={activeAccordion === 'shipping'}
                >
                  <div className={styles.accordionTitleGroup}>
                    {/* Free Shipping Truck SVG Icon */}
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={LIGHT_YELLOW_ICON_COLOR} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.accordionIconLeft}>
                      <rect x="1" y="3" width="15" height="13" rx="2" />
                      <polygon points="16 8 20 8 23 11 23 16 16 16 8" />
                      <circle cx="5.5" cy="18.5" r="2.5" />
                      <circle cx="18.5" cy="18.5" r="2.5" />
                    </svg>
                    <span>Free Shipping</span>
                  </div>
                  <span className={styles.accordionToggleIcon}>{activeAccordion === 'shipping' ? '−' : '+'}</span>
                </button>
                {activeAccordion === 'shipping' && (
                  <div className={styles.accordionBody}>
                    <p>{product.freeShippingText || 'Complimentary standard express shipping across all pin codes in India on all prepaid and Cash on Delivery (COD) orders.'}</p>
                  </div>
                )}
              </div>

              {/* 4. 2–5 Days Delivery (with Clock icon & merged Dispatch details) */}
              <div className={styles.accordionItem}>
                <button 
                  type="button" 
                  className={styles.accordionHeader}
                  onClick={() => toggleAccordion('delivery')}
                  aria-expanded={activeAccordion === 'delivery'}
                >
                  <div className={styles.accordionTitleGroup}>
                    {/* Clock SVG Icon */}
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={LIGHT_YELLOW_ICON_COLOR} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.accordionIconLeft}>
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    <span>2–5 Days Delivery</span>
                  </div>
                  <span className={styles.accordionToggleIcon}>{activeAccordion === 'delivery' ? '−' : '+'}</span>
                </button>
                {activeAccordion === 'delivery' && (
                  <div className={styles.accordionBody}>
                    <div className={styles.deliveryDetailsContent}>
                      <p style={{ marginBottom: '0.4rem' }}>
                        <strong>Dispatch:</strong> {product.dispatchText || 'All orders are dispatched within 1–2 business days from our warehouse.'}
                      </p>
                      <p>
                        <strong>Delivery:</strong> {product.deliveryText || 'Metros: 2–3 business days. Rest of India: 3–5 business days.'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* 5. 7 Days Returns & Exchange */}
              <div className={styles.accordionItem}>
                <button 
                  type="button" 
                  className={styles.accordionHeader}
                  onClick={() => toggleAccordion('returns')}
                  aria-expanded={activeAccordion === 'returns'}
                >
                  <div className={styles.accordionTitleGroup}>
                    {/* Circular Return Arrows SVG */}
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={LIGHT_YELLOW_ICON_COLOR} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.accordionIconLeft}>
                      <path d="M3 12a9 9 0 0 1 15.54-6.36L21 8" />
                      <path d="M21 3v5h-5" />
                      <path d="M21 12a9 9 0 0 1-15.54 6.36L3 16" />
                      <path d="M3 21v-5h5" />
                    </svg>
                    <span>7 Days Returns &amp; Exchange</span>
                  </div>
                  <span className={styles.accordionToggleIcon}>{activeAccordion === 'returns' ? '−' : '+'}</span>
                </button>
                {activeAccordion === 'returns' && (
                  <div className={styles.accordionBody}>
                    <p>{product.returnPolicyText || 'Hassle-free 7-day doorstep exchange and return policy. If the fit is not 100% ideal, we arrange a free doorstep exchange pickup seamlessly.'}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Fixed Bottom Purchase Area (Promotion Offer + Action Buttons) */}
          <div className={styles.bottomPurchaseSection}>
            {/* Dynamic Promotional OFFER Card - rendered ONLY if active and eligible */}
            {isProductPromoEligible && currentProductOffer && (
              <div className={styles.offerCardPurchaseArea}>
                <div className={styles.offerCard}>
                  <div className={styles.offerCardLeft}>
                    <div className={styles.offerIconWrap}>
                      <Gift size={16} color="#000000" />
                    </div>
                    <div className={styles.offerTextWrap}>
                      <div className={styles.offerBadgeTitle}>
                        {currentProductOffer.name || 'SPECIAL OFFER'}
                      </div>
                      <div className={styles.offerBadgeSubtitle}>
                        Buy {currentProductOffer.buyQuantity || 1} &amp; pick <strong>{currentProductOffer.freeQuantity || 1} additional {product.category?.name ? product.category.name : 'product'}{(currentProductOffer.freeQuantity || 1) > 1 && !product.category?.name?.endsWith('s') ? 's' : ''} FREE</strong>!
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className={styles.offerCtaBtn}
                    onClick={handleViewOfferDetails}
                  >
                    View Details
                  </button>
                </div>
              </div>
            )}


            {/* Purchase Action Buttons */}
            <div className={styles.actionButtonsRow}>
              <button 
                type="button" 
                className={styles.addToCartBtn}
                onClick={handleAddToCart}
                disabled={maxStock <= 0}
              >
                <ShoppingCart size={16} strokeWidth={2.2} />
                <span>{addedSuccess ? 'ADDED TO CART ✓' : 'ADD TO CART'}</span>
              </button>

              <button 
                type="button" 
                className={styles.buyNowBtn}
                onClick={handleBuyNow}
                disabled={maxStock <= 0}
              >
                <Zap size={16} strokeWidth={2.4} fill="currentColor" />
                <span>BUY NOW</span>
              </button>

              <button
                type="button"
                className={`${styles.shareBtn} ${copiedShare ? styles.shareBtnSuccess : ''}`}
                onClick={handleShare}
                aria-label="Share product"
                title={copiedShare ? "Link copied to clipboard!" : "Share product"}
              >
                {copiedShare ? <Check size={16} strokeWidth={2.5} color="#16a34a" /> : <Share2 size={16} strokeWidth={2.2} />}
                <span className={styles.shareBtnLabel}>{copiedShare ? 'COPIED' : 'SHARE'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. "YOU MAY ALSO LIKE" RELATED PRODUCTS CAROUSEL          */}
      {/* ========================================================= */}
      {filteredRelatedProducts.length > 0 && (
        <section className={styles.relatedSection} aria-label="Related Products">
          <div className={styles.relatedHeader}>
            <div className={styles.relatedTitleGroup}>
              <h2 className={styles.relatedTitle}>You May Also Like</h2>
              <p className={styles.relatedSubtitle}>
                Handpicked styles curated just for you
              </p>
            </div>

            {/* Carousel Navigation Buttons */}
            <div className={styles.carouselControls}>
              <button
                type="button"
                className={`${styles.carouselNavBtn} ${!canScrollLeft ? styles.carouselNavBtnDisabled : ''}`}
                onClick={handleScrollPrev}
                disabled={!canScrollLeft}
                aria-label="Previous products"
              >
                <ChevronLeft size={20} strokeWidth={2.4} />
              </button>
              <button
                type="button"
                className={`${styles.carouselNavBtn} ${!canScrollRight ? styles.carouselNavBtnDisabled : ''}`}
                onClick={handleScrollNext}
                disabled={!canScrollRight}
                aria-label="Next products"
              >
                <ChevronRight size={20} strokeWidth={2.4} />
              </button>
            </div>
          </div>

          {/* Horizontal Product Carousel Track */}
          <div className={styles.carouselTrack} ref={carouselTrackRef}>
            {filteredRelatedProducts.map((relProduct: any) => (
              <div key={relProduct.id} className={styles.carouselItem}>
                <ProductCard product={relProduct} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ========================================================= */}
      {/* 4. SIZE GUIDE MODAL                                       */}
      {/* ========================================================= */}
      <SizeChartModal
        isOpen={isSizeGuideOpen}
        onClose={() => setIsSizeGuideOpen(false)}
        sizeChartRaw={product.sizeChart}
        productName={product.name}
        productType={product.productType}
        categoryName={product.category?.name}
      />

      {/* ========================================================= */}
      {/* 5. FULLSCREEN IMAGE LIGHTBOX / ZOOM MODAL                 */}
      {/* ========================================================= */}
      {isLightboxOpen && (
        <div className={styles.lightboxBackdrop} onClick={() => setIsLightboxOpen(false)}>
          <div className={styles.lightboxContent} onClick={(e) => e.stopPropagation()}>
            <button 
              type="button" 
              className={styles.lightboxCloseBtn}
              onClick={() => setIsLightboxOpen(false)}
              aria-label="Close zoom viewer"
            >
              <X size={24} />
            </button>

            <img 
              src={imagesList[activeImageIndex] || imagesList[0]} 
              alt={`${product.name} full view`}
              className={styles.lightboxImg} 
            />

            {imagesList.length > 1 && (
              <>
                <button 
                  type="button" 
                  className={`${styles.lightboxNavBtn} ${styles.lightboxPrevBtn}`}
                  onClick={handlePrevImage}
                  aria-label="Previous image"
                >
                  <ChevronLeft size={28} />
                </button>
                <button 
                  type="button" 
                  className={`${styles.lightboxNavBtn} ${styles.lightboxNextBtn}`}
                  onClick={handleNextImage}
                  aria-label="Next image"
                >
                  <ChevronRight size={28} />
                </button>

                <div className={styles.lightboxThumbnailStrip}>
                  {imagesList.map((img: string, idx: number) => (
                    <button
                      key={idx}
                      type="button"
                      className={`${styles.lightboxThumbBtn} ${activeImageIndex === idx ? styles.lightboxThumbActive : ''}`}
                      onClick={() => setActiveImageIndex(idx)}
                    >
                      <img src={img} alt={`Thumbnail ${idx + 1}`} />
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
