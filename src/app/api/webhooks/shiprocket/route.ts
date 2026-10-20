import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { mapShiprocketStatusToAdrizo } from '@/lib/shiprocket/tracking';
import { createAdminNotification } from '@/lib/admin-notifications';

export const dynamic = 'force-dynamic';

/**
 * Shiprocket Tracking & Shipment Webhook Handler
 * 
 * Shiprocket sends webhook payloads for:
 * - Order tracking status updates (AWB assigned, in transit, out for delivery, delivered, RTO, etc.)
 * 
 * Security:
 * - Validates optional SHIPROCKET_WEBHOOK_SECRET if configured in environment.
 * - Safely matches AWB or order reference against Supabase orders.
 * - Never blindly overwrites non-null order data with empty values.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Optional Secret Verification
    const configuredSecret = process.env.SHIPROCKET_WEBHOOK_SECRET;
    if (configuredSecret) {
      const headerSecret = req.headers.get('x-shiprocket-token') || req.headers.get('x-api-key');
      if (headerSecret !== configuredSecret) {
        console.warn('[Shiprocket Webhook] Unauthorized webhook attempt: secret mismatch');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const payload = await req.json().catch(() => null);
    if (!payload || typeof payload !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const awb = payload.awb || payload.awb_code || payload.tracking_id;
    const orderNumber = payload.order_id || payload.order_number;
    const currentStatus = payload.current_status || payload.status || payload.shipment_status;

    if (!awb && !orderNumber) {
      return NextResponse.json({ message: 'Payload missing AWB and order_id identifiers' }, { status: 200 });
    }

    console.log(
      `[Shiprocket Webhook] Received tracking update: AWB=${awb || 'N/A'}, Order=${orderNumber || 'N/A'}, Status=${currentStatus || 'N/A'}`
    );

    const supabase = getAdminClient();
    let query = supabase.from('orders').select('id, order_number, tracking_status, order_status, payment_status');

    if (awb) {
      query = query.eq('tracking_id', String(awb).trim());
    } else if (orderNumber) {
      query = query.eq('order_number', String(orderNumber).trim());
    }

    const { data: matchedOrders, error: findErr } = await query;
    if (findErr || !matchedOrders || matchedOrders.length === 0) {
      console.warn(`[Shiprocket Webhook] No matching order found in database for AWB: ${awb}`);
      return NextResponse.json({ message: 'No matching order found in database' }, { status: 200 });
    }

    const targetOrder = matchedOrders[0];
    const mapped = mapShiprocketStatusToAdrizo(currentStatus);

    // Prevent regressing terminal states (DELIVERED)
    if (targetOrder.tracking_status === 'DELIVERED' && mapped.trackingStatus !== 'DELIVERED') {
      console.log(`[Shiprocket Webhook] Ignoring regression from DELIVERED to ${mapped.trackingStatus} for #${targetOrder.order_number}`);
      return NextResponse.json({
        success: true,
        orderNumber: targetOrder.order_number,
        message: 'Order is already marked as DELIVERED; event recorded without status regression',
      });
    }

    const updates: Record<string, any> = {
      shiprocket_status: currentStatus || targetOrder.tracking_status,
      shiprocket_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (mapped.trackingStatus) {
      updates.tracking_status = mapped.trackingStatus;
    }
    if (mapped.orderStatus && targetOrder.order_status !== 'DELIVERED') {
      updates.order_status = mapped.orderStatus;
    }
    if (payload.courier_name && typeof payload.courier_name === 'string' && payload.courier_name.trim()) {
      updates.delivery_partner = payload.courier_name.trim();
    }
    if (awb && typeof awb === 'string' && awb.trim() && !awb.includes('AWB123')) {
      updates.tracking_id = awb.trim();
    }
    // Note: Tracking webhooks must never mutate payment_status (secured per specification)

    const { error: updateErr } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', targetOrder.id);

    if (updateErr) {
      console.error(`[Shiprocket Webhook] Failed to update order #${targetOrder.order_number}:`, updateErr.message);
      return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
    }

    // Persist carrier event to unified tracking history
    const { appendTrackingEvent } = await import('@/lib/order-tracking');
    await appendTrackingEvent(targetOrder.order_number, {
      status: mapped.trackingStatus,
      activity: payload.activity || payload.current_status || `Carrier status: ${currentStatus}`,
      location: payload.location || payload.city || '',
      timestamp: payload.date || payload.scanned_date || new Date().toISOString(),
      source: 'CARRIER_EVENT',
      actor: `Shiprocket / ${payload.courier_name || 'Carrier'}`,
      rawStatus: String(currentStatus || ''),
    }).catch(err => console.warn('[Tracking History Append Warning]', err?.message));

    console.log(
      `[Shiprocket Webhook] Order #${targetOrder.order_number} successfully updated to: ${mapped.trackingStatus}`
    );

    // Dispatch durable admin notifications on key delivery events
    const upperStatus = String(currentStatus || '').toUpperCase();
    if (mapped.trackingStatus === 'DELIVERED') {
      createAdminNotification({
        type: 'DELIVERED',
        title: `Order Delivered: #${targetOrder.order_number}`,
        message: `Shiprocket confirmed order #${targetOrder.order_number} has been delivered.`,
        orderNumber: targetOrder.order_number,
        orderId: targetOrder.id,
        dedupKey: `DELIVERED_${targetOrder.order_number}`,
      }).catch(err => console.warn('[Admin Notification Warning]', err?.message));
    } else if (upperStatus.includes('UNDELIVERED') || upperStatus.includes('EXCEPTION') || upperStatus.includes('DELAYED') || upperStatus.includes('RTO')) {
      createAdminNotification({
        type: 'DELIVERY_EXCEPTION',
        title: `Delivery Exception: #${targetOrder.order_number}`,
        message: `Courier reported status: "${currentStatus}" for Order #${targetOrder.order_number}.`,
        orderNumber: targetOrder.order_number,
        orderId: targetOrder.id,
        dedupKey: `EXCEPTION_${targetOrder.order_number}_${upperStatus}`,
      }).catch(err => console.warn('[Admin Notification Warning]', err?.message));
    }

    return NextResponse.json({
      success: true,
      orderNumber: targetOrder.order_number,
      updatedStatus: mapped.trackingStatus,
    });
  } catch (err: unknown) {
    const errorObj = err as { message?: string };
    console.error('[Shiprocket Webhook] Unexpected exception:', errorObj.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
