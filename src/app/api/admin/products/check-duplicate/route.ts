import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { verifyAdminSession } from '../../../../../lib/auth';
import { buildProductConfigKey, generateDeterministicSku } from '../../../../../lib/sku';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const adminCheck = await verifyAdminSession();
    if (!adminCheck.authorized) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get('categoryId')?.trim() || null;
    const categoryName = searchParams.get('categoryName')?.trim() || '';
    const productType = searchParams.get('productType')?.trim() || null;
    const color = searchParams.get('color')?.trim() || null;
    const excludeProductId = 
      searchParams.get('excludeProductId')?.trim() || 
      searchParams.get('excludeId')?.trim() || 
      null;

    if (!categoryId || !productType || !color) {
      return NextResponse.json({
        success: true,
        exists: false,
      });
    }

    const configKey = buildProductConfigKey({
      categoryId,
      productType,
      color,
    });

    const deterministicSku = generateDeterministicSku({
      categoryName,
      colorName: color,
      productTypeName: productType,
    });

    const where: any = {
      AND: [
        ...(excludeProductId ? [{ id: { not: excludeProductId } }] : []),
        {
          OR: [
            { configKey },
            { sku: deterministicSku },
            ...(categoryId && productType && color
              ? [
                  {
                    AND: [
                      { categoryId },
                      { productType: { equals: productType, mode: 'insensitive' as const } },
                      { color: { equals: color, mode: 'insensitive' as const } },
                    ],
                  },
                ]
              : []),
          ],
        },
      ],
    };

    const existing = await prisma.product.findFirst({
      where,
      include: { category: true },
    });

    if (existing) {
      const prodData = {
        id: existing.id,
        name: existing.name,
        sku: existing.sku,
        categoryName: existing.category?.name || categoryName,
        productType: existing.productType || productType,
        color: existing.color || color,
      };
      return NextResponse.json({
        success: true,
        exists: true,
        product: prodData,
        existingProduct: prodData,
        message: `Product already exists. A product with this Category, Product Type and Color is already registered (SKU: ${existing.sku}). Please edit the existing product instead.`,
      });
    }

    return NextResponse.json({
      success: true,
      exists: false,
      deterministicSku,
    });
  } catch (error: any) {
    console.error("[Check duplicate error]:", error);
    return NextResponse.json({ success: false, error: 'Unable to verify product uniqueness. Please try again.' }, { status: 500 });
  }
}
