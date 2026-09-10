import { SupabaseClient } from '@supabase/supabase-js';
import { getAdminClient } from './supabase/admin';
import { ORDER_RETENTION_DAYS } from '@/config/order-retention';

export interface OrderDeleteResult {
  success: boolean;
  orderNumber?: string;
  deletedId?: string;
  error?: string;
}

export interface RetentionCleanupResult {
  success: boolean;
  retentionDays: number;
  cutoffTimestamp: string;
  deletedOrders: number;
  deletedOrderItems: number;
  executedAt: string;
  error?: string;
}

/**
 * Defensively cleans up any order-specific files in Supabase Storage.
 * Note: AD(R)IZO generates tax invoice PDFs dynamically in-memory without persistent storage.
 * This function ensures that if any future bucket (e.g., invoices/orders) stores order files,
 * they are cleaned up permanently to prevent storage leakage on the free tier.
 */
async function cleanOrderStorageFiles(
  supabase: SupabaseClient, 
  orderId: string, 
  orderNumber?: string
): Promise<void> {
  try {
    const { data: buckets, error: bErr } = await supabase.storage.listBuckets();
    if (bErr || !buckets || buckets.length === 0) return;

    for (const b of buckets) {
      const bucketName = b.name.toLowerCase();
      // Target only order or invoice specific buckets
      if (bucketName.includes('order') || bucketName.includes('invoice')) {
        // Check folder for UUID
        const { data: idFiles } = await supabase.storage.from(b.name).list(orderId);
        if (idFiles && idFiles.length > 0) {
          const paths = idFiles.map((f: any) => `${orderId}/${f.name}`);
          await supabase.storage.from(b.name).remove(paths);
          console.log(`[Storage Cleanup] Removed ${paths.length} files from bucket "${b.name}" for order ID ${orderId}`);
        }

        // Check folder for human-readable orderNumber (e.g. ADR-810231)
        if (orderNumber) {
          const { data: numFiles } = await supabase.storage.from(b.name).list(orderNumber);
          if (numFiles && numFiles.length > 0) {
            const paths = numFiles.map((f: any) => `${orderNumber}/${f.name}`);
            await supabase.storage.from(b.name).remove(paths);
            console.log(`[Storage Cleanup] Removed ${paths.length} files from bucket "${b.name}" for order #${orderNumber}`);
          }
        }
      }
    }
  } catch (storageErr) {
    console.warn('[Storage Cleanup Warning]:', storageErr);
  }
}

/**
 * Permanently deletes a single order and all its dependent data from Supabase.
 * - Resolves both UUID and human-readable orderNumber (e.g., ADR-810231).
 * - Cascades deletion to `order_items` via foreign-key constraint.
 * - Cleans any order-specific storage files.
 * - Strictly leaves customer profiles (`customer_profiles`) and authentication accounts (`auth.users`) intact.
 */
export async function deleteSingleOrder(
  supabase: SupabaseClient, 
  orderIdentifier: string
): Promise<OrderDeleteResult> {
  try {
    if (!orderIdentifier || typeof orderIdentifier !== 'string') {
      return { success: false, error: 'Order identifier is required' };
    }

    const cleanId = orderIdentifier.trim();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);

    let targetOrderId = cleanId;
    let orderNumberDisplay = cleanId;

    // 1. Resolve internal database ID and human-readable orderNumber
    if (!isUuid) {
      const { data: foundOrder, error: findErr } = await supabase
        .from('orders')
        .select('id, order_number')
        .eq('order_number', cleanId)
        .maybeSingle();

      if (findErr || !foundOrder) {
        return { success: false, error: `Order "${cleanId}" could not be found to delete` };
      }
      targetOrderId = foundOrder.id;
      orderNumberDisplay = foundOrder.order_number || targetOrderId;
    } else {
      const { data: foundOrder } = await supabase
        .from('orders')
        .select('order_number')
        .eq('id', targetOrderId)
        .maybeSingle();

      if (foundOrder?.order_number) {
        orderNumberDisplay = foundOrder.order_number;
      }
    }

    // 2. Clean order-specific storage files if any exist
    await cleanOrderStorageFiles(supabase, targetOrderId, orderNumberDisplay);

    // 3. Delete order from Supabase via SECURITY DEFINER admin_delete_order RPC
    const { data: rpcData, error: rpcErr } = await supabase.rpc('admin_delete_order', {
      p_order_id: targetOrderId,
    });

    if (rpcErr || (rpcData && !rpcData.success)) {
      console.warn('[admin_delete_order RPC warning, trying direct delete]:', rpcErr?.message || rpcData?.error);
      const { error: delErr } = await supabase
        .from('orders')
        .delete()
        .eq('id', targetOrderId);

      if (delErr) {
        console.error('[Supabase Direct Order Delete Error]', delErr);
        return { success: false, error: delErr.message || 'Failed to delete order from database' };
      }
    }

    console.log(`[Order Cleanup] Order #${orderNumberDisplay} (${targetOrderId}) and child records successfully deleted`);

    return {
      success: true,
      orderNumber: orderNumberDisplay,
      deletedId: targetOrderId,
    };
  } catch (error: any) {
    console.error('[Order Cleanup Exception]', error);
    return {
      success: false,
      error: error.message || 'Internal error deleting order',
    };
  }
}

