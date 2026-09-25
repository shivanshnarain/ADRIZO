import { prisma } from '@/lib/prisma';
import { getAdminClient } from '@/lib/supabase/admin';
import { POLICY_CONFIG } from '@/config/policies';
import { checkPinDeliverability } from '@/data/indiaLocations';

export interface MagicShippingAddressInput {
  id?: string | number;
  zipcode?: string;
  state_code?: string;
  country?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
}

export interface MagicShippingInfoPayload {
  order_id?: string;
  razorpay_order_id?: string;
  email?: string;
  contact?: string;
  addresses?: MagicShippingAddressInput[];
}

export interface MagicShippingMethod {
  id: string;
  name: string;
  description: string;
  serviceable: boolean;
  shipping_fee: number; // in paise
  cod: boolean;
  cod_fee: number; // in paise
}

export interface MagicAddressShippingResult {
  id: string;
  zipcode?: string;
  state_code?: string;
  country?: string;
  shipping_methods: MagicShippingMethod[];
}

/**
 * Resolves authoritative order subtotal from Supabase orders table
 * given either the internal order number / id or razorpay_order_id.
 */
async function resolveOrderSubtotal(orderId?: string, razorpayOrderId?: string): Promise<number | null> {
  if (!orderId && !razorpayOrderId) return null;

  try {
    const supabase = getAdminClient();
    let query = supabase.from('orders').select('subtotal, total_amount, id, order_number, razorpay_order_id');

    if (razorpayOrderId) {
      query = query.eq('razorpay_order_id', razorpayOrderId);
    } else if (orderId) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);
      if (isUuid) {
        query = query.eq('id', orderId);
      } else {
        query = query.eq('order_number', orderId);
      }
    }

    const { data: supaOrders } = await query.limit(1);
    if (supaOrders && supaOrders.length > 0) {
      const o = supaOrders[0];
      const sub = Number(o.subtotal ?? o.total_amount);
      if (!isNaN(sub) && sub > 0) return sub;
    }
  } catch (err) {
    console.warn('[resolveOrderSubtotal] Error resolving subtotal:', err);
  }

  return null;
}

/**
 * Calculates shipping serviceability and fees for Razorpay Magic Checkout.
 * All fee values returned in paise.
 */
export async function calculateMagicShippingInfo(payload: MagicShippingInfoPayload) {
  const { order_id, razorpay_order_id, addresses = [] } = payload;

  const orderSubtotal = await resolveOrderSubtotal(order_id, razorpay_order_id);
  const effectiveSubtotal = orderSubtotal !== null ? orderSubtotal : 0;

  const freeShippingThreshold = POLICY_CONFIG.shipping.freeShippingThreshold; // ₹599
  const standardFeeRupees = POLICY_CONFIG.shipping.standardFee; // ₹39
  const codFeeRupees = POLICY_CONFIG.shipping.codHandlingFee; // ₹99

  // In paise:
  const isFreeShipping = effectiveSubtotal >= freeShippingThreshold;
  const standardShippingFeePaise = isFreeShipping ? 0 : Math.round(standardFeeRupees * 100);
  const codFeePaise = Math.round(codFeeRupees * 100);

  const addressResults: MagicAddressShippingResult[] = [];

  for (const addr of addresses) {
    const addrId = String(addr.id ?? '0');
    const pin = (addr.zipcode || '').trim().replace(/\D/g, '');

    let isDeliverable = true;
    if (pin.length === 6) {
      const check = checkPinDeliverability(pin);
      isDeliverable = check.deliverable;
    } else if (pin.length > 0) {
      isDeliverable = false;
    }

    const shippingMethod: MagicShippingMethod = {
      id: 'standard_delivery',
      name: 'Standard Delivery (3-5 Business Days)',
      description: isFreeShipping
        ? 'Free shipping on orders over ₹599'
        : `Standard flat rate delivery (₹${standardFeeRupees})`,
      serviceable: isDeliverable,
      shipping_fee: isDeliverable ? standardShippingFeePaise : 0,
      cod: isDeliverable,
      cod_fee: isDeliverable ? codFeePaise : 0,
    };

    addressResults.push({
      id: addrId,
      zipcode: addr.zipcode,
      state_code: addr.state_code,
      country: addr.country || 'IN',
      shipping_methods: [shippingMethod],
    });
  }

  // If customer selected an address in Magic Checkout, proactively sync it to the pending order
  if (addresses.length > 0 && (order_id || razorpay_order_id)) {
    const chosenAddr = addresses[0];
    if (chosenAddr.address1 && chosenAddr.city) {
      const pin = (chosenAddr.zipcode || '').trim().replace(/\D/g, '');
      const cleanAddressParts = [
        chosenAddr.address1.trim(),
        chosenAddr.address2 ? chosenAddr.address2.trim() : '',
        chosenAddr.city.trim(),
        chosenAddr.state ? `${chosenAddr.state.trim()}${pin ? ` - ${pin}` : ''}` : pin,
        chosenAddr.country || 'India'
      ].filter(Boolean).join(', ');

      const updates: any = {
        shipping_address: cleanAddressParts,
        house_flat: chosenAddr.address1.trim(),
        area_street: chosenAddr.address2 ? chosenAddr.address2.trim() : null,
        city: chosenAddr.city.trim(),
        state: chosenAddr.state || chosenAddr.state_code || 'Pending',
        pincode: pin || '000000',
        updated_at: new Date().toISOString(),
      };

      if (payload.contact) {
        const cleanContact = payload.contact.replace(/^\+91/, '').replace(/\D/g, '');
        if (cleanContact.length === 10) updates.customer_phone = cleanContact;
      }
      if (payload.email && payload.email.includes('@') && payload.email !== 'checkout@adrizo.com') {
        updates.customer_email = payload.email.trim();
      }

      try {
        const supabase = getAdminClient();
        let query = supabase.from('orders').update(updates);
        if (razorpay_order_id) {
          query = query.eq('razorpay_order_id', razorpay_order_id);
        } else if (order_id) {
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(order_id);
          query = isUuid ? query.eq('id', order_id) : query.eq('order_number', order_id);
        }
        (async () => {
          await query;
        })().catch((e) => console.warn('[syncPendingMagicOrderAddress warning]', e));
      } catch {}
    }
  }

  // Fallback default shipping method if no addresses were passed in payload
  const defaultMethod: MagicShippingMethod = {
    id: 'standard_delivery',
    name: 'Standard Delivery (3-5 Business Days)',
    description: isFreeShipping
      ? 'Free shipping on orders over ₹599'
      : `Standard delivery (₹${standardFeeRupees})`,
    serviceable: true,
    shipping_fee: standardShippingFeePaise,
    cod: true,
    cod_fee: codFeePaise,
  };

  return {
    addresses: addressResults,
    shipping_methods: addressResults[0]?.shipping_methods || [defaultMethod],
  };
}

