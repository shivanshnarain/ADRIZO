"use client";

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Heart, Check } from 'lucide-react';
import styles from './ProductCard.module.css';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { getOptimizedImageUrl } from '../lib/image-utils';
import { getProductPricing } from '../lib/pricing';

export interface ProductCardProps {
  product: {
    id: string;
    name: string;
    slug?: string;
    brand?: string;
    productType?: string | null;
    price: number;
    originalPrice?: number | null;
    salePrice?: number | null;
    badge?: string | null;
    images?: Array<{ url?: string | null; secure_url?: string | null; altText?: string | null } | string>;
    imagesRaw?: string | null;
    colorsRaw?: string | null;
    sizesRaw?: string | null;
    variants?: Array<{ size?: string | null; color?: string | null; stock?: number }>;
    newArrival?: boolean;
    onSale?: boolean;
    featured?: boolean;
    stock?: number;
    category?: { name: string; slug?: string } | null;
  };
  badgeText?: string;
  brandText?: string;
}

export default function ProductCard({ product, badgeText, brandText }: ProductCardProps) {
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();

  // Extract images array with Cloudinary CDN optimization and robust type handling
  const imageList: string[] = [];

  if (product.images && Array.isArray(product.images) && product.images.length > 0) {
    product.images.forEach((img: any) => {
      const rawUrl = typeof img === 'string' ? img : (img?.url || img?.secure_url || '');
      if (rawUrl && typeof rawUrl === 'string' && rawUrl.trim()) {
        imageList.push(getOptimizedImageUrl(rawUrl.trim(), { width: 600 }));
      }
    });
  }

  if (imageList.length === 0 && product.imagesRaw) {
    try {
      const parsed = typeof product.imagesRaw === 'string' ? JSON.parse(product.imagesRaw) : product.imagesRaw;
      if (Array.isArray(parsed)) {
        parsed.forEach((item: any) => {
          const rawUrl = typeof item === 'string' ? item : (item?.url || item?.secure_url || '');
          if (rawUrl && typeof rawUrl === 'string' && rawUrl.trim()) {
            imageList.push(getOptimizedImageUrl(rawUrl.trim(), { width: 600 }));
          }
        });
      }
    } catch (e) {
      // ignore
    }
  }

  if (imageList.length === 0) {
    imageList.push('https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&q=80&w=800');
  }


  // Extract default color & size for seamless "Buy Now" / Cart integration
  let defaultColor = 'Default';
  if (product.colorsRaw) {
    try {
      const parsed = JSON.parse(product.colorsRaw);
      if (Array.isArray(parsed) && parsed[0]) defaultColor = parsed[0];
    } catch (e) {}
  } else if (product.variants && product.variants.length > 0) {
    const firstColor = product.variants.find((v) => v.color)?.color;
    if (firstColor) defaultColor = firstColor;
  }

  let defaultSize = 'M';
  if (product.sizesRaw) {
    try {
      const parsed = JSON.parse(product.sizesRaw);
      if (Array.isArray(parsed) && parsed[0]) defaultSize = parsed[0];
    } catch (e) {}
  } else if (product.variants && product.variants.length > 0) {
    const firstSize = product.variants.find((v) => v.size)?.size;
    if (firstSize) defaultSize = firstSize;
  }

  // State
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isAdded, setIsAdded] = useState(false);

  // Auto-Slideshow on Hover
  const slideIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startSlideShow = () => {
    if (imageList.length <= 1) return;
    if (slideIntervalRef.current) clearInterval(slideIntervalRef.current);

    slideIntervalRef.current = setInterval(() => {
      setActiveImageIndex((prev) => (prev + 1) % imageList.length);
    }, 1600);
  };

  const stopSlideShow = () => {
    if (slideIntervalRef.current) {
      clearInterval(slideIntervalRef.current);
      slideIntervalRef.current = null;
    }
    setActiveImageIndex(0);
  };

  useEffect(() => {
    return () => {
      if (slideIntervalRef.current) {
        clearInterval(slideIntervalRef.current);
      }
    };
  }, []);

  // Touch swipe support for mobile
  const touchStartX = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (diff > 40 && imageList.length > 1) {
      // Swiped left -> next
      setActiveImageIndex((prev) => (prev + 1) % imageList.length);
    } else if (diff < -40 && imageList.length > 1) {
      // Swiped right -> prev
      setActiveImageIndex((prev) => (prev - 1 + imageList.length) % imageList.length);
    }
    touchStartX.current = null;
  };

  const isLiked = isInWishlist(product.id);

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product.id);
  };

  // Dynamic Authoritative Pricing & Discount Calculation
  const pricing = getProductPricing(product);

  // Dynamic Badge Determination
  const resolvedBadge =
    badgeText ||
    product.badge ||
    (product.featured ? 'Best Seller' : product.newArrival ? 'New' : null);

  // Brand / Category text determination
  const resolvedBrand =
    brandText ||
    product.brand ||
    product.category?.name ||
    product.productType ||
    '';

  const handleBuyNow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const cartItemId = `${product.id}-${defaultSize}-${defaultColor}`;

    addToCart({
      id: cartItemId,
      productId: product.id,
      name: product.name,
      price: pricing.sellingPrice,
      image: imageList[activeImageIndex] || imageList[0],
      size: defaultSize,
      color: defaultColor,
      quantity: 1,
      maxStock: product.stock || 50,
    });

    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 1800);
  };

  const productUrl = `/product/${product.id}`;

  return (
    <div
      className={styles.productCard}
      onMouseEnter={startSlideShow}
      onMouseLeave={stopSlideShow}
    >
      {/* =========================================
          1. PRODUCT IMAGE & TOP CONTROLS CONTAINER
         ========================================= */}
      <div
        className={styles.imageContainer}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <Link href={productUrl} className={styles.imageLink} tabIndex={-1}>
          <img
            key={activeImageIndex}
            src={imageList[activeImageIndex] || imageList[0]}
            alt={activeImageIndex === 0 ? product.name : `${product.name} - View ${activeImageIndex + 1}`}
            className={styles.productImage}
            loading={activeImageIndex === 0 ? "eager" : "lazy"}
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&q=80&w=800';
            }}
          />
        </Link>

        {/* Top-Left Dynamic Badge */}
        {resolvedBadge && (
          <div className={styles.badgeWrapper}>
            <span className={styles.badgePill}>{resolvedBadge}</span>
          </div>
        )}

        {/* Top-Right Wishlist Heart Button */}
        <button
          type="button"
          onClick={handleWishlistClick}
          className={`${styles.wishlistBtn} ${isLiked ? styles.wishlistBtnActive : ''}`}
          aria-label={isLiked ? 'Remove from Wishlist' : 'Add to Wishlist'}
          title={isLiked ? 'In Wishlist' : 'Add to Wishlist'}
        >
          <Heart
            size={17}
            strokeWidth={2}
            className={isLiked ? styles.heartActive : styles.heartDefault}
          />
        </button>

        {/* Bottom-Center Image Carousel Indicators */}
        {imageList.length > 1 && (
          <div className={styles.slideIndicators} aria-label="Image indicators">
            {imageList.map((_, idx) => (
              <button
                key={idx}
                type="button"
                className={`${styles.indicatorDot} ${idx === activeImageIndex ? styles.indicatorDotActive : ''}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setActiveImageIndex(idx);
                }}
                aria-label={`View image ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* =========================================
          2. PRODUCT INFORMATION SECTION
         ========================================= */}
      <div className={styles.cardInfo}>
        {/* Brand / Category */}
        {resolvedBrand && (
          <span className={styles.brandCategory}>{resolvedBrand}</span>
        )}

        {/* Product Name */}
        <Link href={productUrl} className={styles.productTitleLink}>
          <h3 className={styles.productTitle} title={product.name}>
            {product.name}
          </h3>
        </Link>

        {/* Pricing & Discount */}
        <div className={styles.pricingRow}>
          <span className={styles.sellingPrice}>{pricing.formattedSelling}</span>
          {pricing.hasDiscount && pricing.formattedMrp && (
            <span className={styles.mrpPrice}>{pricing.formattedMrp}</span>
          )}
          {pricing.hasDiscount && (
            <span className={styles.saveBadge}>SAVE {pricing.discountPercent}%</span>
          )}
        </div>

        {/* Full-Width Buy Now Button */}
        <button
          type="button"
          onClick={handleBuyNow}
          className={`${styles.buyNowBtn} ${isAdded ? styles.buyNowBtnSuccess : ''}`}
          disabled={isAdded}
          aria-label={isAdded ? 'Added to Cart' : `Buy ${product.name}`}
        >
          {isAdded ? (
            <>
              <span>ADDED TO CART</span>
              <Check size={16} strokeWidth={2.4} />
            </>
          ) : (
            <span>Buy Now</span>
          )}
        </button>
      </div>
    </div>
  );
}
