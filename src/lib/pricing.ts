/**
 * Unified Pricing & Automatic Discount Utility
 * 
 * Provides standard pricing calculation, validation, and formatting across
 * the Admin Panel, API routes, Server Actions, and Storefront components.
 */

export interface ProductPricingInfo {
  sellingPrice: number;
  mrp: number | null;
  discountPercent: number;
  hasDiscount: boolean;
  saveText: string;
  formattedSelling: string;
  formattedMrp: string | null;
}

export interface PricingValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Safely parses any price input (string, number, null, undefined) to a clean number.
 * Returns null if the value is empty, invalid, or NaN.
 */
export function parsePrice(val: number | string | null | undefined): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') {
    return isNaN(val) || !isFinite(val) ? null : val;
  }
  const str = String(val).trim();
  if (str === '') return null;
  const num = parseFloat(str);
  return isNaN(num) || !isFinite(num) ? null : num;
}

/**
 * Calculates the discount percentage from MRP and Selling Price:
 * Formula: ((MRP - Selling Price) / MRP) * 100
 * 
 * Rules:
 * - Rounded to the nearest whole percentage (e.g., 41.68% -> 42%).
 * - Returns 0 if Selling Price >= MRP, or if either price is invalid/non-positive.
 * - Always returns a safe non-negative integer between 0 and 100 (never NaN or Infinity).
 */
export function calculateDiscountPercentage(
  mrp: number | string | null | undefined,
  sellingPrice: number | string | null | undefined
): number {
  const numMrp = parsePrice(mrp);
  const numSelling = parsePrice(sellingPrice);

  if (numMrp === null || numSelling === null) return 0;
  if (numMrp <= 0 || numSelling <= 0) return 0;
  if (numSelling >= numMrp) return 0;

  const discount = Math.round(((numMrp - numSelling) / numMrp) * 100);
  return Math.min(Math.max(discount, 0), 100);
}

/**
 * Validates MRP and Selling Price for product creation and updating.
 * 
 * Rules:
 * 1. MRP must be provided and > 0.
 * 2. Selling Price must be provided and > 0.
 * 3. Selling Price must not exceed MRP (Selling Price <= MRP).
 * 4. Negative and non-numeric values are rejected.
 */
export function validatePricing(
  mrp: number | string | null | undefined,
  sellingPrice: number | string | null | undefined
): PricingValidationResult {
  const numMrp = parsePrice(mrp);
  const numSelling = parsePrice(sellingPrice);

  if (mrp === '' || mrp === null || mrp === undefined || numMrp === null) {
    return {
      isValid: false,
      error: 'MRP / Original Price is required and must be a valid positive number.'
    };
  }

  if (numMrp <= 0) {
    return {
      isValid: false,
      error: 'MRP / Original Price must be greater than zero.'
    };
  }

  if (sellingPrice === '' || sellingPrice === null || sellingPrice === undefined || numSelling === null) {
    return {
      isValid: false,
      error: 'Selling Price is required and must be a valid positive number.'
    };
  }

  if (numSelling <= 0) {
    return {
      isValid: false,
      error: 'Selling Price must be greater than zero.'
    };
  }

  if (numSelling > numMrp) {
    return {
      isValid: false,
      error: `Selling Price (₹${numSelling.toLocaleString('en-IN')}) cannot be greater than MRP / Original Price (₹${numMrp.toLocaleString('en-IN')}).`
    };
  }

  return { isValid: true };
}

/**
 * Formats a numeric price into Indian Rupee format (e.g. ₹1,000 or ₹1,399.50)
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return '₹0';
  const hasDecimals = amount % 1 !== 0;
  if (hasDecimals) {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `₹${amount.toLocaleString('en-IN')}`;
}

/**
 * Returns formatted promotional discount text: "SAVE XX%" or empty if 0
 */
export function formatSaveText(discountPercent: number): string {
  if (!discountPercent || discountPercent <= 0) return '';
  return `SAVE ${discountPercent}%`;
}

/**
 * Extracts and calculates authoritative pricing metrics from any product object.
 * Supports current schema fields (price, originalPrice) and legacy fallbacks (salePrice).
 */
export function getProductPricing(product: {
  price?: number | string | null;
  originalPrice?: number | string | null;
  salePrice?: number | string | null;
}): ProductPricingInfo {
  if (!product) {
    return {
      sellingPrice: 0,
      mrp: null,
      discountPercent: 0,
      hasDiscount: false,
      saveText: '',
      formattedSelling: '₹0',
      formattedMrp: null
    };
  }

  // Determine Selling Price & MRP
  let rawSelling: number | null = null;
  let rawMrp: number | null = null;

  const pPrice = parsePrice(product.price);
  const pOriginal = parsePrice(product.originalPrice);
  const pSale = parsePrice(product.salePrice);

  if (pOriginal !== null) {
    // Standard structure: price is Selling Price, originalPrice is MRP
    rawSelling = pPrice !== null ? pPrice : 0;
    rawMrp = pOriginal;
  } else if (pSale !== null && pPrice !== null && pPrice > pSale) {
    // Legacy structure: price was MRP, salePrice was discounted Selling Price
    rawSelling = pSale;
    rawMrp = pPrice;
  } else {
    // Single price product without compare-at MRP
    rawSelling = pPrice !== null ? pPrice : (pSale !== null ? pSale : 0);
    rawMrp = null;
  }

  const sellingPrice = rawSelling !== null && rawSelling >= 0 ? rawSelling : 0;
  const mrp = rawMrp !== null && rawMrp > 0 ? rawMrp : null;

  const discountPercent = mrp !== null && mrp > sellingPrice ? calculateDiscountPercentage(mrp, sellingPrice) : 0;
  const hasDiscount = discountPercent > 0 && mrp !== null && mrp > sellingPrice;
  const saveText = hasDiscount ? `SAVE ${discountPercent}%` : '';

  return {
    sellingPrice,
    mrp,
    discountPercent,
    hasDiscount,
    saveText,
    formattedSelling: formatCurrency(sellingPrice),
    formattedMrp: mrp ? formatCurrency(mrp) : null
  };
}