/**
 * Automated Retention Cleanup:
 * Identifies and purges transactional orders older than `ORDER_RETENTION_DAYS`.
 * - Compares database server timestamps (`created_at < NOW() - INTERVAL '30 days'`).
 * - Cleans dependent order items and associated storage files.
 * - Idempotent and safe to run repeatedly.
 * - Preserves recent orders, customer accounts, and products.
 */
export async function cleanupExpiredOrders(
  retentionDays: number = ORDER_RETENTION_DAYS
): Promise<RetentionCleanupResult> {
  const adminSupabase = getAdminClient();
  const effectiveDays = isNaN(retentionDays) || retentionDays < 1 ? ORDER_RETENTION_DAYS : retentionDays;
  const cutoffTimestamp = new Date(Date.now() - effectiveDays * 24 * 60 * 60 * 1000).toISOString();

  try {
    // 1. Execute PostgreSQL transaction RPC
    const { data: rpcData, error: rpcErr } = await adminSupabase.rpc('cleanup_expired_orders', {
      retention_days: effectiveDays,
    });

    if (!rpcErr && rpcData && rpcData.success) {
      console.log(`[Retention Cleanup] Supabase RPC success: ${rpcData.deleted_orders} orders purged.`);
      return {
        success: true,
        retentionDays: effectiveDays,
        cutoffTimestamp: rpcData.cutoff_timestamp || cutoffTimestamp,
        deletedOrders: Number(rpcData.deleted_orders || 0),
        deletedOrderItems: Number(rpcData.deleted_order_items || 0),
        executedAt: rpcData.executed_at || new Date().toISOString(),
      };
    }

    if (rpcErr) {
      console.warn('[cleanup_expired_orders RPC warning, falling back to direct cleanup]:', rpcErr.message);
    }

    // 2. Direct fallback cleanup if RPC not reachable
    const { data: expiredOrders, error: fetchErr } = await adminSupabase
      .from('orders')
      .select('id, order_number')
      .lt('created_at', cutoffTimestamp);

    if (fetchErr) {
      throw new Error(`Failed to query expired orders: ${fetchErr.message}`);
    }

    if (!expiredOrders || expiredOrders.length === 0) {
      return {
        success: true,
        retentionDays: effectiveDays,
        cutoffTimestamp,
        deletedOrders: 0,
        deletedOrderItems: 0,
        executedAt: new Date().toISOString(),
      };
    }

    let deletedOrdersCount = 0;
    for (const ord of expiredOrders) {
      const res = await deleteSingleOrder(adminSupabase, ord.id);
      if (res.success) {
        deletedOrdersCount++;
      }
    }

    return {
      success: true,
      retentionDays: effectiveDays,
      cutoffTimestamp,
      deletedOrders: deletedOrdersCount,
      deletedOrderItems: 0,
      executedAt: new Date().toISOString(),
    };
  } catch (error: any) {
    console.error('[Retention Cleanup Exception]', error);
    return {
      success: false,
      retentionDays: effectiveDays,
      cutoffTimestamp,
      deletedOrders: 0,
      deletedOrderItems: 0,
      executedAt: new Date().toISOString(),
      error: error.message || 'Failed to complete retention cleanup',
    };
  }
}
