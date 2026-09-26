import { POLICY_CONFIG, getCodAdvanceAmount } from '../config/policies';
import type { PromotionOffer } from '@/lib/promotions';

/**
 * ADRIZO Authoritative Checkout & Promotion Calculation Engine
 * 
 * Generic Promotion Engine:
 * 1. Supports any Buy X Get Y Free promotion configured in Admin Panel.
 * 2. Allocates highest-priced items as paid, lowest-priced items as free.
 * 3. Never overwrites or charges for items marked free.
 * 4. Online prepaid discount: ₹50 OFF universal incentive for full online payment.
 * 5. COD confirmation: Dedicated ₹99 online advance paid via Razorpay, remaining balance payable on delivery.
 */

export type CategoryType = 'T_SHIRT' | 'HOODIE' | 'OTHER' | string;
export type PaymentMode = 'ONLINE_RAZORPAY' | 'PREPAID' | 'COD';

export interface RawCheckoutItem {
  id?: string;
  productId: string;
  name?: string;
  productName?: string;
  price: number; // catalog selling price (or 0 for free promotional items)
  originalPrice?: number; // MRP
  image?: string;
  productImage?: string;
  size?: string;
  color?: string;
  quantity: number;
  sku?: string;
  categorySlug?: string;
  categoryName?: string;
  category?: { slug?: string; name?: string } | null;
  isFree?: boolean;
  promoGroupId?: string;
  promotionRule?: string;
}

export interface UnitItem {
  productId: string;
  name: string;
  price: number; // authoritative catalog selling price
  mrp: number;   // authoritative original/reference MRP
  image: string;
  size: string;
  color: string;
  sku?: string;
  categoryType: CategoryType;
  isFree: boolean;
  effectivePrice: number; // 0 if free, selling price if paid
  promoGroupId?: string;
  bundleRule?: string;
}

export interface CheckoutTotals {
  catalogSubtotal: number;
  tshirtBundleSavings: number;
  hoodieBundleSavings: number;
  bundleDiscount: number;
  subtotalAfterBundles: number;
  couponDiscount: number;
  prepaidDiscount: number;
  codFee: number;
  shippingCharge: number;
  amountPayableNow: number;
  amountDueOnDelivery: number;
  finalOrderValue: number;
  paymentMode: PaymentMode;
  bundleDetails: {
    tshirtCount: number;
    tshirtPaid: number;
    tshirtFree: number;
    hoodieCount: number;
    hoodiePaid: number;
    hoodieFree: number;
    appliedOffers: string[];
  };
  unitItems: UnitItem[];
}

/**
 * Classifies an item into category type for display and classification.
 */
export function getItemCategoryType(item: {
  name?: string;
  productName?: string;
  categorySlug?: string;
  categoryName?: string;
  category?: { slug?: string; name?: string } | null;
}): CategoryType {
  const catSlug = (item.categorySlug || item.category?.slug || '').toLowerCase();
  const catName = (item.categoryName || item.category?.name || '').toLowerCase();
  const prodName = (item.name || item.productName || '').toLowerCase();

  if (
    catSlug.includes('hoodie') ||
    catName.includes('hoodie') ||
    catSlug.includes('sweatshirt') ||
    catName.includes('sweatshirt') ||
    prodName.includes('hoodie') ||
    prodName.includes('sweatshirt')
  ) {
    return 'HOODIE';
  }

  if (
    catSlug.includes('t-shirt') ||
    catSlug.includes('tshirt') ||
    catSlug.includes('tee') ||
    catName.includes('t-shirt') ||
    catName.includes('tshirt') ||
    catName.includes('tee') ||
    prodName.includes('t-shirt') ||
    prodName.includes('tshirt') ||
    prodName.includes(' polo') ||
    prodName.includes('polo ') ||
    prodName.endsWith('polo') ||
    prodName.includes('tee')
  ) {
    return 'T_SHIRT';
  }

  return 'OTHER';
}

/**
 * Calculates paid and free counts for any generic Buy X Get Y Free rule.
 * Example Buy 1 Get 2 Free: N=1 -> paid 1, free 0; N=2 -> paid 1, free 1; N=3 -> paid 1, free 2; N=6 -> paid 2, free 4.
 * Example Buy 1 Get 1 Free: N=1 -> paid 1, free 0; N=2 -> paid 1, free 1; N=4 -> paid 2, free 2.
 * Example Buy 2 Get 1 Free: N=2 -> paid 2, free 0; N=3 -> paid 2, free 1.
 */
