import { prisma } from './prisma';
import { revalidatePath } from 'next/cache';
import { verifyAdminSession } from './auth';

export interface StoreSettings {
  storeBrandName: string;
  supportEmail: string;
  supportPhone: string;
  baseCurrency: string;
  freeShippingThreshold: number;
  standardShippingFee: number;
  codMinOrder: number;
  codMaxOrder: number;
  deliveryServiceability: string;
}

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  storeBrandName: 'ADRIZO Luxury Menswear',
  supportEmail: 'Care.adrizo@gmail.com',
  supportPhone: '+91 9773777410',
  baseCurrency: 'INR',
  freeShippingThreshold: 599,
  standardShippingFee: 39,
  codMinOrder: 699,
  codMaxOrder: 2999,
  deliveryServiceability: 'Active nationwide coverage',
};

// In-memory cache for ultra-fast checkout calculations
let cachedSettings: { data: StoreSettings; timestamp: number } | null = null;
const CACHE_TTL_MS = 30 * 1000; // 30s cache

export function invalidateStoreSettingsCache(): void {
  cachedSettings = null;
}

/**
 * Retrieve persistent store settings from MongoDB StoreSetting collection
 * with fast in-memory cache and safe defaults fallback.
 */
export async function getStoreSettings(forceFresh = false): Promise<StoreSettings> {
  if (!forceFresh && cachedSettings && Date.now() - cachedSettings.timestamp < CACHE_TTL_MS) {
    return cachedSettings.data;
  }

  try {
    const records = await prisma.storeSetting.findMany({
      where: {
        key: {
          in: [
            'store_brand_name',
            'support_email',
            'support_phone',
            'base_currency',
            'free_shipping_threshold',
            'standard_shipping_fee',
            'cod_min_order',
            'cod_max_order',
            'delivery_serviceability',
          ]
        }
      }
    });

    const map = new Map<string, string>();
    records.forEach(r => map.set(r.key, r.value));

    const settings: StoreSettings = {
      storeBrandName: map.get('store_brand_name') || DEFAULT_STORE_SETTINGS.storeBrandName,
      supportEmail: map.get('support_email') || DEFAULT_STORE_SETTINGS.supportEmail,
      supportPhone: map.get('support_phone') || DEFAULT_STORE_SETTINGS.supportPhone,
      baseCurrency: map.get('base_currency') || DEFAULT_STORE_SETTINGS.baseCurrency,
      freeShippingThreshold: map.has('free_shipping_threshold') 
        ? Number(map.get('free_shipping_threshold')) 
        : DEFAULT_STORE_SETTINGS.freeShippingThreshold,
      standardShippingFee: map.has('standard_shipping_fee') 
        ? Number(map.get('standard_shipping_fee')) 
        : DEFAULT_STORE_SETTINGS.standardShippingFee,
      codMinOrder: map.has('cod_min_order') 
        ? Number(map.get('cod_min_order')) 
        : DEFAULT_STORE_SETTINGS.codMinOrder,
      codMaxOrder: map.has('cod_max_order') 
        ? Number(map.get('cod_max_order')) 
        : DEFAULT_STORE_SETTINGS.codMaxOrder,
      deliveryServiceability: map.get('delivery_serviceability') || DEFAULT_STORE_SETTINGS.deliveryServiceability,
    };

    cachedSettings = { data: settings, timestamp: Date.now() };
    return settings;
  } catch (err) {
    console.warn('[getStoreSettings Warning, falling back to defaults]:', err);
    return DEFAULT_STORE_SETTINGS;
  }
}

/**
 * Save Store Identity settings to MongoDB
 */
export async function saveStoreIdentity(data: {
  storeBrandName: string;
  supportEmail: string;
  supportPhone: string;
  baseCurrency?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await verifyAdminSession();
    if (!session.authorized) {
      return { success: false, error: 'Unauthorized: Admin session required' };
    }

    const cleanName = data.storeBrandName?.trim();
    const cleanEmail = data.supportEmail?.trim().toLowerCase();
    const cleanPhone = data.supportPhone?.trim();

    if (!cleanName || cleanName.length < 2) {
      return { success: false, error: 'Store brand name must be at least 2 characters long' };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      return { success: false, error: 'Please enter a valid support email address' };
    }

    // Phone validation: allow leading + and digits/spaces/dashes, min 7 digits
    const digitsOnly = cleanPhone?.replace(/\D/g, '') || '';
    if (digitsOnly.length < 7) {
      return { success: false, error: 'Please enter a valid support phone number (at least 7 digits)' };
    }

    const updates = [
      { key: 'store_brand_name', value: cleanName },
      { key: 'support_email', value: cleanEmail },
      { key: 'support_phone', value: cleanPhone },
    ];

    for (const u of updates) {
      await prisma.storeSetting.upsert({
        where: { key: u.key },
        update: { value: u.value },
        create: { key: u.key, value: u.value },
      });
    }

    invalidateStoreSettingsCache();
    revalidatePath('/admin/settings');
    revalidatePath('/');
    return { success: true };
  } catch (err: any) {
    console.error('[saveStoreIdentity Exception]:', err);
    return { success: false, error: err.message || 'Failed to persist store identity settings' };
  }
}

/**
 * Save Shipping & Fulfillment Thresholds to MongoDB
 */
export async function saveShippingThresholds(data: {
  freeShippingThreshold: number;
  standardShippingFee: number;
  codMinOrder: number;
  codMaxOrder: number;
  deliveryServiceability?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await verifyAdminSession();
    if (!session.authorized) {
      return { success: false, error: 'Unauthorized: Admin session required' };
    }

    const freeThresh = Number(data.freeShippingThreshold);
    const stdFee = Number(data.standardShippingFee);
    const codMin = Number(data.codMinOrder);
    const codMax = Number(data.codMaxOrder);
    const serviceability = data.deliveryServiceability?.trim() || 'Active nationwide coverage';

    if (isNaN(freeThresh) || freeThresh < 0) {
      return { success: false, error: 'Free shipping threshold must be a valid non-negative number' };
    }

    if (isNaN(stdFee) || stdFee < 0) {
      return { success: false, error: 'Standard shipping fee must be a valid non-negative number' };
    }

    if (isNaN(codMin) || codMin < 0) {
      return { success: false, error: 'COD minimum amount must be a valid non-negative number' };
    }

    if (isNaN(codMax) || codMax < 0) {
      return { success: false, error: 'COD maximum amount must be a valid non-negative number' };
    }

    if (codMin > codMax) {
      return { success: false, error: 'COD minimum amount cannot be greater than COD maximum amount' };
    }

    const updates = [
      { key: 'free_shipping_threshold', value: freeThresh.toString() },
      { key: 'standard_shipping_fee', value: stdFee.toString() },
      { key: 'cod_min_order', value: codMin.toString() },
      { key: 'cod_max_order', value: codMax.toString() },
      { key: 'delivery_serviceability', value: serviceability },
    ];

    for (const u of updates) {
      await prisma.storeSetting.upsert({
        where: { key: u.key },
        update: { value: u.value },
        create: { key: u.key, value: u.value },
      });
    }

    invalidateStoreSettingsCache();
    revalidatePath('/admin/settings');
    revalidatePath('/checkout');
    revalidatePath('/');
    return { success: true };
  } catch (err: any) {
    console.error('[saveShippingThresholds Exception]:', err);
    return { success: false, error: err.message || 'Failed to persist shipping threshold settings' };
  }
}
