'use server';

import { saveStoreIdentity, saveShippingThresholds, getStoreSettings } from '@/lib/store-settings';

export async function fetchStoreSettingsAction() {
  return await getStoreSettings(true);
}

export async function saveStoreIdentityAction(data: {
  storeBrandName: string;
  supportEmail: string;
  supportPhone: string;
  baseCurrency?: string;
}) {
  return await saveStoreIdentity(data);
}

export async function saveShippingThresholdsAction(data: {
  freeShippingThreshold: number;
  standardShippingFee: number;
  codMinOrder: number;
  codMaxOrder: number;
  deliveryServiceability?: string;
}) {
  return await saveShippingThresholds(data);
}
