/**
 * ADRIZO Authoritative Checkout & Promotion Calculation Engine
 * 
 * Rules:
 * 1. T-Shirts: Automatic BUY 1 GET 2 FREE
 *    - 1 T-shirt: 1 paid, 0 free
 *    - 2 T-shirts: 1 paid, 1 free
 *    - 3 T-shirts: 1 paid, 2 free
 *    - 4 T-shirts: 2 paid, 2 free
 *    - 5 T-shirts: 2 paid, 3 free
 *    - 6 T-shirts: 2 paid, 4 free
 * 
 * 2. Hoodies: Automatic BUY 1 GET 1 FREE
 *    - 1 hoodie: 1 paid, 0 free
 *    - 2 hoodies: 1 paid, 1 free
 *    - 4 hoodies: 2 paid, 2 free
 * 
 * 3. Categories do NOT mix: T-shirts & Hoodies calculated independently.
 * 4. Lowest-priced items become free in each bundle group.
 * 5. Prepaid discount: ₹50 OFF universal incentive for full online payment.
 * 6. COD confirmation fee: ₹99 paid now online via Razorpay, merchandise balance payable on delivery.
 */

export type CategoryType = 'T_SHIRT' | 'HOODIE' | 'OTHER';
export type PaymentMode = 'ONLINE_RAZORPAY' | 'PREPAID' | 'COD';

export interface RawCheckoutItem {
  id?: string;
  productId: string;
  name?: string;
  productName?: string;
  price: number; // catalog selling price
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
}

export interface UnitItem {
  productId: string;
  name: string;
  price: number; // authoritative catalog price
  mrp: number;
  image: string;
  size: string;
  color: string;
  sku?: string;
  categoryType: CategoryType;
  isFree: boolean;
  effectivePrice: number; // 0 if free, price if paid
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
 * Classifies an item into T_SHIRT, HOODIE, or OTHER.
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

  // Check Hoodies first
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