interface CouponDefinition {
  code: string;
  type: string;
  value: number;
  minSpend?: number;
  status: string;
}

/**
 * Returns available active promotions for Razorpay Magic Checkout.
 */
export async function getMagicPromotions(_payload: { order_id?: string; contact?: string; email?: string } = {}) {
  let couponsList: CouponDefinition[] = [
    { code: 'WELCOME10', type: 'PERCENT', value: 10, minSpend: 999, status: 'ACTIVE' },
    { code: 'ADRIZO50', type: 'PERCENT', value: 50, minSpend: 1999, status: 'ACTIVE' },
    { code: 'FLAT200', type: 'FLAT', value: 200, minSpend: 1499, status: 'ACTIVE' },
  ];

  try {
    const setting = await prisma.storeSetting.findUnique({
      where: { key: 'store_discounts' },
    });
    if (setting && setting.value) {
      const parsed = JSON.parse(setting.value);
      if (Array.isArray(parsed) && parsed.length > 0) {
        couponsList = parsed;
      }
    }
  } catch (err) {
    console.warn('[getMagicPromotions] Using default coupon list:', err);
  }

  const activeCoupons = couponsList.filter((c: CouponDefinition) => c.status === 'ACTIVE');

  return {
    promotions: activeCoupons.map((c: CouponDefinition) => {
      const isPercent = c.type === 'PERCENT' || c.type === 'PERCENTAGE';
      const minSpendText = c.minSpend ? `on orders above ₹${c.minSpend}` : 'on all orders';
      const discountText = isPercent ? `${c.value}% OFF` : `₹${c.value} FLAT OFF`;

      return {
        code: String(c.code).toUpperCase().trim(),
        summary: `${discountText} ${minSpendText}`,
        description: isPercent
          ? `Get ${c.value}% discount ${minSpendText}.`
          : `Flat ₹${c.value} discount ${minSpendText}.`,
      };
    }),
  };
}

/**
 * Validates and applies a coupon promotion code for Razorpay Magic Checkout.
 * Returns discount amount in paise or an error object.
 */
export async function applyMagicPromotion(payload: {
  order_id?: string;
  razorpay_order_id?: string;
  code?: string;
  contact?: string;
  email?: string;
}) {
  const { order_id, razorpay_order_id, code } = payload;

  if (!code || typeof code !== 'string' || !code.trim()) {
    return {
      success: false,
      error: { description: 'Promo code is required.' },
    };
  }

  const cleanCode = code.trim().toUpperCase();

  let couponsList: CouponDefinition[] = [
    { code: 'WELCOME10', type: 'PERCENT', value: 10, minSpend: 999, status: 'ACTIVE' },
    { code: 'ADRIZO50', type: 'PERCENT', value: 50, minSpend: 1999, status: 'ACTIVE' },
    { code: 'FLAT200', type: 'FLAT', value: 200, minSpend: 1499, status: 'ACTIVE' },
  ];

  try {
    const setting = await prisma.storeSetting.findUnique({
      where: { key: 'store_discounts' },
    });
    if (setting && setting.value) {
      const parsed = JSON.parse(setting.value);
      if (Array.isArray(parsed) && parsed.length > 0) {
        couponsList = parsed;
      }
    }
  } catch (err) {
    console.warn('[applyMagicPromotion] Using default coupon list:', err);
  }

  const matched = couponsList.find(
    (c: CouponDefinition) => String(c.code).trim().toUpperCase() === cleanCode && c.status === 'ACTIVE'
  );

  if (!matched) {
    return {
      success: false,
      error: { description: `Promo code "${cleanCode}" is invalid or has expired.` },
    };
  }

  const orderSubtotal = await resolveOrderSubtotal(order_id, razorpay_order_id);
  const minSpend = Number(matched.minSpend) || 0;

  if (orderSubtotal !== null && orderSubtotal < minSpend) {
    return {
      success: false,
      error: {
        description: `Promo code "${matched.code}" requires a minimum order of ₹${minSpend}.`,
      },
    };
  }

  // Calculate discount amount in rupees
  const baseSubtotal = orderSubtotal !== null ? orderSubtotal : Math.max(minSpend, 1000);
  let discountRupees = 0;
  if (matched.type === 'PERCENT' || matched.type === 'PERCENTAGE') {
    discountRupees = Math.round((baseSubtotal * Number(matched.value)) / 100);
  } else {
    discountRupees = Math.min(Number(matched.value), baseSubtotal);
  }

  const discountPaise = Math.round(discountRupees * 100);

  return {
    success: true,
    amount: discountPaise,
    currency: 'INR',
  };
}
