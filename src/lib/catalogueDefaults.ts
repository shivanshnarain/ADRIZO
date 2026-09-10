/**
 * Catalogue Defaults & Standard Configuration
 * Exact specifications for ADRIZO / Unique India Garments.
 */

export interface InitialColor {
  name: string;
  code: string;
  hex: string;
}

export interface InitialCategory {
  name: string;
  slug: string;
  code: string;
  description?: string;
  sortOrder: number;
}

export interface InitialProductType {
  categorySlug: string;
  name: string;
  code: string;
  sortOrder: number;
}

export interface InitialSize {
  name: string;
  code: string;
  sortOrder: number;
}

export interface StructuredProductColor {
  number: number;
  numberLabel: string;
  name: string;
  slug: string;
  code: string;
  hex: string;
}

// 1. EXACT PREDEFINED 17 CATALOGUE COLORS FOR T-SHIRTS
export const INITIAL_PREDEFINED_COLORS: InitialColor[] = [
  { name: 'JET BLACK', code: 'JBL', hex: '#111111' },
  { name: 'BOTTLE GREEN', code: 'BGR', hex: '#134611' },
  { name: 'ROYAL BLUE', code: 'RBL', hex: '#1D4ED8' },
  { name: 'FROZI BLUE', code: 'FBL', hex: '#48CAE4' },
  { name: 'WHITE', code: 'WHT', hex: '#FFFFFF' },
  { name: 'ROSE PINK', code: 'RPK', hex: '#E07A5F' },
  { name: 'RED', code: 'RED', hex: '#D92323' },
  { name: 'NAVY BLUE', code: 'NVY', hex: '#14213D' },
  { name: 'SKY BLUE', code: 'SKY', hex: '#8ECAE6' },
  { name: 'MEHRON', code: 'MHR', hex: '#721121' },
  { name: '5% MELANGE', code: '5ML', hex: '#D8D8D8' },
  { name: 'MUSTARD', code: 'MST', hex: '#DDA15E' },
  { name: 'PARROT GREEN', code: 'PGR', hex: '#60B246' },
  { name: 'OLIVE GREEN', code: 'OLV', hex: '#588157' },
  { name: '15% MELANGE', code: '15M', hex: '#A8A8A8' },
  { name: 'BABY PINK', code: 'BPK', hex: '#F4ACB7' },
  { name: 'YELLOW', code: 'YLW', hex: '#FAB800' },
];

// 2. EXACT 18 STRUCTURED COLORS FOR HOODIES (Fabric Reference Palette 01 - 18)
export const HOODIE_COLORS: StructuredProductColor[] = [
  { number: 1, numberLabel: '01', name: 'JET BLACK', slug: 'jet-black', code: 'JBL', hex: '#111111' },
  { number: 2, numberLabel: '02', name: 'MUSTARD', slug: 'mustard', code: 'MST', hex: '#DDA15E' },
  { number: 3, numberLabel: '03', name: 'NAVY BLUE', slug: 'navy-blue', code: 'NVY', hex: '#14213D' },
  { number: 4, numberLabel: '04', name: 'MEHRON', slug: 'mehron', code: 'MHR', hex: '#721121' },
  { number: 5, numberLabel: '05', name: 'ONION', slug: 'onion', code: 'ONI', hex: '#A36B69' },
  { number: 6, numberLabel: '06', name: 'OLIVE GREEN', slug: 'olive-green', code: 'OLV', hex: '#588157' },
  { number: 7, numberLabel: '07', name: 'WINE', slug: 'wine', code: 'WIN', hex: '#5C1D24' },
  { number: 8, numberLabel: '08', name: 'WHITE MELANGE', slug: 'white-melange', code: 'WML', hex: '#E5E5E5' },
  { number: 9, numberLabel: '09', name: 'BOTTLE GREEN', slug: 'bottle-green', code: 'BGR', hex: '#134611' },
  { number: 10, numberLabel: '10', name: 'RED', slug: 'red', code: 'RED', hex: '#D92323' },
  { number: 11, numberLabel: '11', name: 'SKY BLUE', slug: 'sky-blue', code: 'SKY', hex: '#8ECAE6' },
  { number: 12, numberLabel: '12', name: 'WHITE', slug: 'white', code: 'WHT', hex: '#FFFFFF' },
  { number: 13, numberLabel: '13', name: 'DARK SKIN', slug: 'dark-skin', code: 'DSK', hex: '#8D5524' },
  { number: 14, numberLabel: '14', name: 'LIGHT SKIN', slug: 'light-skin', code: 'LSK', hex: '#E0AC69' },
  { number: 15, numberLabel: '15', name: 'DARK GREY', slug: 'dark-grey', code: 'DGY', hex: '#333333' },
  { number: 16, numberLabel: '16', name: 'CREAM', slug: 'cream', code: 'CRM', hex: '#FFFDD0' },
  { number: 17, numberLabel: '17', name: 'CHOCOLATE BROWN', slug: 'chocolate-brown', code: 'CBR', hex: '#3D2314' },
  { number: 18, numberLabel: '18', name: 'OFF WHITE', slug: 'off-white', code: 'OFW', hex: '#FAF9F6' },
];

