import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { couponCode, subtotal } = body;

    if (!couponCode || typeof couponCode !== 'string') {
      return NextResponse.json({ valid: false, error: 'Promo code is required.' }, { status: 400 });
    }

    const numSubtotal = Number(subtotal) || 0;
    if (numSubtotal <= 0) {
      return NextResponse.json({ valid: false, error: 'Subtotal must be greater than 0.' }, { status: 400 });
    }

    // Retrieve active discount coupons from StoreSetting
    let couponsList: any[] = [
      { id: 'disc-1', code: 'WELCOME10', type: 'PERCENT', value: 10, minSpend: 999, status: 'ACTIVE' },
      { id: 'disc-2', code: 'ADRIZO50', type: 'PERCENT', value: 50, minSpend: 1999, status: 'ACTIVE' },
      { id: 'disc-3', code: 'FLAT200', type: 'FLAT', value: 200, minSpend: 1499, status: 'ACTIVE' },
    ];

    try {
      const setting = await prisma.storeSetting.findUnique({
        where: { key: 'store_discounts' }
      });
      if (setting && setting.value) {
        const parsed = JSON.parse(setting.value);
        if (Array.isArray(parsed) && parsed.length > 0) {
          couponsList = parsed;
        }
      }
    } catch {
      // Use defaults
    }

    const cleanCode = couponCode.trim().toUpperCase();
    const matchedCoupon = couponsList.find(
      (c: any) => c.code.toUpperCase() === cleanCode && c.status === 'ACTIVE'
    );

    if (!matchedCoupon) {
      return NextResponse.json({
        valid: false,
        error: `Promo code "${cleanCode}" is invalid or has expired.`
      }, { status: 400 });
    }

    const minSpend = Number(matchedCoupon.minSpend) || 0;
    if (numSubtotal < minSpend) {
      return NextResponse.json({
        valid: false,
        error: `Promo code "${matchedCoupon.code}" requires a minimum order of ₹${minSpend.toLocaleString('en-IN')}.`
      }, { status: 400 });
    }

    let discountAmount = 0;
    if (matchedCoupon.type === 'PERCENT') {
      discountAmount = Math.round((numSubtotal * Number(matchedCoupon.value)) / 100);
    } else {
      discountAmount = Math.min(Number(matchedCoupon.value), numSubtotal);
    }

    return NextResponse.json({
      valid: true,
      coupon: {
        code: matchedCoupon.code,
        type: matchedCoupon.type,
        value: matchedCoupon.value,
        discount: discountAmount,
      }
    });
  } catch (error: any) {
    return NextResponse.json({
      valid: false,
      error: error.message || 'Failed to validate coupon.'
    }, { status: 500 });
  }
}
