import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminClient } from '@/lib/supabase/admin';
import { verifyRazorpaySignature } from '@/lib/razorpay';
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

    // 4. Update Supabase Order to target payment status and CONFIRMED
    let supaUpdate = supabase.from('orders').update({
      payment_status: targetPaymentStatus,
      order_status: 'CONFIRMED',
      razorpay_payment_id,
      razorpay_signature,
      updated_at: new Date().toISOString(),
    });

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
        customerEmail: supaOrder.customer_email,
        customerPhone: supaOrder.customer_phone,
        userId: supaOrder.customer_id,
        discountAmount: Number(supaOrder.discount),
      }).catch(err => console.error('[Verify Payment Coupon Usage Record Warning]', err));
    }

    return NextResponse.json({
      success: true,
      orderId: supaOrder?.id || orderId,
      orderNumber: supaOrder?.order_number,
      paymentStatus: targetPaymentStatus
    });

  } catch (error: any) {
    console.error('[Payment Verification Error]', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Payment verification failed due to internal error.'
    }, { status: 500 });
  }
}