// Color Map lookup by normalized name
export const INITIAL_COLOR_MAP: Record<string, { code: string; hex: string }> = {
  // Hoodie palette (01 - 18)
  'JET BLACK': { code: 'JBL', hex: '#111111' },
  'MUSTARD': { code: 'MST', hex: '#DDA15E' },
  'NAVY BLUE': { code: 'NVY', hex: '#14213D' },
  'MEHRON': { code: 'MHR', hex: '#721121' },
  'ONION': { code: 'ONI', hex: '#A36B69' },
  'OLIVE GREEN': { code: 'OLV', hex: '#588157' },
  'WINE': { code: 'WIN', hex: '#5C1D24' },
  'WHITE MELANGE': { code: 'WML', hex: '#E5E5E5' },
  'BOTTLE GREEN': { code: 'BGR', hex: '#134611' },
  'RED': { code: 'RED', hex: '#D92323' },
  'SKY BLUE': { code: 'SKY', hex: '#8ECAE6' },
  'WHITE': { code: 'WHT', hex: '#FFFFFF' },
  'DARK SKIN': { code: 'DSK', hex: '#8D5524' },
  'LIGHT SKIN': { code: 'LSK', hex: '#E0AC69' },
  'DARK GREY': { code: 'DGY', hex: '#333333' },
  'CREAM': { code: 'CRM', hex: '#FFFDD0' },
  'CHOCOLATE BROWN': { code: 'CBR', hex: '#3D2314' },
  'OFF WHITE': { code: 'OFW', hex: '#FAF9F6' },
  // T-Shirt specific colors
  'ROYAL BLUE': { code: 'RBL', hex: '#1D4ED8' },
  'FROZI BLUE': { code: 'FBL', hex: '#48CAE4' },
  'ROSE PINK': { code: 'RPK', hex: '#E07A5F' },
  '5% MELANGE': { code: '5ML', hex: '#D8D8D8' },
  '15% MELANGE': { code: '15M', hex: '#A8A8A8' },
  'PARROT GREEN': { code: 'PGR', hex: '#60B246' },
  'RAMA GREEN': { code: 'RGN', hex: '#008080' },
  'BABY PINK': { code: 'BPK', hex: '#F4ACB7' },
  'YELLOW': { code: 'YLW', hex: '#FAB800' },
};

// 3. INITIAL CATEGORIES WITH SHORT CODES
export const INITIAL_CATEGORIES: InitialCategory[] = [
  { name: 'T-Shirts', slug: 't-shirts', code: 'TSH', description: 'Premium heavyweight and oversized t-shirts', sortOrder: 1 },
  { name: 'Shirts', slug: 'shirts', code: 'SHT', description: 'Casual, formal, and linen shirts', sortOrder: 2 },
  { name: 'Hoodies', slug: 'hoodies', code: 'HOD', description: 'Signature heavyweight fleece and zipper hoodies', sortOrder: 3 },
  { name: 'Jackets', slug: 'jackets', code: 'JKT', description: 'Denim, bomber, puffer, and varsity jackets', sortOrder: 4 },
  { name: 'Jeans', slug: 'jeans', code: 'JNS', description: 'Slim, straight, relaxed, and baggy denim', sortOrder: 5 },
  { name: 'Pants', slug: 'pants', code: 'PNT', description: 'Cargo, chino, track, and jogger pants', sortOrder: 6 },
  { name: 'Trousers', slug: 'trousers', code: 'TRS', description: 'Formal, pleated, and tailored trousers', sortOrder: 7 },
];

