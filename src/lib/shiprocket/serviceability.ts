import { shiprocketRequest } from './client';
import {
  ShiprocketAvailableCourier,
  ShiprocketServiceabilityResult,
} from './types';

export interface CheckCourierServiceabilityParams {
  pickupPincode?: string;
  deliveryPincode: string;
  weightKg?: number;
  isCod?: boolean;
  orderTotal?: number;
}

/**
 * Checks courier serviceability and shipping rates live via Shiprocket's API.
 * 
 * Features:
 * - Queries Shiprocket's courier serviceability endpoint.
 * - Extracts and ranks all available courier partners (Shadowfax, Delhivery, Xpressbees, Blue Dart, etc.).
 * - Sanitizes response: zero credentials or bearer tokens are ever exposed.
 */
export async function checkCourierServiceability(
  params: CheckCourierServiceabilityParams
): Promise<ShiprocketServiceabilityResult> {
  const pickupPincode = (params.pickupPincode || '201301').trim();
  const deliveryPincode = (params.deliveryPincode || '').trim();
  const weight = params.weightKg ? Math.max(0.1, params.weightKg) : 0.5;
  const isCod = params.isCod !== undefined ? (params.isCod ? 1 : 0) : 1;
  const declaredValue = params.orderTotal ? Math.max(1, params.orderTotal) : 999;

  if (!deliveryPincode || deliveryPincode.length !== 6) {
    return {
      success: false,
      pickupPincode,
      deliveryPincode,
      availableCouriers: [],
      error: 'Invalid delivery PIN code. 6-digit Indian PIN code required.',
    };
  }

  const queryParams = new URLSearchParams({
    pickup_postcode: pickupPincode,
    delivery_postcode: deliveryPincode,
    weight: String(weight),
    cod: String(isCod),
    declared_value: String(declaredValue),
  });

  const endpoint = `/courier/serviceability/?${queryParams.toString()}`;
  console.log(`[Shiprocket Serviceability] Checking couriers: ${pickupPincode} -> ${deliveryPincode} (Weight: ${weight}kg, COD: ${isCod})...`);

  try {
    const rawRes: any = await shiprocketRequest(endpoint);

    if (!rawRes || rawRes.status !== 200 || !rawRes.data) {
      const errMsg = rawRes?.message || 'No serviceability data returned for this PIN code.';
      return {
        success: false,
        pickupPincode,
        deliveryPincode,
        availableCouriers: [],
        error: errMsg,
      };
    }

    const courierList: any[] = rawRes.data.available_courier_companies || [];

    const availableCouriers: ShiprocketAvailableCourier[] = courierList.map(c => {
      const rateVal = Number(c.rate || c.freight_charge || 0);
      const freightVal = Number(c.freight_charge || 0);
      const codVal = Number(c.cod_charges || 0);
      const ratingNum = typeof c.rating === 'number' ? c.rating : parseFloat(c.rating || '0') || 0;

      return {
        courierCompanyId: c.courier_company_id || c.id,
        courierName: c.courier_name || 'Standard Courier',
        rate: rateVal,
        freightCharge: freightVal,
        codCharges: codVal,
        etd: c.etd || '',
        estimatedDeliveryDays: String(c.estimated_delivery_days || '3-5'),
        rating: ratingNum,
        isSurface: !!c.is_surface,
        realtimeTracking: c.realtime_tracking || 'Real Time',
        callBeforeDelivery: c.call_before_delivery || 'Available',
      };
    });

    // Sort couriers by rate ascending (most cost-effective first)
    availableCouriers.sort((a, b) => a.rate - b.rate);

    console.log(
      `[Shiprocket Serviceability] Found ${availableCouriers.length} serviceable couriers for ${deliveryPincode}. Cheapest: ${availableCouriers[0]?.courierName || 'N/A'} (₹${availableCouriers[0]?.rate || 0})`
    );

    return {
      success: true,
      pickupPincode,
      deliveryPincode,
      availableCouriers,
      recommendedCourierId: rawRes.data.recommended_courier_company_id || availableCouriers[0]?.courierCompanyId,
    };
  } catch (err: unknown) {
    const errorObj = err as { message?: string };
    console.error(`[Shiprocket Serviceability] Error checking PIN ${deliveryPincode}:`, errorObj.message);
    return {
      success: false,
      pickupPincode,
      deliveryPincode,
      availableCouriers: [],
      error: errorObj.message || 'Failed to check courier serviceability with Shiprocket API.',
    };
  }
}
