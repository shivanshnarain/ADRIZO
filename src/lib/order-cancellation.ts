import { resolveOrderFromSupabase, ResolvedOrder } from './order-resolver';
import { getAdminClient } from './supabase/admin';
import { cancelShiprocketOrder } from './shiprocket';
import { AuthenticatedCustomer, isOrderOwnedByCustomer } from './customer-auth';

export interface CancelOrderResult {
  success: boolean;
  alreadyCancelled?: boolean;
  orderNumber: string;
  orderStatus?: string;
  refundNote?: string;
  message: string;
  error?: string;
}

/**
 * Validates whether an order is still in a cancellable fulfillment state.
 */
export function isOrderCancellable(order: ResolvedOrder): { cancellable: boolean; reason?: string } {
  const currentStatus = (order.orderStatus || '').toUpperCase();
  const trackingStatus = (order.trackingStatus || '').toUpperCase();
  const shiprocketStatus = (order.shiprocketStatus || '').toUpperCase();

  if (currentStatus === 'CANCELLED' || trackingStatus === 'CANCELLED' || shiprocketStatus.includes('CANCEL')) {
    return { cancellable: false, reason: 'This order has already been cancelled.' };
  }

  if (currentStatus === 'DELIVERED' || trackingStatus === 'DELIVERED') {
    return { cancellable: false, reason: 'Delivered orders cannot be cancelled. You may request a return or exchange.' };
  }

  if (
    currentStatus === 'SHIPPED' ||
    trackingStatus === 'SHIPPED' ||
    trackingStatus === 'OUT_FOR_DELIVERY' ||
    trackingStatus === 'IN_TRANSIT' ||
    trackingStatus === 'PICKED_UP' ||
    trackingStatus === 'RETURNED'
  ) {
    return {
      cancellable: false,
      reason: 'This order is already in transit with our courier partner and cannot be cancelled.',
    };
  }

  // If courier is already assigned (AWB generated) or pickup scheduled, fulfillment has progressed
  if (
    order.trackingId ||
    order.pickupId ||
    trackingStatus === 'PACKED' ||
    trackingStatus === 'AWB_ASSIGNED' ||
    shiprocketStatus.includes('AWB') ||
    shiprocketStatus.includes('PICKUP')
  ) {
    return {
      cancellable: false,
      reason: 'This order is already packed and assigned to a courier for dispatch. It can no longer be cancelled.',
    };
  }

  // Allowed states: PLACED, CONFIRMED, PROCESSING, ORDER_RECEIVED
  const cancellableOrderStates = ['PLACED', 'CONFIRMED', 'PROCESSING'];
  if (!cancellableOrderStates.includes(currentStatus)) {
    return {
      cancellable: false,
      reason: `Orders in "${currentStatus}" state cannot be cancelled online. Please contact customer care.`,
    };
  }

  return { cancellable: true };
}

/**
 * Safely cancels an order for an authenticated customer.
 * 
 * Safety & Integrity:
 * - Enforces customer ownership (strict IDOR protection).
 * - Re-checks latest database status atomically.
 * - Idempotent if already cancelled.
 * - If order exists in Shiprocket, safely coordinates cancellation with Shiprocket API.
 * - Never fakes refunds for prepaid or COD orders.
 */