export const INITIAL_CATEGORY_CODES: Record<string, string> = {
  'T-Shirt': 'TSH',
  't-shirt': 'TSH',
  'T-Shirts': 'TSH',
  't-shirts': 'TSH',
  'Shirt': 'SHT',
  'shirt': 'SHT',
  'Shirts': 'SHT',
  'shirts': 'SHT',
  'Hoodie': 'HOD',
  'hoodie': 'HOD',
  'Hoodies': 'HOD',
  'hoodies': 'HOD',
  'Jacket': 'JKT',
  'jacket': 'JKT',
  'Jackets': 'JKT',
  'jackets': 'JKT',
  'Jeans': 'JNS',
  'jeans': 'JNS',
  'Pant': 'PNT',
  'pant': 'PNT',
  'Pants': 'PNT',
  'pants': 'PNT',
  'Trouser': 'TRS',
  'trouser': 'TRS',
  'Trousers': 'TRS',
  'trousers': 'TRS',
};

// 4. DEDICATED HOODIE PRODUCT TYPES (Strictly 3 Options)
export const INITIAL_HOODIE_PRODUCT_TYPES: InitialProductType[] = [
  { categorySlug: 'hoodies', name: 'Unisex Hoodie', code: 'UH', sortOrder: 1 },
  { categorySlug: 'hoodies', name: 'Regular Fit', code: 'RF', sortOrder: 2 },
  { categorySlug: 'hoodies', name: 'Slim Fit', code: 'SF', sortOrder: 3 },
];

// 5. DEDICATED T-SHIRT PRODUCT TYPES (11 Styles)
export const INITIAL_TSHIRT_PRODUCT_TYPES: InitialProductType[] = [
  { categorySlug: 't-shirts', name: 'Polo T-Shirt', code: 'PO', sortOrder: 1 },
  { categorySlug: 't-shirts', name: 'Zipper Polo T-Shirt', code: 'ZP', sortOrder: 2 },
  { categorySlug: 't-shirts', name: 'Button Polo T-Shirt', code: 'BP', sortOrder: 3 },
  { categorySlug: 't-shirts', name: 'Round Neck T-Shirt', code: 'RN', sortOrder: 4 },
  { categorySlug: 't-shirts', name: 'V-Neck T-Shirt', code: 'VN', sortOrder: 5 },
  { categorySlug: 't-shirts', name: 'Oversized T-Shirt', code: 'OS', sortOrder: 6 },
  { categorySlug: 't-shirts', name: 'Regular Fit T-Shirt', code: 'RF', sortOrder: 7 },
  { categorySlug: 't-shirts', name: 'Slim Fit T-Shirt', code: 'SF', sortOrder: 8 },
  { categorySlug: 't-shirts', name: 'Henley T-Shirt', code: 'HEN', sortOrder: 9 },
  { categorySlug: 't-shirts', name: 'Half Sleeve T-Shirt', code: 'HS', sortOrder: 10 },
  { categorySlug: 't-shirts', name: 'Full Sleeve T-Shirt', code: 'FS', sortOrder: 11 },
];

