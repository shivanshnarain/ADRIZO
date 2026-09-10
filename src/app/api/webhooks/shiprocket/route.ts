import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { mapShiprocketStatusToAdrizo } from '@/lib/shiprocket/tracking';

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
    if (mapped.paymentStatus && targetOrder.payment_status !== 'PAID') {
      updates.payment_status = mapped.paymentStatus;
    }

    const { error: updateErr } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', targetOrder.id);

    if (updateErr) {
      console.error(`[Shiprocket Webhook] Failed to update order #${targetOrder.order_number}:`, updateErr.message);
      return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
    }

    console.log(
      `[Shiprocket Webhook] Order #${targetOrder.order_number} successfully updated to: ${mapped.trackingStatus}`
    );

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
