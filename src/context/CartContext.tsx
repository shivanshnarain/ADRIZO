"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface CartItem {
  id: string; // product id + size + color (or free-prefix)
  productId: string;
  name: string;
  price: number; // Effective price (0 for free items, highestPrice for paid item)
  originalPrice?: number; // Catalog selling price / MRP
  image: string;
  size: string;
  color: string;
  quantity: number;
  maxStock: number;
  sku?: string;
  isFree?: boolean;
  promotionRule?: string;
  parentId?: string; // id of the qualifying paid item
  promoGroupId?: string; // unique ID grouping the 3 items of a bundle
  isPaidPromoItem?: boolean; // true if this is the paid product in the bundle
  category?: { id?: string; name?: string; slug?: string } | null;
  categorySlug?: string;
  categoryName?: string;
  buyQuantity?: number;
  freeQuantity?: number;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  addFreeItem: (item: Omit<CartItem, 'price' | 'isFree'>, parentId?: string) => void;
  addPromoBundle: (items: CartItem[]) => void;
  removeFreeItem: (id: string) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, delta: number) => void;
  clearCart: () => void;
  editCartItem: (id: string, updates: Partial<CartItem>) => void;
  cartTotal: number;
  cartCatalogTotal: number;
  cartPromotionalDiscount: number;
  itemCount: number;
  isCartOpen: boolean;
  setIsCartOpen: (isOpen: boolean) => void;
  // BOGO Promotional state & modals
  isBogoSelectorOpen: boolean;
  setIsBogoSelectorOpen: (isOpen: boolean) => void;
  isForgottenModalOpen: boolean;
  setIsForgottenModalOpen: (isOpen: boolean) => void;
  openBogoSelectorFor: (target?: string | CartItem, options?: { isBuyNow?: boolean }) => void;
  openBuyNowPromoModal: (item: CartItem) => void;
  openBogoSelectorForBundle: (promoGroupId: string) => void;
  updatePromoBundle: (promoGroupId: string, items: CartItem[]) => void;
  dissolvePromoBundle: (promoGroupId: string, keepMainItem?: boolean) => void;
  editingPromoGroupId: string | null;
  setEditingPromoGroupId: (id: string | null) => void;
  buyNowPromoItem: CartItem | null;
  setBuyNowPromoItem: (item: CartItem | null) => void;
  directOfferItem: CartItem | null;
  setDirectOfferItem: (item: CartItem | null) => void;
  activeBogoParentId: string | null;
  hasEligibleBogoItem: boolean;
  bogoPromoConfig: any;
  activeOffers: any[];
  freeItemsCount: number;
  allowedFreeItemsCount: number;
  has6ProductOfferBonus: boolean;
  has9ProductOfferBonus: boolean;
  offer100Discount: number;
  offerTierDiscount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // BOGO Modal states
  const [isBogoSelectorOpen, setIsBogoSelectorOpen] = useState(false);
  const [isForgottenModalOpen, setIsForgottenModalOpen] = useState(false);
  const [activeBogoParentId, setActiveBogoParentId] = useState<string | null>(null);
  const [editingPromoGroupId, setEditingPromoGroupId] = useState<string | null>(null);
  const [buyNowPromoItem, setBuyNowPromoItem] = useState<CartItem | null>(null);
  const [directOfferItem, setDirectOfferItem] = useState<CartItem | null>(null);
  const [bogoPromoConfig, setBogoPromoConfig] = useState<any>(null);
  const [activeOffers, setActiveOffers] = useState<any[]>([]);

  // Fetch BOGO promotion config on mount
  useEffect(() => {
    fetch('/api/promotions/bogo')
      .then(res => res.json())
      .then(data => {
        if (data && data.success) {
          if (data.promotion) {
            setBogoPromoConfig(data.promotion);
          }
          if (Array.isArray(data.offers)) {
            setActiveOffers(data.offers);
          }
          if (data.active === false || data.promotion?.status === 'INACTIVE') {
            // Recalculate cart: remove free items and convert promo bundles to regular items
            setCart(prev => {
              const hasFreeOrPromo = prev.some(i => i.isFree || i.promoGroupId);
              if (!hasFreeOrPromo) return prev;
              return prev
                .filter(i => !i.isFree)
                .map(i => ({
                  ...i,
                  price: i.price > 0 ? i.price : (i.originalPrice || 0),
                  isPaidPromoItem: false,
                  promoGroupId: undefined,
                  promotionRule: undefined,
                }));
            });
          }
        }
      })
      .catch(err => console.warn('Failed to load bogo promo config', err));
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('unique_india_cart');
    if (saved) {
      try {
        setCart(JSON.parse(saved));
      } catch (e) {
        // ignore error
      }
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('unique_india_cart', JSON.stringify(cart));
    }
  }, [cart, isLoaded]);

  // Calculations for BOGO status
  const paidItems = cart.filter(item => !item.isFree);
  const freeItems = cart.filter(item => item.isFree);
  const freeItemsCount = freeItems.reduce((acc, item) => acc + item.quantity, 0);

  // Promotion status
  const isPromoActive = bogoPromoConfig ? bogoPromoConfig.status === 'ACTIVE' : true;
  const totalPaidQuantity = paidItems.reduce((acc, item) => acc + item.quantity, 0);
  const freeMultiplier = bogoPromoConfig?.freeQuantity || 2;
  const allowedFreeItemsCount = isPromoActive ? totalPaidQuantity * freeMultiplier : 0;
  const hasEligibleBogoItem = isPromoActive && paidItems.length > 0;

  const openBogoSelectorFor = (target?: string | CartItem, options?: { isBuyNow?: boolean }) => {
    setEditingPromoGroupId(null);
    if (typeof target === 'object' && target !== null) {
      setDirectOfferItem(target);
      setActiveBogoParentId(target.id);
      if (options?.isBuyNow) {
        setBuyNowPromoItem(target);
      } else {
        setBuyNowPromoItem(null);
      }
    } else if (typeof target === 'string') {
      setDirectOfferItem(null);
      setBuyNowPromoItem(null);
      setActiveBogoParentId(target);
    } else {
      setDirectOfferItem(null);
      setBuyNowPromoItem(null);
      if (paidItems.length > 0) {
        setActiveBogoParentId(paidItems[0].id);
      } else {
        setActiveBogoParentId(null);
      }
    }
    setIsBogoSelectorOpen(true);
  };

  const openBuyNowPromoModal = (item: CartItem) => {
    setEditingPromoGroupId(null);
    setDirectOfferItem(item);
    setBuyNowPromoItem(item);
    setActiveBogoParentId(item.id);
    setIsBogoSelectorOpen(true);
  };

  const openBogoSelectorForBundle = (promoGroupId: string) => {
    setDirectOfferItem(null);
    setBuyNowPromoItem(null);
    setEditingPromoGroupId(promoGroupId);
    setIsBogoSelectorOpen(true);
  };

  const addToCart = (item: CartItem) => {
    setCart((prev) => {
      const existing = prev.find(i => i.id === item.id && !i.isFree && !i.promoGroupId);
      if (existing) {
        if (existing.quantity + item.quantity > item.maxStock) {
          alert('Cannot add more than available stock.');
          return prev;
        }
        return prev.map(i => (i.id === item.id && !i.isFree && !i.promoGroupId) ? { ...i, quantity: i.quantity + item.quantity } : i);
      }
      return [...prev, { ...item, isFree: false }];
    });
    setIsCartOpen(true);
  };

  /**
   * Adds an atomic Buy X Get Y promotional bundle.
   * Enforces highest current selling-price rule:
   * - Highest X items are marked PAID (price = actual selling price)
   * - Remaining Y items are marked FREE (price = 0, originalPrice/MRP preserved for display reference)
   * - All share the same promoGroupId
   */
  const addPromoBundle = (items: CartItem[]) => {
    const bundleGroupId = `promo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const buyQty = Math.max(
      1,
      items[0]?.buyQuantity || (items.length >= 3 && items.length % 3 === 0 ? Math.floor(items.length / 3) : 1) || bogoPromoConfig?.buyQuantity || 1
    );
    const promoRuleName = items[0]?.promotionRule || bogoPromoConfig?.name || 'SPECIAL OFFER';

    // CRITICAL PRICING RULE:
    // sellingPrice = Number(item.price), NOT originalPrice!
    // mrp = Number(item.originalPrice || item.price)
    const prepared = items.map(item => ({
      ...item,
      sellingPrice: Number(item.price),
      mrp: Number(item.originalPrice || item.price),
    }));

    // Sort by current sellingPrice DESCENDING
    // The top `buyQty` items are PAID, the rest are FREE
    const sorted = [...prepared].sort((a, b) => b.sellingPrice - a.sellingPrice);
    const paidItems = sorted.slice(0, buyQty);

    const bundleCartItems: CartItem[] = prepared.map((item, idx) => {
      const isPaid = paidItems.includes(item);
      const uniqueId = `bundle-${item.productId}-${item.size}-${Date.now()}-${idx}`;

      return {
        ...item,
        id: uniqueId,
        price: isPaid ? item.sellingPrice : 0, // Customer pays current SELLING PRICE for paid items
        originalPrice: item.mrp, // MRP strictly for reference/strike-through display
        quantity: 1,
        isFree: !isPaid,
        isPaidPromoItem: isPaid,
        promoGroupId: bundleGroupId,
        promotionRule: promoRuleName,
      };
    });

    setCart(prev => {
      let base = [...prev];
      // If the parent product was previously added as an unbundled item, decrement or remove it
      if (activeBogoParentId) {
        const pIdx = base.findIndex(i => i.id === activeBogoParentId && !i.promoGroupId);
        if (pIdx !== -1) {
          if (base[pIdx].quantity > 1) {
            base[pIdx] = { ...base[pIdx], quantity: base[pIdx].quantity - 1 };
          } else {
            base.splice(pIdx, 1);
          }
        }
      }
      return [...base, ...bundleCartItems];
    });
  };

  /**
   * Updates an existing Buy X Get Y promotional bundle in-place.
   * Recalculates highest selling-price payable and savings.
   */
  const updatePromoBundle = (promoGroupId: string, items: CartItem[]) => {
    const buyQty = Math.max(
      1,
      items[0]?.buyQuantity || (items.length >= 3 && items.length % 3 === 0 ? Math.floor(items.length / 3) : 1) || bogoPromoConfig?.buyQuantity || 1
    );
    const promoRuleName = items[0]?.promotionRule || bogoPromoConfig?.name || 'SPECIAL OFFER';

    const prepared = items.map(item => ({
      ...item,
      sellingPrice: Number(item.price),
      mrp: Number(item.originalPrice || item.price),
    }));

    const sorted = [...prepared].sort((a, b) => b.sellingPrice - a.sellingPrice);
    const paidItems = sorted.slice(0, buyQty);

    const bundleCartItems: CartItem[] = prepared.map((item, idx) => {
      const isPaid = paidItems.includes(item);
      const uniqueId = `bundle-${item.productId}-${item.size}-${Date.now()}-${idx}`;

      return {
        ...item,
        id: uniqueId,
        price: isPaid ? item.sellingPrice : 0, // Customer pays current SELLING PRICE for paid items
        originalPrice: item.mrp,
        quantity: 1,
        isFree: !isPaid,
        isPaidPromoItem: isPaid,
        promoGroupId: promoGroupId,
        promotionRule: promoRuleName,
      };
    });

    setCart(prev => {
      const withoutOldBundle = prev.filter(i => i.promoGroupId !== promoGroupId);
      return [...withoutOldBundle, ...bundleCartItems];
    });
    setEditingPromoGroupId(null);
  };

  /**
   * Dissolves a Buy X Get Y bundle.
   * If keepMainItem is true, converts the paid/highest-price item into a regular single cart item at regular price.
   * If false, removes all items in the bundle completely.
   */
  const dissolvePromoBundle = (promoGroupId: string, keepMainItem: boolean = true) => {
    setCart(prev => {
      const bundleItems = prev.filter(i => i.promoGroupId === promoGroupId);
      const otherItems = prev.filter(i => i.promoGroupId !== promoGroupId);

      if (!keepMainItem || bundleItems.length === 0) {
        return otherItems;
      }

      // Identify the paid item (or highest price item)
      const paidItem = bundleItems.find(i => i.isPaidPromoItem) || bundleItems[0];
      const regularPrice = paidItem.price > 0 ? paidItem.price : (paidItem.originalPrice || 0);
      const regularItem: CartItem = {
        ...paidItem,
        id: `cart-${paidItem.productId}-${paidItem.size}-${Date.now()}`,
        price: regularPrice,
        originalPrice: Number(paidItem.originalPrice || regularPrice),
        isFree: false,
        isPaidPromoItem: false,
        promoGroupId: undefined,
        promotionRule: undefined,
        quantity: 1,
      };

      return [...otherItems, regularItem];
    });
  };

  const addFreeItem = (item: Omit<CartItem, 'price' | 'isFree'>, parentId?: string) => {
    setCart((prev) => {
      const targetParentId = parentId || (prev.find(i => !i.isFree)?.id) || 'promo-root';
      const freeId = `free-${item.productId}-${item.size}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      
      const freeCartItem: CartItem = {
        ...item,
        id: freeId,
        price: 0,
        originalPrice: item.originalPrice || 0,
        isFree: true,
        promotionRule: bogoPromoConfig?.name || 'SPECIAL OFFER',
        parentId: targetParentId,
        quantity: 1,
      };

      return [...prev, freeCartItem];
    });
  };

  const removeFreeItem = (id: string) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => {
      const targetItem = prev.find(i => i.id === id);

      // If this item belongs to a promotional bundle, remove the entire bundle
      // to maintain bundle integrity (3 products per promotion)
      if (targetItem?.promoGroupId) {
        return prev.filter(i => i.promoGroupId !== targetItem.promoGroupId);
      }

      // 1. Remove the item itself
      let nextCart = prev.filter(i => i.id !== id);
      
      // 2. Remove any free items that were directly attached to this paid item
      nextCart = nextCart.filter(i => !(i.isFree && i.parentId === id));

      // 3. Safety check: ensure remaining free items do not exceed allowed limit
      const remainingPaidCount = nextCart.filter(i => !i.isFree).reduce((acc, i) => acc + i.quantity, 0);
      const maxAllowedFree = isPromoActive ? remainingPaidCount * 2 : 0;
      let currentFreeTotal = nextCart.filter(i => i.isFree && !i.promoGroupId).reduce((acc, i) => acc + i.quantity, 0);

      if (currentFreeTotal > maxAllowedFree) {
        const trimmed: CartItem[] = [];
        let allowedLeft = maxAllowedFree;
        for (const item of nextCart) {
          if (!item.isFree || item.promoGroupId) {
            trimmed.push(item);
          } else if (allowedLeft > 0) {
            const takeQty = Math.min(item.quantity, allowedLeft);
            trimmed.push({ ...item, quantity: takeQty });
            allowedLeft -= takeQty;
          }
        }
        nextCart = trimmed;
      }

      return nextCart;
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => {
      const target = prev.find(i => i.id === id);

      // If part of promotional bundle, quantity per item cannot exceed 1
      if (target?.promoGroupId) {
        if (delta < 0) {
          // Decreasing removes the entire bundle
          return prev.filter(i => i.promoGroupId !== target.promoGroupId);
        }
        // Disallow increasing quantity of a single promotional bundle item
        return prev;
      }

      return prev.map(i => {
        if (i.id === id) {
          if (i.isFree && delta > 0) return i;
          const newQty = i.quantity + delta;
          if (newQty > 0 && newQty <= i.maxStock) {
            return { ...i, quantity: newQty };
          }
        }
        return i;
      });
    });
  };

  const clearCart = () => {
    setCart([]);
  };

  const editCartItem = (id: string, updates: Partial<CartItem>) => {
    setCart((prev) => {
      return prev.map((item) => {
        if (item.id === id) {
          const newSize = updates.size !== undefined ? updates.size : item.size;
          const newQty = updates.quantity !== undefined ? updates.quantity : item.quantity;
          const newId = updates.size && updates.size !== item.size ? `${item.productId}-${newSize}` : item.id;
          return {
            ...item,
            ...updates,
            id: newId,
            size: newSize,
            quantity: newQty,
          };
        }
        return item;
      });
    });
  };

  // Pricing calculations
  const rawSubtotal = cart.reduce((total, item) => total + (item.isFree ? 0 : item.price) * item.quantity, 0);
  const cartCatalogTotal = cart.reduce((total, item) => total + (item.originalPrice || item.price) * item.quantity, 0);

  // Tiered Offer Bonus:
  // 2 paid + 4 free (6 products total) -> ₹100 discount
  // 3 paid + 6 free (9 products total) -> ₹200 discount
  const qualifyingPaidCount = cart
    .filter(i => i.promoGroupId && !i.isFree)
    .reduce((acc, i) => acc + i.quantity, 0);
  const qualifyingFreeCount = cart
    .filter(i => i.promoGroupId && i.isFree)
    .reduce((acc, i) => acc + i.quantity, 0);

  let offerTierDiscount = 0;
  if (qualifyingPaidCount >= 3 && qualifyingFreeCount >= 6) {
    offerTierDiscount = Math.min(200, rawSubtotal);
  } else if (qualifyingPaidCount >= 2 && qualifyingFreeCount >= 4) {
    offerTierDiscount = Math.min(100, rawSubtotal);
  }

  const has6ProductOfferBonus = qualifyingPaidCount >= 2 && qualifyingFreeCount >= 4;
  const has9ProductOfferBonus = qualifyingPaidCount >= 3 && qualifyingFreeCount >= 6;
  const offer100Discount = offerTierDiscount; // Keep for backwards-compatibility
  const cartTotal = Math.max(0, rawSubtotal - offerTierDiscount);
  const cartPromotionalDiscount = Math.max(0, cartCatalogTotal - cartTotal);
  const itemCount = cart.reduce((count, item) => count + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        addFreeItem,
        addPromoBundle,
        updatePromoBundle,
        dissolvePromoBundle,
        removeFreeItem,
        removeFromCart,
        updateQuantity,
        clearCart,
        editCartItem,
        cartTotal,
        cartCatalogTotal,
        cartPromotionalDiscount,
        itemCount,
        isCartOpen,
        setIsCartOpen,
        isBogoSelectorOpen,
        setIsBogoSelectorOpen,
        isForgottenModalOpen,
        setIsForgottenModalOpen,
        openBogoSelectorFor,
        openBuyNowPromoModal,
        openBogoSelectorForBundle,
        editingPromoGroupId,
        setEditingPromoGroupId,
        buyNowPromoItem,
        setBuyNowPromoItem,
        directOfferItem,
        setDirectOfferItem,
        activeBogoParentId,
        hasEligibleBogoItem,
        bogoPromoConfig,
        activeOffers,
        freeItemsCount,
        allowedFreeItemsCount,
        has6ProductOfferBonus,
        has9ProductOfferBonus,
        offer100Discount,
        offerTierDiscount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