// 6. INITIAL PRODUCT TYPES PER CATEGORY WITH SHORT CODES
export const INITIAL_PRODUCT_TYPES: InitialProductType[] = [
  // T-Shirt (plural & singular)
  ...INITIAL_TSHIRT_PRODUCT_TYPES,
  { categorySlug: 't-shirt', name: 'Polo T-Shirt', code: 'PO', sortOrder: 1 },
  { categorySlug: 't-shirt', name: 'Zipper Polo T-Shirt', code: 'ZP', sortOrder: 2 },
  { categorySlug: 't-shirt', name: 'Button Polo T-Shirt', code: 'BP', sortOrder: 3 },
  { categorySlug: 't-shirt', name: 'Round Neck T-Shirt', code: 'RN', sortOrder: 4 },
  { categorySlug: 't-shirt', name: 'V-Neck T-Shirt', code: 'VN', sortOrder: 5 },
  { categorySlug: 't-shirt', name: 'Oversized T-Shirt', code: 'OS', sortOrder: 6 },
  { categorySlug: 't-shirt', name: 'Regular Fit T-Shirt', code: 'RF', sortOrder: 7 },
  { categorySlug: 't-shirt', name: 'Slim Fit T-Shirt', code: 'SF', sortOrder: 8 },
  { categorySlug: 't-shirt', name: 'Henley T-Shirt', code: 'HEN', sortOrder: 9 },
  { categorySlug: 't-shirt', name: 'Half Sleeve T-Shirt', code: 'HS', sortOrder: 10 },
  { categorySlug: 't-shirt', name: 'Full Sleeve T-Shirt', code: 'FS', sortOrder: 11 },

  // Hoodies (plural & singular - strictly 3 options)
  ...INITIAL_HOODIE_PRODUCT_TYPES,
  { categorySlug: 'hoodie', name: 'Unisex Hoodie', code: 'UH', sortOrder: 1 },
  { categorySlug: 'hoodie', name: 'Regular Fit', code: 'RF', sortOrder: 2 },
  { categorySlug: 'hoodie', name: 'Slim Fit', code: 'SF', sortOrder: 3 },

  // Shirt
  { categorySlug: 'shirt', name: 'Casual Shirt', code: 'CS', sortOrder: 1 },
  { categorySlug: 'shirt', name: 'Formal Shirt', code: 'FS', sortOrder: 2 },
  { categorySlug: 'shirt', name: 'Oxford Shirt', code: 'OX', sortOrder: 3 },
  { categorySlug: 'shirt', name: 'Linen Shirt', code: 'LN', sortOrder: 4 },
  { categorySlug: 'shirt', name: 'Denim Shirt', code: 'DN', sortOrder: 5 },
  { categorySlug: 'shirt', name: 'Overshirt', code: 'OS', sortOrder: 6 },
  { categorySlug: 'shirt', name: 'Checked Shirt', code: 'CHK', sortOrder: 7 },
  { categorySlug: 'shirt', name: 'Printed Shirt', code: 'PR', sortOrder: 8 },
  { categorySlug: 'shirt', name: 'Solid Shirt', code: 'SLD', sortOrder: 9 },

  // Jacket
  { categorySlug: 'jacket', name: 'Denim Jacket', code: 'DN', sortOrder: 1 },
  { categorySlug: 'jacket', name: 'Bomber Jacket', code: 'BM', sortOrder: 2 },
  { categorySlug: 'jacket', name: 'Puffer Jacket', code: 'PF', sortOrder: 3 },
  { categorySlug: 'jacket', name: 'Varsity Jacket', code: 'VR', sortOrder: 4 },
  { categorySlug: 'jacket', name: 'Leather Jacket', code: 'LTH', sortOrder: 5 },
  { categorySlug: 'jacket', name: 'Windbreaker', code: 'WB', sortOrder: 6 },
  { categorySlug: 'jacket', name: 'Overshirt Jacket', code: 'OJ', sortOrder: 7 },

  // Jeans
  { categorySlug: 'jeans', name: 'Slim Fit Jeans', code: 'SF', sortOrder: 1 },
  { categorySlug: 'jeans', name: 'Skinny Jeans', code: 'SK', sortOrder: 2 },
  { categorySlug: 'jeans', name: 'Straight Fit Jeans', code: 'ST', sortOrder: 3 },
  { categorySlug: 'jeans', name: 'Relaxed Fit Jeans', code: 'RF', sortOrder: 4 },
  { categorySlug: 'jeans', name: 'Baggy Jeans', code: 'BG', sortOrder: 5 },
  { categorySlug: 'jeans', name: 'Tapered Jeans', code: 'TP', sortOrder: 6 },
  { categorySlug: 'jeans', name: 'Bootcut Jeans', code: 'BC', sortOrder: 7 },
  { categorySlug: 'jeans', name: 'Regular Fit Jeans', code: 'RG', sortOrder: 8 },

  // Pant
  { categorySlug: 'pant', name: 'Slim Fit Pant', code: 'SF', sortOrder: 1 },
  { categorySlug: 'pant', name: 'Regular Fit Pant', code: 'RF', sortOrder: 2 },
  { categorySlug: 'pant', name: 'Straight Fit Pant', code: 'ST', sortOrder: 3 },
  { categorySlug: 'pant', name: 'Relaxed Fit Pant', code: 'RX', sortOrder: 4 },
  { categorySlug: 'pant', name: 'Cargo Pant', code: 'CG', sortOrder: 5 },
  { categorySlug: 'pant', name: 'Chino Pant', code: 'CH', sortOrder: 6 },
  { categorySlug: 'pant', name: 'Track Pant', code: 'TR', sortOrder: 7 },
  { categorySlug: 'pant', name: 'Jogger Pant', code: 'JG', sortOrder: 8 },

  // Trouser
  { categorySlug: 'trouser', name: 'Slim Fit Trouser', code: 'SF', sortOrder: 1 },
  { categorySlug: 'trouser', name: 'Regular Fit Trouser', code: 'RF', sortOrder: 2 },
  { categorySlug: 'trouser', name: 'Straight Fit Trouser', code: 'ST', sortOrder: 3 },
  { categorySlug: 'trouser', name: 'Relaxed Fit Trouser', code: 'RX', sortOrder: 4 },
  { categorySlug: 'trouser', name: 'Formal Trouser', code: 'FM', sortOrder: 5 },
  { categorySlug: 'trouser', name: 'Pleated Trouser', code: 'PL', sortOrder: 6 },
];

