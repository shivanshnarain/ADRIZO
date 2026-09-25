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

        // Ingest verified customer identity and shipping address from Magic Checkout if pending
        const webhookUpdates: any = {
          payment_status: 'PAID',
          order_status: 'CONFIRMED',
          razorpay_payment_id: razorpayPaymentId,
          updated_at: new Date().toISOString(),
        };

        const paymentContact = paymentEntity?.contact ? String(paymentEntity.contact).replace(/^\+91/, '').replace(/\D/g, '') : null;
        if (paymentContact && (!order?.customer_phone || order.customer_phone === '')) {
          webhookUpdates.customer_phone = paymentContact;
        }
        if (paymentEntity?.email && (!order?.customer_email || order.customer_email === 'checkout@adrizo.com')) {
          webhookUpdates.customer_email = paymentEntity.email.trim();
        }

        const magicAddress = orderEntity?.shipping_address;
        if (magicAddress && (order?.shipping_address === 'Pending Magic Checkout Selection' || !order?.shipping_address)) {
          const line1 = magicAddress.line1 || magicAddress.address1 || '';
          const line2 = magicAddress.line2 || magicAddress.address2 || '';
          const city = magicAddress.city || '';
          const state = magicAddress.state || '';
          const pin = magicAddress.zipcode || magicAddress.postal_code || magicAddress.pincode || '';
          const name = magicAddress.name || magicAddress.full_name || '';

          if (name && (order.customer_name === 'Customer' || !order.customer_name)) {
            webhookUpdates.customer_name = name;
          }
          if (line1) webhookUpdates.house_flat = line1;
          if (line2) webhookUpdates.area_street = line2;
          if (city) webhookUpdates.city = city;
          if (state) webhookUpdates.state = state;
          if (pin) webhookUpdates.pincode = pin;
          webhookUpdates.shipping_address = [line1, line2, city, state ? `${state} - ${pin}` : pin, 'India'].filter(Boolean).join(', ');
        }

        // Update Supabase
        await supabase
          .from('orders')
          .update(webhookUpdates)
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
