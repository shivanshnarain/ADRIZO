'use server';

import { prisma } from '../lib/prisma';
import { revalidatePath } from 'next/cache';
import { verifyAdminSession } from '../lib/auth';
import { DEFAULT_LOW_STOCK_THRESHOLD } from '../lib/catalogueDefaults';
import { deriveShortCode } from '../lib/sku';

// ============================================================================
// 1. CATEGORIES MANAGEMENT
// ============================================================================

export async function getCategoriesWithTypes() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        productTypes: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
    return { success: true, categories };
  } catch (error: any) {
    return { success: false, categories: [], error: error.message };
  }
}

export async function createCategory(formData: FormData) {
  try {
    const session = await verifyAdminSession();
    if (!session.authorized) {
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    const name = (formData.get('name') as string)?.trim();
    const slug = (formData.get('slug') as string)?.trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const code = ((formData.get('code') as string)?.trim() || deriveShortCode(name, 3)).toUpperCase();
    const description = (formData.get('description') as string) || null;
    const image = (formData.get('image') as string) || null;
    const status = (formData.get('status') as string) || 'ACTIVE';
    const sortOrder = parseInt((formData.get('sortOrder') as string) || '0', 10);

    if (!name || !slug) {
      return { success: false, error: 'Name and slug are required' };
    }

    const category = await prisma.category.create({
      data: {
        name,
        slug,
        code,
        description,
        image,
        status,
        sortOrder,
      },
      include: { productTypes: true },
    });

    revalidatePath('/admin/categories');
    revalidatePath('/admin/settings');
    revalidatePath('/admin/products');
    return { success: true, category };
  } catch (error: any) {
    if (error.code === 'P2002') {
      return { success: false, error: 'Category slug already exists' };
    }
    return { success: false, error: error.message };
  }
}

export async function updateCategory(id: string, formData: FormData) {
  try {
    const session = await verifyAdminSession();
    if (!session.authorized) {
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    if (!isRealObjectId(id)) {
      return { success: false, error: 'Invalid category ID. Please refresh the page and try again.' };
    }

    const name = (formData.get('name') as string)?.trim();
    const slug = (formData.get('slug') as string)?.trim();
    const code = (formData.get('code') as string)?.trim()?.toUpperCase();
    const description = (formData.get('description') as string) || null;
    const image = (formData.get('image') as string) || null;
    const status = (formData.get('status') as string) || 'ACTIVE';
    const sortOrder = parseInt((formData.get('sortOrder') as string) || '0', 10);

    if (!name || !slug) {
      return { success: false, error: 'Name and slug are required' };
    }

    const category = await prisma.category.update({
      where: { id },
      data: {
        name,
        slug,
        code: code || deriveShortCode(name, 3),
        description,
        image,
        status,
        sortOrder,
      },
      include: { productTypes: true },
    });

    revalidatePath('/admin/categories');
    revalidatePath('/admin/settings');
    revalidatePath('/admin/products');
    return { success: true, category };
  } catch (error: any) {
    if (error.code === 'P2002') {
      return { success: false, error: 'Category slug already exists' };
    }
    return { success: false, error: error.message };
  }
}

export async function deleteCategory(id: string) {
  try {
    const session = await verifyAdminSession();
    if (!session.authorized) {
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    if (!isRealObjectId(id)) {
      return { success: false, error: 'Cannot delete: invalid category ID.' };
    }

    await prisma.category.delete({
      where: { id },
    });

    revalidatePath('/admin/categories');
    revalidatePath('/admin/settings');
    revalidatePath('/admin/products');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ============================================================================
// 2. PRODUCT TYPES MANAGEMENT
// ============================================================================

export async function getProductTypes(categoryId?: string) {
  try {
    const where: any = {};
    if (categoryId) {
      where.categoryId = categoryId;
    }

    const types = await prisma.productType.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
      include: { category: true },
    });

    return { success: true, productTypes: types };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Validates that an id looks like a real MongoDB ObjectId (24-hex chars)
function isRealObjectId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id?.trim() ?? '');
}

export async function createProductType(formData: FormData) {
  try {
    const session = await verifyAdminSession();
    if (!session.authorized) {
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    const categoryId = (formData.get('categoryId') as string)?.trim();
    const name = (formData.get('name') as string)?.trim();
    const code = ((formData.get('code') as string)?.trim() || deriveShortCode(name, 2)).toUpperCase();
    const slug = (formData.get('slug') as string)?.trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const sortOrder = parseInt((formData.get('sortOrder') as string) || '0', 10);
    const status = (formData.get('status') as string) || 'ACTIVE';

    if (!name || !code) {
      return { success: false, error: 'Name and Short Code are required' };
    }

    if (!categoryId || !isRealObjectId(categoryId)) {
      return { success: false, error: 'A valid Category must be selected. Please select a category from the dropdown.' };
    }

    const productType = await prisma.productType.create({
      data: {
        categoryId,
        name,
        code,
        slug,
        sortOrder,
        status,
      },
      include: { category: true },
    });

    revalidatePath('/admin/settings');
    revalidatePath('/admin/products');
    return { success: true, productType };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateProductType(id: string, formData: FormData) {
  try {
    const session = await verifyAdminSession();
    if (!session.authorized) {
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    if (!isRealObjectId(id)) {
      return { success: false, error: 'Invalid product type ID. This record does not exist in the database yet.' };
    }

    const categoryId = (formData.get('categoryId') as string)?.trim();
    const name = (formData.get('name') as string)?.trim();
    const code = ((formData.get('code') as string)?.trim() || deriveShortCode(name, 2)).toUpperCase();
    const slug = (formData.get('slug') as string)?.trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const sortOrder = parseInt((formData.get('sortOrder') as string) || '0', 10);
    const status = (formData.get('status') as string) || 'ACTIVE';

    if (!name || !code) {
      return { success: false, error: 'Name and Short Code are required' };
    }

    if (!categoryId || !isRealObjectId(categoryId)) {
      return { success: false, error: 'A valid Category must be selected.' };
    }

    const productType = await prisma.productType.update({
      where: { id },
      data: {
        categoryId,
        name,
        code,
        slug,
        sortOrder,
        status,
      },
      include: { category: true },
    });

    revalidatePath('/admin/settings');
    revalidatePath('/admin/products');
    return { success: true, productType };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteProductType(id: string) {
  try {
    const session = await verifyAdminSession();
    if (!session.authorized) {
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    if (!isRealObjectId(id)) {
      return { success: false, error: 'Cannot delete: this record does not exist in the database.' };
    }

    await prisma.productType.delete({
      where: { id },
    });

    revalidatePath('/admin/settings');
    revalidatePath('/admin/products');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ============================================================================
// 3. COLOR LIBRARY MANAGEMENT
// ============================================================================

export async function getColors() {
  try {
    const colors = await prisma.productColor.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return { success: true, colors };
  } catch (error: any) {
    return { success: false, colors: [], error: error.message };
  }
}

export async function createColor(formData: FormData) {
  try {
    const session = await verifyAdminSession();
    if (!session.authorized) {
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    const rawName = (formData.get('name') as string)?.trim();
    if (!rawName) {
      return { success: false, error: 'Color name is required' };
    }

    const name = rawName.toUpperCase();
    const code = ((formData.get('code') as string)?.trim() || deriveShortCode(name, 3)).toUpperCase();
    const hex = (formData.get('hex') as string)?.trim() || null;
    const isCustom = formData.get('isCustom') === 'true' || true;
    const sortOrder = parseInt((formData.get('sortOrder') as string) || '99', 10);

    // Case-insensitive duplicate check
    const existing = await prisma.productColor.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
      },
    });

    if (existing) {
      return { success: true, color: existing, message: 'Color already exists' };
    }

    const color = await prisma.productColor.create({
      data: {
        name,
        code,
        hex,
        isCustom,
        sortOrder,
        status: 'ACTIVE',
      },
    });

    revalidatePath('/admin/settings');
    revalidatePath('/admin/products');
    return { success: true, color };
  } catch (error: any) {
    if (error.code === 'P2002') {
      const existing = await prisma.productColor.findUnique({
        where: { name: (formData.get('name') as string)?.trim().toUpperCase() },
      });
      return { success: true, color: existing, message: 'Color already exists' };
    }
    return { success: false, error: error.message };
  }
}

export async function updateColor(id: string, formData: FormData) {
  try {
    const session = await verifyAdminSession();
    if (!session.authorized) {
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    if (!isRealObjectId(id)) {
      return { success: false, error: 'Invalid color ID. Please refresh the page and try again.' };
    }

    const name = (formData.get('name') as string)?.trim().toUpperCase();
    const code = ((formData.get('code') as string)?.trim() || deriveShortCode(name, 3)).toUpperCase();
    const hex = (formData.get('hex') as string)?.trim() || null;
    const status = (formData.get('status') as string) || 'ACTIVE';
    const sortOrder = parseInt((formData.get('sortOrder') as string) || '0', 10);

    if (!name || !code) {
      return { success: false, error: 'Color name and code are required' };
    }

    const color = await prisma.productColor.update({
      where: { id },
      data: {
        name,
        code,
        hex,
        status,
        sortOrder,
      },
    });

    revalidatePath('/admin/settings');
    revalidatePath('/admin/products');
    return { success: true, color };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteColor(id: string) {
  try {
    const session = await verifyAdminSession();
    if (!session.authorized) {
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    if (!isRealObjectId(id)) {
      return { success: false, error: 'Cannot delete: invalid color ID.' };
    }

    await prisma.productColor.delete({
      where: { id },
    });

    revalidatePath('/admin/settings');
    revalidatePath('/admin/products');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ============================================================================
// 4. SIZES MANAGEMENT
// ============================================================================

export async function getSizes() {
  try {
    const sizes = await prisma.productSize.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    return { success: true, sizes };
  } catch (error: any) {
    return { success: false, sizes: [], error: error.message };
  }
}


export async function createSize(formData: FormData) {
  try {
    const session = await verifyAdminSession();
    if (!session.authorized) {
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    const name = (formData.get('name') as string)?.trim();
    const code = ((formData.get('code') as string)?.trim() || name).toUpperCase();
    const sortOrder = parseInt((formData.get('sortOrder') as string) || '0', 10);
    const status = (formData.get('status') as string) || 'ACTIVE';

    if (!name) {
      return { success: false, error: 'Size name is required' };
    }

    const size = await prisma.productSize.create({
      data: {
        name,
        code,
        sortOrder,
        status,
      },
    });

    revalidatePath('/admin/settings');
    revalidatePath('/admin/products');
    return { success: true, size };
  } catch (error: any) {
    if (error.code === 'P2002') {
      return { success: false, error: 'Size already exists' };
    }
    return { success: false, error: error.message };
  }
}

export async function updateSize(id: string, formData: FormData) {
  try {
    const session = await verifyAdminSession();
    if (!session.authorized) {
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    if (!isRealObjectId(id)) {
      return { success: false, error: 'Invalid size ID. Please refresh the page and try again.' };
    }

    const name = (formData.get('name') as string)?.trim();
    const code = ((formData.get('code') as string)?.trim() || name).toUpperCase();
    const sortOrder = parseInt((formData.get('sortOrder') as string) || '0', 10);
    const status = (formData.get('status') as string) || 'ACTIVE';

    if (!name) {
      return { success: false, error: 'Size name is required' };
    }

    const size = await prisma.productSize.update({
      where: { id },
      data: {
        name,
        code,
        sortOrder,
        status,
      },
    });

    revalidatePath('/admin/settings');
    revalidatePath('/admin/products');
    return { success: true, size };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteSize(id: string) {
  try {
    const session = await verifyAdminSession();
    if (!session.authorized) {
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    if (!isRealObjectId(id)) {
      return { success: false, error: 'Cannot delete: invalid size ID.' };
    }

    await prisma.productSize.delete({
      where: { id },
    });

    revalidatePath('/admin/settings');
    revalidatePath('/admin/products');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ============================================================================
// 5. STORE SETTINGS / INVENTORY CONFIG
// ============================================================================

export async function getStoreSettings() {
  try {
    const settings = await prisma.storeSetting.findMany();
    const map: Record<string, string> = {
      lowStockThreshold: DEFAULT_LOW_STOCK_THRESHOLD.toString(),
    };
    settings.forEach(s => {
      map[s.key] = s.value;
    });
    return { success: true, settings: map };
  } catch (error: any) {
    return {
      success: true,
      settings: {
        lowStockThreshold: DEFAULT_LOW_STOCK_THRESHOLD.toString(),
      },
    };
  }
}

export async function updateStoreSetting(key: string, value: string) {
  try {
    const session = await verifyAdminSession();
    if (!session.authorized) {
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    const setting = await prisma.storeSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });

    revalidatePath('/admin/settings');
    revalidatePath('/admin/products');
    return { success: true, setting };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function saveAdminPromotionOffers(offers: any[]) {
  try {
    const session = await verifyAdminSession();
    if (!session.authorized) {
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    const { savePromotionOffers } = await import('../lib/promotions');
    const ok = await savePromotionOffers(offers);

    revalidatePath('/admin/settings');
    revalidatePath('/admin/products');
    revalidatePath('/');
    return { success: ok };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

