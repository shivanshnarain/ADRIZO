/**
 * ADRIZO Centralized Product Catalog Variation & Smart Ordering Engine
 * 
 * Provides:
 * 1. MODE A (Dedicated Subcategory): Natural case-insensitive alphabetical sorting
 *    for specific subcategories like BUTTON_POLO and ZIPPER_POLO.
 * 2. MODE B (Broad Mixed Collection): Deterministic, grid-aware, constraint-based
 *    scoring algorithm that eliminates repetitive adjacent and vertically stacked
 *    products (e.g., same color + different gender, same color + different subtype,
 *    or consecutive matching colors).
 * 
 * Guarantees:
 * - Deterministic output: Never re-shuffles on ordinary React re-renders.
 * - Complete catalog coverage: Every product appears exactly once (zero omissions, zero duplicates).
 * - Data integrity: Product objects, IDs, and customer-facing names are preserved 100% untouched.
 */

import { 
  ProductLike, 
  isHoodieProduct, 
  isZipperPoloProduct, 
  isButtonPoloProduct, 
  isTShirtProduct, 
  isWomenProduct,
  normalizeCategoryKey 
} from './productFiltering';

// 32-bit FNV-1a Hash for deterministic seed generation
export function hashString(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

// Deterministic 32-bit Mulberry PRNG
export function createPrng(seed: number) {
  let s = Math.floor(seed) >>> 0;
  return function next(): number {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const KNOWN_COLORS = [
  'JET BLACK', 'MUSTARD', 'NAVY BLUE', 'MEHRON', 'MEHROON', 'ONION',
  'OLIVE GREEN', 'WINE', 'WHITE MELANGE', 'BOTTLE GREEN', 'RED',
  'SKY BLUE', 'WHITE', 'DARK SKIN', 'LIGHT SKIN', 'DARK GREY', 'CREAM',
  'CHOCOLATE BROWN', 'OFF WHITE', 'ROYAL BLUE', 'FROZI BLUE', 'ROSE PINK',
  '15% MELANGE', '5% MELANGE', 'RAMA GREEN', 'BABY PINK', 'YELLOW'
];

/**
 * Normalizes product color across structured field and title fallback.
 * Maps synonyms such as MEHROON -> MEHRON and GREY -> GRAY.
 */
export function normalizeProductColor(color?: string | null, name?: string): string {
  const raw = (color || '').toUpperCase().trim();
  if (raw) {
    return raw.replace(/MEHROON/g, 'MEHRON').replace(/GREY/g, 'GRAY');
  }

  const upperName = (name || '').toUpperCase();
  for (const k of KNOWN_COLORS) {
    if (upperName.includes(k)) {
      return k.replace(/MEHROON/g, 'MEHRON').replace(/GREY/g, 'GRAY');
    }
  }

  return 'OTHER';
}

export type ProductSubtype = 'HOODIE' | 'ZIPPER_POLO' | 'BUTTON_POLO' | 'TSHIRT' | 'OTHER';

export function getProductSubtype(p: ProductLike): ProductSubtype {
  if (isHoodieProduct(p)) return 'HOODIE';
  if (isZipperPoloProduct(p)) return 'ZIPPER_POLO';
  if (isButtonPoloProduct(p)) return 'BUTTON_POLO';
  if (isTShirtProduct(p)) return 'TSHIRT';
  return 'OTHER';
}

export function getProductGender(p: ProductLike): 'WOMEN' | 'MEN' {
  return isWomenProduct(p) ? 'WOMEN' : 'MEN';
}

export interface OrderingOptions {
  seed?: string | number;
  sortOverride?: string;
}

/**
 * Main Centralized Product Ordering Engine.
 */
export function getOrderedProducts<T extends ProductLike>(
  products: T[],
  mode: string = 'ALL',
  options: OrderingOptions = {}
): T[] {
  if (!Array.isArray(products) || products.length <= 1) {
    return products || [];
  }

  const { seed: seedInput, sortOverride } = options;

  // 1. If customer has chosen an explicit sort option, respect it
  if (sortOverride && sortOverride !== 'NEWEST' && sortOverride !== 'MIXED') {
    return [...products];
  }

  const normKey = normalizeCategoryKey(mode);
  const cleanMode = typeof normKey === 'string' ? normKey.toUpperCase() : 'ALL';

  // 2. MODE A: Dedicated Specific Subcategories -> Natural Alphabetical Sort
  // Covers BUTTON POLO, ZIPPER POLO, and individual dedicated subcategory views
  if (cleanMode === 'BUTTON_POLO' || cleanMode === 'ZIPPER_POLO') {
    return [...products].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
    );
  }

  // 3. MODE B: Broad Mixed Collections -> Smart Variation & Anti-Repetition
  // Covers ALL, VIEW_ALL, TSHIRTS, HOODIES, MEN, WOMEN
  const seedNumber =
    typeof seedInput === 'number'
      ? seedInput
      : hashString((seedInput || cleanMode) + '_adrizo_catalog_v2');

  const prng = createPrng(seedNumber);

  // Pre-calculate normalized metadata for rapid scalar scoring
  const candidates = products.map((p) => ({
    original: p,
    color: normalizeProductColor(p.color, p.name),
    gender: getProductGender(p),
    subtype: getProductSubtype(p),
    category: (p.category?.slug || p.categoryId || '').toLowerCase() || getProductSubtype(p),
  }));

  const remaining = [...candidates];
  const result: typeof candidates = [];

  while (remaining.length > 0) {
    const i = result.length;
    const prev1 = i >= 1 ? result[i - 1] : null;
    const prev2 = i >= 2 ? result[i - 2] : null; // Directly vertical above in 2-column mobile grid
    const prev3 = i >= 3 ? result[i - 3] : null; // Diagonal in 2-column mobile grid
    const prev4 = i >= 4 ? result[i - 4] : null; // Directly vertical above in 4-column desktop grid
    const recent6 = result.slice(Math.max(0, i - 6));

    let bestIdx = 0;
    let minPenalty = Infinity;

    // Check pool capabilities to only penalize when viable alternatives exist
    const hasDiffGender = prev1 ? remaining.some((r) => r.gender !== prev1.gender) : false;
    const hasDiffSubtype = prev1 ? remaining.some((r) => r.subtype !== prev1.subtype) : false;
    const hasDiffColor = prev1 ? remaining.some((r) => r.color !== prev1.color) : false;

    for (let rIdx = 0; rIdx < remaining.length; rIdx++) {
      const cand = remaining[rIdx];
      let penalty = 0;

      // ----------------------------------------------------
      // A. Horizontal Adjacency (Immediate Previous Product)
      // ----------------------------------------------------
      if (prev1) {
        if (cand.color === prev1.color && hasDiffColor) {
          penalty += 12000;

          // Critical penalty: Same color with opposite gender (e.g. Mehron Women -> Mehron Men)
          if (cand.gender !== prev1.gender) {
            penalty += 25000;
          }

          // Critical penalty: Same color with different subtype (e.g. Rose Pink Button -> Rose Pink Zipper)
          if (cand.subtype !== prev1.subtype) {
            penalty += 25000;
          }
        }

        // Subtype clustering penalty in mixed views (e.g. Polos in T-Shirts, or Hoodies in ALL)
        if (cand.subtype === prev1.subtype && hasDiffSubtype) {
          penalty += cleanMode === 'TSHIRTS' ? 450 : 300;
        }

        // Gender clustering penalty in Hoodies or mixed collections
        if (cand.gender === prev1.gender && hasDiffGender) {
          penalty += cleanMode === 'HOODIES' ? 400 : 250;
        }

        // Broad category clustering penalty in ALL / VIEW_ALL
        if (
          (cleanMode === 'ALL' || cleanMode === 'VIEW_ALL') &&
          cand.category === prev1.category &&
          remaining.some((r) => r.category !== prev1.category)
        ) {
          penalty += 250;
        }
      }

      // ----------------------------------------------------
      // B. Vertical Adjacency (2-Column Mobile Grid: i - 2)
      // ----------------------------------------------------
      if (prev2) {
        if (cand.color === prev2.color && hasDiffColor) {
          penalty += 6000;

          // Vertical same color + opposite gender
          if (cand.gender !== prev2.gender) {
            penalty += 15000;
          }

          // Vertical same color + different subtype
          if (cand.subtype !== prev2.subtype) {
            penalty += 15000;
          }
        }

        // Moderate subtype stack penalty
        if (cand.subtype === prev2.subtype && hasDiffSubtype) {
          penalty += 150;
        }
      }

      // ----------------------------------------------------
      // C. Diagonal Adjacency in 2-Column Mobile Grid (i - 3)
      // ----------------------------------------------------
      if (prev3) {
        if (cand.color === prev3.color && hasDiffColor) {
          penalty += 1800;
        }
      }

      // ----------------------------------------------------
      // D. Vertical Adjacency in 4-Column Desktop Grid (i - 4)
      // ----------------------------------------------------
      if (prev4) {
        if (cand.color === prev4.color && hasDiffColor) {
          penalty += 2500;
          if (cand.gender !== prev4.gender || cand.subtype !== prev4.subtype) {
            penalty += 5000;
          }
        }
      }

      // ----------------------------------------------------
      // E. Color Distribution Frequency
      // Disperses colors across the entire catalog
      // ----------------------------------------------------
      const recentColorOccurrences = recent6.filter((r) => r.color === cand.color).length;
      if (recentColorOccurrences > 0 && hasDiffColor) {
        penalty += recentColorOccurrences * 650;
      }

      // ----------------------------------------------------
      // F. Deterministic Tie-Breaking
      // Natural visual dispersion without arbitrary clustering
      // ----------------------------------------------------
      const jitter = prng() * 10;
      const totalScore = penalty + jitter;

      if (totalScore < minPenalty) {
        minPenalty = totalScore;
        bestIdx = rIdx;
      }
    }

    result.push(remaining[bestIdx]);
    remaining.splice(bestIdx, 1);
  }

  return result.map((r) => r.original);
}
