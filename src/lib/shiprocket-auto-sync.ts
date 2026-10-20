import { resolveOrderFromSupabase } from './order-resolver';
import { createShiprocketOrder, CreateShiprocketOrderResult } from './shiprocket/orders';
import { getAdminClient } from './supabase/admin';
import { createAdminNotification } from './admin-notifications';
import { getCircuitBreakerStatus, isAutomatedSyncAllowed } from './shiprocket/circuit-breaker';
import { isShiprocketConfigured } from './shiprocket/config';

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
 * Automatically synchronizes an ADRIZO order to Shiprocket server-side.
 * 
 * Safety & Production Protections:
 * 1. Circuit Breaker Guard: Respects 2-hour account lockout and cooldowns; never makes login calls if blocked.
 * 2. Strict Idempotency: If the order already has Shiprocket Order ID or Shipment ID,
 *    it will never create a duplicate order on Shiprocket.
 * 3. Partial Failure Resilience: If Shiprocket API is temporarily down, the ADRIZO
 *    order remains safe in Supabase. Marked as 'BLOCKED_AUTH' or 'FAILED' sync status so Admin can safely retry.
 * 4. Never leaks Shiprocket credentials, tokens, or internal errors to customer.
 * 5. Reuses authoritative createShiprocketOrder service.
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

  // 1. Configuration Guard: Check if Shiprocket credentials exist in environment
  if (!isShiprocketConfigured()) {
    console.warn(`[Auto-Shiprocket Sync] Shiprocket credentials not configured. Skipping auto-sync for Order #${cleanId}.`);
    return {
      success: false,
      status: 'CONFIG_MISSING',
      error: 'Shiprocket API credentials are not configured in server environment variables.',
      message: 'Shiprocket API credentials are not configured.',
    };
  }

  // 2. Circuit Breaker Guard: Stop immediately if account is locked, cooling down, or awaiting manual verification
  const breaker = await getCircuitBreakerStatus();
  if (breaker.isBlocked || !isAutomatedSyncAllowed(breaker)) {
    const pauseReason = breaker.message || 'Shiprocket authentication is cooling down or paused to protect account.';
    console.warn(
      `[Auto-Shiprocket Sync] Circuit breaker is not closed (State: ${breaker.state}, isBlocked: ${breaker.isBlocked}). Pausing auto-sync for Order #${cleanId}: ${pauseReason}`
    );

    // Persist BLOCKED_AUTH status so Admin Panel displays exact lockout state
    try {
      let blockedQuery = supabase
        .from('orders')
        .update({
          shiprocket_sync_status: 'BLOCKED_AUTH',
          shiprocket_sync_error: pauseReason,
          shiprocket_status: 'AUTH_BLOCKED',
          updated_at: new Date().toISOString(),
        });
      if (isUuid) {
        blockedQuery = blockedQuery.eq('id', cleanId);
      } else {
        blockedQuery = blockedQuery.eq('order_number', cleanId);
      }
      await blockedQuery;
    } catch {
      // Non-critical if order doesn't exist
    }

    return {
      success: false,
      status: 'AUTH_BLOCKED',
      error: pauseReason,
      message: pauseReason,
    };
  }

  try {
    // 3. Resolve fresh order from Supabase
    const order = await resolveOrderFromSupabase(cleanId);
    if (!order) {
      console.warn(`[Auto-Shiprocket Sync] Order #${cleanId} not found in database.`);
      return { success: false, error: `Order #${cleanId} not found.` };
    }

    const orderRef = order.orderNumber || order.id;

    // 4. Idempotency Guard: Never duplicate if already registered with Shiprocket
    if (order.shiprocketOrderId || order.shiprocketShipmentId) {
      console.log(
        `[Auto-Shiprocket Sync] Order #${orderRef} is already registered (Shiprocket Order: ${order.shiprocketOrderId || 'N/A'}, Shipment: ${order.shiprocketShipmentId || 'N/A'}). Skipping duplicate creation.`
      );
      return {
        success: true,
        alreadySynced: true,
        orderId: order.shiprocketOrderId ? Number(order.shiprocketOrderId) : undefined,
        shipmentId: order.shiprocketShipmentId ? Number(order.shiprocketShipmentId) : undefined,
        shiprocketOrderId: order.shiprocketOrderId ? Number(order.shiprocketOrderId) : undefined,
        shiprocketShipmentId: order.shiprocketShipmentId ? Number(order.shiprocketShipmentId) : undefined,
        status: order.shiprocketStatus || 'NEW',
        message: 'Order is already registered with Shiprocket.',
      };
    }

    // 4. State Guard: Do not sync cancelled orders or unpaid prepaid orders
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

    // 5. Update status to PENDING while processing
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

    // 6. Call authoritative createShiprocketOrder
    const result: CreateShiprocketOrderResult = await createShiprocketOrder(order);

    if (result.success && result.orderId && result.shipmentId) {
      // 7. Persist SYNCED status
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

    const isAuth = errMsg.toLowerCase().includes('auth') ||
      errMsg.toLowerCase().includes('password') ||
      errMsg.toLowerCase().includes('403') ||
      errMsg.toLowerCase().includes('401') ||
      errMsg.toLowerCase().includes('locked') ||
      errMsg.toLowerCase().includes('blocked');

    const syncStatus = isAuth ? 'BLOCKED_AUTH' : 'FAILED';
    const shiprocketStatus = isAuth ? 'AUTH_BLOCKED' : 'SYNC_FAILED';

    // 8. Defensive Failure Preservation: Mark as BLOCKED_AUTH or FAILED, save error reason for Admin
    try {
      let failQuery = supabase
        .from('orders')
        .update({
          shiprocket_sync_status: syncStatus,
          shiprocket_sync_error: errMsg,
          shiprocket_status: shiprocketStatus,
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

    // 9. Dispatch durable admin notification for Shiprocket sync failure
    createAdminNotification({
      type: isAuth ? 'SHIPROCKET_AUTH_FAILED' : 'SHIPMENT_CREATION_FAILED',
      title: isAuth ? `Shiprocket Auth Failed: #${cleanId}` : `Shipment Creation Failed: #${cleanId}`,
      message: `Failed to sync Order #${cleanId} with Shiprocket: ${errMsg}`,
      orderNumber: cleanId,
      dedupKey: `SHIPMENT_FAILED_${cleanId}_${isAuth ? 'AUTH' : 'CREATE'}`,
    }).catch(notifyErr => console.warn('[Admin Notification Warning]', notifyErr?.message));

    return {
      success: false,
      status: shiprocketStatus,
      error: errMsg,
    };
  }
}
