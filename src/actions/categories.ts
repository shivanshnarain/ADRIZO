'use server';

import { prisma } from '../lib/prisma';
import { revalidatePath } from 'next/cache';
import { verifyAdminSession } from '../lib/auth';

export async function getCategories() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return { success: true, categories };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createCategory(formData: FormData) {
  try {
    const session = await verifyAdminSession();
    if (!session.authorized) {
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    const name = formData.get('name') as string;
    const slug = formData.get('slug') as string;
    const code = (formData.get('code') as string)?.trim()?.toUpperCase() || null;
    const sortOrder = parseInt((formData.get('sortOrder') as string) || '0', 10);
    const description = formData.get('description') as string;
    const image = formData.get('image') as string;
    const status = formData.get('status') as string;

    if (!name || !slug) {
      return { success: false, error: 'Name and slug are required' };
    }

    const category = await prisma.category.create({
      data: {
        name,
        slug,
        code,
        sortOrder,
        description: description || null,
        image: image || null,
        status: status || 'ACTIVE',
      }
    });

    revalidatePath('/admin/categories');
    return { success: true, category };
  } catch (error: any) {
    if (error.code === 'P2002') {
      return { success: false, error: 'Category slug must be unique' };
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

    const name = formData.get('name') as string;
    const slug = formData.get('slug') as string;
    const code = (formData.get('code') as string)?.trim()?.toUpperCase() || null;
    const sortOrder = parseInt((formData.get('sortOrder') as string) || '0', 10);
    const description = formData.get('description') as string;
    const image = formData.get('image') as string;
    const status = formData.get('status') as string;

    if (!name || !slug) {
      return { success: false, error: 'Name and slug are required' };
    }

    const category = await prisma.category.update({
      where: { id },
      data: {
        name,
        slug,
        code,
        sortOrder,
        description: description || null,
        image: image || null,
        status: status || 'ACTIVE',
      }
    });

    revalidatePath('/admin/categories');
    return { success: true, category };
  } catch (error: any) {
    if (error.code === 'P2002') {
      return { success: false, error: 'Category slug must be unique' };
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

    const productCount = await prisma.product.count({ where: { categoryId: id } }).catch(() => 0);
    if (productCount > 0) {
      await prisma.product.updateMany({
        where: { categoryId: id },
        data: { categoryId: null }
      }).catch(() => null);
    }

    await prisma.productType.deleteMany({ where: { categoryId: id } }).catch(() => null);

    await prisma.category.delete({
      where: { id }
    });
    revalidatePath('/admin/categories');
    revalidatePath('/admin/products');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