  // Check T-Shirts
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
 * Expands an array of items into individual units and applies automatic bundle rules.
 */
export function processItemBundles(items: RawCheckoutItem[]): {
  unitItems: UnitItem[];
  catalogSubtotal: number;
  tshirtBundleSavings: number;
  hoodieBundleSavings: number;
  bundleDiscount: number;
  subtotalAfterBundles: number;
  bundleDetails: CheckoutTotals['bundleDetails'];
} {
  const tshirtUnits: UnitItem[] = [];
  const hoodieUnits: UnitItem[] = [];
  const otherUnits: UnitItem[] = [];

  // Expand items by quantity
  for (const it of items) {
    const qty = Math.max(1, parseInt(String(it.quantity || 1), 10));
    const catType = getItemCategoryType(it);
    const unitPrice = Number(it.price || it.originalPrice || 0);
    const unitMrp = Number(it.originalPrice || it.price || 0);
    const name = it.name || it.productName || 'Product';
    const image = it.image || it.productImage || '';
    const size = it.size || 'Standard';
    const color = it.color || 'Standard';

    for (let i = 0; i < qty; i++) {
      const unit: UnitItem = {
        productId: it.productId || (it as any).id,
        name,
        price: unitPrice,
        mrp: unitMrp,
        image,
        size,
        color,
        sku: it.sku,
        categoryType: catType,
        isFree: false,
        effectivePrice: unitPrice,
      };

      if (catType === 'T_SHIRT') {
        tshirtUnits.push(unit);
      } else if (catType === 'HOODIE') {
        hoodieUnits.push(unit);
      } else {
        otherUnits.push(unit);
      }
    }
  }

  const appliedOffers: string[] = [];

  // 1. Process T-Shirts: Automatic BUY 1 GET 2 FREE
  // Sort descending: highest price paid, lowest price free
  tshirtUnits.sort((a, b) => b.price - a.price);
  const totalTshirts = tshirtUnits.length;
  let tshirtPaidCount = 0;
  let tshirtFreeCount = 0;

  if (totalTshirts > 0) {
    const fullBundles = Math.floor(totalTshirts / 3);
    const remainder = totalTshirts % 3;

    tshirtPaidCount = fullBundles + (remainder > 0 ? 1 : 0);
    tshirtFreeCount = fullBundles * 2 + (remainder === 2 ? 1 : 0);

    for (let i = 0; i < totalTshirts; i++) {
      if (i < tshirtPaidCount) {
        tshirtUnits[i].isFree = false;
        tshirtUnits[i].effectivePrice = tshirtUnits[i].price;
      } else {
        tshirtUnits[i].isFree = true;
        tshirtUnits[i].effectivePrice = 0;
        tshirtUnits[i].bundleRule = 'BUY 1 GET 2 FREE';
      }
    }

    if (tshirtFreeCount > 0) {
      appliedOffers.push(`Buy 1 Get 2 Free (T-Shirts: ${tshirtFreeCount} Free)`);
    }
  }

  const tshirtBundleSavings = tshirtUnits
    .filter(u => u.isFree)
    .reduce((sum, u) => sum + u.price, 0);

  // 2. Process Hoodies: Automatic BUY 1 GET 1 FREE
  // Sort descending: highest price paid, lowest price free
  hoodieUnits.sort((a, b) => b.price - a.price);
  const totalHoodies = hoodieUnits.length;
  let hoodiePaidCount = 0;
  let hoodieFreeCount = 0;

  if (totalHoodies > 0) {
    const fullPairs = Math.floor(totalHoodies / 2);
    const remainder = totalHoodies % 2;

    hoodiePaidCount = fullPairs + remainder;
    hoodieFreeCount = fullPairs;

    for (let i = 0; i < totalHoodies; i++) {
      if (i < hoodiePaidCount) {
        hoodieUnits[i].isFree = false;
        hoodieUnits[i].effectivePrice = hoodieUnits[i].price;
      } else {
        hoodieUnits[i].isFree = true;
        hoodieUnits[i].effectivePrice = 0;
        hoodieUnits[i].bundleRule = 'BUY 1 GET 1 FREE';
      }
    }

    if (hoodieFreeCount > 0) {
      appliedOffers.push(`Buy 1 Get 1 Free (Hoodies: ${hoodieFreeCount} Free)`);
    }
  }

  const hoodieBundleSavings = hoodieUnits
    .filter(u => u.isFree)
    .reduce((sum, u) => sum + u.price, 0);

  // Combine all unit items
  const allUnitItems = [...tshirtUnits, ...hoodieUnits, ...otherUnits];
  const catalogSubtotal = allUnitItems.reduce((sum, u) => sum + u.price, 0);
  const bundleDiscount = tshirtBundleSavings + hoodieBundleSavings;
  const subtotalAfterBundles = Math.max(0, catalogSubtotal - bundleDiscount);

  return {
    unitItems: allUnitItems,
    catalogSubtotal,
    tshirtBundleSavings,
    hoodieBundleSavings,
    bundleDiscount,
    subtotalAfterBundles,
    bundleDetails: {
      tshirtCount: totalTshirts,
      tshirtPaid: tshirtPaidCount,
      tshirtFree: tshirtFreeCount,
      hoodieCount: totalHoodies,
      hoodiePaid: hoodiePaidCount,
      hoodieFree: hoodieFreeCount,
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
  paymentMode = 'ONLINE_RAZORPAY',
  couponDiscount = 0,
  shippingThreshold = 999,
  standardShippingFee = 0,
}: {
  items: RawCheckoutItem[];
  paymentMode?: PaymentMode;
  couponDiscount?: number;
  shippingThreshold?: number;
  standardShippingFee?: number;
}): CheckoutTotals {
  const bundleResult = processItemBundles(items);
  const {
    unitItems,
    catalogSubtotal,
    tshirtBundleSavings,
    hoodieBundleSavings,
    bundleDiscount,
    subtotalAfterBundles,
    bundleDetails,
  } = bundleResult;

  // Shipping
  const shippingCharge = subtotalAfterBundles >= shippingThreshold ? 0 : standardShippingFee;

  // Valid coupon discount
  const validCouponDiscount = Math.min(subtotalAfterBundles, Math.max(0, couponDiscount));
  const basePayable = Math.max(0, subtotalAfterBundles - validCouponDiscount);

  // Universal Prepaid Incentive: ₹50 OFF for full online payment
  const isPrepaid = paymentMode === 'ONLINE_RAZORPAY' || paymentMode === 'PREPAID';
  const rawPrepaidDiscount = isPrepaid ? 50 : 0;
  // Cap prepaid discount so amount payable is at least ₹1 if basePayable > 0
  const prepaidDiscount = isPrepaid ? Math.min(rawPrepaidDiscount, Math.max(0, basePayable - 1)) : 0;

  // COD: ₹99 paid now online via Razorpay as advance confirmation
  const isCod = paymentMode === 'COD';
  const codFee = isCod ? 99 : 0;

  let amountPayableNow = 0;
  let amountDueOnDelivery = 0;

  if (isCod) {
    // For COD: Customer pays ₹99 online now via Razorpay
    amountPayableNow = 99;
    // Customer pays the merchandise amount on delivery
    amountDueOnDelivery = basePayable + shippingCharge;
  } else {
    // For Prepaid: Customer pays the full amount online now
    amountPayableNow = Math.max(1, basePayable - prepaidDiscount + shippingCharge);
    amountDueOnDelivery = 0;
  }

  const finalOrderValue = isCod
    ? amountDueOnDelivery + codFee
    : amountPayableNow;

  return {
    catalogSubtotal,
    tshirtBundleSavings,
    hoodieBundleSavings,
    bundleDiscount,
    subtotalAfterBundles,
    couponDiscount: validCouponDiscount,
    prepaidDiscount,
    codFee,
    shippingCharge,
    amountPayableNow,
    amountDueOnDelivery,
    finalOrderValue,
    paymentMode,
    bundleDetails,
    unitItems,
  };
}
