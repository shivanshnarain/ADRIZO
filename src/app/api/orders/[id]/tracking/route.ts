import { NextRequest, NextResponse } from 'next/server';
import { resolveOrderFromSupabase } from '@/lib/order-resolver';
import { trackShipmentByAwb } from '@/lib/shiprocket/tracking';
import { getAuthenticatedCustomer, isOrderOwnedByCustomer } from '@/lib/customer-auth';
import { 
  buildUnifiedTrackingActivities, 
  getTrackingStatusLabel, 
  normalizeTrackingStatus 
} from '@/lib/order-tracking';

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

    const isVerifiedAwb = Boolean(order.trackingId && order.trackingId !== 'AWB123456789');
    const normStatus = normalizeTrackingStatus(order.trackingStatus);
    const courierName = (order.deliveryPartner && order.deliveryPartner !== 'Blue Dart Delivery' && order.deliveryPartner !== 'Awaiting courier assignment') 
      ? order.deliveryPartner 
      : null;

    if (!isVerifiedAwb) {
      const hasShipment = !!order.shiprocketShipmentId;
      let displayStatus = getTrackingStatusLabel(normStatus);
      if (normStatus === 'ORDER_RECEIVED') {
        displayStatus = hasShipment ? 'Shipment is being prepared' : 'Order Confirmed';
      }

      const activities = await buildUnifiedTrackingActivities({
        orderNumber: order.orderNumber,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        city: order.city,
        trackingStatus: normStatus,
        deliveryPartner: courierName,
        trackingId: null,
      });

      return NextResponse.json({
        success: true,
        orderNumber: order.orderNumber,
        orderStatus: order.orderStatus,
        status: order.orderStatus,
        currentStatus: displayStatus,
        trackingStatus: normStatus,
        deliveryPartner: courierName,
        trackingId: null,
        hasShipment,
        activities,
      });
    }

    // Live query Shiprocket tracking
    const trackingRes = await trackShipmentByAwb(order.trackingId!);
    const displayStatus = trackingRes.currentStatus !== 'UNKNOWN' && trackingRes.currentStatus !== 'ERROR'
      ? trackingRes.currentStatus
      : getTrackingStatusLabel(normStatus);

    const activities = await buildUnifiedTrackingActivities({
      orderNumber: order.orderNumber,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      city: order.city,
      trackingStatus: normStatus,
      deliveryPartner: trackingRes.courierName || courierName,
      trackingId: order.trackingId,
    }, trackingRes.activities || []);

    return NextResponse.json({
      success: true,
      orderNumber: order.orderNumber,
      orderStatus: order.orderStatus,
      status: order.orderStatus,
      trackingStatus: normStatus,
      currentStatus: displayStatus,
      deliveryPartner: trackingRes.courierName || courierName || 'Courier Partner',
      trackingId: order.trackingId,
      etd: trackingRes.etd || null,
      origin: trackingRes.origin || null,
      destination: trackingRes.destination || order.city || null,
      activities,
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
