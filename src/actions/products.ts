'use server';

import { prisma } from '../lib/prisma';
import { revalidatePath } from 'next/cache';
import { verifyAdminSession } from '../lib/auth';
import { deleteCloudinaryAsset } from '../lib/cloudinary';
import { validatePricing } from '../lib/pricing';
import {
  generateDeterministicSku,
  buildVariantSku,
  buildProductConfigKey,
  resolveCategoryCode,
  resolveColorCode,
  resolveProductTypeCode,
} from '../lib/sku';

const SINGLETON_DRAFT_ID = '000000000000000000000001';

const isMongoObjectId = (val?: string | null) => Boolean(val && /^[0-9a-fA-F]{24}$/.test(val));

async function resolveDbCategory(categoryIdRaw?: string | null) {
  if (!categoryIdRaw || categoryIdRaw.trim() === '') return null;
  const trimmed = categoryIdRaw.trim();
  if (isMongoObjectId(trimmed)) {
    const cat = await prisma.category.findUnique({ where: { id: trimmed } }).catch(() => null);
    if (cat) return cat;
  }
  const cleanSlug = trimmed.replace(/^cat-/, '');
  const catBySlugOrName = await prisma.category.findFirst({
    where: {
      OR: [
        { slug: cleanSlug },
        { slug: trimmed },
        { name: { equals: trimmed, mode: 'insensitive' } }
      ]
    }
  }).catch(() => null);
  return catBySlugOrName;
}

