import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/auth';
import { checkCourierServiceability } from '@/lib/shiprocket/serviceability';

export const dynamic = 'force-dynamic';

async function handleServiceability(req: NextRequest) {
  try {
    // 1. Verify Admin Session
    const adminCheck = await verifyAdminSession();
    if (!adminCheck.authorized) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Admin access required', availableCouriers: [] },
        { status: 401 }
      );
    }

    // 2. Parse query or body
    let deliveryPincode = '';
    let pickupPincode = '201301';
    let weightKg = 0.5;
    let isCod = true;
    let orderTotal = 999;

    if (req.method === 'GET') {
      const { searchParams } = new URL(req.url);
      deliveryPincode = searchParams.get('deliveryPincode') || searchParams.get('pincode') || '';
      pickupPincode = searchParams.get('pickupPincode') || '201301';
      weightKg = parseFloat(searchParams.get('weight') || '0.5') || 0.5;
      isCod = searchParams.get('isCod') !== 'false';
      orderTotal = parseFloat(searchParams.get('total') || '999') || 999;
    } else {
      const body = await req.json().catch(() => ({}));
      deliveryPincode = body.deliveryPincode || body.pincode || '';
      pickupPincode = body.pickupPincode || '201301';
      weightKg = typeof body.weightKg === 'number' ? body.weightKg : 0.5;
      isCod = body.isCod !== false;
      orderTotal = typeof body.orderTotal === 'number' ? body.orderTotal : 999;
    }

    if (!deliveryPincode) {
      return NextResponse.json(
        { success: false, error: 'Delivery PIN code is required.', availableCouriers: [] },
        { status: 400 }
      );
    }

    // 3. Query Shiprocket serviceability live
    const result = await checkCourierServiceability({
      pickupPincode,
      deliveryPincode,
      weightKg,
      isCod,
      orderTotal,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error('[Admin Shiprocket Serviceability Route Error]', err.message);
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Failed to check courier serviceability',
        availableCouriers: [],
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return handleServiceability(req);
}

export async function POST(req: NextRequest) {
  return handleServiceability(req);
}
