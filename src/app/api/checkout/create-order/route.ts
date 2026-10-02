import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedCustomer } from '@/lib/customer-auth';
import { POLICY_CONFIG, getCodAdvanceAmount } from '@/config/policies';
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
import { validateAndPriceOrderItems, getActivePromotionOffers } from '@/lib/promotions';
import { validateAndCalculateCouponDiscount } from '@/lib/coupon-engine';
import { calculateCheckoutTotals, PaymentMode } from '@/lib/checkout-engine';

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
      couponCode,
      isMagicCheckout: rawIsMagic = false,
      customer: clientCustomer = {}
    } = body;
    const isMagicCheckout = Boolean(rawIsMagic);
    const rawUpper = String(rawPaymentMethod || 'COD').trim().toUpperCase();
    const paymentMethod = (rawUpper === 'CASH_ON_DELIVERY' || rawUpper === 'CASH-ON-DELIVERY') ? 'COD' : rawUpper;

    // 1. Validate Items
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Your order must contain at least one item.' 
      }, { status: 400 });
    }

    // 2. Validate Delivery Address (only mandatory for manual checkout; Magic Checkout handles address selection inside modal)
    if (!shippingAddress && !isMagicCheckout) {
      return NextResponse.json({ 
        success: false, 
        error: 'Shipping address is required.' 
      }, { status: 400 });
    }

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

    let trimmedName = '';
    let trimmedPhone = '';
    let trimmedEmail = '';
    let trimmedAddress = '';
    let trimmedDistrict = '';
    let trimmedCity = '';
    let trimmedState = '';
    let trimmedPincode = '';
    let cleanFlat = '';
    let cleanArea = '';
    let cleanLandmark = '';
    let fullShippingAddressString = '';

    if (shippingAddress) {
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

      trimmedName = (fullName || (authCustomer?.name && authCustomer.name !== 'Customer' ? authCustomer.name : '')).trim();
      trimmedPhone = (phone || authCustomer?.phone || '').trim().replace(/[^0-9]/g, '');
      trimmedEmail = (email || authCustomer?.email || '').trim();
      trimmedAddress = (addressLine1 || address || flatHouseBuilding || '').trim();
      trimmedDistrict = district ? district.trim() : '';
      trimmedCity = city.trim();
      trimmedState = state.trim();
      trimmedPincode = pincode.trim().replace(/[^0-9]/g, '');

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
      cleanFlat = trimmedAddress;
      cleanArea = (addressLine2 || area || areaStreetSector || '').trim();
      cleanLandmark = landmark ? landmark.trim() : '';

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

      fullShippingAddressString = addressParts.join(', ');
    } else {
      // 1-Click Magic Checkout flow without pre-entered address
      trimmedName = (clientCustomer.name || authCustomer?.name || 'Customer').trim();
      trimmedPhone = (clientCustomer.phone || authCustomer?.phone || '').trim().replace(/[^0-9]/g, '');
      trimmedEmail = (clientCustomer.email || authCustomer?.email || 'checkout@adrizo.com').trim();
      trimmedAddress = 'Pending Magic Checkout Selection';
      trimmedCity = 'Pending';
      trimmedState = 'Pending';
      trimmedPincode = '000000';
      cleanFlat = 'Pending Magic Checkout Selection';
      fullShippingAddressString = 'Pending Magic Checkout Selection';
    }

    let authoritativeCustomerEmail = trimmedEmail || authCustomer?.email || 'checkout@adrizo.com';
    let authoritativeCustomerPhone = trimmedPhone || authCustomer?.phone || '';
    let authoritativeCustomerName = trimmedName || authCustomer?.name || 'Customer';

    // Non-blocking Address & Profile Persistence (runs in background without delaying order creation)
    if (authenticatedUserId && shippingAddress) {
      (async () => {
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
      })().catch(() => {});
    }

    // 4. Authoritative MongoDB Product, Promotion & Inventory Verification (parallelized for latency optimization)
    const [promoResult, activeOffers] = await Promise.all([
      validateAndPriceOrderItems(items),
      getActivePromotionOffers(),
    ]);
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
      const couponResult = await validateAndCalculateCouponDiscount({
        couponCode: couponCode.trim(),
        subtotal,
        items: validatedItems.map(it => ({
          productId: it.productId,
          sku: it.sku,
          price: it.price,
          quantity: it.quantity,
        })),
        customerPhone: authoritativeCustomerPhone,
        customerEmail: authoritativeCustomerEmail,
        userId: authenticatedUserId || undefined,
        paymentMode: paymentMethod === 'COD' ? 'COD' : 'ONLINE',
      });

      if (couponResult.success) {
        couponDiscount = couponResult.discount;
        appliedCouponCode = couponResult.coupon?.code || couponCode.trim().toUpperCase();
      }
    }

    // 6. Authoritative Checkout & Promotion Calculation Engine
    // Single authoritative source of truth across Cart, Checkout, Buy Now, and Razorpay
    const paymentModeEnum: PaymentMode = paymentMethod === 'COD' ? 'COD' : 'ONLINE_RAZORPAY';

    const checkoutTotals = calculateCheckoutTotals({
      items: validatedItems.map(item => ({
        id: item.productId,
        productId: item.productId,
        name: item.productName,
        productName: item.productName,
        price: item.price,
        originalPrice: item.mrp || item.price,
        image: item.productImage,
        size: item.size,
        color: item.color,
        quantity: item.quantity,
        sku: item.sku,
        categorySlug: (item as any).categorySlug || (item as any).category?.slug,
        categoryName: (item as any).categoryName || (item as any).category?.name,
        category: (item as any).category,
        isFree: item.isFree,
        promoGroupId: item.promoGroupId,
        promotionRule: item.promotionRule,
      })),
      offers: activeOffers,
      paymentMode: paymentModeEnum,
      couponDiscount,
      shippingThreshold: POLICY_CONFIG.shipping.freeShippingThreshold,
      standardShippingFee: POLICY_CONFIG.shipping.standardFee,
    });

    subtotal = checkoutTotals.subtotalAfterBundles;
    const bundleDiscount = checkoutTotals.bundleDiscount;
    const shippingCharge = checkoutTotals.shippingCharge;
    const prepaidDiscount = checkoutTotals.prepaidDiscount;
    const finalTotal = checkoutTotals.finalOrderValue;

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
      if (trimmedPhone && trimmedPhone.length >= 10) {
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
              codCharge: Number(candidate.cod_charge || (paymentMethod === 'COD' ? checkoutTotals.codFee : 0)),
              razorpayOrderId: candidate.razorpay_order_id,
              paymentStatus: candidate.payment_status,
            };
          }
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
        console.error('[Razorpay COD Server Config Issue]', codConfigStatus.reason);
        return NextResponse.json({
          success: false,
          error: 'Unable to initialize online advance confirmation at this time. Please try again or select Pay Online.'
        }, { status: 400 });
      }

      const orderNumber = generateOrderNumber();
      const rzp = getRazorpayInstance();
      const currency = process.env.RAZORPAY_CURRENCY || 'INR';

      // Dynamic calculation: customer pays dedicated ₹99 advance online, remaining balance on delivery
      const codConfirmationAmount = checkoutTotals.amountPayableNow; // ₹99 (or full total if <= ₹99)
      const codRemainingAmount = checkoutTotals.amountDueOnDelivery; // e.g. ₹1,200
      const codAdvancePaise = Math.round(codConfirmationAmount * 100);

      // Dedicated COD advance confirmation line item for Razorpay Magic Checkout
      const codLineItems = [
        {
          sku: 'COD-ADVANCE-CONFIRMATION',
          variant_id: 'cod_advance_99',
          price: codAdvancePaise,
          offer_price: codAdvancePaise,
          quantity: 1,
          name: 'Cash on Delivery (₹99 Advance Confirmation)',
          description: `Advance confirmation for Order #${orderNumber}. Balance ₹${codRemainingAmount.toFixed(2)} payable on delivery.`,
          image_url: 'https://adrizo.com/logo.png',
        }
      ];

      // Create Razorpay Order specifically for the COD confirmation advance payment ONLY
      let razorpayOrder: any = null;
      try {
        razorpayOrder = await rzp.orders.create({
          amount: codAdvancePaise, // 9900 paise
          currency,
          receipt: `${orderNumber}-COD99`,
          line_items_total: codAdvancePaise,
          line_items: codLineItems as any,
          notes: {
            orderNumber,
            type: 'COD_ADVANCE',
            customerName: authoritativeCustomerName,
            customerEmail: authoritativeCustomerEmail,
            customerPhone: authoritativeCustomerPhone,
            orderTotal: String(finalTotal),
            codConfirmationAmount: String(codConfirmationAmount),
            codRemainingAmount: String(codRemainingAmount),
          }
        });
      } catch (codMagicErr: any) {
        console.warn('[COD Order] Magic line item rejected, falling back to standard order:', codMagicErr?.message || codMagicErr);
        razorpayOrder = await rzp.orders.create({
          amount: codAdvancePaise,
          currency,
          receipt: `${orderNumber}-COD99`,
          notes: {
            orderNumber,
            type: 'COD_ADVANCE',
            customerName: authoritativeCustomerName,
            customerEmail: authoritativeCustomerEmail,
            customerPhone: authoritativeCustomerPhone,
            orderTotal: String(finalTotal),
            codConfirmationAmount: String(codConfirmationAmount),
            codRemainingAmount: String(codRemainingAmount),
          }
        });
      }

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
        cod_charge: codConfirmationAmount, // Dedicated advance payment recorded
        discount: couponDiscount + bundleDiscount,
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
        unit_price: item.isFree ? 0 : item.price,
        total_price: item.isFree ? 0 : (item.price * item.quantity),
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
        amount: codAdvancePaise, // 9900 paise
        currency,
        key: getRazorpayKeyId(),
        total: finalTotal,
        bundleDiscount,
        subtotalAfterBundles: subtotal,
        line_items_total: codAdvancePaise,
        codConfirmationAmount,
        codRemainingAmount,
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
        console.error('[Razorpay Online Server Config Issue]', onlineConfigStatus.reason);
        return NextResponse.json({
          success: false,
          error: 'Unable to initialize payment gateway at this time. Please try again or select Cash on Delivery.'
        }, { status: 400 });
      }

      const orderNumber = generateOrderNumber();
      const rzp = getRazorpayInstance();
      const currency = process.env.RAZORPAY_CURRENCY || 'INR';

      const onlineAmountToPay = checkoutTotals.amountPayableNow; // e.g. ₹1,299 or ₹1,249
      const onlineAmountInPaise = Math.round(onlineAmountToPay * 100);
      const shippingFeePaise = shippingCharge > 0 ? Math.round(shippingCharge * 100) : 0;
      const targetLineItemsTotalPaise = Math.max(0, onlineAmountInPaise - shippingFeePaise);

      // Build official Magic Checkout line_items using authoritative checkoutTotals.unitItems
      // Group units by productId, size, color, and isFree status
      interface GroupedLineItem {
        productId: string;
        sku: string;
        name: string;
        size: string;
        color: string;
        imageUrl: string;
        mrpPaise: number;
        baseOfferPricePaise: number;
        offerPricePaise: number;
        quantity: number;
        isFree: boolean;
        bundleRule?: string;
      }

      const groupedMap = new Map<string, GroupedLineItem>();

      for (const unit of (checkoutTotals.unitItems || [])) {
        const key = `${unit.productId}_${unit.size || 'std'}_${unit.color || 'std'}_${unit.isFree ? 'FREE' : 'PAID'}`;
        const existing = groupedMap.get(key);

        let imageUrl = unit.image || '';
        if (imageUrl && !imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
          imageUrl = `https://adrizo.com${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
        }

        const mrpPaise = Math.round((unit.mrp || unit.price || 2999) * 100);
        const baseOfferPricePaise = unit.isFree ? 0 : Math.round(unit.effectivePrice * 100);

        if (existing) {
          existing.quantity += 1;
        } else {
          groupedMap.set(key, {
            productId: unit.productId,
            sku: unit.sku || unit.productId,
            name: unit.name,
            size: unit.size || 'Standard',
            color: unit.color || 'Standard',
            imageUrl,
            mrpPaise,
            baseOfferPricePaise,
            offerPricePaise: baseOfferPricePaise,
            quantity: 1,
            isFree: unit.isFree,
            bundleRule: unit.bundleRule,
          });
        }
      }

      const lineItemGroups = Array.from(groupedMap.values());
      const paidGroups = lineItemGroups.filter(it => !it.isFree && it.quantity > 0);
      const totalPaidUnits = paidGroups.reduce((acc, it) => acc + it.quantity, 0);

      // Deduct extra discounts (prepaid, coupon) strictly across paid items without going negative
      const basePaidPaiseSum = lineItemGroups.reduce((acc, it) => acc + (it.baseOfferPricePaise * it.quantity), 0);
      let discountToDistributePaise = Math.max(0, basePaidPaiseSum - targetLineItemsTotalPaise);

      if (discountToDistributePaise > 0 && totalPaidUnits > 0) {
        for (const grp of paidGroups) {
          if (discountToDistributePaise <= 0) break;
          const perUnitShare = Math.floor(discountToDistributePaise / totalPaidUnits);
          const maxDeductible = grp.baseOfferPricePaise;
          const actualDeduction = Math.min(maxDeductible, perUnitShare);
          grp.offerPricePaise = Math.max(0, grp.baseOfferPricePaise - actualDeduction);
        }
      }

      // Adjust any residual rounding difference to ensure sum(offer_price * qty) === targetLineItemsTotalPaise
      let currentItemsTotalPaise = lineItemGroups.reduce((sum, it) => sum + (it.offerPricePaise * it.quantity), 0);
      let diff = targetLineItemsTotalPaise - currentItemsTotalPaise;

      if (diff !== 0 && paidGroups.length > 0) {
        for (const grp of paidGroups) {
          if (diff === 0) break;
          const candidate = grp.offerPricePaise + diff;
          if (candidate >= 0) {
            grp.offerPricePaise = candidate;
            diff = 0;
            break;
          } else {
            diff += grp.offerPricePaise;
            grp.offerPricePaise = 0;
          }
        }
      }

      currentItemsTotalPaise = lineItemGroups.reduce((sum, it) => sum + (it.offerPricePaise * it.quantity), 0);

      const magicLineItems = lineItemGroups.map(item => {
        const descParts: string[] = [];
        if (item.size && item.size !== 'Standard') descParts.push(`Size: ${item.size}`);
        if (item.color && item.color !== 'Standard') descParts.push(`Color: ${item.color}`);
        if (item.isFree) descParts.push('FREE Promotional Item');
        const description = descParts.join(' | ') || item.name;

        const hasValidImage = Boolean(item.imageUrl && item.imageUrl.startsWith('https://') && !item.imageUrl.includes('placeholder'));

        return {
          sku: item.sku,
          variant_id: `${item.productId}_${item.size}_${item.color}_${item.isFree ? 'FREE' : 'PAID'}`,
          price: Math.max(item.mrpPaise, item.offerPricePaise),
          offer_price: item.offerPricePaise,
          quantity: item.quantity,
          name: item.isFree ? `${item.name} (FREE)` : item.name,
          description,
          ...(hasValidImage ? { image_url: item.imageUrl } : {}),
        };
      });

      const isLineItemsValid = magicLineItems.length > 0 &&
        magicLineItems.every(it => it.offer_price >= 0 && it.price >= it.offer_price) &&
        (currentItemsTotalPaise + shippingFeePaise === onlineAmountInPaise);

      // Create Razorpay Order server-side with Magic Checkout line items, with seamless fallback
      let razorpayOrder: any = null;

      if (isLineItemsValid) {
        try {
          razorpayOrder = await rzp.orders.create({
            amount: onlineAmountInPaise,
            currency,
            receipt: orderNumber,
            line_items_total: currentItemsTotalPaise,
            line_items: magicLineItems as any,
            shipping_fee: shippingFeePaise,
            notes: {
              orderNumber,
              customerName: authoritativeCustomerName,
              customerEmail: authoritativeCustomerEmail,
              customerPhone: authoritativeCustomerPhone,
              checkoutType: isMagicCheckout ? 'MAGIC_1CC' : 'STANDARD',
            }
          });
        } catch (magicErr: any) {
          console.warn('[Razorpay Order] Magic checkout line_items rejected, falling back to standard order:', magicErr?.message || magicErr);
        }
      }

      // Authoritative Fallback: Standard Razorpay order (always succeeds if credentials are valid)
      if (!razorpayOrder) {
        razorpayOrder = await rzp.orders.create({
          amount: onlineAmountInPaise,
          currency,
          receipt: orderNumber,
          notes: {
            orderNumber,
            customerName: authoritativeCustomerName,
            customerEmail: authoritativeCustomerEmail,
            customerPhone: authoritativeCustomerPhone,
            checkoutType: 'STANDARD',
          }
        });
      }

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
        discount: couponDiscount + bundleDiscount + prepaidDiscount,
        coupon_code: appliedCouponCode,
        total_amount: onlineAmountToPay,
        payment_method: 'ONLINE_RAZORPAY',
        payment_status: 'PENDING',
        order_status: 'PENDING',
        razorpay_order_id: razorpayOrder.id,
        delivery_partner: null,
        tracking_id: null,
        tracking_status: 'ORDER_RECEIVED',
      };

      const onlineItemsPayload = lineItemGroups.map(item => ({
        product_id: item.productId,
        product_name: item.isFree ? `${item.name} (FREE Offer)` : item.name,
        product_image: item.imageUrl || null,
        mrp: item.mrpPaise ? item.mrpPaise / 100 : null,
        sku: item.sku || null,
        size: item.size || null,
        color: item.color || null,
        quantity: item.quantity,
        unit_price: item.isFree ? 0 : (item.offerPricePaise / 100),
        total_price: item.isFree ? 0 : ((item.offerPricePaise * item.quantity) / 100),
      }));

      const saveResult = await saveOrderToSupabase(adminSupabase, onlineOrderPayload, onlineItemsPayload);
      const supaOrderId = saveResult.orderId;

      if (!supaOrderId) {
        console.error('[Supabase Online Order Failure] Supabase order write failed:', saveResult.error);
        return NextResponse.json({
          success: false,
          error: saveResult.error || 'Unable to start payment. Please try again.'
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
        total: onlineAmountToPay,
        prepaidDiscount,
        bundleDiscount,
        subtotalAfterBundles: subtotal,
        line_items_total: razorpayOrder.line_items_total || razorpayOrder.amount,
        isMagicCheckout,
        customer: {
          name: authoritativeCustomerName,
          email: authoritativeCustomerEmail,
          phone: authoritativeCustomerPhone
        }
      });
    }


    return NextResponse.json({ success: false, error: 'Invalid payment method selected.' }, { status: 400 });

  } catch (error: any) {
    console.error('[Create Order API Error]', error);
    const rawDesc = error?.error?.description || error?.description || error?.message;
    const rawLower = String(rawDesc || '').toLowerCase();

    // Prevent internal gateway diagnostics from leaking to customers
    let customerError = 'Unable to start payment. Please try again or choose Cash on Delivery.';
    if (rawDesc && typeof rawDesc === 'string' && !rawLower.includes('razorpay') && !rawLower.includes('secret') && !rawLower.includes('key') && !rawLower.includes('env') && !rawLower.includes('auth')) {
      customerError = rawDesc;
    }

    return NextResponse.json({
      success: false,
      error: customerError
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