export async function getProducts() {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
      include: { 
        category: true,
        images: { orderBy: { sortOrder: 'asc' } },
        variants: true
      }
    });
    return { success: true, products };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createProduct(formData: FormData) {
  try {
    const session = await verifyAdminSession();
    if (!session.authorized) {
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    const name = (formData.get('name') as string)?.trim();
    let slug = (formData.get('slug') as string)?.trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    const description = (formData.get('description') as string) || '';
    const categoryIdRaw = formData.get('categoryId') as string;
    const productType = (formData.get('productType') as string)?.trim() || null;
    const color = (formData.get('color') as string)?.trim() || null;

    const priceRaw = formData.get('price') as string;
    const price = parseFloat(priceRaw);
    const originalPriceRaw = formData.get('originalPrice') as string;
    const originalPrice = originalPriceRaw ? parseFloat(originalPriceRaw) : null;
    const status = (formData.get('status') as string) || 'ACTIVE';
    const featured = formData.get('featured') === 'true';
    const newArrival = formData.get('newArrival') === 'true';
    const onSale = formData.get('onSale') === 'true';

    const showSizeChart = formData.get('showSizeChart') === 'true';
    const sizeChart = (formData.get('sizeChart') as string) || null;
    const sizeFit = (formData.get('sizeFit') as string) || null;
    const washCare = (formData.get('washCare') as string) || null;
    const freeShippingText = (formData.get('freeShippingText') as string) || null;
    const dispatchText = (formData.get('dispatchText') as string) || null;
    const deliveryText = (formData.get('deliveryText') as string) || null;
    const returnPolicyText = (formData.get('returnPolicyText') as string) || null;
    const freeExchangesText = (formData.get('freeExchangesText') as string) || null;
    const easyReturnsText = (formData.get('easyReturnsText') as string) || null;
    const exchangeElseText = (formData.get('exchangeElseText') as string) || null;

    const colorsRaw = (formData.get('colors') as string) || null;
    const sizesRaw = (formData.get('sizes') as string) || null;

    const imagesData = JSON.parse((formData.get('images') as string) || '[]');

    if (!name || !slug) {
      return { success: false, error: 'Please fill in all required fields: Name and Slug.' };
    }

    const pricingValidation = validatePricing(originalPriceRaw, priceRaw);
    if (!pricingValidation.isValid) {
      return { success: false, error: pricingValidation.error };
    }

    // Safely resolve Category from database
    const resolvedCat = await resolveDbCategory(categoryIdRaw);
    const categoryName = resolvedCat ? resolvedCat.name : '';
    const safeCategoryId = resolvedCat ? resolvedCat.id : null;

    // 1. Normalized Configuration Identity
    const configKey = buildProductConfigKey({
      categoryId: safeCategoryId,
      productType,
      color,
    });

    // 2. Strictly Deterministic SKU
    const finalSku = generateDeterministicSku({
      categoryName,
      colorName: color,
      productTypeName: productType,
    });

    // 3. Check for existing product with matching configuration or SKU
    const existingConflict = await prisma.product.findFirst({
      where: {
        OR: [
          { configKey },
          { sku: finalSku },
          ...(safeCategoryId && productType && color
            ? [
                {
                  AND: [
                    { categoryId: safeCategoryId },
                    { productType: { equals: productType, mode: 'insensitive' as const } },
                    { color: { equals: color, mode: 'insensitive' as const } },
                  ],
                },
              ]
            : []),
        ],
      },
      include: { category: true },
    });

    if (existingConflict) {
      return {
        success: false,
        isDuplicate: true,
        error: `Product already exists. A product with this Category, Product Type and Color is already registered (SKU: ${existingConflict.sku}). Please edit the existing product instead.`,
        existingProduct: {
          id: existingConflict.id,
          name: existingConflict.name,
          sku: existingConflict.sku,
          categoryName: (existingConflict as any).category?.name || categoryName,
          productType: existingConflict.productType || productType,
          color: existingConflict.color || color,
        },
      };
    }

    // Check slug collision
    const existingSlug = await prisma.product.findUnique({
      where: { slug },
      select: { id: true }
    }).catch(() => null);

    if (existingSlug) {
      slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
    }

    // Resolve available sizes (product options only, NO stock stored)
    let selectedSizes: string[] = [];
    if (sizesRaw) {
      try {
        const parsed = JSON.parse(sizesRaw);
        if (Array.isArray(parsed)) selectedSizes = parsed.filter(Boolean);
      } catch {
        selectedSizes = [];
      }
    }
    if (selectedSizes.length === 0) {
      selectedSizes = ['S', 'M', 'L', 'XL', 'XXL'];
    }
    const finalSizesRaw = JSON.stringify(selectedSizes);

    const data: any = {
      name,
      slug,
      description,
      price,
      salePrice: null,
      originalPrice,
      productType,
      color,
      sku: finalSku,
      configKey,
      status: status || 'ACTIVE',
      featured,
      newArrival,
      onSale: Boolean(originalPrice && originalPrice > price),
      showSizeChart,
      sizeChart,
      sizeFit,
      washCare,
      freeShippingText,
      dispatchText,
      deliveryText,
      returnPolicyText,
      freeExchangesText,
      easyReturnsText,
      exchangeElseText,
      colorsRaw,
      sizesRaw: finalSizesRaw,
      images: {
        create: imagesData.map((img: any, index: number) => ({
          url: typeof img === 'string' ? img : img.url,
          publicId: (typeof img === 'object' && img.publicId) ? img.publicId : null,
          altText: (typeof img === 'object' && img.altText) ? img.altText : name,
          isPrimary: (typeof img === 'object' && img.isPrimary !== undefined) ? img.isPrimary : index === 0,
          sortOrder: (typeof img === 'object' && img.sortOrder !== undefined) ? img.sortOrder : index
        }))
      },
      variants: {
        create: selectedSizes.map((sz: string, idx: number) => ({
          size: sz,
          color: color || null,
          sku: buildVariantSku(finalSku, sz, idx),
        }))
      }
    };

    if (safeCategoryId) {
      data.category = { connect: { id: safeCategoryId } };
    }

    const product = await prisma.product.create({
      data,
      include: {
        category: true,
        images: { orderBy: { sortOrder: 'asc' } },
        variants: true
      }
    });

    try {
      revalidatePath('/admin/products');
      revalidatePath('/shop');
      revalidatePath('/');
      revalidatePath(`/product/${product.id}`);
      if (product.slug) {
        revalidatePath(`/product/${product.slug}`);
      }
      revalidatePath('/category/[slug]', 'page');
    } catch {
      // Revalidation non-blocking
    }

    return {
      success: true,
      product
    };
  } catch (error: any) {
    console.error('[Action createProduct error]:', error);
    if (error.code === 'P2002') {
      return {
        success: false,
        isDuplicate: true,
        error: 'Product already exists. A product with this Category, Product Type and Color is already registered. Please edit the existing product instead.'
      };
    }
    return {
      success: false,
      error: error.message || 'Failed to create product'
    };
  }
}

export async function updateProduct(id: string, formData: FormData) {
  try {
    const session = await verifyAdminSession();
    if (!session.authorized) {
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    const name = (formData.get('name') as string)?.trim();
    const slug = (formData.get('slug') as string)?.trim();
    const description = (formData.get('description') as string) || '';
    const categoryIdRaw = formData.get('categoryId') as string;
    const productType = (formData.get('productType') as string)?.trim() || null;
    const color = (formData.get('color') as string)?.trim() || null;

    const priceRaw = formData.get('price') as string;
    const price = parseFloat(priceRaw);
    const originalPriceRaw = formData.get('originalPrice') as string;
    const originalPrice = originalPriceRaw ? parseFloat(originalPriceRaw) : null;
    const rawSku = (formData.get('sku') as string)?.trim();

    const status = (formData.get('status') as string) || 'ACTIVE';
    const featured = formData.get('featured') === 'true';
    const newArrival = formData.get('newArrival') === 'true';
    const onSale = formData.get('onSale') === 'true';

    const showSizeChart = formData.get('showSizeChart') === 'true';
    const sizeChart = (formData.get('sizeChart') as string) || null;
    const sizeFit = (formData.get('sizeFit') as string) || null;
    const washCare = (formData.get('washCare') as string) || null;
    const freeShippingText = (formData.get('freeShippingText') as string) || null;
    const dispatchText = (formData.get('dispatchText') as string) || null;
    const deliveryText = (formData.get('deliveryText') as string) || null;
    const returnPolicyText = (formData.get('returnPolicyText') as string) || null;
    const freeExchangesText = (formData.get('freeExchangesText') as string) || null;
    const easyReturnsText = (formData.get('easyReturnsText') as string) || null;
    const exchangeElseText = (formData.get('exchangeElseText') as string) || null;

    const colorsRaw = (formData.get('colors') as string) || null;
    const sizesRaw = (formData.get('sizes') as string) || null;

    const imagesData = JSON.parse((formData.get('images') as string) || '[]');

    if (!name || !slug) {
      return { success: false, error: 'Please fill in all required fields: Name and Slug.' };
    }

    const pricingValidation = validatePricing(originalPriceRaw, priceRaw);
    if (!pricingValidation.isValid) {
      return { success: false, error: pricingValidation.error };
    }

    // Retrieve existing product
    const existingProduct = await prisma.product.findUnique({
      where: { id },
      include: { images: true, category: true, variants: true }
    });

    if (!existingProduct) {
      return { success: false, error: 'Product not found.' };
    }

    // Clean up deleted Cloudinary assets
    const newPublicIds = new Set(imagesData.map((img: any) => img.publicId).filter(Boolean));
    for (const oldImg of existingProduct.images) {
      if (oldImg.publicId && !newPublicIds.has(oldImg.publicId)) {
        deleteCloudinaryAsset(oldImg.publicId).catch(console.error);
      }
    }

    // Safely resolve Category from database
    const resolvedCat = await resolveDbCategory(categoryIdRaw);
    const categoryName = resolvedCat?.name || existingProduct.category?.name || '';
    const safeCategoryId = resolvedCat ? resolvedCat.id : existingProduct.categoryId;

    // Check if configuration has changed
    const currentConfigKey = (existingProduct as any).configKey || buildProductConfigKey({
      categoryId: existingProduct.categoryId,
      productType: existingProduct.productType,
      color: existingProduct.color,
    });

    const newConfigKey = buildProductConfigKey({
      categoryId: safeCategoryId,
      productType,
      color,
    });

    const isConfigChanged = currentConfigKey !== newConfigKey;

    // If configuration changed, check for conflict with ANY OTHER product
    if (isConfigChanged) {
      const conflict = await prisma.product.findFirst({
        where: {
          id: { not: id },
          OR: [
            { configKey: newConfigKey },
            ...(safeCategoryId && productType && color
              ? [
                  {
                    AND: [
                      { categoryId: safeCategoryId },
                      { productType: { equals: productType, mode: 'insensitive' as const } },
                      { color: { equals: color, mode: 'insensitive' as const } },
                    ],
                  },
                ]
              : []),
          ],
        },
        include: { category: true },
      });

      if (conflict) {
        return {
          success: false,
          isDuplicate: true,
          error: `This product configuration already exists on product "${conflict.name}" (SKU: ${conflict.sku}). Please edit that product instead.`,
          existingProduct: {
            id: conflict.id,
            name: conflict.name,
            sku: conflict.sku,
            categoryName: (conflict as any).category?.name || '',
            productType: conflict.productType,
            color: conflict.color,
          },
        };
      }
    }

    // Determine SKU: strictly preserve existing SKU unless configuration changed
    let finalSku = existingProduct.sku;
    if (isConfigChanged) {
      finalSku = generateDeterministicSku({
        categoryName,
        colorName: color,
        productTypeName: productType,
      });
    }

    // Resolve available sizes (product options only, NO stock stored)
    let selectedSizes: string[] = [];
    if (sizesRaw) {
      try {
        const parsed = JSON.parse(sizesRaw);
        if (Array.isArray(parsed)) selectedSizes = parsed.filter(Boolean);
      } catch {
        selectedSizes = [];
      }
    }
    if (selectedSizes.length === 0) {
      selectedSizes = existingProduct.sizesRaw
        ? JSON.parse(existingProduct.sizesRaw)
        : ['S', 'M', 'L', 'XL', 'XXL'];
    }
    const finalSizesRaw = JSON.stringify(selectedSizes);

    const data: any = {
      name,
      slug,
      description,
      price,
      salePrice: null,
      originalPrice,
      productType,
      color,
      sku: finalSku,
      configKey: newConfigKey,
      status: status || 'ACTIVE',
      featured,
      newArrival,
      onSale: Boolean(originalPrice && originalPrice > price),
      showSizeChart,
      sizeChart,
      sizeFit,
      washCare,
      freeShippingText,
      dispatchText,
      deliveryText,
      returnPolicyText,
      freeExchangesText,
      easyReturnsText,
      exchangeElseText,
      colorsRaw,
      sizesRaw: finalSizesRaw,
      images: {
        create: imagesData.map((img: any, index: number) => ({
          url: typeof img === 'string' ? img : img.url,
          publicId: (typeof img === 'object' && img.publicId) ? img.publicId : null,
          altText: (typeof img === 'object' && img.altText) ? img.altText : name,
          isPrimary: (typeof img === 'object' && img.isPrimary !== undefined) ? img.isPrimary : index === 0,
          sortOrder: (typeof img === 'object' && img.sortOrder !== undefined) ? img.sortOrder : index
        }))
      },
      variants: {
        create: selectedSizes.map((sz: string, idx: number) => ({
          size: sz,
          color: color || null,
          sku: buildVariantSku(finalSku, sz, idx),
        }))
      }
    };

    if (safeCategoryId) {
      data.category = { connect: { id: safeCategoryId } };
    } else {
      data.categoryId = null;
    }

    await prisma.$transaction([
      prisma.productImage.deleteMany({ where: { productId: id } }),
      prisma.productVariant.deleteMany({ where: { productId: id } }),
      prisma.product.update({
        where: { id },
        data
      })
    ]);

    const updatedProduct = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        images: { orderBy: { sortOrder: 'asc' } },
        variants: true
      }
    });

    try {
      revalidatePath('/admin/products');
      revalidatePath('/shop');
      revalidatePath('/');
      revalidatePath(`/product/${id}`);
      if (updatedProduct?.slug) {
        revalidatePath(`/product/${updatedProduct.slug}`);
      }
      revalidatePath('/category/[slug]', 'page');
    } catch {
      // Revalidation non-blocking
    }

    return {
      success: true,
      product: updatedProduct
    };
  } catch (error: any) {
    if (error.code === 'P2002') {
      return {
        success: false,
        isDuplicate: true,
        error: 'Product configuration or SKU already exists in another product. Please choose a different combination.'
      };
    }
    return { success: false, error: error.message };
  }
}

