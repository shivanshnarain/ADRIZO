import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/auth';
import { resolveOrderFromSupabase } from '@/lib/order-resolver';
import { createShiprocketOrder } from '@/lib/shiprocket/orders';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Verify Admin Session
    const adminCheck = await verifyAdminSession();
    if (!adminCheck.authorized) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Admin access required' },
        { status: 401 }
      );
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Missing order identifier' },
        { status: 400 }
      );
    }

    // 2. Resolve order safely
    const order = await resolveOrderFromSupabase(id);
    if (!order) {
      return NextResponse.json(
        { success: false, error: `Order #${id} not found in database.` },
        { status: 404 }
      );
    }

    // 3. Optional body options (e.g. weight overrides)
    const body = await req.json().catch(() => ({}));
    const options = {
      pickupLocation: body?.pickupLocation,
      packageWeightKg: body?.packageWeightKg,
      packageDimensionsCm: body?.packageDimensionsCm,
    };

    // 4. Create Shiprocket order / shipment
    const result = await createShiprocketOrder(order, options);

    return NextResponse.json({
      success: true,
      alreadySynced: result.alreadySynced,
      orderId: result.orderId,
      shipmentId: result.shipmentId,
      status: result.status,
      message: result.message,
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error('[Admin Shiprocket Create Route Error]', err.message);
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Failed to create Shiprocket order',
      },
      { status: 500 }
    );
  }
}
