import { resolveOrderFromSupabase } from './order-resolver';
import { createShiprocketOrder, CreateShiprocketOrderResult } from './shiprocket/orders';
import { getAdminClient } from './supabase/admin';

export interface AutoSyncResult {
  success: boolean;
  alreadySynced?: boolean;
  orderId?: number;
  shipmentId?: number;
  shiprocketOrderId?: number;
  shiprocketShipmentId?: number;
  status?: string;
  message?: string;
  error?: string;
}

/**
 * Automatically synchronizes an AD(R)IZO order to Shiprocket server-side.
 * 
 * Safety & Production Protections:
 * 1. Strict Idempotency: If the order already has Shiprocket Order ID & Shipment ID,
 *    it will never create a duplicate order on Shiprocket.
 * 2. Partial Failure Resilience: If Shiprocket API is temporarily down, the AD(R)IZO
 *    order remains safe in Supabase. Marked as 'FAILED' sync status so Admin can safely retry.
 * 3. Never leaks Shiprocket credentials, tokens, or internal errors to customer.
 * 4. Reuses authoritative createShiprocketOrder service.
 */
export async function autoSyncOrderToShiprocket(
  orderIdentifier: string
): Promise<AutoSyncResult> {
  if (!orderIdentifier) {
    return { success: false, error: 'Missing order identifier for Shiprocket synchronization.' };
  }

  const cleanId = orderIdentifier.trim();
  const supabase = getAdminClient();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);

  try {
    // 1. Resolve fresh order from Supabase
    const order = await resolveOrderFromSupabase(cleanId);
    if (!order) {
      console.warn(`[Auto-Shiprocket Sync] Order #${cleanId} not found in database.`);
      return { success: false, error: `Order #${cleanId} not found.` };
    }

    const orderRef = order.orderNumber || order.id;

    // 2. Idempotency Guard: Never duplicate if already registered with Shiprocket
    if (order.shiprocketOrderId && order.shiprocketShipmentId) {
      console.log(
        `[Auto-Shiprocket Sync] Order #${orderRef} is already synced (Shiprocket Order: ${order.shiprocketOrderId}, Shipment: ${order.shiprocketShipmentId}). Skipping.`
      );
      return {
        success: true,
        alreadySynced: true,
        orderId: Number(order.shiprocketOrderId),
        shipmentId: Number(order.shiprocketShipmentId),
        shiprocketOrderId: Number(order.shiprocketOrderId),
        shiprocketShipmentId: Number(order.shiprocketShipmentId),
        status: order.shiprocketStatus || 'NEW',
        message: 'Order is already registered with Shiprocket.',
      };
    }

    // 3. State Guard: Do not sync cancelled orders or unpaid prepaid orders
    if (order.orderStatus === 'CANCELLED') {
      console.log(`[Auto-Shiprocket Sync] Order #${orderRef} is CANCELLED. Skipping Shiprocket creation.`);
      return { success: false, error: 'Order is cancelled.' };
    }

    const isPrepaid = order.paymentMethod !== 'COD';
    if (isPrepaid && order.paymentStatus !== 'PAID') {
      console.log(
        `[Auto-Shiprocket Sync] Order #${orderRef} is Prepaid but payment status is ${order.paymentStatus}. Awaiting payment confirmation.`
      );
      return { success: false, error: 'Prepaid payment is pending confirmation.' };
    }

    // 4. Update status to PENDING while processing
    let pendingQuery = supabase
      .from('orders')
      .update({
        shiprocket_sync_status: 'PENDING',
        updated_at: new Date().toISOString(),
      });
    if (isUuid) {
      pendingQuery = pendingQuery.eq('id', order.id);
    } else {
      pendingQuery = pendingQuery.eq('order_number', order.orderNumber);
    }
    await pendingQuery;

    console.log(`[Auto-Shiprocket Sync] Initiating automatic creation for Order #${orderRef}...`);

    // 5. Call authoritative createShiprocketOrder
    const result: CreateShiprocketOrderResult = await createShiprocketOrder(order);

    if (result.success && result.orderId && result.shipmentId) {
      // 6. Persist SYNCED status
      let syncedQuery = supabase
        .from('orders')
        .update({
          shiprocket_order_id: String(result.orderId),
          shiprocket_shipment_id: String(result.shipmentId),
          shiprocket_status: result.status || 'NEW',
          shiprocket_sync_status: 'SYNCED',
          shiprocket_sync_error: null,
          shiprocket_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      if (isUuid) {
        syncedQuery = syncedQuery.eq('id', order.id);
      } else {
        syncedQuery = syncedQuery.eq('order_number', order.orderNumber);
      }
      await syncedQuery;

      console.log(
        `[Auto-Shiprocket Sync] Successfully synced Order #${orderRef} with Shiprocket (Order: ${result.orderId}, Shipment: ${result.shipmentId})`
      );

      return {
        success: true,
        alreadySynced: result.alreadySynced || false,
        orderId: result.orderId,
        shipmentId: result.shipmentId,
        shiprocketOrderId: result.orderId,
        shiprocketShipmentId: result.shipmentId,
        status: result.status,
        message: result.message,
      };
    } else {
      throw new Error(result.message || 'Shiprocket order creation returned incomplete data.');
    }
  } catch (error: unknown) {
    const err = error as { message?: string };
    const errMsg = err.message || 'Unknown error occurred during Shiprocket auto-sync.';

    console.error(`[Auto-Shiprocket Sync] Failed for Order #${cleanId}:`, errMsg);

    // 7. Defensive Failure Preservation: Mark as FAILED, save error reason for Admin
    try {
      let failQuery = supabase
        .from('orders')
        .update({
          shiprocket_sync_status: 'FAILED',
          shiprocket_sync_error: errMsg,
          shiprocket_status: 'SYNC_FAILED',
          updated_at: new Date().toISOString(),
        });
      if (isUuid) {
        failQuery = failQuery.eq('id', cleanId);
      } else {
        failQuery = failQuery.eq('order_number', cleanId);
      }
      await failQuery;
    } catch (dbErr: any) {
      console.error('[Auto-Shiprocket Sync] Failed to record error state in DB:', dbErr.message);
    }

    return {
      success: false,
      error: errMsg,
    };
  }
}