export async function deleteProduct(id: string) {
  try {
    const session = await verifyAdminSession();
    if (!session.authorized) {
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    const product = await prisma.product.findUnique({
      where: { id },
      include: { images: true, variants: true, orderItems: true }
    });

    if (!product) {
      return { success: false, error: 'Product not found' };
    }

    // Delete Cloudinary assets safely
    if (product.images && product.images.length > 0) {
      for (const img of product.images) {
        if (img.publicId) {
          deleteCloudinaryAsset(img.publicId).catch(console.error);
        }
      }
    }

    // Delete child records first in MongoDB / Prisma
    await prisma.productImage.deleteMany({ where: { productId: id } }).catch(() => null);
    await prisma.productVariant.deleteMany({ where: { productId: id } }).catch(() => null);

    await prisma.product.delete({
      where: { id }
    });

    try {
      revalidatePath('/admin/products');
      revalidatePath('/shop');
      revalidatePath('/');
      revalidatePath(`/product/${id}`);
    } catch {
      // non-blocking
    }

    return { success: true };
  } catch (error: any) {
    console.error('deleteProduct error:', error);
    try {
      await prisma.product.update({
        where: { id },
        data: { status: 'DELETED' }
      });
      revalidatePath('/admin/products');
      revalidatePath('/shop');
      return { success: true };
    } catch {
      return { success: false, error: error.message || 'Failed to delete product' };
    }
  }
}

export async function saveDraft(data: string) {
  try {
    const session = await verifyAdminSession();
    if (!session.authorized) {
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    await prisma.productDraft.upsert({
      where: { id: SINGLETON_DRAFT_ID },
      update: { data },
      create: { id: SINGLETON_DRAFT_ID, data }
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getDraft() {
  try {
    const session = await verifyAdminSession();
    if (!session.authorized) {
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    const draft = await prisma.productDraft.findUnique({
      where: { id: SINGLETON_DRAFT_ID }
    });
    return { success: true, draft: draft ? draft.data : null };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function clearDraft() {
  try {
    const session = await verifyAdminSession();
    if (!session.authorized) {
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    await prisma.productDraft.delete({
      where: { id: SINGLETON_DRAFT_ID }
    });
    return { success: true };
  } catch (error: any) {
    return { success: true };
  }
}
