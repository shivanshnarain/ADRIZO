import { NextRequest, NextResponse } from 'next/server';
import { resolveOrderFromSupabase } from '@/lib/order-resolver';
import { trackShipmentByAwb } from '@/lib/shiprocket/tracking';
import { getAuthenticatedCustomer, isOrderOwnedByCustomer } from '@/lib/customer-auth';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Order identifier is required' },
        { status: 400 }
      );
    }

    // 1. Verify authenticated customer session
    const customer = await getAuthenticatedCustomer();
    if (!customer) {
      return NextResponse.json(
        { success: false, error: 'Please log in to view shipment tracking' },
        { status: 401 }
      );
    }

    const order = await resolveOrderFromSupabase(id);
    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    // 2. Strict IDOR protection: verify order belongs to the authenticated customer
    if (!isOrderOwnedByCustomer(order, customer)) {
      return NextResponse.json(
        { success: false, error: 'You are not authorized to view tracking for this order' },
        { status: 403 }
      );
    }

    if (!order.trackingId) {
      return NextResponse.json({
        success: true,
        orderNumber: order.orderNumber,
        status: order.orderStatus,
        currentStatus: 'Shipment is being prepared',
        trackingStatus: order.trackingStatus || 'ORDER_CONFIRMED',
        deliveryPartner: order.deliveryPartner || null,
        trackingId: null,
        hasShipment: !!order.shiprocketShipmentId,
        message: 'Your order has been confirmed and registered for shipment. Live courier tracking will become available once a courier partner and AWB are assigned.',
        activities: [
          {
            date: order.createdAt,
            status: 'ORDER_CONFIRMED',
            activity: 'Your order has been confirmed and registered for shipment. Live courier tracking will become available once a courier partner and AWB are assigned.',
            location: order.city || 'AD(R)IZO Fulfillment Center',
          },
        ],
      });
    }

    // Live query Shiprocket tracking
    const trackingRes = await trackShipmentByAwb(order.trackingId);

    return NextResponse.json({
      success: true,
      orderNumber: order.orderNumber,
      orderStatus: order.orderStatus,
      trackingStatus: order.trackingStatus || 'ORDER_RECEIVED',
      deliveryPartner: order.deliveryPartner || trackingRes.courierName || 'Courier Partner',
      trackingId: order.trackingId,
      etd: trackingRes.etd || null,
      origin: trackingRes.origin || null,
      destination: trackingRes.destination || order.city || null,
      currentStatus: trackingRes.currentStatus,
      activities: trackingRes.activities.length > 0 ? trackingRes.activities : [
        {
          date: order.shiprocketSyncedAt || order.createdAt,
          status: order.trackingStatus || 'PACKED',
          activity: `AWB ${order.trackingId} generated. Package ready for courier handover.`,
          location: 'Noida Warehouse',
        },
        {
          date: order.createdAt,
          status: 'ORDER_PLACED',
          activity: 'Order placed successfully.',
          location: order.city || 'AD(R)IZO Fulfillment Center',
        }
      ],
    });
  } catch (err: unknown) {
    const errorObj = err as { message?: string };
    console.error('[Customer Tracking API Error]', errorObj.message);
    return NextResponse.json(
      { success: false, error: 'Unable to retrieve tracking at this time.' },
      { status: 500 }
    );
  }
}
