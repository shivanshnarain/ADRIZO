import { NextRequest, NextResponse } from 'next/server';
import { applyMagicPromotion } from '@/lib/magic-checkout';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const result = await applyMagicPromotion(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || { description: 'Promo code could not be applied.' } },
        { status: 400 }
      );
    }

    return NextResponse.json({
      amount: result.amount, // in paise
      currency: result.currency || 'INR',
    }, { status: 200 });
  } catch (error: any) {
    console.error('[Magic Checkout apply-promotions error]', error);
    return NextResponse.json({
      error: { description: error.message || 'Unable to apply promotion.' },
    }, { status: 500 });
  }
}
