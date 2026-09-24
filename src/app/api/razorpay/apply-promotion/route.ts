import { NextRequest, NextResponse } from 'next/server';
import { validateAndCalculateCouponDiscount } from '@/lib/coupon-engine';
import { getAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const rawCode = body.code || body.couponCode || body.promoCode;
    const order_id = body.order_id || body.orderId;
    const razorpay_order_id = body.razorpay_order_id || body.razorpayOrderId;
    const email = body.email || body.customerEmail;
    const phone = body.contact || body.phone || body.customerPhone;
    const userId = body.userId;
    let subtotal = body.subtotal !== undefined ? Number(body.subtotal) : undefined;
    let items = Array.isArray(body.items) ? body.items : [];

    if (!rawCode || typeof rawCode !== 'string' || !rawCode.trim()) {
      return NextResponse.json({
        success: false,
        error: { code: 'EMPTY_CODE', description: 'Promo code is required.' },
        message: 'Promo code is required.',
      }, { status: 400 });
    }

    // Resolve order details from Supabase if order identifier is provided
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
        console.warn('[Apply Promotion] Order resolution warning:', err);
      }
    }

    // If subtotal still not found, derive from items if present
    if (subtotal === undefined) {
      if (items.length > 0) {
        subtotal = items.reduce((acc: number, it: any) => acc + (Number(it.price || 0) * (Number(it.quantity) || 1)), 0);
      } else {
        subtotal = 0;
      }
    }

    const finalSubtotal: number = typeof subtotal === 'number' && !isNaN(subtotal) ? subtotal : 0;

    const validationResult = await validateAndCalculateCouponDiscount({
      couponCode: rawCode,
      subtotal: finalSubtotal,
      items,
      customerEmail: email,
      customerPhone: phone,
      userId,
      orderId: order_id,
      razorpayOrderId: razorpay_order_id,
    });

    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
        error: validationResult.error,
        message: validationResult.error?.description || 'Promo code is not eligible.',
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      coupon: validationResult.coupon,
      code: validationResult.coupon?.code,
      discount: validationResult.discount,
      discountInPaise: validationResult.discountInPaise,
      amount: validationResult.discountInPaise, // Required by Razorpay Magic Checkout
      subtotal: validationResult.subtotal,
      finalPayable: validationResult.finalPayable,
      currency: validationResult.currency,
      message: `Promo code "${validationResult.coupon?.code}" applied successfully! You saved ₹${validationResult.discount}.`,
    }, { status: 200 });
  } catch (error: any) {
    console.error('[POST /api/razorpay/apply-promotion Error]', error);
    return NextResponse.json({
      success: false,
      error: { description: error.message || 'Unable to apply promo code.' },
      message: error.message || 'Unable to apply promo code.',
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code') || searchParams.get('couponCode') || searchParams.get('promoCode');
  const rawSub = searchParams.get('subtotal');
  const subtotal = rawSub ? Number(rawSub) : 0;

  if (!code) {
    return NextResponse.json({
      status: 'active',
      endpoint: '/api/razorpay/apply-promotion',
      message: 'Razorpay Magic Checkout Apply Promotion API is active. Send POST request with { code, subtotal, items } or query ?code=...&subtotal=...',
    }, { status: 200 });
  }

  const validationResult = await validateAndCalculateCouponDiscount({
    couponCode: code.trim(),
    subtotal,
  });

  if (!validationResult.success) {
    return NextResponse.json({
      success: false,
      error: validationResult.error,
      message: validationResult.error?.description || 'Promo code is not eligible.',
    }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    coupon: validationResult.coupon,
    code: validationResult.coupon?.code,
    discount: validationResult.discount,
    discountInPaise: validationResult.discountInPaise,
    amount: validationResult.discountInPaise,
    subtotal: validationResult.subtotal,
    finalPayable: validationResult.finalPayable,
    currency: validationResult.currency,
  }, { status: 200 });
}
