import { prisma } from '@/lib/prisma';

export interface PromotionConfig {
  id: string;
  name: string;
  type: string;
  buyQuantity: number;
  freeQuantity: number;
  paidItem: number;
  freeItems: number;
  allowSameProduct: boolean;
  allowDifferentProducts: boolean;
  status: 'ACTIVE' | 'INACTIVE';
  eligibleCategories: string[];
}

export interface PromotionOffer {
  id: string;
  name: string;
  type: string; // 'Buy X Get Y'
  offerType?: string;
  buyQuantity: number;
  freeQuantity: number;
  applicableCategories: string[]; // ['all'] or slugs/names
  applicableProducts?: string[];
  applicableProductIds?: string[];
  status: 'ACTIVE' | 'INACTIVE';
  startDate?: string;
  endDate?: string;
  maxBundlesPerOrder?: number;
  priority?: number;
  allowSameProduct?: boolean;
  allowDifferentProducts?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PromotionConfig extends PromotionOffer {
  paidItem: number;
  freeItems: number;
  eligibleCategories: string[];
}

export const DEFAULT_OFFER: PromotionOffer = {
  id: 'bogo-buy1-get2',
  name: 'BUY 1 GET 2 FREE',
  type: 'Buy X Get Y',
  buyQuantity: 1,
  freeQuantity: 2,
  applicableCategories: ['all'],
  status: 'ACTIVE',
  allowSameProduct: true,
  allowDifferentProducts: true,
  priority: 1,
};

export const DEFAULT_BOGO_PROMOTION: PromotionConfig = {
  ...DEFAULT_OFFER,
  allowSameProduct: true,
  allowDifferentProducts: true,
  paidItem: 1,
  freeItems: 2,
  eligibleCategories: ['all'],
};

/**
 * Read all configured promotion offers from MongoDB StoreSetting.
 */
export async function getAllPromotionOffers(): Promise<PromotionOffer[]> {
  try {
    const setting = await prisma.storeSetting.findUnique({
      where: { key: 'promotions_offers' },
    });
    if (setting && setting.value) {
      const parsed = JSON.parse(setting.value);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((o: any) => ({
          ...DEFAULT_OFFER,
          ...o,
          applicableCategories: o.applicableCategories || o.eligibleCategories || ['all'],
        }));
      }
    }

    // Fallback: check legacy bogo_promotion
    const legacy = await prisma.storeSetting.findUnique({
      where: { key: 'bogo_promotion' },
    });
    if (legacy && legacy.value) {
      const parsed = JSON.parse(legacy.value);
      return [{
        ...DEFAULT_OFFER,
        ...parsed,
        applicableCategories: parsed.eligibleCategories || parsed.applicableCategories || ['all'],
      }];
    }
  } catch (err) {
    console.warn('[getAllPromotionOffers] Error reading offers from storeSetting', err);
  }
  return [DEFAULT_OFFER];
}

/**
 * Save promotion offers to MongoDB StoreSetting and synchronize primary offer to bogo_promotion.
 */
export async function savePromotionOffers(offers: PromotionOffer[]): Promise<boolean> {
  try {
    await prisma.storeSetting.upsert({
      where: { key: 'promotions_offers' },
      update: { value: JSON.stringify(offers) },
      create: { key: 'promotions_offers', value: JSON.stringify(offers) },
    });

    // Sync primary active offer to bogo_promotion for backward compatibility
    const activeOffers = offers.filter(o => o.status === 'ACTIVE');
    const primary: PromotionOffer = activeOffers.length > 0
      ? activeOffers[0]
      : (offers[0] ? { ...offers[0], status: 'INACTIVE' as const } : { ...DEFAULT_OFFER, status: 'INACTIVE' as const });
    const legacySync: PromotionConfig = {
      ...primary,
      allowSameProduct: primary.allowSameProduct !== false,
      allowDifferentProducts: primary.allowDifferentProducts !== false,
      paidItem: primary.buyQuantity,
      freeItems: primary.freeQuantity,
      eligibleCategories: primary.applicableCategories || ['all'],
    };
    await prisma.storeSetting.upsert({
      where: { key: 'bogo_promotion' },
      update: { value: JSON.stringify(legacySync) },
      create: { key: 'bogo_promotion', value: JSON.stringify(legacySync) },
    });

    return true;
  } catch (err) {
    console.error('[savePromotionOffers] Error saving offers', err);
    return false;
  }
}

