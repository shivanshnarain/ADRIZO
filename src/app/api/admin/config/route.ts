import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminSession } from '@/lib/auth';
import { DEFAULT_LOW_STOCK_THRESHOLD } from '@/lib/catalogueDefaults';

export async function GET(req: NextRequest) {
  try {
    const adminCheck = await verifyAdminSession();
    if (!adminCheck.authorized) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'all';

    let categories: any[] = [];
    let productTypes: any[] = [];
    let colors: any[] = [];
    let sizes: any[] = [];
    let settings: Record<string, string> = {
      lowStockThreshold: DEFAULT_LOW_STOCK_THRESHOLD.toString(),
    };

    try {
      if (type === 'all' || type === 'categories') {
        categories = await prisma.category.findMany({
          orderBy: { sortOrder: 'asc' },
          include: { productTypes: { orderBy: { sortOrder: 'asc' } } }
        });
      }
      if (type === 'all' || type === 'productTypes') {
        productTypes = await prisma.productType.findMany({
          orderBy: { sortOrder: 'asc' },
          include: { category: true }
        });
      }
      if (type === 'all' || type === 'colors') {
        colors = await prisma.productColor.findMany({
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }]
        });
      }
      if (type === 'all' || type === 'sizes') {
        sizes = await prisma.productSize.findMany({
          orderBy: { sortOrder: 'asc' }
        });
      }
      if (type === 'all' || type === 'settings') {
        const storeSettings = await prisma.storeSetting.findMany();
        storeSettings.forEach(s => { settings[s.key] = s.value; });
      }
    } catch (e) {
      // DB error - return whatever partial data we have
    }

    return NextResponse.json({
      success: true,
      categories,
      productTypes,
      colors,
      sizes,
      settings,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