export function calculateBxGyCounts(
  totalQuantity: number,
  buyQty: number,
  freeQty: number
): { paidCount: number; freeCount: number } {
  const b = Math.max(1, buyQty || 1);
  const f = Math.max(1, freeQty || 1);
  const bundleSize = b + f;
  const fullBundles = Math.floor(totalQuantity / bundleSize);
  const remainder = totalQuantity % bundleSize;

  const paidCount = fullBundles * b + Math.min(remainder, b);
  const freeCount = fullBundles * f + Math.max(0, remainder - b);

  return { paidCount, freeCount };
}

/**
 * Expands items into individual units and applies generic BXGY promotion rules.
 */
export function processItemBundles(
  items: RawCheckoutItem[],
  offers?: PromotionOffer[]
): {
  unitItems: UnitItem[];
  catalogSubtotal: number;
  tshirtBundleSavings: number;
  hoodieBundleSavings: number;
  bundleDiscount: number;
  subtotalAfterBundles: number;
  bundleDetails: CheckoutTotals['bundleDetails'];
} {
  const unitList: UnitItem[] = [];

  // 1. Expand all items by quantity into individual unit representations
  for (const it of items) {
    const qty = Math.max(1, parseInt(String(it.quantity || 1), 10));
    const catType = getItemCategoryType(it);
    const isExplicitlyFree = Boolean(it.isFree || (it.price === 0 && it.originalPrice && it.originalPrice > 0));
    const unitPrice = isExplicitlyFree
      ? Number(it.originalPrice || it.price || 0)
      : Number(it.price || it.originalPrice || 0);
    const unitMrp = Number(it.originalPrice || it.price || unitPrice || 0);
    const name = it.name || it.productName || 'Product';
    const image = it.image || it.productImage || '';
    const size = it.size || 'Standard';
    const color = it.color || 'Standard';

    for (let i = 0; i < qty; i++) {
      unitList.push({
        productId: it.productId || (it as any).id,
        name,
        price: unitPrice,
        mrp: unitMrp,
        image,
        size,
        color,
        sku: it.sku,
        categoryType: catType,
        isFree: isExplicitlyFree,
        effectivePrice: isExplicitlyFree ? 0 : unitPrice,
        promoGroupId: it.promoGroupId,
        bundleRule: it.promotionRule,
      });
    }
  }

  const appliedOffers: string[] = [];

  // 2. Separate units into:
  // a) Explicit Promo Groups (items with promoGroupId)
  // b) Already Free items (isFree === true)
  // c) Unbundled Paid items (to evaluate against active offers)
  const promoGroups = new Map<string, UnitItem[]>();
  const explicitFreeUnits: UnitItem[] = [];
  const unbundledPaidUnits: UnitItem[] = [];

  for (const unit of unitList) {
    if (unit.promoGroupId) {
      if (!promoGroups.has(unit.promoGroupId)) {
        promoGroups.set(unit.promoGroupId, []);
      }
      promoGroups.get(unit.promoGroupId)!.push(unit);
    } else if (unit.isFree) {
      explicitFreeUnits.push(unit);
    } else {
      unbundledPaidUnits.push(unit);
    }
  }

  const finalizedUnits: UnitItem[] = [];

  // Process explicit promo groups
  for (const [groupId, groupUnits] of promoGroups.entries()) {
    // If items in the group already have explicit isFree distinctions:
    const hasPreassignedFree = groupUnits.some(u => u.isFree);
    if (hasPreassignedFree) {
      for (const u of groupUnits) {
        finalizedUnits.push({
          ...u,
          effectivePrice: u.isFree ? 0 : u.price,
        });
      }
      const freeCount = groupUnits.filter(u => u.isFree).length;
      if (freeCount > 0) {
        appliedOffers.push(`Promotional Bundle (${freeCount} Free)`);
      }
    } else {
      // Automatic allocation within group: top items paid, remaining free based on rule
      groupUnits.sort((a, b) => b.price - a.price);
      const ruleName = groupUnits[0]?.bundleRule?.toUpperCase() || '';
      let bQty = 1;
      let fQty = 2; // Default Buy 1 Get 2

      if (ruleName.includes('BUY 1 GET 1') || ruleName.includes('1+1')) {
        bQty = 1;
        fQty = 1;
      } else if (ruleName.includes('BUY 1 GET 3') || ruleName.includes('1+3')) {
        bQty = 1;
        fQty = 3;
      } else if (ruleName.includes('BUY 2 GET 1') || ruleName.includes('2+1')) {
        bQty = 2;
        fQty = 1;
      } else if (ruleName.includes('BUY 2 GET 2') || ruleName.includes('2+2')) {
        bQty = 2;
        fQty = 2;
      }

      const { paidCount, freeCount } = calculateBxGyCounts(groupUnits.length, bQty, fQty);

      for (let i = 0; i < groupUnits.length; i++) {
        if (i < paidCount) {
          finalizedUnits.push({
            ...groupUnits[i],
            isFree: false,
            effectivePrice: groupUnits[i].price,
          });
        } else {
          finalizedUnits.push({
            ...groupUnits[i],
            isFree: true,
            effectivePrice: 0,
            bundleRule: groupUnits[i].bundleRule || `BUY ${bQty} GET ${fQty} FREE`,
          });
        }
      }

      if (freeCount > 0) {
        appliedOffers.push(`Bundle (${freeCount} Free)`);
      }
    }
  }

  // Preserve explicit free units
  for (const u of explicitFreeUnits) {
    finalizedUnits.push({
      ...u,
      isFree: true,
      effectivePrice: 0,
    });
  }

  // Process unbundled paid units
  // Group by category type to support category-specific offers (T-Shirts, Hoodies, etc.)
  const categoryBuckets = new Map<string, UnitItem[]>();
  for (const u of unbundledPaidUnits) {
    const key = u.categoryType || 'OTHER';
    if (!categoryBuckets.has(key)) {
      categoryBuckets.set(key, []);
    }
    categoryBuckets.get(key)!.push(u);
  }

  for (const [catKey, catUnits] of categoryBuckets.entries()) {
    // Sort descending by price (highest paid, lowest free)
    catUnits.sort((a, b) => b.price - a.price);

    // Resolve matching offer for this category
    let buyQty = 1;
    let freeQty = 0;
    let ruleName = '';

    if (offers && offers.length > 0) {
      const activeCatOffer = offers.find(o => {
        if (o.status !== 'ACTIVE') return false;
        const cats = (o.applicableCategories || []).map(c => c.toLowerCase().trim());
        if (cats.includes('all')) return true;
        const lowKey = catKey.toLowerCase();
        return cats.some(c => lowKey.includes(c) || c.includes(lowKey));
      });

      if (activeCatOffer) {
        buyQty = activeCatOffer.buyQuantity || 1;
        freeQty = activeCatOffer.freeQuantity || 0;
        ruleName = activeCatOffer.name || `BUY ${buyQty} GET ${freeQty} FREE`;
      }
    } else {
      // Default standard configuration fallback:
      // T-Shirts: Buy 1 Get 2 Free
      // Hoodies: Buy 1 Get 1 Free
      if (catKey === 'T_SHIRT') {
        buyQty = 1;
        freeQty = 2;
        ruleName = 'BUY 1 GET 2 FREE';
      } else if (catKey === 'HOODIE') {
        buyQty = 1;
        freeQty = 1;
        ruleName = 'BUY 1 GET 1 FREE';
      }
    }

    if (freeQty > 0 && catUnits.length >= (buyQty + 1)) {
      const { paidCount, freeCount } = calculateBxGyCounts(catUnits.length, buyQty, freeQty);

      for (let i = 0; i < catUnits.length; i++) {
        if (i < paidCount) {
          finalizedUnits.push({
            ...catUnits[i],
            isFree: false,
            effectivePrice: catUnits[i].price,
          });
        } else {
          finalizedUnits.push({
            ...catUnits[i],
            isFree: true,
            effectivePrice: 0,
            bundleRule: ruleName,
          });
        }
      }

      if (freeCount > 0) {
        appliedOffers.push(`${ruleName} (${freeCount} Free)`);
      }
    } else {
      // No promotion applicable: all units are paid
      for (const u of catUnits) {
        finalizedUnits.push({
          ...u,
          isFree: false,
          effectivePrice: u.price,
        });
      }
    }
  }

  // T-Shirt and Hoodie statistics for UI breakdown
  const tshirtUnits = finalizedUnits.filter(u => u.categoryType === 'T_SHIRT');
  const hoodieUnits = finalizedUnits.filter(u => u.categoryType === 'HOODIE');

  const tshirtPaid = tshirtUnits.filter(u => !u.isFree).length;
  const tshirtFree = tshirtUnits.filter(u => u.isFree).length;
  const tshirtBundleSavings = tshirtUnits.filter(u => u.isFree).reduce((sum, u) => sum + u.price, 0);

  const hoodiePaid = hoodieUnits.filter(u => !u.isFree).length;
  const hoodieFree = hoodieUnits.filter(u => u.isFree).length;
  const hoodieBundleSavings = hoodieUnits.filter(u => u.isFree).reduce((sum, u) => sum + u.price, 0);

  const catalogSubtotal = finalizedUnits.reduce((sum, u) => sum + (u.mrp || u.price), 0);
  const bundleDiscount = finalizedUnits.filter(u => u.isFree).reduce((sum, u) => sum + u.price, 0);
  const subtotalAfterBundles = finalizedUnits.reduce((sum, u) => sum + u.effectivePrice, 0);

  return {
    unitItems: finalizedUnits,
    catalogSubtotal,
    tshirtBundleSavings,
    hoodieBundleSavings,
    bundleDiscount,
    subtotalAfterBundles,
    bundleDetails: {
      tshirtCount: tshirtUnits.length,
      tshirtPaid,
      tshirtFree,
      hoodieCount: hoodieUnits.length,
      hoodiePaid,
      hoodieFree,
      appliedOffers,
    },
  };
}