/**
 * Fetch all currently ACTIVE promotion offers (respecting start/end dates and priority).
 */
export async function getActivePromotionOffers(): Promise<PromotionOffer[]> {
  const all = await getAllPromotionOffers();
  const now = new Date();
  return all
    .filter(o => {
      if (o.status !== 'ACTIVE') return false;
      if (o.startDate && new Date(o.startDate) > now) return false;
      if (o.endDate && new Date(o.endDate) < now) return false;
      return true;
    })
    .sort((a, b) => (b.priority || 0) - (a.priority || 0));
}

/**
 * Fetch the top active promotion offer.
 */
export async function getPrimaryActivePromotion(): Promise<PromotionOffer | null> {
  const active = await getActivePromotionOffers();
  return active.length > 0 ? active[0] : null;
}

/**
 * Authoritative category & product offer resolver.
 * 1. Checks specific product ID targeting
 * 2. Checks specific category matching
 * 3. Falls back to storewide 'all' offers
 */
export function findMatchingOfferForProductOrCategory(
  offers: PromotionOffer[],
  options: {
    productId?: string;
    categorySlug?: string;
    categoryName?: string;
    productType?: string;
    ruleName?: string;
  }
): PromotionOffer | null {
  const { productId, categorySlug, categoryName, productType, ruleName } = options;
  const pSlug = (categorySlug || '').toLowerCase().trim();
  const pName = (categoryName || '').toLowerCase().trim();
  const pType = (productType || '').toLowerCase().trim();
  const rName = (ruleName || '').toLowerCase().trim();

  // If ruleName provided, check if that specific offer is active
  if (rName) {
    const ruleMatch = offers.find(o => o.status === 'ACTIVE' && o.name.toLowerCase().trim() === rName);
    if (ruleMatch) {
      // If ruleMatch is category-scoped, ensure it applies to this category or 'all'
      const cats = ruleMatch.applicableCategories || ['all'];
      if (cats.includes('all')) return ruleMatch;
      const applies = cats.some(c => {
        const low = c.toLowerCase().trim();
        return low === pSlug || low === pName || low === pType ||
          low.replace(/s$/, '') === pSlug.replace(/s$/, '') ||
          low.replace(/s$/, '') === pType.replace(/s$/, '');
      });
      if (applies) return ruleMatch;
    }
  }

  // 1. Explicit product match
  if (productId) {
    const prodMatch = offers.find(o => 
      o.status === 'ACTIVE' && 
      (o.applicableProducts?.includes(productId) || (o as any).applicableProductIds?.includes(productId))
    );
    if (prodMatch) return prodMatch;
  }

  // 2. Specific category match (not 'all')
  const catMatch = offers.find(o => {
    if (o.status !== 'ACTIVE') return false;
    const cats = o.applicableCategories || [];
    return cats.some(c => {
      const low = c.toLowerCase().trim();
      if (!low || low === 'all') return false;
      return (
        low === pSlug ||
        low === pName ||
        low === pType ||
        low.replace(/s$/, '') === pSlug.replace(/s$/, '') ||
        low.replace(/s$/, '') === pType.replace(/s$/, '') ||
        (pType && pType.includes(low)) ||
        (pName && pName.includes(low))
      );
    });
  });
  if (catMatch) return catMatch;

  // 3. Storewide fallback ('all')
  const storewideMatch = offers.find(o => 
    o.status === 'ACTIVE' && 
    (o.applicableCategories?.includes('all') || !o.applicableCategories || o.applicableCategories.length === 0)
  );
  return storewideMatch || null;
}


/**
 * Fetch the active promotion configuration (backward-compatible with getPromotionConfig()).
 */
export async function getPromotionConfig(): Promise<PromotionConfig> {
  const primary = await getPrimaryActivePromotion();
  if (primary) {
    return {
      ...primary,
      allowSameProduct: primary.allowSameProduct !== false,
      allowDifferentProducts: primary.allowDifferentProducts !== false,
      paidItem: primary.buyQuantity,
      freeItems: primary.freeQuantity,
      eligibleCategories: primary.applicableCategories || ['all'],
    };
  }
  const all = await getAllPromotionOffers();
  const first = all[0] || DEFAULT_OFFER;
  return {
    ...first,
    status: 'INACTIVE' as const,
    allowSameProduct: first.allowSameProduct !== false,
    allowDifferentProducts: first.allowDifferentProducts !== false,
    paidItem: first.buyQuantity,
    freeItems: first.freeQuantity,
    eligibleCategories: first.applicableCategories || ['all'],
  };
}

