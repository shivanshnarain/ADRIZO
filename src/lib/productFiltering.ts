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

/**
 * Returns true ONLY if the product is explicitly assigned to Women.
 * Note: Does not treat "unisex" description as Women's product to prevent
 * Men's Hoodies from incorrectly appearing in Women's categories.
 */
export function isWomenProduct(product: ProductLike): boolean {
  if (!product) return false;

  const gender = (product.gender || '').trim().toLowerCase();
  if (gender === 'women' || gender === 'womens' || gender === 'female') return true;
  if (gender === 'men' || gender === 'mens' || gender === 'male') return false;

  const name = (product.name || '').toLowerCase();
  const prodType = (product.productType || '').toLowerCase();
  const catName = (product.category?.name || '').toLowerCase();
  const catSlug = (product.category?.slug || '').toLowerCase();

  // Explicit women keywords in structured fields or title
  if (
    name.includes("women's") ||
    name.includes("womens") ||
    name.includes("women hoodie") ||
    name.includes("women polo") ||
    name.includes("women t-shirt") ||
    prodType.includes("women") ||
    catName.includes("women") ||
    catSlug.includes("women")
  ) {
    return true;
  }

  // Dark Skin Women's Hoodie asset representation
  if (
    (name.includes('dark skin') && (name.includes('hoodie') || prodType.includes('hoodie'))) ||
    product.images?.some((img: any) => typeof img?.url === 'string' && img.url.includes('pvfr1iyiibkvau4xkwu1'))
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

  const gender = (product.gender || '').trim().toLowerCase();
  if (gender === 'men' || gender === 'mens' || gender === 'male') return true;

  const name = (product.name || '').toLowerCase();
  const prodType = (product.productType || '').toLowerCase();
  const catName = (product.category?.name || '').toLowerCase();
  const catSlug = (product.category?.slug || '').toLowerCase();

  if (
    name.includes("men's") ||
    name.includes("mens") ||
    prodType.includes("men") ||
    catName.includes("men") ||
    catSlug.includes("men")
  ) {
    return true;
  }

  // All existing catalogue polo t-shirts and hoodies without explicit women designation are men's products
  return true;
}

/**
 * Returns true if the product is a T-Shirt (covers both Zipper Polo and Button Polo, plus any standard tees).
 */
export function isTShirtProduct(product: ProductLike): boolean {
  if (!product) return false;

  const name = (product.name || '').toLowerCase();
  const prodType = (product.productType || '').toLowerCase();
  const catName = (product.category?.name || '').toLowerCase();
  const catSlug = (product.category?.slug || '').toLowerCase();

  return (
    catSlug === 't-shirts' ||
    catSlug === 't-shirt' ||
    catName.includes('t-shirt') ||
    prodType.includes('t-shirt') ||
    prodType.includes('polo') ||
    name.includes('t-shirt') ||
    name.includes('polo')
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
    (name.includes('zipper') && name.includes('polo'))
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
    (name.includes('button') && name.includes('polo'))
  );
}

/**
 * Returns true if the product is a Hoodie (Men's or Women's).
 */
export function isHoodieProduct(product: ProductLike): boolean {
  if (!product) return false;

  const name = (product.name || '').toLowerCase();
  const prodType = (product.productType || '').toLowerCase();
  const catName = (product.category?.name || '').toLowerCase();
  const catSlug = (product.category?.slug || '').toLowerCase();

  return (
    catSlug === 'hoodies' ||
    catSlug === 'hoodie' ||
    catName.includes('hoodie') ||
    prodType.includes('hoodie') ||
    name.includes('hoodie')
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
