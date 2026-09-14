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
  Star,
} from 'lucide-react';
import styles from './product.module.css';
import { useCart } from '../../../../context/CartContext';
import { getOptimizedImageUrl } from '@/lib/image-utils';
import SizeChartModal from '@/components/SizeChartModal';
import ProductCard from '@/components/ProductCard';
import ProductReviewsSection from '@/components/ProductReviewsSection';
import { ProductRatingStats } from '@/types/review';
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

// ADRIZO Brand Yellow for product accordion & accent icons
const LIGHT_YELLOW_ICON_COLOR = "#FFC800";

interface ProductClientProps {
  product: any;
  initialRelatedProducts?: any[];
}

export default function ProductClient({ product, initialRelatedProducts = [] }: ProductClientProps) {
  const { addToCart, openBogoSelectorFor, openBuyNowPromoModal, bogoPromoConfig, activeOffers } = useCart();
  const router = useRouter();

  // 1. Resolve Images List & Device-Optimized CDN URLs
  const { heroImages, thumbnailImages, imagesList } = useMemo(() => {
    let list: string[] = [];
    if (product.images && product.images.length > 0) {
      list = product.images.map((img: any) => typeof img === 'string' ? img : (img?.url || img?.secure_url || ''));
    } else if (product.imagesRaw) {
      try {
        const parsed = JSON.parse(product.imagesRaw || '[]');
        if (Array.isArray(parsed) && parsed.length > 0) {
          list = parsed.map((item: any) => typeof item === 'string' ? item : (item?.url || item?.secure_url || ''));
        }
      } catch {
        list = [];
      }
    }

    list = list.filter(Boolean);
    if (list.length === 0) {
      list = ['https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&q=80&w=1200'];
    }

    const hero = list.map((url) => getOptimizedImageUrl(url, { width: 1000, crop: 'limit', quality: 'auto', format: 'auto' }));
    const thumbs = list.map((url) => getOptimizedImageUrl(url, { width: 160, crop: 'limit', quality: 'auto', format: 'auto' }));
    return { heroImages: hero, thumbnailImages: thumbs, imagesList: hero };
  }, [product.images, product.imagesRaw]);

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
  const [ratingStats, setRatingStats] = useState<ProductRatingStats>({
    averageRating: 0,
    totalReviews: 0,
    ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
  });

  // Dynamic aspect ratio preservation to never crop product photography
  const [imageAspectRatios, setImageAspectRatios] = useState<Record<number, string>>({});

  const handleImageLoaded = (idx: number, e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.naturalWidth && img.naturalHeight) {
      const ratio = `${img.naturalWidth} / ${img.naturalHeight}`;
      setImageAspectRatios((prev) => (prev[idx] === ratio ? prev : { ...prev, [idx]: ratio }));
    }
  };

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

  // Floating thumbnails hide/show state & timers (Mobile only)
  const [areThumbnailsVisible, setAreThumbnailsVisible] = useState(true);
  const slideshowResumeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isSwipeGestureRef = useRef<boolean>(false);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  const pauseSlideshowTemporarily = useCallback((resumeDelayMs = 5000) => {
    setIsSlideshowPaused(true);
    if (slideshowResumeTimerRef.current) {
      clearTimeout(slideshowResumeTimerRef.current);
    }
    slideshowResumeTimerRef.current = setTimeout(() => {
      setIsSlideshowPaused(false);
    }, resumeDelayMs);
  }, []);

  useEffect(() => {
    return () => {
      if (slideshowResumeTimerRef.current) clearTimeout(slideshowResumeTimerRef.current);
    };
  }, []);

  const handleThumbnailClick = (idx: number) => {
    setActiveImageIndex(idx);
    pauseSlideshowTemporarily(5000);
  };

  // Mobile Touch Swipe Gesture for Main Image
  const handleMainImageTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
    isSwipeGestureRef.current = false;
    pauseSlideshowTemporarily(5000);
  };

  const handleMainImageTouchMove = (e: React.TouchEvent) => {
    if (touchStartXRef.current !== null) {
      const deltaX = Math.abs(e.touches[0].clientX - touchStartXRef.current);
      if (deltaX > 15) {
        isSwipeGestureRef.current = true;
      }
    }
  };

  const handleMainImageTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchEndX - touchStartXRef.current;
    const deltaY = touchEndY - (touchStartYRef.current || 0);

    if (Math.abs(deltaX) > 35 && Math.abs(deltaX) > Math.abs(deltaY)) {
      isSwipeGestureRef.current = true;
      if (deltaX < 0) {
        handleNextImage();
      } else {
        handlePrevImage();
      }
    }
    touchStartXRef.current = null;
    touchStartYRef.current = null;
    pauseSlideshowTemporarily(5000);
  };

  const handleMainImageClick = () => {
    // If it was a horizontal swipe gesture, do not toggle thumbnails
    if (isSwipeGestureRef.current) {
      isSwipeGestureRef.current = false;
      return;
    }

    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      // Toggle thumbnail row visibility smoothly on mobile
      setAreThumbnailsVisible((prev) => !prev);
    } else {
      setIsLightboxOpen(true);
    }
  };

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
          {/* Vertical Thumbnail Strip on Desktop */}
          <div className={`${styles.thumbnailColumn} ${styles.desktopThumbnailColumn}`}>
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
                      src={thumbnailImages[idx] || img} 
                      alt={`ADRIZO ${product.name} thumbnail ${idx + 1}`} 
                      className={styles.thumbImg}
                      loading="lazy"
                      decoding="async"
                      width={76}
                      height={96}
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
              style={imageAspectRatios[activeImageIndex] ? { aspectRatio: imageAspectRatios[activeImageIndex] } : undefined}
              onClick={handleMainImageClick}
              onTouchStart={handleMainImageTouchStart}
              onTouchMove={handleMainImageTouchMove}
              onTouchEnd={handleMainImageTouchEnd}
              role="button"
              tabIndex={0}
              aria-label="Click to enlarge or view image"
            >
              {imagesList.map((img: string, idx: number) => {
                const isCurrent = activeImageIndex === idx;
                return (
                  <img 
                    key={idx}
                    src={img} 
                    alt={`ADRIZO ${product.name}${product.color ? ` in ${product.color}` : ''} - View ${idx + 1}`}
                    className={`${styles.mainHeroImg} ${isCurrent ? styles.mainHeroImgActive : styles.mainHeroImgHidden}`}
                    loading={idx === 0 ? "eager" : "lazy"}
                    fetchPriority={idx === 0 ? "high" : "low"}
                    decoding={idx === 0 ? "sync" : "async"}
                    onLoad={(e) => handleImageLoaded(idx, e)}
                  />
                );
              })}
            </div>

            {/* Floating Thumbnail Overlay on Mobile (Inside mainImageWrapper) */}
            <div className={`${styles.mobileThumbnailOverlay} ${!areThumbnailsVisible ? styles.thumbnailsHidden : ''}`}>
              <div className={styles.mobileThumbnailList}>
                {imagesList.map((img: string, idx: number) => {
                  const isActive = activeImageIndex === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      className={`${styles.mobileThumbnailCard} ${isActive ? styles.mobileThumbnailActive : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleThumbnailClick(idx);
                      }}
                      aria-label={`View image ${idx + 1}`}
                    >
                      <img 
                        src={thumbnailImages[idx] || img} 
                        alt={`ADRIZO ${product.name} thumbnail ${idx + 1}`} 
                        className={styles.thumbImg}
                        loading="lazy"
                        decoding="async"
                        width={56}
                        height={70}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>


        {/* ========================================================= */}
        {/* 2. PRODUCT INFORMATION COLUMN — RIGHT SIDE               */}
        {/* ========================================================= */}
        <div className={styles.productInfoSection}>
          {/* Top Fixed Information Zone */}
          <div className={styles.topInfoSection}>
            {/* Breadcrumb Navigation */}
            <nav
              aria-label="Breadcrumb"
              style={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.4rem',
                fontSize: '0.785rem',
                color: '#71717a',
                marginBottom: '0.5rem',
              }}
            >
              <a href="/" style={{ color: '#71717a', textDecoration: 'none' }}>Home</a>
              <span style={{ color: '#d4d4d8' }}>&rsaquo;</span>
              <a href="/shop" style={{ color: '#71717a', textDecoration: 'none' }}>Shop</a>
              {product.category && (
                <>
                  <span style={{ color: '#d4d4d8' }}>&rsaquo;</span>
                  <a
                    href={`/category/${product.category.slug || 'men'}`}
                    style={{ color: '#71717a', textDecoration: 'none' }}
                  >
                    {product.category.name}
                  </a>
                </>
              )}
              <span style={{ color: '#d4d4d8' }}>&rsaquo;</span>
              <span style={{ color: '#09090b', fontWeight: 600 }}>{product.name}</span>
            </nav>

            {/* 1. Product Title */}
            <h1 className={styles.productTitle}>{product.name.toUpperCase()}</h1>

            {/* Star Rating snippet linking to Customer Reviews */}
            <a
              href="#customer-reviews"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.825rem',
                color: '#71717a',
                textDecoration: 'none',
                marginTop: '0.35rem',
                marginBottom: '0.5rem',
                cursor: 'pointer'
              }}
              title="View customer reviews and ratings"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#FFC800' }}>
                <Star size={14} fill="#FFC800" stroke="#FFC800" />
              </div>
              <span style={{ fontWeight: 700, color: '#09090b' }}>
                {ratingStats.totalReviews > 0 ? ratingStats.averageRating.toFixed(1) : '5.0'}
              </span>
              <span style={{ color: '#71717a' }}>
                ({ratingStats.totalReviews > 0 ? `${ratingStats.totalReviews} review${ratingStats.totalReviews > 1 ? 's' : ''}` : 'Verified Quality'})
              </span>
            </a>

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
                <div 
                  className={styles.offerCard}
                  onClick={handleViewOfferDetails}
                  role="button"
                  tabIndex={0}
                  aria-label="View promotional offer details"
                >
                  <div className={styles.offerCardLeft}>
                    <div className={styles.offerIconWrap}>
                      <Gift size={22} strokeWidth={2} color="#000000" className={styles.offerGiftIcon} />
                    </div>
                    <div className={styles.offerTextWrap}>
                      <div className={styles.offerBadgeTitle}>
                        {(currentProductOffer.name && currentProductOffer.name !== 'SPECIAL OFFER')
                          ? currentProductOffer.name.toUpperCase()
                          : `BUY ${currentProductOffer.buyQuantity || 1} GET ${currentProductOffer.freeQuantity || 1} FREE`}
                      </div>
                      <div className={styles.offerBadgeSubtitle}>
                        Buy {currentProductOffer.buyQuantity || 1} &amp; pick {currentProductOffer.freeQuantity || 1} additional {product.category?.name ? (product.category.name.endsWith('s') ? product.category.name : `${product.category.name}s`) : 'items'} FREE!
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className={styles.offerCtaBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewOfferDetails();
                    }}
                  >
                    View Details
                  </button>
                  <div className={styles.offerMobileArrow}>
                    <ChevronRight size={18} strokeWidth={2.4} color="#000000" />
                  </div>
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
      {/* 3. CUSTOMER REVIEWS & RATINGS (FIRESTORE)                 */}
      {/* ========================================================= */}
      <ProductReviewsSection
        productId={product.id}
        productSlug={product.slug || product.id}
        productName={product.name}
        onRatingStatsLoaded={setRatingStats}
      />

      {/* ========================================================= */}
      {/* 4. "YOU MAY ALSO LIKE" RELATED PRODUCTS CAROUSEL          */}
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
