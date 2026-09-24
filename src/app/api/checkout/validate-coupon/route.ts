import { NextRequest, NextResponse } from 'next/server';
import { validateAndCalculateCouponDiscount } from '@/lib/coupon-engine';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { couponCode, subtotal, items = [], customerEmail, customerPhone, userId } = body;

    const numSubtotal = Number(subtotal) || 0;
    if (numSubtotal <= 0) {
      return NextResponse.json({ valid: false, error: 'Subtotal must be greater than 0.' }, { status: 400 });
    }

    const result = await validateAndCalculateCouponDiscount({
      couponCode,
      subtotal: numSubtotal,
      items,
      customerEmail,
      customerPhone,
      userId,
    });

    if (!result.success) {
      return NextResponse.json({
        valid: false,
        error: result.error?.description || 'Invalid promo code.',
      }, { status: 400 });
    }

    return NextResponse.json({
      valid: true,
      coupon: {
        code: result.coupon?.code,
        type: result.coupon?.discountType === 'percentage' ? 'PERCENT' : 'FLAT',
        value: result.coupon?.discountValue,
        discount: result.discount,
        minimumOrderValue: result.coupon?.minimumOrderValue,
        maximumDiscount: result.coupon?.maximumDiscount,
      },
      discount: result.discount,
      finalPayable: result.finalPayable,
    });
  } catch (error: any) {
    return NextResponse.json({
      valid: false,
      error: error.message || 'Failed to validate coupon.',
    }, { status: 500 });
  }
}