// Product type code mapping lookup
export const INITIAL_PRODUCT_TYPE_CODES: Record<string, string> = {
  // T-Shirt types
  'Polo T-Shirt': 'PO',
  'Zipper Polo T-Shirt': 'ZP',
  'Button Polo T-Shirt': 'BP',
  'Round Neck T-Shirt': 'RN',
  'V-Neck T-Shirt': 'VN',
  'Oversized T-Shirt': 'OS',
  'Regular Fit T-Shirt': 'RF',
  'Slim Fit T-Shirt': 'SF',
  'Henley T-Shirt': 'HEN',
  'Half Sleeve T-Shirt': 'HS',
  'Full Sleeve T-Shirt': 'FS',

  // Hoodie types (Strictly 3 options)
  'Unisex Hoodie': 'UH',
  'Regular Fit': 'RF',
  'Slim Fit': 'SF',

  // Shirt types
  'Casual Shirt': 'CS',
  'Formal Shirt': 'FS',
  'Oxford Shirt': 'OX',
  'Linen Shirt': 'LN',
  'Denim Shirt': 'DN',
  'Overshirt': 'OS',
  'Checked Shirt': 'CHK',
  'Printed Shirt': 'PR',
  'Solid Shirt': 'SLD',

  // Jacket types
  'Denim Jacket': 'DN',
  'Bomber Jacket': 'BM',
  'Puffer Jacket': 'PF',
  'Varsity Jacket': 'VR',
  'Leather Jacket': 'LTH',
  'Windbreaker': 'WB',
  'Overshirt Jacket': 'OJ',

  // Jeans types
  'Slim Fit Jeans': 'SF',
  'Skinny Jeans': 'SK',
  'Straight Fit Jeans': 'ST',
  'Relaxed Fit Jeans': 'RF',
  'Baggy Jeans': 'BG',
  'Tapered Jeans': 'TP',
  'Bootcut Jeans': 'BC',
  'Regular Fit Jeans': 'RG',

  // Pant types
  'Slim Fit Pant': 'SF',
  'Regular Fit Pant': 'RF',
  'Straight Fit Pant': 'ST',
  'Relaxed Fit Pant': 'RX',
  'Cargo Pant': 'CG',
  'Chino Pant': 'CH',
  'Track Pant': 'TR',
  'Jogger Pant': 'JG',

  // Trouser types
  'Slim Fit Trouser': 'SF',
  'Regular Fit Trouser': 'RF',
  'Straight Fit Trouser': 'ST',
  'Relaxed Fit Trouser': 'RX',
  'Formal Trouser': 'FM',
  'Pleated Trouser': 'PL',
};

