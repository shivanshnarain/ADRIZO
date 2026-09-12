import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedCustomer } from '@/lib/customer-auth';
import { POLICY_CONFIG } from '@/config/policies';
import { 
  isRazorpayConfigured, 
  getRazorpayConfigStatus,
  getRazorpayInstance, 
  generateOrderNumber,
  getRazorpayKeyId,
  getRazorpaySecret,
} from '@/lib/razorpay';
import { resolveOrderFromSupabase } from '@/lib/order-resolver';
import { sendOrderConfirmationEmail } from '@/lib/order-email';
import { autoSyncOrderToShiprocket } from '@/lib/shiprocket-auto-sync';
import { validateAndPriceOrderItems } from '@/lib/promotions';

/**
 * Atomically saves an order and its items to Supabase.
 * Uses the place_order_atomic PostgreSQL transaction RPC with graceful direct fallback.
 */
async function saveOrderToSupabase(
  adminSupabase: any,
  orderData: any,
  itemsData: any[]
): Promise<{ success: boolean; orderId?: string; error?: string }> {
  // 1. Try atomic PostgreSQL transaction RPC first
  try {
    const { data: rpcData, error: rpcError } = await adminSupabase.rpc('place_order_atomic', {
      p_order: orderData,
      p_items: itemsData,
    });

    if (!rpcError && rpcData && rpcData.success && rpcData.order_id) {
      return { success: true, orderId: rpcData.order_id };
    }

    if (rpcData && !rpcData.success && rpcData.error) {
      console.warn('[place_order_atomic RPC error message, falling back to direct insert]:', rpcData.error);
    }
    if (rpcError) {
      console.warn('[place_order_atomic RPC Call Warning, falling back to direct insert]:', rpcError.message);
    }
  } catch (rpcEx) {
    console.warn('[place_order_atomic RPC Exception, falling back to direct insert]:', rpcEx);
  }

  // 2. Direct insert fallback
  try {
    let supaOrderData = { ...orderData };
    let { data: supaOrder, error: supaOrderErr } = await adminSupabase
      .from('orders')
      .insert(supaOrderData)
      .select('id')
      .single();

    // If foreign key constraint on customer_id fails, gracefully retry without customer_id
    if (supaOrderErr && supaOrderErr.code === '23503' && supaOrderData.customer_id) {
      console.warn('[Supabase Order Direct Insert FK Violation on customer_id, retrying as guest]:', supaOrderErr.message);
      supaOrderData.customer_id = null;
      const retryRes = await adminSupabase
        .from('orders')
        .insert(supaOrderData)
        .select('id')
        .single();
      supaOrder = retryRes.data;
      supaOrderErr = retryRes.error;
    }

    if (supaOrderErr || !supaOrder) {
      console.error('[Supabase Order Direct Insert Error]', supaOrderErr);
      return { success: false, error: supaOrderErr?.message || 'Database insert failed' };
    }

    const supaOrderId = supaOrder.id;
    const itemsWithOrderId = itemsData.map((it: any) => ({ ...it, order_id: supaOrderId }));
    const { error: itemsErr } = await adminSupabase.from('order_items').insert(itemsWithOrderId);

    if (itemsErr) {
      console.error('[Supabase Order Items Insert Error]', itemsErr);
    }

    return { success: true, orderId: supaOrderId };
  } catch (err: any) {
    console.error('[Supabase Order Save Exception]', err);
    return { success: false, error: err?.message || 'Unexpected database error' };
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      items, 
      shippingAddress, 
      paymentMethod: rawPaymentMethod = 'COD', 
      couponCode 
    } = body;
    const rawUpper = String(rawPaymentMethod || 'COD').trim().toUpperCase();
    const paymentMethod = (rawUpper === 'CASH_ON_DELIVERY' || rawUpper === 'CASH-ON-DELIVERY') ? 'COD' : rawUpper;

    // 1. Validate Items
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Your order must contain at least one item.' 
      }, { status: 400 });
    }

    // 2. Validate Delivery Address
    if (!shippingAddress) {
      return NextResponse.json({ 
        success: false, 
        error: 'Shipping address is required.' 
      }, { status: 400 });
    }

    const {
      fullName = '',
      phone = '',
      email = '',
      addressLine1 = '',
      addressLine2 = '',
      address = '',
      flatHouseBuilding = '',
      area = '',
      areaStreetSector = '',
      landmark = '',
      district = '',
      city = '',
      state = '',
      pincode = '',
      country = 'India',
    } = shippingAddress;

    // 3. Customer Auth Resolution & Profile/Address Auto-Persistence
    const adminSupabase = getAdminClient();
    let authenticatedUserId: string | null = null;
    let authCustomer: any = null;

    try {
      const customer = await getAuthenticatedCustomer();
      if (customer && customer.id && customer.id !== 'admin') {
        authenticatedUserId = customer.id;
        authCustomer = customer;
      }
    } catch (authErr) {
      console.warn('[Checkout Auth Resolution Warning]', authErr);
    }

    const trimmedName = (fullName || (authCustomer?.name && authCustomer.name !== 'Customer' ? authCustomer.name : '')).trim();
    const trimmedPhone = (phone || authCustomer?.phone || '').trim().replace(/[^0-9]/g, '');
    const trimmedEmail = (email || authCustomer?.email || '').trim();
    const trimmedAddress = (addressLine1 || address || flatHouseBuilding || '').trim();
    const trimmedDistrict = district ? district.trim() : '';
    const trimmedCity = city.trim();
    const trimmedState = state.trim();
    const trimmedPincode = pincode.trim().replace(/[^0-9]/g, '');

    let authoritativeCustomerEmail = trimmedEmail || authCustomer?.email || '';
    let authoritativeCustomerPhone = trimmedPhone || authCustomer?.phone || '';
    let authoritativeCustomerName = trimmedName || authCustomer?.name || 'Customer';

    if (!trimmedName || trimmedName.length < 2) {
      return NextResponse.json({ success: false, error: 'Please enter a valid full name.' }, { status: 400 });
    }

    if (!/^[6-9][0-9]{9}$/.test(trimmedPhone)) {
      return NextResponse.json({ success: false, error: 'Enter a valid 10-digit mobile number.' }, { status: 400 });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      return NextResponse.json({ success: false, error: 'Please enter a valid email address.' }, { status: 400 });
    }

    if (!trimmedAddress || trimmedAddress.length < 3) {
      return NextResponse.json({ success: false, error: 'Please enter a valid street/house address.' }, { status: 400 });
    }

    if (!trimmedCity || !trimmedState) {
      return NextResponse.json({ success: false, error: 'Please enter your city and state.' }, { status: 400 });
    }

    if (!/^[1-9][0-9]{5}$/.test(trimmedPincode)) {
      return NextResponse.json({ success: false, error: 'Please enter a valid 6-digit Indian PIN code.' }, { status: 400 });
    }

    // Normalize and construct formatted single delivery string without duplicating city/state/pin/country
    const cleanFlat = trimmedAddress;
    let cleanArea = (addressLine2 || area || areaStreetSector || '').trim();
    const cleanLandmark = landmark ? landmark.trim() : '';

    if (cleanArea) {
      const areaFragments = cleanArea.split(',').map((f: string) => f.trim()).filter(Boolean);
      const filteredArea = areaFragments.filter((frag: string) => {
        const low = frag.toLowerCase();
        if (low === 'india') return false;
        if (trimmedState && low.includes(trimmedState.toLowerCase())) return false;
        if (trimmedCity && low === trimmedCity.toLowerCase()) return false;
        if (trimmedPincode && low.includes(trimmedPincode)) return false;
        if (trimmedDistrict && low === trimmedDistrict.toLowerCase()) return false;
        if (low.startsWith('landmark:')) return false;
        if (low.startsWith('dist:')) return false;
        return true;
      });
      cleanArea = filteredArea.join(', ');
    }

    const addressParts: string[] = [];
    if (cleanFlat) addressParts.push(cleanFlat);
    if (cleanArea && cleanArea.toLowerCase() !== cleanFlat.toLowerCase()) addressParts.push(cleanArea);
    if (cleanLandmark) addressParts.push(`Near ${cleanLandmark.replace(/^(near|landmark:?)\s*/i, '')}`);
    if (trimmedCity) addressParts.push(trimmedCity);
    if (trimmedState) {
      if (trimmedPincode) {
        addressParts.push(`${trimmedState} - ${trimmedPincode}`);
      } else {
        addressParts.push(trimmedState);
      }
    } else if (trimmedPincode) {
      addressParts.push(trimmedPincode);
    }
    addressParts.push('India');

    const fullShippingAddressString = addressParts.join(', ');

    // Persist address to customer_addresses and sync profile if customer is authenticated
    if (authenticatedUserId) {
      try {
        // 1. Check existing saved addresses to prevent duplicates
        const { data: existingAddrs } = await adminSupabase
          .from('customer_addresses')
          .select('id, address, pincode')
          .eq('customer_id', authenticatedUserId);

        const isDuplicate = (existingAddrs || []).some((a: any) =>
          a.pincode === trimmedPincode &&
          a.address?.toLowerCase().trim() === cleanFlat.toLowerCase().trim()
        );

        const isFirst = !existingAddrs || existingAddrs.length === 0;

        if (!isDuplicate) {
          await adminSupabase.from('customer_addresses').insert({
            customer_id: authenticatedUserId,
            full_name: trimmedName,
            phone: trimmedPhone,
            address: cleanFlat,
            area: cleanArea || null,
            district: trimmedDistrict || null,
            city: trimmedCity,
            state: trimmedState,
            pincode: trimmedPincode,
            landmark: cleanLandmark || null,
            is_default: isFirst,
          });
        }

        // 2. Update customer_profiles table
        await adminSupabase
          .from('customer_profiles')
          .upsert({
            id: authenticatedUserId,
            full_name: trimmedName,
            phone: trimmedPhone,
            delivery_address: fullShippingAddressString,
            city: trimmedCity,
            state: trimmedState,
            pincode: trimmedPincode,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'id' });

        // 3. Update MongoDB user record if exists
        try {
          const isMongo = /^[0-9a-fA-F]{24}$/.test(authenticatedUserId);
          if (isMongo) {
            await prisma.user.update({
              where: { id: authenticatedUserId },
              data: {
                address: fullShippingAddressString,
                city: trimmedCity,
                state: trimmedState,
                pincode: trimmedPincode,
                phone: trimmedPhone,
              },
            }).catch(() => null);
          } else if (trimmedEmail || trimmedPhone) {
            const mUser = await prisma.user.findFirst({
              where: {
                OR: [
                  trimmedEmail ? { email: trimmedEmail.toLowerCase() } : {},
                  trimmedPhone ? { phone: trimmedPhone } : {},
                ].filter(o => Object.keys(o).length > 0),
              },
            }).catch(() => null);
            if (mUser) {
              await prisma.user.update({
                where: { id: mUser.id },
                data: {
                  address: fullShippingAddressString,
                  city: trimmedCity,
                  state: trimmedState,
                  pincode: trimmedPincode,
                },
              }).catch(() => null);
            }
          }
        } catch {}
      } catch (syncErr: any) {
        console.warn('[Supabase Profile/Address Persistence Warning]', syncErr);
      }
    }

    // 4. Authoritative MongoDB Product, Promotion & Inventory Verification
    const promoResult = await validateAndPriceOrderItems(items);
    if (!promoResult.success) {
      return NextResponse.json({
        success: false,
        error: promoResult.error || 'Invalid items in your order.'
      }, { status: 400 });
    }

    const validatedItems = promoResult.items;
    let subtotal = promoResult.subtotal;

    // 5. Authoritative Coupon & Automatic 6-Product Offer Promotion Verification
    let couponDiscount = 0;
    let appliedCouponCode: string | null = null;

    if (couponCode && typeof couponCode === 'string' && couponCode.trim()) {
      const codeUpper = couponCode.trim().toUpperCase();
      const discountsSetting = await prisma.storeSetting.findUnique({
        where: { key: 'store_discounts' }
      });

      let availableCoupons: any[] = [
        { code: 'WELCOME10', type: 'PERCENTAGE', value: 10, minSpend: 499, status: 'ACTIVE' },
        { code: 'ADRIZO50', type: 'FIXED', value: 50, minSpend: 299, status: 'ACTIVE' },
        { code: 'FLAT200', type: 'FIXED', value: 200, minSpend: 1499, status: 'ACTIVE' },
      ];

      if (discountsSetting && discountsSetting.value) {
        try {
          const parsed = JSON.parse(discountsSetting.value);
          if (Array.isArray(parsed) && parsed.length > 0) availableCoupons = parsed;
        } catch {
          // Fall back to defaults
        }
      }

      const foundCoupon = availableCoupons.find(
        c => c.code.toUpperCase() === codeUpper && c.status === 'ACTIVE'
      );

      if (foundCoupon && subtotal >= (foundCoupon.minSpend || 0)) {
        appliedCouponCode = foundCoupon.code;
        if (foundCoupon.type === 'PERCENTAGE') {
          couponDiscount = Math.round((subtotal * foundCoupon.value) / 100);
        } else {
          couponDiscount = Math.min(foundCoupon.value, subtotal);
        }
      }
    }

    // Server-validated automatic promotion tiers (₹100 for 6 products, ₹200 for 9 products)
    const autoOfferBonus = promoResult.autoOfferDiscount || 0;
    if (autoOfferBonus > 0) {
      const offerCode = autoOfferBonus >= 200 ? 'OFFER200' : 'OFFER100';
      if (appliedCouponCode) {
        appliedCouponCode = `${appliedCouponCode} + ${offerCode}`;
      } else {
        appliedCouponCode = offerCode;
      }
      couponDiscount = Math.min(subtotal, couponDiscount + autoOfferBonus);
    }

    // 6. Authoritative Shipping Computation
    const shippingCharge = subtotal >= POLICY_CONFIG.shipping.freeShippingThreshold 
      ? 0 
      : POLICY_CONFIG.shipping.standardFee;

    // 7. Authoritative Total Computation (COD fee = ₹99, Razorpay fee = ₹0)
    const codCharge = paymentMethod === 'COD' ? POLICY_CONFIG.shipping.codHandlingFee : 0;
    const finalTotal = Math.max(0, subtotal - couponDiscount + shippingCharge + codCharge);

    // Duplicate Order Prevention Guard (30s idempotency window)
    let existingRecentOrder: {
      id: string;
      orderNumber: string;
      paymentMethod: string;
      total: number;
      codCharge: number;
      razorpayOrderId?: string | null;
      paymentStatus: string;
    } | null = null;

    // Check Supabase (Primary Order Store)
    try {
      const thirtySecondsAgoIso = new Date(Date.now() - 30000).toISOString();
      const { data: recentSupaOrders } = await adminSupabase
        .from('orders')
        .select('id, order_number, total_amount, cod_charge, payment_method, razorpay_order_id, payment_status, order_status')
        .eq('customer_phone', trimmedPhone)
        .gte('created_at', thirtySecondsAgoIso)
        .order('created_at', { ascending: false })
        .limit(1);

      if (recentSupaOrders && recentSupaOrders.length > 0) {
        const candidate = recentSupaOrders[0];
        if (Math.abs(Number(candidate.total_amount) - finalTotal) < 0.01) {
          existingRecentOrder = {
            id: candidate.id,
            orderNumber: candidate.order_number,
            paymentMethod: candidate.payment_method || paymentMethod,
            total: Number(candidate.total_amount),
            codCharge: Number(candidate.cod_charge || codCharge),
            razorpayOrderId: candidate.razorpay_order_id,
            paymentStatus: candidate.payment_status,
          };
        }
      }
    } catch (supaDedupErr) {
      console.warn('[Supabase Duplicate Prevention Warning]', supaDedupErr);
    }

    if (existingRecentOrder && (existingRecentOrder.paymentStatus === 'PAID' || existingRecentOrder.paymentStatus === 'COD_CONFIRMATION_PAID')) {
      console.log('[Duplicate Order Prevention Triggered] Reusing confirmed order:', existingRecentOrder.orderNumber);
      return NextResponse.json({
        success: true,
        orderId: existingRecentOrder.id,
        orderNumber: existingRecentOrder.orderNumber,
        paymentMethod: existingRecentOrder.paymentMethod,
        total: existingRecentOrder.total,
        codCharge: existingRecentOrder.codCharge,
        isDuplicatePrevented: true,
      });
    }

    // 8. Handle CASH ON DELIVERY (COD) with MANDATORY ₹99 INSTANT CONFIRMATION PAYMENT
    if (paymentMethod === 'COD') {
      const codConfigStatus = getRazorpayConfigStatus();
      if (!codConfigStatus.configured) {
        return NextResponse.json({
          success: false,
          error: codConfigStatus.reason || 'Online payment gateway is awaiting credential configuration for COD ₹99 confirmation.'
        }, { status: 400 });
      }

      const orderNumber = generateOrderNumber();
      const rzp = getRazorpayInstance();
      const currency = process.env.RAZORPAY_CURRENCY || 'INR';

      // Dynamic calculation: customer pays ₹99 (or full total if <= ₹99) online, remaining balance on delivery
      const codConfirmationAmount = Math.min(99, finalTotal);
      const codRemainingAmount = Math.max(0, finalTotal - codConfirmationAmount);

      // Create Razorpay Order specifically for the COD confirmation advance payment
      const razorpayOrder = await rzp.orders.create({
        amount: Math.round(codConfirmationAmount * 100), // in paise
        currency,
        receipt: `${orderNumber}-COD99`,
        notes: {
          orderNumber,
          type: 'COD_CONFIRMATION',
          customerName: trimmedName,
          customerEmail: trimmedEmail,
          customerPhone: trimmedPhone,
          orderTotal: String(finalTotal),
          codConfirmationAmount: String(codConfirmationAmount),
          codRemainingAmount: String(codRemainingAmount),
        }
      });

      // 8a. Save Initial Order to Supabase with status PENDING_COD_CONFIRMATION
      const orderPayload = {
        order_number: orderNumber,
        customer_id: authenticatedUserId,
        customer_name: authoritativeCustomerName,
        customer_email: authoritativeCustomerEmail,
        customer_phone: authoritativeCustomerPhone,
        house_flat: cleanFlat || null,
        area_street: cleanArea || null,
        landmark: cleanLandmark || null,
        shipping_address: fullShippingAddressString,
        city: trimmedCity,
        state: trimmedState,
        pincode: trimmedPincode,
        subtotal,
        shipping_charge: shippingCharge,
        cod_charge: codConfirmationAmount,
        discount: couponDiscount,
        coupon_code: appliedCouponCode,
        total_amount: finalTotal,
        payment_method: 'COD',
        payment_status: 'PENDING_COD_CONFIRMATION',
        order_status: 'PENDING_COD_CONFIRMATION',
        razorpay_order_id: razorpayOrder.id,
        razorpay_payment_id: null,
        razorpay_signature: null,
        delivery_partner: null,
        tracking_id: null,
        tracking_status: 'ORDER_RECEIVED',
      };

      const orderItemsPayload = validatedItems.map(item => ({
        product_id: item.productId,
        product_name: item.productName,
        product_image: item.productImage || null,
        mrp: item.mrp || null,
        sku: item.sku || null,
        size: item.size || null,
        color: item.color || null,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.price * item.quantity,
      }));

      const saveResult = await saveOrderToSupabase(adminSupabase, orderPayload, orderItemsPayload);
      const supaOrderId = saveResult.orderId;

      if (!supaOrderId) {
        console.error('[COD Order Initialization Failure] Supabase write failed:', saveResult.error);
        return NextResponse.json({
          success: false,
          error: saveResult.error || 'Unable to initialize your order right now. Please try again.'
        }, { status: 500 });
      }

      // Important: Order is NOT yet confirmed! No confirmation email, no Shiprocket sync until ₹99 is verified.
      return NextResponse.json({
        success: true,
        orderId: supaOrderId,
        orderNumber,
        paymentMethod: 'COD',
        razorpayOrderId: razorpayOrder.id,
        amount: codConfirmationAmount * 100, // 9900 paise
        currency,
        key: getRazorpayKeyId(),
        total: finalTotal,
        codConfirmationAmount,
        codRemainingAmount: Math.max(0, finalTotal - codConfirmationAmount),
        customer: {
          name: authoritativeCustomerName,
          email: authoritativeCustomerEmail,
          phone: authoritativeCustomerPhone,
        }
      });
    }

    // 9. Handle ONLINE PAYMENT (RAZORPAY)
    if (paymentMethod === 'ONLINE_RAZORPAY' || paymentMethod === 'RAZORPAY') {
      const onlineConfigStatus = getRazorpayConfigStatus();
      if (!onlineConfigStatus.configured) {
        return NextResponse.json({
          success: false,
          error: onlineConfigStatus.reason || 'Online payment gateway is awaiting credential configuration. Please configure RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env, or select Cash on Delivery to place your order right now.'
        }, { status: 400 });
      }

      const orderNumber = generateOrderNumber();
      const rzp = getRazorpayInstance();
      const currency = process.env.RAZORPAY_CURRENCY || 'INR';

      // Create Razorpay Order server-side (amount in paise for INR)
      const razorpayOrder = await rzp.orders.create({
        amount: Math.round(finalTotal * 100),
        currency,
        receipt: orderNumber,
        notes: {
          orderNumber,
          customerName: trimmedName,
          customerEmail: trimmedEmail,
          customerPhone: trimmedPhone,
        }
      });

      // 9a. Save Pending Order to Supabase atomically via place_order_atomic RPC
      const onlineOrderPayload = {
        order_number: orderNumber,
        customer_id: authenticatedUserId,
        customer_name: authoritativeCustomerName,
        customer_email: authoritativeCustomerEmail,
        customer_phone: authoritativeCustomerPhone,
        house_flat: cleanFlat || null,
        area_street: cleanArea || null,
        landmark: cleanLandmark || null,
        shipping_address: fullShippingAddressString,
        city: trimmedCity,
        state: trimmedState,
        pincode: trimmedPincode,
        subtotal,
        shipping_charge: shippingCharge,
        cod_charge: 0,
        discount: couponDiscount,
        coupon_code: appliedCouponCode,
        total_amount: finalTotal,
        payment_method: 'ONLINE_RAZORPAY',
        payment_status: 'PENDING',
        order_status: 'PENDING',
        razorpay_order_id: razorpayOrder.id,
        delivery_partner: null,
        tracking_id: null,
        tracking_status: 'ORDER_RECEIVED',
      };

      const onlineItemsPayload = validatedItems.map(item => ({
        product_id: item.productId,
        product_name: item.productName,
        product_image: item.productImage || null,
        mrp: item.mrp || null,
        sku: item.sku || null,
        size: item.size || null,
        color: item.color || null,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.price * item.quantity,
      }));

      const saveResult = await saveOrderToSupabase(adminSupabase, onlineOrderPayload, onlineItemsPayload);
      const supaOrderId = saveResult.orderId;

      if (!supaOrderId) {
        console.error('[Supabase Online Order Failure] Supabase order write failed:', saveResult.error);
        return NextResponse.json({
          success: false,
          error: saveResult.error || 'Unable to initialize online payment order. Please try again.'
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        orderId: supaOrderId,
        orderNumber: orderNumber,
        razorpayOrderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency || currency,
        key: getRazorpayKeyId(),
        customer: {
          name: trimmedName,
          email: trimmedEmail,
          phone: trimmedPhone
        }
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid payment method selected.' }, { status: 400 });

  } catch (error: any) {
    console.error('[Create Order API Error]', error);
    const errorMessage = 
      error?.error?.description || 
      error?.description || 
      error?.message || 
      (typeof error === 'string' ? error : 'Something went wrong while processing your order. Please try again.');
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
}

export async function GET() {
  const keyId = getRazorpayKeyId();
  const configStatus = getRazorpayConfigStatus();

  return NextResponse.json({
    status: 'ok',
    isRazorpayConfigured: configStatus.configured,
    keyConfigured: Boolean(keyId),
    keyPrefix: keyId ? keyId.slice(0, 8) : null,
    secretConfigured: Boolean(getRazorpaySecret()),
    reason: configStatus.reason || null,
  });
}
