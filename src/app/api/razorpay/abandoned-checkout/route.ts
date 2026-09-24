import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyRazorpayWebhookSignature } from '@/lib/razorpay';

export async function POST(req: NextRequest) {
  try {
    // 1. Read raw body BEFORE JSON parsing for accurate HMAC signature verification
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    if (!signature) {
      console.warn('[Abandoned Checkout Webhook] Missing x-razorpay-signature header');
      return NextResponse.json({ error: 'Missing webhook signature' }, { status: 401 });
    }

    // 2. Validate webhook signature using HMAC-SHA256 and server-side RAZORPAY_WEBHOOK_SECRET
    const isValidSignature = verifyRazorpayWebhookSignature(rawBody, signature);
    if (!isValidSignature) {
      console.warn('[Abandoned Checkout Webhook] Invalid signature rejected');
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 403 });
    }

    // 3. Parse validated JSON payload
    let event: any = {};
    try {
      event = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Malformed JSON payload' }, { status: 400 });
    }

    // 4. Derive unique idempotency / event identifier
    const eventId =
      event.token ||
      event.cart_token ||
      event.id ||
      event.event_id ||
      (event.order_id ? `order_${event.order_id}_${event.phone || event.email}` : null) ||
      `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // 5. Replay / Duplicate Webhook Protection
    if (eventId) {
      const existing = await prisma.abandonedCheckout.findUnique({
        where: { eventId },
      }).catch(() => null);

      if (existing) {
        return NextResponse.json({
          status: 'ok',
          received: true,
          alreadyProcessed: true,
          id: existing.id,
        }, { status: 200 });
      }
    }

    // 6. Extract customer and cart information safely (no sensitive payment data)
    const email = event.email ? String(event.email).trim().toLowerCase() : null;
    const phone = event.phone ? String(event.phone).trim() : null;
    const customerName = event.name || event.customer_name || null;
    const orderId = event.order_id || null;
    const razorpayOrderId = event.razorpay_order_id || null;
    const abandonedCheckoutUrl = event.abandoned_checkout_url || null;
    const currency = event.currency || 'INR';

    // Calculate total amount from line items if provided, or from total_price
    let totalAmount = 0;
    if (event.total_price !== undefined) {
      totalAmount = Number(event.total_price);
    } else if (Array.isArray(event.line_items) && event.line_items.length > 0) {
      const sumPaise = event.line_items.reduce((acc: number, it: any) => {
        const p = Number(it.price ?? it.variant_price ?? 0);
        const q = Number(it.quantity ?? 1);
        return acc + (p * q);
      }, 0);
      // In Razorpay webhooks, line item prices may be in paise or rupees; if > 10000 assume paise
      totalAmount = sumPaise > 10000 ? Math.round(sumPaise / 100) : sumPaise;
    }

    // Sanitize line items to store clean product metadata without sensitive tokens
    const sanitizedItems = Array.isArray(event.line_items)
      ? event.line_items.map((it: any) => ({
          productId: it.product_id || it.id,
          variantId: it.variant_id,
          sku: it.sku,
          name: it.name || it.title,
          price: it.price,
          quantity: it.quantity || 1,
          imageUrl: it.image_url,
        }))
      : [];

    const utmParameters = event.utm_parameters ? JSON.stringify(event.utm_parameters) : null;

    // Sanitize raw event: omit sensitive headers or non-cart internals
    const sanitizedRawEvent = JSON.stringify({
      platform: event.platform,
      shop_id: event.shop_id,
      timestamp: new Date().toISOString(),
      itemCount: sanitizedItems.length,
    });

    // 7. Store valid abandoned-checkout record in MongoDB
    const record = await prisma.abandonedCheckout.create({
      data: {
        eventId,
        orderId,
        razorpayOrderId,
        customerEmail: email,
        customerPhone: phone,
        customerName,
        cartItems: sanitizedItems.length > 0 ? JSON.stringify(sanitizedItems) : null,
        totalAmount,
        currency,
        status: 'ABANDONED',
        abandonedCheckoutUrl,
        utmParameters,
        rawEvent: sanitizedRawEvent,
      },
    });

    console.log(`[Abandoned Checkout Recorded] ID: ${record.id} | Phone: ${phone || 'N/A'} | Email: ${email || 'N/A'} | Items: ${sanitizedItems.length}`);

    return NextResponse.json({
      status: 'ok',
      received: true,
      id: record.id,
    }, { status: 200 });

  } catch (error: any) {
    console.error('[Abandoned Checkout Webhook Handler Error]', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'active',
    endpoint: '/api/razorpay/abandoned-checkout',
    message: 'Razorpay Magic Checkout Abandoned Checkout Webhook receiver is active. Send POST requests with x-razorpay-signature.',
  }, { status: 200 });
}