export interface RawOrderItemPayload {
  id?: string;
  productId?: string;
  name?: string;
  price?: number;
  originalPrice?: number;
  size?: string;
  color?: string;
  quantity?: number;
  sku?: string;
  image?: string;
  productImage?: string;
  promoGroupId?: string;
  promotionRule?: string;
  isFree?: boolean;
}

export interface ValidatedLineItem {
  productId: string;
  productName: string;
  productImage: string;
  sku: string;
  size: string;
  color: string;
  quantity: number;
  price: number; // Effective price (0 for free items, selling price for paid item)
  mrp: number;   // Original/catalog price
  selectedVariantId?: string;
  isFree: boolean;
  promoGroupId?: string;
  promotionRule?: string;
  categorySlug?: string;
  categoryName?: string;
}

export interface PromotionValidationResult {
  success: boolean;
  error?: string;
  items: ValidatedLineItem[];
  subtotal: number;
  catalogSubtotal: number;
  catalogMrpSubtotal?: number;
  promotionalDiscount: number;
  promotionalBundlesCount: number;
  has6ProductOfferBonus?: boolean;
  autoOfferDiscount?: number;
  qualifyingPaidCount?: number;
  qualifyingFreeCount?: number;
}

/**
 * Validates and prices order items server-side with strict highest current selling price calculation.
 * Never trusts prices, free flags, or discounts from the client.
 * NEVER uses MRP / original price to determine payable amount.
 */