/**
 * Category detection helpers
 */
export function isHoodieCategory(category?: { name?: string; slug?: string } | string | null): boolean {
  if (!category) return false;
  const val = typeof category === 'string' ? category : `${category.name || ''} ${category.slug || ''}`;
  return /hoodie/i.test(val);
}

export function isTShirtCategory(category?: { name?: string; slug?: string } | string | null): boolean {
  if (!category) return false;
  const val = typeof category === 'string' ? category : `${category.name || ''} ${category.slug || ''}`;
  return /t-?shirt/i.test(val);
}

/**
 * Returns the dedicated product types for a given category.
 */
export function getCategoryProductTypes(category?: { name?: string; slug?: string } | string | null): InitialProductType[] {
  if (isHoodieCategory(category)) {
    return INITIAL_HOODIE_PRODUCT_TYPES;
  }
  if (isTShirtCategory(category)) {
    return INITIAL_TSHIRT_PRODUCT_TYPES;
  }
  return INITIAL_TSHIRT_PRODUCT_TYPES;
}

/**
 * Returns the active color palette for a given category.
 * Hoodies receives strictly the 18 fabric colors.
 * T-Shirts receives the existing T-Shirt colors.
 */
export function getCategoryColors(
  category?: { name?: string; slug?: string } | string | null,
  customColors: any[] = []
): (InitialColor | StructuredProductColor)[] {
  if (isHoodieCategory(category)) {
    const list: (InitialColor | StructuredProductColor)[] = [...HOODIE_COLORS];
    customColors.forEach(cc => {
      if (!list.some(c => c.name.toUpperCase() === cc.name.toUpperCase())) {
        list.push(cc);
      }
    });
    return list;
  }

  // T-Shirt / default
  const list: (InitialColor | StructuredProductColor)[] = [...INITIAL_PREDEFINED_COLORS];
  customColors.forEach(cc => {
    if (!list.some(c => c.name.toUpperCase() === cc.name.toUpperCase())) {
      list.push(cc);
    }
  });
  return list;
}

// 4. INITIAL GARMENT SIZES
export const INITIAL_GARMENT_SIZES: InitialSize[] = [
  { name: 'XS', code: 'XS', sortOrder: 1 },
  { name: 'S', code: 'S', sortOrder: 2 },
  { name: 'M', code: 'M', sortOrder: 3 },
  { name: 'L', code: 'L', sortOrder: 4 },
  { name: 'XL', code: 'XL', sortOrder: 5 },
  { name: 'XXL', code: 'XXL', sortOrder: 6 },
  { name: 'XXXL', code: '3XL', sortOrder: 7 },
  { name: '4XL', code: '4XL', sortOrder: 8 },
  { name: '5XL', code: '5XL', sortOrder: 9 },
  { name: 'Free Size', code: 'FS', sortOrder: 10 },
];

export const DEFAULT_LOW_STOCK_THRESHOLD = 10;
export const DEFAULT_MRP = 1999;
export const DEFAULT_SELLING_PRICE = 999;

// Pricing Defaults
export const DEFAULT_STANDARD_MRP = '2999';
export const DEFAULT_STANDARD_SELLING_PRICE = '1299';
export const DEFAULT_HOODIE_MRP = '3999';
export const DEFAULT_HOODIE_SELLING_PRICE = '1999';

export function getDefaultPricingForCategory(category?: { name?: string; slug?: string } | string | null): {
  mrp: string;
  sellingPrice: string;
} {
  if (isHoodieCategory(category)) {
    return { mrp: DEFAULT_HOODIE_MRP, sellingPrice: DEFAULT_HOODIE_SELLING_PRICE };
  }
  return { mrp: DEFAULT_STANDARD_MRP, sellingPrice: DEFAULT_STANDARD_SELLING_PRICE };
}
