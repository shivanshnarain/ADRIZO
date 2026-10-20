import { getAdminClient } from './supabase/admin';
import { createAdminNotification } from './admin-notifications';

export * from './order-sla-eval';
import { evaluateOrderSla } from './order-sla-eval';


/**
 * Scans active database orders and generates durable alerts for SLA breaches.
 * Idempotent: Can run repeatedly on cron without duplicate notifications.
 */
export async function runSlaAuditAndNotify() {
  const supabase = getAdminClient();
  const results = {
    totalScanned: 0,
    packingOverdue: 0,
    packingApproaching: 0,
    pickupOverdue: 0,
    alertsDispatched: 0,
  };

  try {
    // Scan recent orders from the last 7 days that are not terminal
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: orders, error } = await supabase
      .from('orders')
      .select('id, order_number, customer_name, customer_email, total_amount, payment_status, order_status, tracking_status, created_at')
      .gte('created_at', sevenDaysAgo)
      .neq('order_status', 'CANCELLED')
      .neq('order_status', 'DELIVERED')
      .order('created_at', { ascending: false });

    if (error || !orders) {
      console.error('[SLA Audit Error] Failed to fetch orders:', error?.message);
      return { success: false, error: error?.message || 'Database query error', results };
    }

    results.totalScanned = orders.length;

    for (const order of orders) {
      const sla = evaluateOrderSla(order);

      // 1. Check Packing Overdue
      if (sla.packingSla.status === 'OVERDUE') {
        results.packingOverdue++;
        const res = await createAdminNotification({
          type: 'PACKING_OVERDUE',
          title: `Packing Overdue: #${sla.orderNumber}`,
          message: `Order #${sla.orderNumber} placed on ${sla.createdAtIst} has exceeded the 10-hour packing SLA target (${sla.packingSla.label}).`,
          orderNumber: sla.orderNumber,
          orderId: sla.orderId,
          customerName: order.customer_name,
          orderTotal: Number(order.total_amount || 0),
          paymentStatus: order.payment_status,
          dedupKey: `PACKING_OVERDUE_${sla.orderNumber}`,
          metadata: {
            createdAtIst: sla.createdAtIst,
            hoursElapsed: sla.packingSla.hoursElapsed,
            deadlineIst: sla.packingSla.deadlineIst,
          },
        });
        if (res.success) results.alertsDispatched++;
      } else if (sla.packingSla.status === 'APPROACHING') {
        results.packingApproaching++;
        const res = await createAdminNotification({
          type: 'PACKING_APPROACHING',
          title: `Packing Due Soon: #${sla.orderNumber}`,
          message: `Order #${sla.orderNumber} is approaching the 10-hour packing deadline (${sla.packingSla.label}). Target: ${sla.packingSla.deadlineIst}.`,
          orderNumber: sla.orderNumber,
          orderId: sla.orderId,
          customerName: order.customer_name,
          orderTotal: Number(order.total_amount || 0),
          paymentStatus: order.payment_status,
          dedupKey: `PACKING_APPROACHING_${sla.orderNumber}`,
        });
        if (res.success) results.alertsDispatched++;
      }

      // 2. Check Pickup Overdue
      if (sla.pickupSla.status === 'OVERDUE') {
        results.pickupOverdue++;
        const res = await createAdminNotification({
          type: 'PICKUP_OVERDUE',
          title: `Courier Pickup Overdue: #${sla.orderNumber}`,
          message: `Order #${sla.orderNumber} placed on ${sla.createdAtIst} has exceeded the 24-hour courier pickup target (${sla.pickupSla.label}).`,
          orderNumber: sla.orderNumber,
          orderId: sla.orderId,
          customerName: order.customer_name,
          orderTotal: Number(order.total_amount || 0),
          paymentStatus: order.payment_status,
          dedupKey: `PICKUP_OVERDUE_${sla.orderNumber}`,
          metadata: {
            createdAtIst: sla.createdAtIst,
            hoursElapsed: sla.pickupSla.hoursElapsed,
            deadlineIst: sla.pickupSla.deadlineIst,
          },
        });
        if (res.success) results.alertsDispatched++;
      }
    }

    return { success: true, results };
  } catch (err: any) {
    console.error('[SLA Audit Exception]', err.message);
    return { success: false, error: err.message, results };
  }
}
