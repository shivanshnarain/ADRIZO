/**
 * ADRIZO Product Categorization and Filtering Engine
 * Centralized, reliable, and future-proof logic reusing existing database fields.
 */

export interface ProductLike {
  id: string;
  name: string;
  slug?: string;
  description?: string | null;
  productType?: string | null;
  categoryId?: string | null;
  category?: { id?: string; name?: string; slug?: string } | null;
  gender?: string | null;
  price?: number;
  originalPrice?: number | null;
  salePrice?: number | null;
  [key: string]: any;
}

// Robust Word-Boundary Regular Expressions for Dynamic Normalization
const WOMEN_REGEX = /\b(women|womens|women's|female)\b/i;
const MEN_REGEX = /\b(men|mens|men's|male)\b/i;
const HOODIE_REGEX = /\b(hoodie|hoodies|fleece)\b/i;
const TSHIRT_REGEX = /\b(t-?shirt|t-?shirts|tshirt|tshirts|tee|tees|polo|polos)\b/i;

/**
 * Returns true ONLY if the product is explicitly assigned to Women.
 * Strictly checks gender field, productType, title, and category.
 * If product contains explicit Men identifiers, it immediately returns false.
 */
export function isWomenProduct(product: ProductLike): boolean {
  if (!product) return false;

  // 1. Explicit gender field
  const genderField = (product.gender || '').trim();
  if (genderField) {
    if (WOMEN_REGEX.test(genderField)) return true;
    if (MEN_REGEX.test(genderField)) return false;
  }

  const prodType = (product.productType || '').trim();
  const name = (product.name || '').trim();
  const catName = (product.category?.name || '').trim();
  const catSlug = (product.category?.slug || '').trim();

  // 2. Strict Men's check: If productType or name explicitly contains Men's keywords, it is NOT a Women's product!
  // E.g., "Men's Hoodie", "Dark Skin Men's Hoodie", etc.
  if (MEN_REGEX.test(prodType) || MEN_REGEX.test(name)) {
    return false;
  }

  // 3. Strict Women's check across structured fields, title, or category
  if (
    WOMEN_REGEX.test(prodType) ||
    WOMEN_REGEX.test(name) ||
    WOMEN_REGEX.test(catName) ||
    WOMEN_REGEX.test(catSlug)
  ) {
    return true;
  }

  return false;
}

/**
 * Returns true if the product belongs to the Men's collection.
 * Includes all products assigned to Men, and excludes Women's-only products.
 */
export function isMenProduct(product: ProductLike): boolean {
  if (!product) return false;
  if (isWomenProduct(product)) return false;

  const genderField = (product.gender || '').trim();
  if (genderField && MEN_REGEX.test(genderField)) return true;

  const prodType = (product.productType || '').trim();
  const name = (product.name || '').trim();
  const catName = (product.category?.name || '').trim();
  const catSlug = (product.category?.slug || '').trim();

  if (
    MEN_REGEX.test(prodType) ||
    MEN_REGEX.test(name) ||
    MEN_REGEX.test(catName) ||
    MEN_REGEX.test(catSlug)
  ) {
    return true;
  }

  // In ADRIZO catalog, all polo t-shirts and hoodies without explicit women designation are men's products
  return true;
}

/**
 * Returns true if the product is a T-Shirt (covers both Zipper Polo and Button Polo, plus any standard tees).
 */
export function isTShirtProduct(product: ProductLike): boolean {
  if (!product) return false;

  const name = (product.name || '').trim();
  const prodType = (product.productType || '').trim();
  const catName = (product.category?.name || '').trim();
  const catSlug = (product.category?.slug || '').trim();
  const slug = (product.slug || '').trim();

  return (
    TSHIRT_REGEX.test(catSlug) ||
    TSHIRT_REGEX.test(catName) ||
    TSHIRT_REGEX.test(prodType) ||
    TSHIRT_REGEX.test(name) ||
    TSHIRT_REGEX.test(slug)
  );
}

/**
 * Returns true ONLY if the product is a Zipper Polo.
 * Strictly excludes Button Polo.
 */
export function isZipperPoloProduct(product: ProductLike): boolean {
  if (!product) return false;

  const name = (product.name || '').toLowerCase();
  const prodType = (product.productType || '').toLowerCase();
  const slug = (product.slug || '').toLowerCase();

  if (name.includes('button') || prodType.includes('button') || slug.includes('button')) {
    return false;
  }

  return (
    prodType.includes('zipper polo') ||
    name.includes('zipper polo') ||
    slug.includes('zipper-polo') ||
    (name.includes('zipper') && name.includes('polo')) ||
    (prodType.includes('zipper') && prodType.includes('polo'))
  );
}

/**
 * Returns true ONLY if the product is a Button Polo.
 * Strictly excludes Zipper Polo.
 */
export function isButtonPoloProduct(product: ProductLike): boolean {
  if (!product) return false;

  const name = (product.name || '').toLowerCase();
  const prodType = (product.productType || '').toLowerCase();
  const slug = (product.slug || '').toLowerCase();

  if (name.includes('zipper') || prodType.includes('zipper') || slug.includes('zipper')) {
    return false;
  }

  return (
    prodType.includes('button polo') ||
    name.includes('button polo') ||
    slug.includes('button-polo') ||
    (name.includes('button') && name.includes('polo')) ||
    (prodType.includes('button') && prodType.includes('polo'))
  );
}

/**
 * Returns true if the product is a Hoodie (Men's or Women's).
 */
export function isHoodieProduct(product: ProductLike): boolean {
  if (!product) return false;

  const name = (product.name || '').trim();
  const prodType = (product.productType || '').trim();
  const catName = (product.category?.name || '').trim();
  const catSlug = (product.category?.slug || '').trim();
  const slug = (product.slug || '').trim();

  return (
    HOODIE_REGEX.test(catSlug) ||
    HOODIE_REGEX.test(catName) ||
    HOODIE_REGEX.test(prodType) ||
    HOODIE_REGEX.test(name) ||
    HOODIE_REGEX.test(slug)
  );
}

/**
 * Returns true if product is specifically a Men's Hoodie.
 */
export function isMensHoodieProduct(product: ProductLike): boolean {
  return isHoodieProduct(product) && isMenProduct(product);
}

/**
 * Returns true if product is specifically a Women's Hoodie.
 */
export function isWomensHoodieProduct(product: ProductLike): boolean {
  return isHoodieProduct(product) && isWomenProduct(product);
}

export type CategoryFilterKey =
  | 'ALL'
  | 'VIEW_ALL'
  | 'MEN'
  | 'WOMEN'
  | 'TSHIRTS'
  | 'HOODIES'
  | 'ZIPPER_POLO'
  | 'BUTTON_POLO'
  | 'MENS_HOODIE'
  | 'WOMENS_HOODIE';

/**
 * Normalizes any category slug / ID / key to a canonical FilterKey
 */
export function normalizeCategoryKey(key?: string | null): CategoryFilterKey | string {
  if (!key) return 'ALL';
  const clean = key.trim().toLowerCase().replace(/['’]/g, '');

  if (clean === 'all' || clean === '' || clean === 'all-products') return 'ALL';
  if (clean === 'view-all' || clean === 'view_all' || clean === 'mixed') return 'VIEW_ALL';
  if (clean === 'men' || clean === 'mens' || clean === 'mens-collection') return 'MEN';
  if (clean === 'women' || clean === 'womens' || clean === 'womens-collection') return 'WOMEN';
  if (clean === 't-shirts' || clean === 't-shirt' || clean === 'tshirts' || clean === 'tshirt') return 'TSHIRTS';
  if (clean === 'hoodies' || clean === 'hoodie') return 'HOODIES';
  if (clean === 'zipper-polo' || clean === 'zipper_polo' || clean === 'zipper-polo-t-shirts') return 'ZIPPER_POLO';
  if (clean === 'button-polo' || clean === 'button_polo' || clean === 'button-polo-t-shirts') return 'BUTTON_POLO';
  if (clean === 'mens-hoodie' || clean === 'mens-hoodies' || clean === 'men-hoodie') return 'MENS_HOODIE';
  if (clean === 'womens-hoodie' || clean === 'womens-hoodies' || clean === 'women-hoodie') return 'WOMENS_HOODIE';

  return key;
}

export { getOrderedProducts } from './productOrdering';
import { getOrderedProducts } from './productOrdering';

/**
 * Filters a product array based on the category key.
 */
export function filterProductsByCategory<T extends ProductLike>(
  products: T[],
  categoryKey?: string | null
): T[] {
  if (!Array.isArray(products) || products.length === 0) return [];

  const normalized = normalizeCategoryKey(categoryKey);

  switch (normalized) {
    case 'ALL':
      return products;

    case 'VIEW_ALL':
      return getOrderedProducts(products, 'VIEW_ALL');

    case 'MEN':
      return products.filter(isMenProduct);

    case 'WOMEN':
      return products.filter(isWomenProduct);

    case 'TSHIRTS':
      return products.filter(isTShirtProduct);

    case 'ZIPPER_POLO':
      return products.filter(isZipperPoloProduct);

    case 'BUTTON_POLO':
      return products.filter(isButtonPoloProduct);

    case 'HOODIES':
      return products.filter(isHoodieProduct);

    case 'MENS_HOODIE':
      return products.filter(isMensHoodieProduct);

    case 'WOMENS_HOODIE':
      return products.filter(isWomensHoodieProduct);

    default: {
      // Direct ID or DB slug match fallback
      if (!categoryKey) return products;
      const target = categoryKey.toLowerCase();
      const directMatches = products.filter(
        (p) =>
          p.categoryId === categoryKey ||
          p.category?.slug === categoryKey ||
          (p.category?.name && p.category.name.toLowerCase() === target)
      );
      return directMatches;
    }
  }
}

/**
 * Creates a smart, varied, anti-repetition selection of real products from across available categories.
 * Guarantees every product appears exactly once, no duplicates, no omissions, and no repetitive sequences.
 */
export function getMixedViewAllProducts<T extends ProductLike>(products: T[]): T[] {
  return getOrderedProducts(products, 'VIEW_ALL');
}
