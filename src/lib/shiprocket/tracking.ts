import { resolveOrderFromSupabase, ResolvedOrder } from '../order-resolver';
import { getAdminClient } from '../supabase/admin';
import { shiprocketRequest } from './client';
import { ShiprocketTrackingActivity, ShiprocketTrackingSummary } from './types';

/**
 * Maps Shiprocket fulfillment & tracking status strings to AD(R)IZO's internal status conventions.
 */
export function mapShiprocketStatusToAdrizo(srStatus?: string): {
  trackingStatus: string;
  orderStatus?: string;
  paymentStatus?: string;
} {
  if (!srStatus) {
    return { trackingStatus: 'ORDER_RECEIVED' };
  }

  const upper = srStatus.trim().toUpperCase();

  // Delivered states
  if (upper.includes('DELIVERED') && !upper.includes('RTO')) {
    return {
      trackingStatus: 'DELIVERED',
      orderStatus: 'DELIVERED',
      paymentStatus: 'PAID', // For COD orders, delivery confirms collection
    };
  }

  // Out for Delivery states
  if (upper.includes('OUT FOR DELIVERY') || upper.includes('OFD')) {
    return {
      trackingStatus: 'OUT_FOR_DELIVERY',
      orderStatus: 'SHIPPED',
    };
  }

  // In Transit / Picked Up states
  if (
    upper.includes('IN TRANSIT') ||
    upper.includes('PICKED UP') ||
    upper.includes('REACHED') ||
    upper.includes('SHIPPED')
  ) {
    return {
      trackingStatus: 'SHIPPED',
      orderStatus: 'SHIPPED',
    };
  }

  // AWB / Packed / Pickup Scheduled states
  if (
    upper.includes('AWB') ||
    upper.includes('PICKUP SCHEDULED') ||
    upper.includes('PICKUP QUEUED') ||
    upper.includes('PICKUP GENERATED') ||
    upper.includes('LABEL') ||
    upper.includes('MANIFEST') ||
    upper === 'PACKED'
  ) {
    return {
      trackingStatus: 'PACKED',
      orderStatus: 'PROCESSING',
    };
  }

  // RTO / Return states
  if (upper.includes('RTO')) {
    return {
      trackingStatus: 'RETURNED',
      orderStatus: 'PROCESSING',
    };
  }

  // Cancelled states
  if (upper.includes('CANCEL') || upper === 'CANCELED') {
    return {
      trackingStatus: 'CANCELLED',
      orderStatus: 'CANCELLED',
    };
  }

  return { trackingStatus: 'ORDER_RECEIVED' };
}

/**
 * Queries Shiprocket's tracking API for a given AWB code.
 * Strips all sensitive credentials/tokens and returns a clean, safe summary.
 */
export async function trackShipmentByAwb(awbCode: string): Promise<ShiprocketTrackingSummary> {
  const cleanAwb = (awbCode || '').trim();
  if (!cleanAwb) {
    return {
      success: false,
      awbCode: '',
      currentStatus: 'UNKNOWN',
      activities: [],
      error: 'AWB code is required for tracking.',
    };
  }

  try {
    const rawRes: any = await shiprocketRequest(`/courier/track/awb/${encodeURIComponent(cleanAwb)}`);

    const trackData = rawRes?.tracking_data;
    if (!trackData) {
      return {
        success: false,
        awbCode: cleanAwb,
        currentStatus: 'UNKNOWN',
        activities: [],
        error: rawRes?.message || 'No tracking information available for this AWB yet.',
      };
    }

    const trackObj = Array.isArray(trackData.shipment_track)
      ? trackData.shipment_track[0]
      : trackData.shipment_track;

    const currentStatus =
      trackObj?.current_status ||
      trackData.shipment_status ||
      'AWB_ASSIGNED';

    const origin = trackObj?.origin || '';
    const destination = trackObj?.destination || '';
    const etd = trackObj?.etd || '';
    const courierName = trackObj?.courier_name || '';
    const deliveredDate = trackObj?.delivered_date || undefined;
    const pickupDate = trackObj?.pickup_date || undefined;

    // Parse scan activities
    const rawActivities =
      trackData.shipment_track_activities ||
      trackObj?.scans ||
      [];

    const activities: ShiprocketTrackingActivity[] = Array.isArray(rawActivities)
      ? rawActivities.map((act: any) => ({
          date: act['date'] || act['sr-status-label-date'] || new Date().toISOString(),
          status: act['status'] || act['sr-status'] || act['current_status'] || 'In Progress',
          activity: act['activity'] || act['location-activity'] || 'Status update',
          location: act['location'] || '',
          sr_status: act['sr-status'] || '',
          sr_status_label: act['sr-status-label'] || '',
        }))
      : [];

    return {
      success: true,
      awbCode: cleanAwb,
      currentStatus,
      statusCode: trackData.track_status,
      origin,
      destination,
      etd,
      courierName,
      deliveredDate,
      pickupDate,
      activities,
    };
  } catch (err: unknown) {
    const errorObj = err as { message?: string };
    console.error(`[Shiprocket Tracking] Tracking error for AWB ${cleanAwb}:`, errorObj.message);
    return {
      success: false,
      awbCode: cleanAwb,
      currentStatus: 'ERROR',
      activities: [],
      error: errorObj.message || 'Failed to fetch live tracking from Shiprocket.',
    };
  }
}