export async function validateAndPriceOrderItems(
  rawItems: RawOrderItemPayload[]
): Promise<PromotionValidationResult> {
  if (!rawItems || !Array.isArray(rawItems) || rawItems.length === 0) {
    return {
      success: false,
      error: 'Your order must contain at least one item.',
      items: [],
      subtotal: 0,
      catalogSubtotal: 0,
      promotionalDiscount: 0,
      promotionalBundlesCount: 0,
    };
  }

  const activeOffers = await getActivePromotionOffers();
  const isAnyPromoActive = activeOffers.length > 0;

  // Group items by promoGroupId (if any)
  const promoGroups = new Map<string, RawOrderItemPayload[]>();
  const regularItems: RawOrderItemPayload[] = [];

  for (const item of rawItems) {
    const groupId = item.promoGroupId?.trim();
    if (groupId) {
      if (!promoGroups.has(groupId)) {
        promoGroups.set(groupId, []);
      }
      promoGroups.get(groupId)!.push(item);
    } else {
      regularItems.push(item);
    }
  }

  const validatedItems: ValidatedLineItem[] = [];
  let subtotal = 0;
  let catalogSubtotal = 0;
  let catalogMrpSubtotal = 0;
  let promotionalDiscount = 0;
  let promotionalBundlesCount = 0;

  // 1. Process Promotional Groups
  for (const [groupId, groupItems] of promoGroups.entries()) {
    if (!isAnyPromoActive) {
      return {
        success: false,
        error: 'The promotion is currently inactive or has expired.',
        items: [],
        subtotal: 0,
        catalogSubtotal: 0,
        promotionalDiscount: 0,
        promotionalBundlesCount: 0,
      };
    }

    // Fetch authoritative database info for all bundle products first
    interface ResolvedGroupProduct {
      rawItem: RawOrderItemPayload;
      product: any;
      variant?: any;
      chosenSize: string;
      authoritativePrice: number;
      authoritativeMrp: number;
    }

    const resolvedGroup: ResolvedGroupProduct[] = [];

    for (const item of groupItems) {
      const rawProductId = item.productId || item.id;
      if (!rawProductId) {
        return {
          success: false,
          error: 'Invalid product identifier in promotional bundle.',
          items: [],
          subtotal: 0,
          catalogSubtotal: 0,
          promotionalDiscount: 0,
          promotionalBundlesCount: 0,
        };
      }

      const product = await prisma.product.findUnique({
        where: { id: rawProductId },
        include: {
          variants: true,
          images: { take: 1, orderBy: { sortOrder: 'asc' } },
          category: true,
        },
      });

      if (!product || product.status !== 'ACTIVE') {
        return {
          success: false,
          error: `Product "${item.name || 'Selected item'}" in your promotion bundle is no longer available. Please choose another product.`,
          items: [],
          subtotal: 0,
          catalogSubtotal: 0,
          promotionalDiscount: 0,
          promotionalBundlesCount: 0,
        };
      }

      // Resolve selected variant for size
      const chosenSize = item.size ? String(item.size).trim() : 'Standard';
      let matchingVariant = null;

      if (product.variants && product.variants.length > 0) {
        matchingVariant = product.variants.find(
          (v) => v.size && v.size.toUpperCase() === chosenSize.toUpperCase()
        ) || product.variants[0];
      }

      const authoritativePrice = Number(product.price);
      const authoritativeMrp = Number(product.originalPrice || product.price);

      resolvedGroup.push({
        rawItem: item,
        product,
        variant: matchingVariant,
        chosenSize,
        authoritativePrice,
        authoritativeMrp,
      });
    }

    if (resolvedGroup.length === 0) {
      return {
        success: false,
        error: `Promotional bundle "${groupId}" has no valid items.`,
        items: [],
        subtotal: 0,
        catalogSubtotal: 0,
        promotionalDiscount: 0,
        promotionalBundlesCount: 0,
      };
    }

    // STRICT SAME-CATEGORY ENFORCEMENT:
    // Qualifying product establishes the category for this bundle.
    // ALL products in this bundle MUST belong to this same category.
    const qualifyingProduct = resolvedGroup[0].product;
    const qualCatId = qualifyingProduct.categoryId;
    const qualCatSlug = (qualifyingProduct.category?.slug || '').toLowerCase().trim();
    const qualCatName = (qualifyingProduct.category?.name || qualifyingProduct.productType || 'Category').trim();

    for (let i = 1; i < resolvedGroup.length; i++) {
      const currentProd = resolvedGroup[i].product;
      const curCatId = currentProd.categoryId;
      const curCatSlug = (currentProd.category?.slug || '').toLowerCase().trim();
      const curCatName = (currentProd.category?.name || currentProd.productType || '').trim().toLowerCase();

      const isSameCat = (qualCatId && curCatId && qualCatId === curCatId) ||
        (qualCatSlug && curCatSlug && (qualCatSlug === curCatSlug || qualCatSlug.replace(/s$/, '') === curCatSlug.replace(/s$/, ''))) ||
        (qualCatName && curCatName && (qualCatName.toLowerCase() === curCatName || qualCatName.toLowerCase().replace(/s$/, '') === curCatName.replace(/s$/, '')));

      if (!isSameCat) {
        return {
          success: false,
          error: `All products in promotional bundle "${groupId}" must be from the same category (${qualCatName}). Cross-category selection is strictly prohibited. Product "${currentProd.name}" belongs to a different category.`,
          items: [],
          subtotal: 0,
          catalogSubtotal: 0,
          promotionalDiscount: 0,
          promotionalBundlesCount: 0,
        };
      }
    }

    // Resolve matching active offer for this category / bundle
    const groupRuleName = groupItems[0]?.promotionRule?.trim();
    const matchingOffer = findMatchingOfferForProductOrCategory(activeOffers, {
      productId: qualifyingProduct.id,
      categorySlug: qualCatSlug,
      categoryName: qualCatName,
      productType: qualifyingProduct.productType,
      ruleName: groupRuleName,
    });

    if (!matchingOffer || matchingOffer.status !== 'ACTIVE') {
      return {
        success: false,
        error: `No active promotion exists for category "${qualCatName}".`,
        items: [],
        subtotal: 0,
        catalogSubtotal: 0,
        promotionalDiscount: 0,
        promotionalBundlesCount: 0,
      };
    }

    const buyQty = Math.max(1, matchingOffer.buyQuantity || 1);
    const freeQty = Math.max(1, matchingOffer.freeQuantity || 1);
    const baseBundleSize = buyQty + freeQty; // e.g. 1 + 2 = 3

    // Expand resolvedGroup by quantity if any items had quantity > 1
    const expandedGroup: ResolvedGroupProduct[] = [];
    for (const resIt of resolvedGroup) {
      const q = Math.max(1, parseInt(String(resIt.rawItem.quantity || 1), 10));
      for (let i = 0; i < q; i++) {
        expandedGroup.push(resIt);
      }
    }

    const totalGroupQty = expandedGroup.length;

    // Validate group quantity: must be a multiple of baseBundleSize (e.g. 3, 6, 9)
    if (totalGroupQty === 0 || totalGroupQty % baseBundleSize !== 0) {
      return {
        success: false,
        error: `Every ${matchingOffer.name} bundle must contain products in multiples of ${baseBundleSize} (${buyQty} paid + ${freeQty} free). Group "${groupId}" has ${totalGroupQty} products.`,
        items: [],
        subtotal: 0,
        catalogSubtotal: 0,
        promotionalDiscount: 0,
        promotionalBundlesCount: 0,
      };
    }

    const multiplier = totalGroupQty / baseBundleSize; // e.g. 1 -> 3 items, 2 -> 6 items, 3 -> 9 items
    const paidCountForGroup = multiplier * buyQty;

    // Sort products by authoritative CURRENT SELLING PRICE descending.
    // The top `paidCountForGroup` products are PAID, the remaining `freeCountForGroup` products are FREE.
    expandedGroup.sort((a, b) => b.authoritativePrice - a.authoritativePrice);

    const paidItems = expandedGroup.slice(0, paidCountForGroup);
    const freeItems = expandedGroup.slice(paidCountForGroup);

    const bundlePayable = paidItems.reduce((acc, it) => acc + it.authoritativePrice, 0);
    const bundleSellingSum = expandedGroup.reduce((acc, it) => acc + it.authoritativePrice, 0);
    const bundleSavings = bundleSellingSum - bundlePayable;
    const bundleMrpSum = expandedGroup.reduce((acc, it) => acc + it.authoritativeMrp, 0);

    // 1a. Add Paid Products (Customer pays their authoritative current selling price)
    for (const paidIt of paidItems) {
      const paidImg = paidIt.product.images[0]?.url || paidIt.rawItem.image || '/placeholder.png';
      const paidSku = paidIt.variant?.sku || paidIt.product.sku;

      validatedItems.push({
        productId: paidIt.product.id,
        productName: paidIt.product.name,
        productImage: paidImg,
        sku: paidSku,
        size: paidIt.chosenSize,
        color: paidIt.product.color || 'Standard',
        quantity: 1,
        price: paidIt.authoritativePrice, // Customer pays authoritative SELLING PRICE
        mrp: paidIt.authoritativeMrp,
        selectedVariantId: paidIt.variant?.id,
        isFree: false,
        promoGroupId: groupId,
        promotionRule: matchingOffer.name,
      });
    }

    // 1b. Add Free Products (Customer pays ₹0)
    for (const freeIt of freeItems) {
      const freeImg = freeIt.product.images[0]?.url || freeIt.rawItem.image || '/placeholder.png';
      const freeSku = freeIt.variant?.sku || freeIt.product.sku;

      validatedItems.push({
        productId: freeIt.product.id,
        productName: `[FREE] ${freeIt.product.name}`,
        productImage: freeImg,
        sku: freeSku,
        size: freeIt.chosenSize,
        color: freeIt.product.color || 'Standard',
        quantity: 1,
        price: 0, // Customer pays ₹0
        mrp: freeIt.authoritativeMrp,
        selectedVariantId: freeIt.variant?.id,
        isFree: true,
        promoGroupId: groupId,
        promotionRule: matchingOffer.name,
      });
    }

    subtotal += bundlePayable;
    catalogSubtotal += bundleSellingSum;
    catalogMrpSubtotal += bundleMrpSum;
    promotionalDiscount += bundleSavings;
    promotionalBundlesCount += multiplier;
  }

  // 2. Process Regular / Unbundled Items
  // Fetch authoritative DB product & variants for all items
  interface ResolvedRegularItem {
    rawItem: RawOrderItemPayload;
    product: any;
    matchingVariant: any;
    chosenSize: string;
    authoritativePrice: number;
    authoritativeMrp: number;
    primaryImage: string;
    variantSku: string;
    isExplicitlyFree: boolean;
  }

  const resolvedRegular: ResolvedRegularItem[] = [];

  for (const item of regularItems) {
    const rawProductId = item.productId || item.id;
    const quantity = Math.max(1, parseInt(String(item.quantity || 1), 10));

    if (!rawProductId) {
      return {
        success: false,
        error: 'Invalid product identifier in cart payload.',
        items: [],
        subtotal: 0,
        catalogSubtotal: 0,
        promotionalDiscount: 0,
        promotionalBundlesCount: 0,
      };
    }

    const product = await prisma.product.findUnique({
      where: { id: rawProductId },
      include: {
        variants: true,
        images: { take: 1, orderBy: { sortOrder: 'asc' } },
        category: true,
      },
    });

    if (!product || product.status !== 'ACTIVE') {
      return {
        success: false,
        error: `Product "${item.name || 'Selected item'}" is currently unavailable.`,
        items: [],
        subtotal: 0,
        catalogSubtotal: 0,
        promotionalDiscount: 0,
        promotionalBundlesCount: 0,
      };
    }

    const chosenSize = item.size ? String(item.size).trim() : 'Standard';
    let matchingVariant = null;

    if (product.variants && product.variants.length > 0) {
      matchingVariant = product.variants.find(
        (v) => v.size && v.size.toUpperCase() === chosenSize.toUpperCase()
      ) || product.variants[0];
    }

    const authoritativePrice = Number(product.price);
    const authoritativeMrp = Number(product.originalPrice || product.price);
    const primaryImage = product.images[0]?.url || item.image || item.productImage || '/placeholder.png';
    const variantSku = matchingVariant?.sku || product.sku;
    const isExplicitlyFree = Boolean(item.isFree || (item.price === 0 && item.originalPrice && item.originalPrice > 0));

    // Expand by quantity so individual units can be priced
    for (let q = 0; q < quantity; q++) {
      resolvedRegular.push({
        rawItem: item,
        product,
        matchingVariant,
        chosenSize,
        authoritativePrice,
        authoritativeMrp,
        primaryImage,
        variantSku,
        isExplicitlyFree,
      });
    }
  }

  // 2a. Separate explicit free items from unbundled items
  const explicitFreeItems: ResolvedRegularItem[] = [];
  const unbundledCandidateItems: ResolvedRegularItem[] = [];

  for (const it of resolvedRegular) {
    if (it.isExplicitlyFree) {
      explicitFreeItems.push(it);
    } else {
      unbundledCandidateItems.push(it);
    }
  }

  // Add explicit free items (Customer pays ₹0, commercial price = ₹0)
  for (const freeIt of explicitFreeItems) {
    const rawName = freeIt.rawItem.name || freeIt.product.name;
    const displayName = rawName.startsWith('[FREE]') ? rawName : `[FREE] ${rawName}`;

    validatedItems.push({
      productId: freeIt.product.id,
      productName: displayName,
      productImage: freeIt.primaryImage,
      sku: freeIt.variantSku,
      size: freeIt.chosenSize,
      color: freeIt.product.color || 'Standard',
      quantity: 1,
      price: 0, // Commercial payable value = ₹0
      mrp: freeIt.authoritativeMrp,
      selectedVariantId: freeIt.matchingVariant?.id,
      isFree: true,
      promoGroupId: freeIt.rawItem.promoGroupId,
      promotionRule: freeIt.rawItem.promotionRule || 'Promotional Free Item',
      categorySlug: freeIt.product.category?.slug,
      categoryName: freeIt.product.category?.name,
    });

    // Subtotal increases by 0 for free items
    catalogSubtotal += freeIt.authoritativePrice;
    catalogMrpSubtotal += freeIt.authoritativeMrp;
    promotionalDiscount += freeIt.authoritativePrice;
  }

  // 2b. Evaluate unbundled candidate items against active promotion offers
  // Group by matching active offer and category
  const offerBuckets = new Map<string, { offer: PromotionOffer | null; items: ResolvedRegularItem[] }>();

  for (const it of unbundledCandidateItems) {
    const matchingOffer = findMatchingOfferForProductOrCategory(activeOffers, {
      productId: it.product.id,
      categorySlug: it.product.category?.slug,
      categoryName: it.product.category?.name,
      productType: it.product.productType,
      ruleName: it.rawItem.promotionRule,
    });

    const key = matchingOffer && matchingOffer.status === 'ACTIVE'
      ? `${matchingOffer.id}_${it.product.categoryId || it.product.category?.slug || 'all'}`
      : 'no_offer';

    if (!offerBuckets.has(key)) {
      offerBuckets.set(key, { offer: matchingOffer, items: [] });
    }
    offerBuckets.get(key)!.items.push(it);
  }

  for (const bucket of offerBuckets.values()) {
    const bucketItems = bucket.items;
    const offer = bucket.offer;

    if (offer && offer.status === 'ACTIVE' && offer.buyQuantity > 0 && offer.freeQuantity > 0) {
      const bQty = offer.buyQuantity;
      const fQty = offer.freeQuantity;
      const bundleSize = bQty + fQty;

      // Sort descending by authoritative price (highest paid, lowest free)
      bucketItems.sort((a, b) => b.authoritativePrice - a.authoritativePrice);

      const totalQty = bucketItems.length;
      const fullBundles = Math.floor(totalQty / bundleSize);
      const remainder = totalQty % bundleSize;

      const paidCount = fullBundles * bQty + Math.min(remainder, bQty);
      const freeCount = fullBundles * fQty + Math.max(0, remainder - bQty);

      if (freeCount > 0) {
        promotionalBundlesCount += fullBundles;
      }

      for (let i = 0; i < totalQty; i++) {
        const it = bucketItems[i];
        const isFreeItem = i >= paidCount;

        if (isFreeItem) {
          validatedItems.push({
            productId: it.product.id,
            productName: `[FREE] ${it.product.name}`,
            productImage: it.primaryImage,
            sku: it.variantSku,
            size: it.chosenSize,
            color: it.product.color || 'Standard',
            quantity: 1,
            price: 0, // Commercial payable value = ₹0
            mrp: it.authoritativeMrp,
            selectedVariantId: it.matchingVariant?.id,
            isFree: true,
            promotionRule: offer.name,
            categorySlug: it.product.category?.slug,
            categoryName: it.product.category?.name,
          });

          catalogSubtotal += it.authoritativePrice;
          catalogMrpSubtotal += it.authoritativeMrp;
          promotionalDiscount += it.authoritativePrice;
        } else {
          validatedItems.push({
            productId: it.product.id,
            productName: it.product.name,
            productImage: it.primaryImage,
            sku: it.variantSku,
            size: it.chosenSize,
            color: it.product.color || 'Standard',
            quantity: 1,
            price: it.authoritativePrice,
            mrp: it.authoritativeMrp,
            selectedVariantId: it.matchingVariant?.id,
            isFree: false,
            promotionRule: offer.name,
            categorySlug: it.product.category?.slug,
            categoryName: it.product.category?.name,
          });

          subtotal += it.authoritativePrice;
          catalogSubtotal += it.authoritativePrice;
          catalogMrpSubtotal += it.authoritativeMrp;
        }
      }
    } else {
      // No active offer: standard paid items
      for (const it of bucketItems) {
        validatedItems.push({
          productId: it.product.id,
          productName: it.product.name,
          productImage: it.primaryImage,
          sku: it.variantSku,
          size: it.chosenSize,
          color: it.product.color || 'Standard',
          quantity: 1,
          price: it.authoritativePrice,
          mrp: it.authoritativeMrp,
          selectedVariantId: it.matchingVariant?.id,
          isFree: false,
          categorySlug: it.product.category?.slug,
          categoryName: it.product.category?.name,
        });

        subtotal += it.authoritativePrice;
        catalogSubtotal += it.authoritativePrice;
        catalogMrpSubtotal += it.authoritativeMrp;
      }
    }
  }

  // Calculate qualifying counts across all promotional bundles in order
  const qualifyingPaidCount = validatedItems
    .filter((it) => it.promoGroupId && !it.isFree)
    .reduce((acc, it) => acc + it.quantity, 0);

  const qualifyingFreeCount = validatedItems
    .filter((it) => it.promoGroupId && it.isFree)
    .reduce((acc, it) => acc + it.quantity, 0);

  // Tiered automatic discount for offer bundle:
  // 1 paid + 2 free = 3 products -> ₹0 discount
  // 2 paid + 4 free = 6 products -> ₹100 discount
  // 3 paid + 6 free = 9 products -> ₹200 discount
  let autoOfferDiscount = 0;
  if (qualifyingPaidCount >= 3 && qualifyingFreeCount >= 6) {
    autoOfferDiscount = Math.min(200, subtotal);
  } else if (qualifyingPaidCount >= 2 && qualifyingFreeCount >= 4) {
    autoOfferDiscount = Math.min(100, subtotal);
  }
  const has6ProductOfferBonus = qualifyingPaidCount >= 2 && qualifyingFreeCount >= 4;

  return {
    success: true,
    items: validatedItems,
    subtotal,
    catalogSubtotal,
    catalogMrpSubtotal,
    promotionalDiscount,
    promotionalBundlesCount,
    has6ProductOfferBonus,
    autoOfferDiscount,
    qualifyingPaidCount,
    qualifyingFreeCount,
  };
}