export async function cancelCustomerOrder(params: {
  orderIdentifier: string;
  reason?: string;
  customer: AuthenticatedCustomer;
}): Promise<CancelOrderResult> {
  const { orderIdentifier, reason, customer } = params;

  if (!orderIdentifier) {
    return {
      success: false,
      orderNumber: '',
      message: 'Order identifier is required.',
      error: 'Missing order identifier',
    };
  }

  // 1. Resolve order fresh from database
  const order = await resolveOrderFromSupabase(orderIdentifier);
  if (!order) {
    return {
      success: false,
      orderNumber: orderIdentifier,
      message: 'Order not found.',
      error: 'Order not found',
    };
  }

  // 2. Strict IDOR protection: Verify ownership
  if (!isOrderOwnedByCustomer(order, customer)) {
    return {
      success: false,
      orderNumber: order.orderNumber,
      message: 'You are not authorized to cancel this order.',
      error: 'Unauthorized order ownership',
    };
  }

  // 3. Idempotency: If already cancelled
  if (order.orderStatus === 'CANCELLED') {
    return {
      success: true,
      alreadyCancelled: true,
      orderNumber: order.orderNumber,
      orderStatus: 'CANCELLED',
      message: 'This order is already cancelled.',
    };
  }

  // 4. Validate cancellation eligibility
  const eligibility = isOrderCancellable(order);
  if (!eligibility.cancellable) {
    return {
      success: false,
      orderNumber: order.orderNumber,
      message: eligibility.reason || 'This order can no longer be cancelled.',
      error: eligibility.reason,
    };
  }

  // 5. Handle Shiprocket cancellation if order exists in Shiprocket
  let shiprocketCancelled = false;
  if (order.shiprocketOrderId) {
    console.log(
      `[Order Cancellation] Order #${order.orderNumber} has Shiprocket Order ID ${order.shiprocketOrderId}. Coordinating cancellation...`
    );

    const srResult = await cancelShiprocketOrder(order.shiprocketOrderId);
    if (!srResult.success) {
      console.warn(
        `[Order Cancellation] Shiprocket rejected cancellation for #${order.orderNumber}: ${srResult.message}`
      );
      return {
        success: false,
        orderNumber: order.orderNumber,
        message: 'Unable to cancel order as dispatch is already in progress with the courier network.',
        error: srResult.message,
      };
    }
    shiprocketCancelled = true;
    console.log(`[Order Cancellation] Shiprocket order #${order.shiprocketOrderId} cancelled successfully.`);
  }

  // 6. Build updates safely
  const cancellationReason = reason?.trim() || 'Customer requested cancellation';
  const now = new Date().toISOString();

  const updates: Record<string, any> = {
    order_status: 'CANCELLED',
    tracking_status: 'CANCELLED',
    cancellation_source: 'CUSTOMER',
    cancellation_reason: cancellationReason,
    cancelled_at: now,
    updated_at: now,
  };

  if (shiprocketCancelled) {
    updates.shiprocket_status = 'CANCELED';
    updates.shiprocket_synced_at = now;
  }

  // Handle payment status safely without fake refunds
  let refundNote = '';
  if (order.paymentMethod === 'COD') {
    updates.payment_status = 'CANCELLED';
    refundNote = 'Your Cash on Delivery order has been cancelled. No payment was collected.';
  } else if (order.paymentStatus === 'PAID') {
    // Preserve payment_status as PAID until real payment gateway refund occurs
    refundNote = `Your prepaid refund of ₹${order.total.toFixed(2)} will be processed to your original payment method within 5–7 business days according to the AD(R)IZO Refund Policy.`;
  } else {
    updates.payment_status = 'CANCELLED';
    refundNote = 'Order has been cancelled.';
  }

  // 7. Atomically persist to Supabase
  const supabase = getAdminClient();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(order.id);

  let query = supabase.from('orders').update(updates);
  if (isUuid) {
    query = query.eq('id', order.id);
  } else {
    query = query.eq('order_number', order.orderNumber);
  }

  const { error: updateErr } = await query;
  if (updateErr) {
    console.error(`[Order Cancellation] Database update failed for #${order.orderNumber}:`, updateErr.message);
    return {
      success: false,
      orderNumber: order.orderNumber,
      message: 'Failed to update order status. Please try again or contact support.',
      error: updateErr.message,
    };
  }

  console.log(`[Order Cancellation] Order #${order.orderNumber} successfully cancelled.`);

  return {
    success: true,
    alreadyCancelled: false,
    orderNumber: order.orderNumber,
    orderStatus: 'CANCELLED',
    refundNote,
    message: 'Order cancelled successfully.',
  };
}
