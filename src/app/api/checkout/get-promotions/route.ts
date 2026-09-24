import { NextRequest, NextResponse } from 'next/server';
import { getMagicPromotions } from '@/lib/magic-checkout';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const result = await getMagicPromotions(body);
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('[Magic Checkout get-promotions error]', error);
    return NextResponse.json({
      error: { description: error.message || 'Unable to fetch promotions.' },
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const order_id = searchParams.get('order_id') || undefined;
    const contact = searchParams.get('contact') || undefined;
    const email = searchParams.get('email') || undefined;

    const result = await getMagicPromotions({ order_id, contact, email });
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({
      error: { description: error.message || 'Unable to fetch promotions.' },
    }, { status: 500 });
  }
}
