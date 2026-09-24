import { NextRequest, NextResponse } from 'next/server';
import { getEligiblePromotions } from '@/lib/coupon-engine';
import { getAdminClient } from '@/lib/supabase/admin';

async function handlePromotionsRequest(req: NextRequest) {
  try {
    let order_id: string | undefined;
    let razorpay_order_id: string | undefined;
    let contact: string | undefined;
    let email: string | undefined;
    let subtotal: number | undefined;
    let items: any[] = [];

    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      order_id = body.order_id || body.orderId;
      razorpay_order_id = body.razorpay_order_id || body.razorpayOrderId;
      contact = body.contact || body.phone;
      email = body.email;
      subtotal = body.subtotal ? Number(body.subtotal) : undefined;
      items = Array.isArray(body.items) ? body.items : [];
    } else {
      const { searchParams } = new URL(req.url);
      order_id = searchParams.get('order_id') || searchParams.get('orderId') || undefined;
      razorpay_order_id = searchParams.get('razorpay_order_id') || searchParams.get('razorpayOrderId') || undefined;
      contact = searchParams.get('contact') || searchParams.get('phone') || undefined;
      email = searchParams.get('email') || undefined;
      const rawSub = searchParams.get('subtotal');
      if (rawSub) subtotal = Number(rawSub);
    }

    // If order reference provided, look up authoritative subtotal and customer info
    if (order_id || razorpay_order_id) {
      try {
        const supabase = getAdminClient();
        let q = supabase.from('orders').select('subtotal, total_amount, customer_email, customer_phone, order_items(*)');
        if (razorpay_order_id) {
          q = q.eq('razorpay_order_id', razorpay_order_id);
        } else if (order_id) {
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(order_id);
          q = isUuid ? q.eq('id', order_id) : q.eq('order_number', order_id);
        }
        const { data: supaOrders } = await q.limit(1);
        if (supaOrders && supaOrders.length > 0) {
          const o = supaOrders[0];
          if (subtotal === undefined) {
            subtotal = Number(o.subtotal ?? o.total_amount);
          }
          if (!email && o.customer_email) email = o.customer_email;
          if (!contact && o.customer_phone) contact = o.customer_phone;
          if (items.length === 0 && Array.isArray(o.order_items)) {
            items = o.order_items.map((it: any) => ({
              productId: it.product_id,
              sku: it.sku,
              price: it.unit_price,
              quantity: it.quantity,
            }));
          }
        }
      } catch (err) {
        console.warn('[Promotions API] Order resolution warning:', err);
      }
    }

    const eligible = await getEligiblePromotions({
      subtotal,
      items,
      customerEmail: email,
      customerPhone: contact,
      orderId: order_id,
      razorpayOrderId: razorpay_order_id,
    });

    return NextResponse.json({
      success: true,
      promotions: eligible,
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error('[GET /api/razorpay/promotions Error]', error);
    return NextResponse.json({
      success: false,
      error: { description: error.message || 'Unable to retrieve promotions.' },
      promotions: [],
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return handlePromotionsRequest(req);
}

export async function POST(req: NextRequest) {
  return handlePromotionsRequest(req);
}