/**
 * Authoritative Master Function to calculate checkout totals.
 * Single source of truth across Cart, Checkout, Buy Now, and Razorpay Order Creation.
 */
export function calculateCheckoutTotals({
  items,
  offers,
  paymentMode = 'ONLINE_RAZORPAY',
  couponDiscount = 0,
  shippingThreshold = POLICY_CONFIG.shipping.freeShippingThreshold,
  standardShippingFee = POLICY_CONFIG.shipping.standardFee,
}: {
  items: RawCheckoutItem[];
  offers?: PromotionOffer[];
  paymentMode?: PaymentMode;
  couponDiscount?: number;
  shippingThreshold?: number;
  standardShippingFee?: number;
}): CheckoutTotals {
  const bundleResult = processItemBundles(items, offers);
  const {
    unitItems,
    catalogSubtotal,
    tshirtBundleSavings,
    hoodieBundleSavings,
    bundleDiscount,
    subtotalAfterBundles,
    bundleDetails,
  } = bundleResult;

  // Shipping Calculation
  const shippingCharge = subtotalAfterBundles >= shippingThreshold ? 0 : standardShippingFee;

  // Coupon Discount
  const validCouponDiscount = Math.min(subtotalAfterBundles, Math.max(0, couponDiscount));
  const basePayable = Math.max(0, subtotalAfterBundles - validCouponDiscount);

  // Universal Prepaid Incentive: ₹50 OFF universal incentive for full online payment
  const isPrepaid = paymentMode === 'ONLINE_RAZORPAY' || paymentMode === 'PREPAID';
  const rawPrepaidDiscount = isPrepaid ? 50 : 0;
  // Cap prepaid discount so amount payable is at least ₹1 if basePayable > 0
  const prepaidDiscount = isPrepaid ? Math.min(rawPrepaidDiscount, Math.max(0, basePayable - 1)) : 0;

  // COD Calculation: ₹99 online advance confirmation paid via Razorpay now.
  // The ₹99 advance is an advance against the order total, NOT an additional surcharge.
  const isCod = paymentMode === 'COD';
  const configuredCodAdvance = getCodAdvanceAmount();
  const fullOrderPayable = basePayable + shippingCharge;
  const codAdvanceAmount = isCod ? Math.min(configuredCodAdvance, fullOrderPayable) : 0;

  let amountPayableNow = 0;
  let amountDueOnDelivery = 0;

  if (isCod) {
    // For COD: Customer pays ₹99 online now via Razorpay
    amountPayableNow = codAdvanceAmount;
    // Customer pays remaining merchandise balance on delivery
    amountDueOnDelivery = Math.max(0, fullOrderPayable - codAdvanceAmount);
  } else {
    // For Prepaid: Customer pays the full amount online now
    amountPayableNow = Math.max(1, basePayable - prepaidDiscount + shippingCharge);
    amountDueOnDelivery = 0;
  }

  // The total value of the order
  const finalOrderValue = isCod ? fullOrderPayable : amountPayableNow;

  return {
    catalogSubtotal,
    tshirtBundleSavings,
    hoodieBundleSavings,
    bundleDiscount,
    subtotalAfterBundles,
    couponDiscount: validCouponDiscount,
    prepaidDiscount,
    codFee: isCod ? codAdvanceAmount : 0,
    shippingCharge,
    amountPayableNow,
    amountDueOnDelivery,
    finalOrderValue,
    paymentMode,
    bundleDetails,
    unitItems,
  };
}
