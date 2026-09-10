import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { revalidatePath } from 'next/cache';
import { verifyAdminSession } from '../../../../lib/auth';
import { deleteCloudinaryAsset } from '../../../../lib/cloudinary';
import { validatePricing } from '../../../../lib/pricing';
import {
  generateDeterministicSku,
  buildVariantSku,
  buildProductConfigKey,
} from '../../../../lib/sku';

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

export async function GET(req: NextRequest) {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        category: true,
        images: { orderBy: { sortOrder: 'asc' } },
        variants: true
      }
    });
    return NextResponse.json({ success: true, products });
  } catch (error: any) {
    console.error('[Admin Products GET Error]:', error);
    return NextResponse.json({ success: false, error: 'Unable to fetch products.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminCheck = await verifyAdminSession();
    if (!adminCheck.authorized) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const formData = await req.formData();
    const id = formData.get('id') as string | null;

    // Form fields
    const status = (formData.get('status') as string) || 'ACTIVE';
    const name = (formData.get('name') as string)?.trim() || null;
    const rawSku = (formData.get('sku') as string)?.trim() || null;
    const priceRaw = (formData.get('price') as string)?.trim() || null;

    // Quick Status Toggle Action (only id + status passed, no name or price)
    const isQuickStatusUpdate = Boolean(id && formData.has('status') && !name && !priceRaw);
    if (isQuickStatusUpdate) {
      try {
        const updated = await prisma.product.update({
          where: { id: id! },
          data: { status },
          include: { category: true, images: { orderBy: { sortOrder: 'asc' } }, variants: true }
        });
        try {
          revalidatePath('/admin/products');
          revalidatePath('/shop');
          revalidatePath('/');
          if (updated) {
            revalidatePath(`/product/${updated.id}`);
            if (updated.slug) revalidatePath(`/product/${updated.slug}`);
          }
          revalidatePath('/category/[slug]', 'page');
        } catch {
          // Revalidate non-blocking
        }
        return NextResponse.json({
          success: true,
          message: `Product status updated to ${status}`,
          product: updated
        });
      } catch (dbErr: any) {
        console.error('[Quick Status Update Error]:', dbErr);
        return NextResponse.json({ success: false, error: 'Failed to update product status.' }, { status: 500 });
      }
    }

    // Full Product Create / Update Action
    let slug = (formData.get('slug') as string)?.trim() || (name ? name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') : '');
    const description = (formData.get('description') as string) || '';
    const categoryIdRaw = formData.get('categoryId') as string;
    const productType = (formData.get('productType') as string)?.trim() || null;
    const color = (formData.get('color') as string)?.trim() || null;

    const price = priceRaw ? parseFloat(priceRaw) : 0;
    const originalPriceRaw = formData.get('originalPrice') as string;
    const originalPrice = originalPriceRaw ? parseFloat(originalPriceRaw) : null;

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
      return NextResponse.json({ success: false, error: 'Please fill in all required fields: Name and Slug.' }, { status: 400 });
    }

    const pricingValidation = validatePricing(originalPriceRaw, priceRaw);
    if (!pricingValidation.isValid) {
      return NextResponse.json({ success: false, error: pricingValidation.error }, { status: 400 });
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

    // 2. Deterministic SKU
    const deterministicSku = generateDeterministicSku({
      categoryName,
      colorName: color,
      productTypeName: productType,
    });

    let existingProduct: any = null;

    // 3. Validation & Conflict Checking
    if (!id) {
      // NEW PRODUCT CREATION: Check if configuration or SKU already exists
      const existingConflict = await prisma.product.findFirst({
        where: {
          OR: [
            { configKey },
            { sku: deterministicSku },
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
        return NextResponse.json(
          {
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
          },
          { status: 409 }
        );
      }
    } else {
      // EDIT PRODUCT: Verify configuration uniqueness against OTHER products
      existingProduct = await prisma.product.findUnique({
        where: { id },
        include: { category: true },
      });

      if (!existingProduct) {
        return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
      }

      const currentConfigKey = existingProduct.configKey || buildProductConfigKey({
        categoryId: existingProduct.categoryId,
        productType: existingProduct.productType,
        color: existingProduct.color,
      });

      const isConfigChanged = currentConfigKey !== configKey;

      if (isConfigChanged) {
        const conflict = await prisma.product.findFirst({
          where: {
            id: { not: id },
            OR: [
              { configKey },
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
          return NextResponse.json(
            {
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
            },
            { status: 409 }
          );
        }
      }
    }

    // Resolve final SKU
    let finalSku: string;
    if (!id) {
      finalSku = deterministicSku;
      // Ensure slug uniqueness
      const existingSlug = await prisma.product.findUnique({
        where: { slug },
        select: { id: true }
      }).catch(() => null);
      if (existingSlug) {
        slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
      }
    } else {
      const currentConfig = existingProduct?.configKey || buildProductConfigKey({
        categoryId: existingProduct?.categoryId,
        productType: existingProduct?.productType,
        color: existingProduct?.color,
      });
      if (currentConfig !== configKey) {
        finalSku = deterministicSku;
      } else {
        finalSku = existingProduct?.sku || rawSku || deterministicSku;
      }
    }

    // Resolve available sizes (NO stock stored)
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

    const payload: any = {
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
        create: imagesData.map((img: any, idx: number) => ({
          url: typeof img === 'string' ? img : img.url,
          publicId: typeof img === 'object' ? img.publicId : undefined,
          altText: (typeof img === 'object' && img.altText) ? img.altText : name,
          isPrimary: (typeof img === 'object' && img.isPrimary !== undefined) ? img.isPrimary : idx === 0,
          sortOrder: (typeof img === 'object' && img.sortOrder !== undefined) ? img.sortOrder : idx
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
      payload.category = {
        connect: { id: safeCategoryId }
      };
    } else if (id) {
      payload.categoryId = null;
    }

    let product;

    try {
      if (id) {
        await prisma.$transaction([
          prisma.productImage.deleteMany({ where: { productId: id } }),
          prisma.productVariant.deleteMany({ where: { productId: id } }),
          prisma.product.update({
            where: { id },
            data: payload,
          })
        ]);

        product = await prisma.product.findUnique({
          where: { id },
          include: {
            category: true,
            images: { orderBy: { sortOrder: 'asc' } },
            variants: true
          }
        });
      } else {
        product = await prisma.product.create({
          data: payload,
          include: {
            category: true,
            images: { orderBy: { sortOrder: 'asc' } },
            variants: true
          }
        });
      }

      try {
        revalidatePath('/admin/products');
        revalidatePath('/shop');
        revalidatePath('/');
        if (product) {
          revalidatePath(`/product/${product.id}`);
          if (product.slug) {
            revalidatePath(`/product/${product.slug}`);
          }
        }
        revalidatePath('/category/[slug]', 'page');
      } catch {
        // Non-blocking
      }

      return NextResponse.json({
        success: true,
        message: id ? "Product updated successfully" : "Product created successfully",
        product
      });
    } catch (dbErr: any) {
      console.error("[Database error saving product]:", dbErr);
      if (dbErr.code === 'P2002') {
        return NextResponse.json({
          success: false,
          isDuplicate: true,
          error: 'Product already exists. A product with this Category, Product Type and Color is already registered. Please edit the existing product instead.'
        }, { status: 409 });
      }
      return NextResponse.json({
        success: false,
        error: 'Unable to save product. Please check the product details and try again.'
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error("[Product publish error]:", error);
    const isTechnical = 
      typeof error?.message === 'string' &&
      (error.message.includes('prisma') ||
       error.message.includes('Prisma') ||
       error.message.includes('TURBOPACK') ||
       error.message.includes('invocation') ||
       error.message.includes('Unknown field') ||
       error.message.includes('ConnectorError') ||
       error.message.includes('Cannot find'));

    return NextResponse.json({
      success: false,
      error: isTechnical
        ? 'An error occurred while saving the product. Please check the product details and try again.'
        : (error.message || 'An unexpected error occurred while publishing the product.')
    }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const adminCheck = await verifyAdminSession();
    if (!adminCheck.authorized) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Product ID is required' }, { status: 400 });
    }

    const product = await prisma.product.findUnique({
      where: { id },
      include: { images: true, variants: true, orderItems: true }
    });

    if (product?.images) {
      for (const img of product.images) {
        if (img.publicId) {
          deleteCloudinaryAsset(img.publicId).catch(console.error);
        }
      }
    }

    await prisma.productImage.deleteMany({ where: { productId: id } }).catch(() => null);
    await prisma.productVariant.deleteMany({ where: { productId: id } }).catch(() => null);

    await prisma.product.delete({
      where: { id }
    }).catch(async () => {
      await prisma.product.update({
        where: { id },
        data: { status: 'DELETED' }
      }).catch(() => null);
    });

    try {
      revalidatePath('/admin/products');
      revalidatePath('/shop');
      revalidatePath('/');
      revalidatePath(`/product/${id}`);
    } catch {
      // non-blocking
    }

    return NextResponse.json({ success: true, message: 'Product deleted successfully' });
  } catch (error: any) {
    console.error("[Product delete error]:", error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete product. Please try again.'
    }, { status: 500 });
  }
}
