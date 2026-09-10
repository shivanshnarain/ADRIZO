import { prisma } from '../../../lib/prisma';
import SettingsClient from './SettingsClient';
import { DEFAULT_LOW_STOCK_THRESHOLD } from '../../../lib/catalogueDefaults';

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  let categories: any[] = [];
  let productTypes: any[] = [];
  let colors: any[] = [];
  let sizes: any[] = [];
  let settingsMap: Record<string, string> = {
    lowStockThreshold: DEFAULT_LOW_STOCK_THRESHOLD.toString()
  };

  try {
    const [dbCategories, dbTypes, dbColors, dbSizes, dbSettings] = await Promise.all([
      prisma.category.findMany({
        orderBy: { sortOrder: 'asc' }
      }),
      prisma.productType.findMany({
        orderBy: { sortOrder: 'asc' },
        include: { category: true }
      }),
      prisma.productColor.findMany({
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }]
      }),
      prisma.productSize.findMany({
        orderBy: { sortOrder: 'asc' }
      }),
      prisma.storeSetting.findMany()
    ]);

    categories = dbCategories;
    productTypes = dbTypes;
    colors = dbColors;
    sizes = dbSizes;
    dbSettings.forEach(s => { settingsMap[s.key] = s.value; });
  } catch {
    // DB unavailable — pass empty arrays; SettingsClient will show empty state
  }

  return (
    <SettingsClient
      initialCategories={categories}
      initialProductTypes={productTypes}
      initialColors={colors}
      initialSizes={sizes}
      initialSettings={settingsMap}
    />
  );
}

