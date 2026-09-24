import { NextRequest, NextResponse } from 'next/server';
import { calculateMagicShippingInfo } from '@/lib/magic-checkout';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const result = await calculateMagicShippingInfo(body);
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('[Magic Checkout Shipping Info API Error]', error);
    return NextResponse.json({
      error: {
        description: error.message || 'Unable to calculate shipping information.',
      },
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const order_id = searchParams.get('order_id') || undefined;
    const razorpay_order_id = searchParams.get('razorpay_order_id') || undefined;
    const zipcode = searchParams.get('zipcode') || undefined;
    const state_code = searchParams.get('state_code') || undefined;

    const addresses = zipcode ? [{ id: '0', zipcode, state_code }] : [];
    const result = await calculateMagicShippingInfo({ order_id, razorpay_order_id, addresses });
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({
      error: { description: error.message || 'Shipping info query error.' },
    }, { status: 500 });
  }
}