/**
 * Synchronizes an order's tracking status from Shiprocket to the Supabase database.
 */
export async function syncOrderTracking(orderIdOrNumber: string): Promise<{
  success: boolean;
  orderNumber: string;
  trackingId?: string;
  trackingStatus?: string;
  previousStatus?: string;
  updated: boolean;
  message: string;
}> {
  const order = await resolveOrderFromSupabase(orderIdOrNumber);
  if (!order) {
    return {
      success: false,
      orderNumber: orderIdOrNumber,
      updated: false,
      message: `Order "${orderIdOrNumber}" not found in database.`,
    };
  }

  if (!order.trackingId) {
    return {
      success: false,
      orderNumber: order.orderNumber,
      updated: false,
      message: `Order #${order.orderNumber} does not have an AWB / tracking ID yet.`,
    };
  }

  const trackingResult = await trackShipmentByAwb(order.trackingId);
  if (!trackingResult.success) {
    return {
      success: false,
      orderNumber: order.orderNumber,
      trackingId: order.trackingId,
      updated: false,
      message: trackingResult.error || 'Tracking details not available.',
    };
  }

  const mapped = mapShiprocketStatusToAdrizo(trackingResult.currentStatus);
  const previousStatus = order.trackingStatus || 'ORDER_RECEIVED';
  const hasChanged = mapped.trackingStatus !== previousStatus;

  // Build updates safely
  const updates: Record<string, any> = {
    shiprocket_status: trackingResult.currentStatus,
    shiprocket_synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (hasChanged) {
    updates.tracking_status = mapped.trackingStatus;
    if (mapped.orderStatus && order.orderStatus !== 'DELIVERED') {
      updates.order_status = mapped.orderStatus;
    }
    if (mapped.paymentStatus && order.paymentStatus !== 'PAID') {
      updates.payment_status = mapped.paymentStatus;
    }
  }

  const supabase = getAdminClient();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(order.id);

  let query = supabase.from('orders').update(updates);
  if (isUuid) {
    query = query.eq('id', order.id);
  } else {
    query = query.eq('order_number', order.orderNumber);
  }

  await query;

  console.log(
    `[Shiprocket Sync] Order #${order.orderNumber} tracking synced: ${previousStatus} -> ${mapped.trackingStatus} (Shiprocket: ${trackingResult.currentStatus})`
  );

  return {
    success: true,
    orderNumber: order.orderNumber,
    trackingId: order.trackingId,
    trackingStatus: mapped.trackingStatus,
    previousStatus,
    updated: hasChanged,
    message: `Tracking synced successfully (${mapped.trackingStatus}).`,
  };
}

/**
 * Synchronizes tracking for all active orders with an assigned AWB.
 */
export async function syncAllActiveShipments(): Promise<{
  totalChecked: number;
  totalUpdated: number;
  results: Array<{ orderNumber: string; status: string; updated: boolean }>;
}> {
  const supabase = getAdminClient();

  // Find non-delivered, non-cancelled orders with an AWB
  const { data: activeOrders, error } = await supabase
    .from('orders')
    .select('id, order_number, tracking_id, tracking_status')
    .not('tracking_id', 'is', null)
    .not('order_status', 'in', '("DELIVERED","CANCELLED")')
    .limit(50);

  if (error || !activeOrders) {
    console.error('[Shiprocket Batch Sync] Query error:', error?.message);
    return { totalChecked: 0, totalUpdated: 0, results: [] };
  }

  console.log(`[Shiprocket Batch Sync] Checking tracking for ${activeOrders.length} active shipments...`);

  const results: Array<{ orderNumber: string; status: string; updated: boolean }> = [];
  let totalUpdated = 0;

  for (const o of activeOrders) {
    try {
      const res = await syncOrderTracking(o.id);
      if (res.updated) totalUpdated++;
      results.push({
        orderNumber: o.order_number,
        status: res.trackingStatus || 'UNKNOWN',
        updated: res.updated,
      });
    } catch (err: any) {
      console.error(`[Shiprocket Batch Sync] Error for #${o.order_number}:`, err.message);
    }
  }

  return {
    totalChecked: activeOrders.length,
    totalUpdated,
    results,
  };
}
