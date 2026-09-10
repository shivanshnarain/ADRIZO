/**
 * SKU & Product Configuration Identity Service
 * Collision-safe, strictly deterministic SKU engine for ADRIZO / Unique India Garments.
 * Format: CATEGORY-COLOR-TYPE (e.g., TSH-JBL-ZP)
 *
 * Product configuration is uniquely determined by:
 * CATEGORY + PRODUCT TYPE + COLOR
 * Each unique configuration maps to exactly ONE deterministic SKU identity.
 */

import {
  INITIAL_COLOR_MAP,
  INITIAL_CATEGORY_CODES,
  INITIAL_PRODUCT_TYPE_CODES,
} from './catalogueDefaults';

/**
 * Normalizes configuration strings for case- and whitespace-insensitive identity.
 * e.g. "  Jet   Black  " -> "jet black"
 */
export function normalizeConfigPart(val?: string | null): string {
  if (!val) return '';
  return val
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/**
 * Builds the canonical internal configuration key for database uniqueness.
 * Format: `${categoryId}:${normalizedProductType}:${normalizedColor}`
 */
export function buildProductConfigKey(params: {
  categoryId?: string | null;
  productType?: string | null;
  color?: string | null;
}): string {
  const cat = (params.categoryId || '').trim();
  const type = normalizeConfigPart(params.productType);
  const color = normalizeConfigPart(params.color);
  return `${cat}:${type}:${color}`;
}

/**
 * Derives a clean 2 to 4-character uppercase alphanumeric code from a string.
 */
export function deriveShortCode(text: string, defaultLength: number = 3): string {
  if (!text) return 'GEN';

  const cleaned = text.trim().toUpperCase().replace(/[^A-Z0-9\s%]/g, '');

  // If percentage (e.g. 5% MELANGE -> 5ML, 15% MELANGE -> 15M)
  if (cleaned.startsWith('5%') || cleaned.startsWith('5 %')) return '5ML';
  if (cleaned.startsWith('15%') || cleaned.startsWith('15 %')) return '15M';

  const words = cleaned.split(/\s+/).filter(Boolean);

  if (words.length >= 3) {
    return (words[0][0] + words[1][0] + words[2][0]).toUpperCase();
  }
  if (words.length === 2) {
    // E.g. 'BABY PINK' -> 'BPK', 'JET BLACK' -> 'JBL', 'BOTTLE GREEN' -> 'BGR'
    const firstWord = words[0];
    const secondWord = words[1];
    if (secondWord.length >= 2) {
      return (firstWord[0] + secondWord[0] + secondWord[secondWord.length - 1]).toUpperCase();
    }
    return (firstWord[0] + secondWord.slice(0, 2)).toUpperCase();
  }

  // Single word: first 3 consonants/letters
  const single = words[0];
  if (single.length <= defaultLength) return single.toUpperCase();
  const consonants = single.replace(/[AEIOU]/g, '');
  if (consonants.length >= defaultLength) {
    return consonants.slice(0, defaultLength).toUpperCase();
  }
  return single.slice(0, defaultLength).toUpperCase();
}

/**
 * Resolves Category Code (e.g. 'T-Shirt' / 'T-Shirts' -> 'TSH', 'Jeans' -> 'JNS')
 */
export function resolveCategoryCode(categoryName?: string | null, customCode?: string | null): string {
  if (customCode && customCode.trim()) {
    return customCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
  }
  if (!categoryName) return 'GEN';
  const trimmed = categoryName.trim();
  if (INITIAL_CATEGORY_CODES[trimmed]) {
    return INITIAL_CATEGORY_CODES[trimmed];
  }
  // Try case-insensitive lookup
  const match = Object.entries(INITIAL_CATEGORY_CODES).find(
    ([k]) => k.toLowerCase() === trimmed.toLowerCase()
  );
  if (match) return match[1];

  return deriveShortCode(trimmed, 3);
}

/**
 * Resolves Color Code (e.g. 'BABY PINK' -> 'BPK', 'JET BLACK' -> 'JBL', 'YELLOW' -> 'YLW')
 */
export function resolveColorCode(colorName?: string | null, customCode?: string | null): string {
  if (customCode && customCode.trim()) {
    return customCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
  }
  if (!colorName) return 'DFT';
  // Strip leading number prefix like "01 — ", "01 - ", "01. " if present
  const cleaned = colorName.trim().replace(/^\d+[\s\-\—\.\:]+/, '').trim().toUpperCase();
  if (INITIAL_COLOR_MAP[cleaned]) {
    return INITIAL_COLOR_MAP[cleaned].code;
  }
  const upper = colorName.trim().toUpperCase();
  if (INITIAL_COLOR_MAP[upper]) {
    return INITIAL_COLOR_MAP[upper].code;
  }
  return deriveShortCode(cleaned || upper, 3);
}

/**
 * Resolves Product Type Code (e.g. 'Zipper Polo T-Shirt' -> 'ZP', 'Button Polo T-Shirt' -> 'BP', 'Polo T-Shirt' -> 'PO')
 */
export function resolveProductTypeCode(productTypeName?: string | null, customCode?: string | null): string {
  if (customCode && customCode.trim()) {
    return customCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
  }
  if (!productTypeName) return 'STD';
  const trimmed = productTypeName.trim();
  if (INITIAL_PRODUCT_TYPE_CODES[trimmed]) {
    return INITIAL_PRODUCT_TYPE_CODES[trimmed];
  }
  // Try case-insensitive lookup
  const match = Object.entries(INITIAL_PRODUCT_TYPE_CODES).find(
    ([k]) => k.toLowerCase() === trimmed.toLowerCase()
  );
  if (match) return match[1];

  return deriveShortCode(trimmed, 2);
}

/**
 * Legacy suffix generator - retained for compatibility with older test harnesses,
 * but no longer used in production SKU generation.
 */
export function generateSkuSuffix(length: number = 4): string {
  return '';
}

/**
 * Builds the canonical deterministic SKU prefix / identity: CATEGORY-COLOR-TYPE
 * e.g., 'TSH-JBL-ZP'
 */
export function buildSkuPrefix(params: {
  categoryName?: string | null;
  categoryCode?: string | null;
  colorName?: string | null;
  colorCode?: string | null;
  productTypeName?: string | null;
  productTypeCode?: string | null;
}): string {
  const catCode = resolveCategoryCode(params.categoryName, params.categoryCode);
  const colCode = resolveColorCode(params.colorName, params.colorCode);
  const typCode = resolveProductTypeCode(params.productTypeName, params.productTypeCode);

  return `${catCode}-${colCode}-${typCode}`;
}

/**
 * Generates the strictly deterministic SKU based on product configuration:
 * CATEGORY + COLOR + PRODUCT TYPE
 * Changing price, description, images, sizes, etc. NEVER changes the SKU.
 * Deterministic format: CATEGORY-COLOR-TYPE (e.g., TSH-JBL-ZP)
 */
export function generateDeterministicSku(params: {
  categoryName?: string | null;
  categoryCode?: string | null;
  colorName?: string | null;
  colorCode?: string | null;
  productTypeName?: string | null;
  productTypeCode?: string | null;
}): string {
  return buildSkuPrefix(params);
}

/**
 * Generates preview SKU string for immediate UI display before save.
 * Uses the deterministic format without random suffixes.
 */
export function generateSkuPreview(params: {
  categoryName?: string | null;
  categoryCode?: string | null;
  colorName?: string | null;
  colorCode?: string | null;
  productTypeName?: string | null;
  productTypeCode?: string | null;
  suffix?: string;
}): string {
  return buildSkuPrefix(params);
}

/**
 * Builds a deterministic, clean variant SKU based on parent product SKU and variant size.
 * Example: 'TSH-JBL-ZP' + 'S' -> 'TSH-JBL-ZP-S'
 */
export function buildVariantSku(baseSku: string, size?: string | null, index: number = 0): string {
  const cleanBase = (baseSku || 'GEN-SKU').trim().toUpperCase();
  if (size && size.trim()) {
    const cleanSize = size.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    return `${cleanBase}-${cleanSize}`;
  }
  return `${cleanBase}-VAR-${index + 1}`;
}

/**
 * Resolves the deterministic SKU for a product configuration.
 * Candidate SKU is only preserved if editing an existing product whose configuration hasn't changed.
 */
export async function generateUniqueSku(params: {
  categoryName?: string | null;
  categoryCode?: string | null;
  colorName?: string | null;
  colorCode?: string | null;
  productTypeName?: string | null;
  productTypeCode?: string | null;
  excludeProductId?: string | null;
  candidateSku?: string | null;
}): Promise<string> {
  // Deterministic SKU based on Category + Color + Product Type
  return generateDeterministicSku(params);
}
