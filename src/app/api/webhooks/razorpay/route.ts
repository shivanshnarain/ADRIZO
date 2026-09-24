import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminClient } from '@/lib/supabase/admin';
import { verifyRazorpayWebhookSignature } from '@/lib/razorpay';
import { resolveOrderFromSupabase } from '@/lib/order-resolver';
import { sendOrderConfirmationEmail } from '@/lib/order-email';
import { autoSyncOrderToShiprocket } from '@/lib/shiprocket-auto-sync';
import { recordCouponUsage } from '@/lib/coupon-engine';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing webhook signature' }, { status: 400 });
    }

    // 1. Verify Webhook Signature
    const isValid = verifyRazorpayWebhookSignature(rawBody, signature);
    if (!isValid) {
      console.warn('[Razorpay Webhook] Invalid signature rejected');
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
    }

    const event = JSON.parse(rawBody);
    const eventType = event.event;

    console.log(`[Razorpay Webhook Event] ${eventType}`);

    const supabase = getAdminClient();

    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const paymentEntity = event.payload?.payment?.entity;
      const orderEntity = event.payload?.order?.entity;

      const razorpayOrderId = paymentEntity?.order_id || orderEntity?.id;
      const razorpayPaymentId = paymentEntity?.id;

      if (razorpayOrderId) {
        // Fetch Order from Supabase
        const { data: supaOrders } = await supabase
          .from('orders')
          .select('*, order_items(*)')
          .eq('razorpay_order_id', razorpayOrderId);

        const order = supaOrders?.[0];

        // Idempotency check
        if (order && order.payment_status === 'PAID') {
          return NextResponse.json({ status: 'ok', received: true, alreadyProcessed: true }, { status: 200 });
        }

        // Update Supabase
        const webhookUpdate: any = {
          payment_status: 'PAID',
          order_status: 'CONFIRMED',
          razorpay_payment_id: razorpayPaymentId,
          updated_at: new Date().toISOString(),
        };

        const shipping = orderEntity?.shipping_address;
        const customer = orderEntity?.customer_details;

        if (shipping) {
          const houseFlat = shipping.line1 || shipping.address1 || null;
          const areaStreet = shipping.line2 || shipping.address2 || null;
          const city = shipping.city || null;
          const state = shipping.state || null;
          const pincode = shipping.postal_code || shipping.zipcode || null;
          const fullParts = [houseFlat, areaStreet, city, state ? `${state} - ${pincode || ''}` : pincode, 'India'].filter(Boolean);
          if (fullParts.length > 0) {
            webhookUpdate.shipping_address = fullParts.join(', ');
            if (houseFlat) webhookUpdate.house_flat = houseFlat;
            if (areaStreet) webhookUpdate.area_street = areaStreet;
            if (city) webhookUpdate.city = city;
            if (state) webhookUpdate.state = state;
            if (pincode) webhookUpdate.pincode = pincode;
          }
        }
        if (shipping?.name || customer?.name) {
          webhookUpdate.customer_name = shipping?.name || customer?.name;
        }
        if (shipping?.contact || customer?.contact) {
          webhookUpdate.customer_phone = (shipping?.contact || customer?.contact).replace(/\D/g, '').slice(-10);
        }
        if (customer?.email) {
          webhookUpdate.customer_email = customer.email;
        }

        await supabase
          .from('orders')
          .update(webhookUpdate)
          .eq('razorpay_order_id', razorpayOrderId);

        console.log(`[Razorpay Webhook] Order ${order?.order_number || razorpayOrderId} successfully marked PAID`);

        // Trigger Automated Order Confirmation Email with PDF invoice attached
        resolveOrderFromSupabase(order?.id || razorpayOrderId)
          .then(resolved => {
            if (resolved) {
              resolved.paymentStatus = 'PAID';
              resolved.orderStatus = 'CONFIRMED';
              sendOrderConfirmationEmail(resolved);
            }
          })
          .catch(err => console.error('[Razorpay Webhook Email Error]', err));

        // Automatically sync confirmed prepaid order to Shiprocket
        await autoSyncOrderToShiprocket(order?.id || razorpayOrderId).catch(err =>
          console.error('[Automatic Shiprocket Sync Error in Webhook]', err)
        );

        // Authoritatively record coupon redemption in database
        if (order?.coupon_code && Number(order?.discount) > 0) {
          const primaryCoupon = String(order.coupon_code).split('+')[0].trim();
          recordCouponUsage({
            couponCode: primaryCoupon,
            orderId: order.id,
            orderNumber: order.order_number,
            customerEmail: order.customer_email,
            customerPhone: order.customer_phone,
            userId: order.customer_id,
            discountAmount: Number(order.discount),
          }).catch(err => console.error('[Razorpay Webhook Coupon Usage Record Warning]', err));
        }
      }
    } else if (eventType === 'payment.failed') {
      const paymentEntity = event.payload?.payment?.entity;
      const razorpayOrderId = paymentEntity?.order_id;

      if (razorpayOrderId) {
        // Update Supabase
        await supabase
          .from('orders')
          .update({
            payment_status: 'FAILED',
            updated_at: new Date().toISOString(),
          })
          .eq('razorpay_order_id', razorpayOrderId);

        console.log(`[Razorpay Webhook] Order ${razorpayOrderId} marked FAILED`);
      }
    }

    return NextResponse.json({ status: 'ok', received: true }, { status: 200 });

  } catch (error: any) {
    console.error('[Razorpay Webhook Handler Error]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
