import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminClient } from '@/lib/supabase/admin';
import { verifyRazorpaySignature, getRazorpayInstance } from '@/lib/razorpay';
import { resolveOrderFromSupabase } from '@/lib/order-resolver';
import { sendOrderConfirmationEmail } from '@/lib/order-email';
import { autoSyncOrderToShiprocket } from '@/lib/shiprocket-auto-sync';
import { recordCouponUsage } from '@/lib/coupon-engine';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      orderId, 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature 
    } = body;

    if (!orderId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({
        success: false,
        error: 'Missing required payment verification details.'
      }, { status: 400 });
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);
    const supabase = getAdminClient();

    // 1. Verify Signature Server-Side using HMAC-SHA256
    const isSignatureValid = verifyRazorpaySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isSignatureValid) {
      console.error('[Payment Verification Failed] Invalid signature', { orderId, razorpay_order_id });
      
      let failQuery = supabase.from('orders').update({ 
        payment_status: 'FAILED',
        updated_at: new Date().toISOString()
      });
      if (isUuid) {
        failQuery = failQuery.eq('id', orderId);
      } else {
        failQuery = failQuery.eq('razorpay_order_id', razorpay_order_id);
      }
      await failQuery;

      return NextResponse.json({
        success: false,
        error: 'Payment verification failed: invalid signature. If amount was deducted, it will be refunded within 3–5 business days.'
      }, { status: 400 });
    }

    // 2. Fetch Order from Supabase (authoritative source)
    let orderQuery = supabase
      .from('orders')
      .select('*, order_items(*)');
    if (isUuid) {
      orderQuery = orderQuery.eq('id', orderId);
    } else {
      orderQuery = orderQuery.eq('razorpay_order_id', razorpay_order_id);
    }
    const { data: supaOrders, error: supaErr } = await orderQuery;
    const supaOrder = supaOrders?.[0];

    const isCod = supaOrder?.payment_method === 'COD';
    const targetPaymentStatus = isCod ? 'COD_CONFIRMATION_PAID' : 'PAID';

    // 3. Idempotency check: if order already marked as verified or confirmed, return success
    if (supaOrder && (supaOrder.payment_status === targetPaymentStatus || supaOrder.payment_status === 'PAID' || supaOrder.order_status === 'CONFIRMED')) {
      return NextResponse.json({
        success: true,
        orderId: supaOrder.id,
        orderNumber: supaOrder.order_number,
        paymentStatus: supaOrder.payment_status,
        alreadyProcessed: true
      });
    }

    // 3b. Fetch authoritative order & customer/shipping details from Razorpay Magic Checkout
    let rzpShippingAddress: string | null = null;
    let rzpCustomerName: string | null = null;
    let rzpCustomerPhone: string | null = null;
    let rzpCustomerEmail: string | null = null;
    let rzpHouseFlat: string | null = null;
    let rzpAreaStreet: string | null = null;
    let rzpCity: string | null = null;
    let rzpState: string | null = null;
    let rzpPincode: string | null = null;

    try {
      const rzp = getRazorpayInstance();
      const [rzpOrder, rzpPayment] = await Promise.all([
        rzp.orders.fetch(razorpay_order_id).catch(() => null),
        rzp.payments.fetch(razorpay_payment_id).catch(() => null),
      ]);

      const shipping = (rzpOrder as any)?.shipping_address;
      const customer = (rzpOrder as any)?.customer_details;

      if (shipping) {
        rzpHouseFlat = shipping.line1 || shipping.address1 || null;
        rzpAreaStreet = shipping.line2 || shipping.address2 || null;
        rzpCity = shipping.city || null;
        rzpState = shipping.state || null;
        rzpPincode = shipping.postal_code || shipping.zipcode || null;
        rzpCustomerName = shipping.name || null;
        rzpCustomerPhone = shipping.contact || null;

        const parts = [
          rzpHouseFlat,
          rzpAreaStreet,
          rzpCity,
          rzpState ? `${rzpState} - ${rzpPincode || ''}` : rzpPincode,
          'India',
        ].filter(Boolean);
        if (parts.length > 0) {
          rzpShippingAddress = parts.join(', ');
        }
      }

      if (customer) {
        if (!rzpCustomerName && customer.name) rzpCustomerName = customer.name;
        if (!rzpCustomerPhone && customer.contact) rzpCustomerPhone = customer.contact;
        if (customer.email) rzpCustomerEmail = customer.email;
      }

      if (rzpPayment) {
        if (!rzpCustomerEmail && (rzpPayment as any).email) rzpCustomerEmail = (rzpPayment as any).email;
        if (!rzpCustomerPhone && (rzpPayment as any).contact) rzpCustomerPhone = (rzpPayment as any).contact;
      }
    } catch (fetchErr) {
      console.warn('[Verify Payment Razorpay Order/Payment Fetch Warning]', fetchErr);
    }

    // 4. Update Supabase Order to target payment status and CONFIRMED with Magic Checkout shipping info
    const updatePayload: any = {
      payment_status: targetPaymentStatus,
      order_status: 'CONFIRMED',
      razorpay_payment_id,
      razorpay_signature,
      updated_at: new Date().toISOString(),
    };

    if (rzpShippingAddress) {
      updatePayload.shipping_address = rzpShippingAddress;
      if (rzpHouseFlat) updatePayload.house_flat = rzpHouseFlat;
      if (rzpAreaStreet) updatePayload.area_street = rzpAreaStreet;
      if (rzpCity) updatePayload.city = rzpCity;
      if (rzpState) updatePayload.state = rzpState;
      if (rzpPincode) updatePayload.pincode = rzpPincode;
    }

    if (rzpCustomerName && rzpCustomerName !== 'Customer' && (!supaOrder?.customer_name || supaOrder.customer_name === 'Customer')) {
      updatePayload.customer_name = rzpCustomerName;
    }
    if (rzpCustomerPhone && (!supaOrder?.customer_phone || supaOrder.customer_phone.length < 10)) {
      updatePayload.customer_phone = rzpCustomerPhone.replace(/\D/g, '').slice(-10);
    }
    if (rzpCustomerEmail && !supaOrder?.customer_email) {
      updatePayload.customer_email = rzpCustomerEmail;
    }

    let supaUpdate = supabase.from('orders').update(updatePayload);

    if (isUuid) {
      supaUpdate = supaUpdate.eq('id', orderId);
    } else {
      supaUpdate = supaUpdate.eq('razorpay_order_id', razorpay_order_id);
    }
    await supaUpdate;

    // 5. Trigger Automated Order Confirmation Email with PDF invoice attached
    resolveOrderFromSupabase(supaOrder?.id || orderId)
      .then(resolved => {
        if (resolved) {
          resolved.paymentStatus = targetPaymentStatus;
          resolved.orderStatus = 'CONFIRMED';
          sendOrderConfirmationEmail(resolved);
        }
      })
      .catch(err => console.error('[Verify Payment Email Background Error]', err));

    // 6. Automatically sync confirmed order to Shiprocket
    await autoSyncOrderToShiprocket(supaOrder?.id || orderId).catch(err =>
      console.error('[Automatic Shiprocket Sync Error on Payment Verification]', err)
    );

    // 7. Authoritatively record coupon redemption in database
    if (supaOrder?.coupon_code && Number(supaOrder?.discount) > 0) {
      const primaryCoupon = String(supaOrder.coupon_code).split('+')[0].trim();
      recordCouponUsage({
        couponCode: primaryCoupon,
        orderId: supaOrder.id,
        orderNumber: supaOrder.order_number,
        customerEmail: rzpCustomerEmail || supaOrder.customer_email,
        customerPhone: rzpCustomerPhone || supaOrder.customer_phone,
        userId: supaOrder.customer_id,
        discountAmount: Number(supaOrder.discount),
      }).catch(err => console.error('[Verify Payment Coupon Usage Record Warning]', err));
    }

    return NextResponse.json({
      success: true,
      orderId: supaOrder?.id || orderId,
      orderNumber: supaOrder?.order_number,
      paymentStatus: targetPaymentStatus,
      shippingAddress: rzpShippingAddress || supaOrder?.shipping_address,
      customerName: rzpCustomerName || supaOrder?.customer_name,
      customerPhone: rzpCustomerPhone || supaOrder?.customer_phone,
      customerEmail: rzpCustomerEmail || supaOrder?.customer_email,
    });

  } catch (error: any) {
    console.error('[Payment Verification Error]', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Payment verification failed due to internal error.'
    }, { status: 500 });
  }
}
