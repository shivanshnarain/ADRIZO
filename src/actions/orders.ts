'use server';

import { prisma } from '../lib/prisma';
import { getAdminClient } from '../lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { verifyAdminSession } from '../lib/auth';
import { resolveOrderFromSupabase } from '../lib/order-resolver';
import {
  createShiprocketOrder,
  checkCourierServiceability,
  assignShiprocketAwb,
  generateShiprocketLabel,
  generateShiprocketInvoice,
  requestShiprocketPickup,
  generateShiprocketManifest,
  trackShipmentByAwb,
  syncOrderTracking,
} from '../lib/shiprocket';
import { autoSyncOrderToShiprocket } from '../lib/shiprocket-auto-sync';

export async function getOrders() {
  try {
    const session = await verifyAdminSession();
    if (!session.authorized) {
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    // 1. Fetch strictly from Supabase as the Single Source of Truth
    const supabase = getAdminClient();
    const { data: supaOrders, error: supaErr } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        customer_id,
        customer_name,
        customer_email,
        customer_phone,
        house_flat,
        area_street,
        landmark,
        shipping_address,
        city,
        state,
        pincode,
        subtotal,
        shipping_charge,
        cod_charge,
        discount,
        coupon_code,
        total_amount,
        payment_method,
        payment_status,
        order_status,
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        delivery_partner,
        tracking_id,
        tracking_status,
        shiprocket_order_id,
        shiprocket_shipment_id,
        shiprocket_status,
        shiprocket_sync_status,
        shiprocket_sync_error,
        shiprocket_synced_at,
        pickup_id,
        label_url,
        invoice_url,
        manifest_url,
        courier_company_id,
        cancellation_source,
        cancellation_reason,
        cancelled_at,
        created_at,
        updated_at,
        order_items (
          id,
          product_id,
          product_name,
          sku,
          size,
          color,
          quantity,
          unit_price,
          total_price
        )
      `)
      .order('created_at', { ascending: false });

    if (!supaErr && supaOrders) {
      const formatted = supaOrders.map(o => ({
        id: o.id,
        orderNumber: o.order_number,
        customerId: o.customer_id,
        customerName: o.customer_name,
        customerEmail: o.customer_email,
        customerPhone: o.customer_phone,
        houseFlat: o.house_flat || null,
        areaStreet: o.area_street || null,
        landmark: o.landmark || null,
        shippingAddress: o.shipping_address,
        city: o.city,
        state: o.state,
        pincode: o.pincode,
        subtotal: Number(o.subtotal || 0),
        shippingCharge: Number(o.shipping_charge || 0),
        codCharge: Number(o.cod_charge || (o.payment_method === 'COD' ? 99 : 0)),
        discount: Number(o.discount || 0),
        couponCode: o.coupon_code,
        total: Number(o.total_amount || 0),
        paymentMethod: o.payment_method,
        paymentStatus: o.payment_status,
        orderStatus: o.order_status,
        razorpayOrderId: o.razorpay_order_id,
        razorpayPaymentId: o.razorpay_payment_id,
        razorpaySignature: o.razorpay_signature,
        deliveryPartner: o.delivery_partner,
        trackingId: o.tracking_id,
        trackingStatus: o.tracking_status || 'ORDER_RECEIVED',
        shiprocketOrderId: o.shiprocket_order_id || null,
        shiprocketShipmentId: o.shiprocket_shipment_id || null,
        shiprocketStatus: o.shiprocket_status || null,
        shiprocketSyncStatus: o.shiprocket_sync_status || (o.shiprocket_shipment_id ? 'SYNCED' : 'PENDING'),
        shiprocketSyncError: o.shiprocket_sync_error || null,
        shiprocketSyncedAt: o.shiprocket_synced_at || null,
        pickupId: o.pickup_id || null,
        labelUrl: o.label_url || null,
        invoiceUrl: o.invoice_url || null,
        manifestUrl: o.manifest_url || null,
        courierCompanyId: o.courier_company_id || null,
        cancellationSource: o.cancellation_source || null,
        cancellationReason: o.cancellation_reason || null,
        cancelledAt: o.cancelled_at || null,
        createdAt: o.created_at,
        updatedAt: o.updated_at,
        items: (o.order_items || []).map((it: any) => ({
          id: it.id,
          productId: it.product_id,
          productName: it.product_name,
          sku: it.sku,
          size: it.size,
          color: it.color,
          quantity: it.quantity,
          price: Number(it.unit_price || 0),
          total: Number(it.total_price || 0),
        }))
      }));
      return { success: true, orders: formatted };
    }

    return { success: true, orders: [] };
  } catch (error: any) {
    console.error('[Admin Orders Fetch Error]', error);
    return { success: false, error: error.message };
  }
}

export async function updateOrderStatus(
  id: string, 
  orderStatus: string, 
  paymentStatus: string,
  deliveryPartner?: string,
  trackingId?: string,
  trackingStatus?: string
) {
  try {
    const session = await verifyAdminSession();
    if (!session.authorized) {
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    // Update in Supabase via SECURITY DEFINER admin_update_order RPC
    const supabase = getAdminClient();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    let targetOrderId = id;
    if (!isUuid) {
      const { data: foundOrder } = await supabase
        .from('orders')
        .select('id')
        .eq('order_number', id)
        .maybeSingle();
      if (foundOrder?.id) {
        targetOrderId = foundOrder.id;
      } else {
        return { success: false, error: 'Order not found' };
      }
    }

    const { data: rpcRes, error: rpcErr } = await supabase.rpc('admin_update_order', {
      p_order_id: targetOrderId,
      p_order_status: orderStatus,
      p_payment_status: paymentStatus,
      p_delivery_partner: deliveryPartner?.trim() || null,
      p_tracking_id: trackingId?.trim() || null,
      p_tracking_status: trackingStatus?.trim() || 'ORDER_RECEIVED',
    });

    if (rpcErr) {
      console.error('[Supabase admin_update_order Error]', rpcErr);
      return { success: false, error: rpcErr.message };
    }

    revalidatePath('/admin/orders');
    revalidatePath('/admin/dashboard');
    return { success: true, order: rpcRes?.order };
  } catch (error: any) {
    console.error('[Admin Order Update Error]', error);
    return { success: false, error: error.message };
  }
}

import { deleteSingleOrder } from '../lib/order-cleanup';

export async function deleteOrder(id: string) {
  try {
    const session = await verifyAdminSession();
    if (!session.authorized) {
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    if (!id || typeof id !== 'string') {
      return { success: false, error: 'Order identifier is required' };
    }

    const supabase = getAdminClient();
    const result = await deleteSingleOrder(supabase, id);

    if (!result.success) {
      return { 
        success: false, 
        error: result.error || 'Unable to delete this order. No data was removed.' 
      };
    }

    revalidatePath('/admin/orders');
    revalidatePath('/admin/dashboard');

    return { 
      success: true, 
      message: `Order #${result.orderNumber} permanently deleted.`,
      orderNumber: result.orderNumber,
      deletedId: result.deletedId 
    };
  } catch (error: any) {
    console.error('[Admin Order Delete Exception]', error);
    return { 
      success: false, 
      error: error.message || 'Unable to delete this order. No data was removed.' 
    };
  }
}

export async function createShiprocketShipmentAction(orderId: string) {
  try {
    const session = await verifyAdminSession();
    if (!session.authorized) {
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    const result = await autoSyncOrderToShiprocket(orderId);
    revalidatePath('/admin/orders');
    revalidatePath('/admin/dashboard');

    if (!result.success) {
      return { success: false, error: result.error || 'Failed to sync with Shiprocket' };
    }

    return {
      success: true,
      alreadySynced: result.alreadySynced,
      orderId: result.orderId,
      shipmentId: result.shipmentId,
      status: result.status,
      message: result.message,
    };
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error('[Admin Shiprocket Create Action Error]', err.message);
    return { success: false, error: err.message || 'Failed to create Shiprocket order' };
  }
}

export async function checkOrderServiceabilityAction(orderId: string) {
  try {
    const session = await verifyAdminSession();
    if (!session.authorized) {
      return { success: false, error: 'Unauthorized: Admin access required', availableCouriers: [] };
    }

    const order = await resolveOrderFromSupabase(orderId);
    if (!order) {
      return { success: false, error: 'Order not found', availableCouriers: [] };
    }

    if (!order.pincode) {
      return { success: false, error: 'Order does not have a destination PIN code', availableCouriers: [] };
    }

    const totalUnits = order.items.reduce((s, it) => s + (it.quantity || 1), 0);
    const weight = Math.max(0.4, Number((totalUnits * 0.35).toFixed(2)));

    const result = await checkCourierServiceability({
      deliveryPincode: order.pincode,
      weightKg: weight,
      isCod: order.paymentMethod === 'COD',
      orderTotal: order.total,
    });

    return result;
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error('[Admin Serviceability Action Error]', err.message);
    return { success: false, error: err.message || 'Failed to check serviceability', availableCouriers: [] };
  }
}

export async function assignAwbAction(
  orderId: string,
  courierId: string | number,
  courierName?: string,
  forceReassign?: boolean
) {
  try {
    const session = await verifyAdminSession();
    if (!session.authorized) {
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    const result = await assignShiprocketAwb({
      orderId,
      courierId,
      courierName,
      forceReassign,
    });

    revalidatePath('/admin/orders');
    revalidatePath('/admin/dashboard');

    return {
      success: true,
      alreadyAssigned: result.alreadyAssigned,
      awbCode: result.awbCode,
      courierName: result.courierName,
      courierCompanyId: result.courierCompanyId,
      message: result.message,
    };
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error('[Admin Assign AWB Action Error]', err.message);
    return { success: false, error: err.message || 'Failed to assign AWB with Shiprocket' };
  }
}

export async function generateLabelAction(orderId: string, force?: boolean) {
  try {
    const session = await verifyAdminSession();
    if (!session.authorized) {
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    const result = await generateShiprocketLabel({ orderId, force });
    revalidatePath('/admin/orders');

    return {
      success: true,
      labelUrl: result.labelUrl,
      message: result.message,
    };
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error('[Admin Generate Label Action Error]', err.message);
    return { success: false, error: err.message || 'Failed to generate shipping label' };
  }
}

export async function generateInvoiceAction(orderId: string, force?: boolean) {
  try {
    const session = await verifyAdminSession();
    if (!session.authorized) {
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    const result = await generateShiprocketInvoice({ orderId, force });
    revalidatePath('/admin/orders');

    return {
      success: true,
      invoiceUrl: result.invoiceUrl,
      message: result.message,
    };
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error('[Admin Generate Invoice Action Error]', err.message);
    return { success: false, error: err.message || 'Failed to generate shipping invoice' };
  }
}

export async function requestPickupAction(orderId: string) {
  try {
    const session = await verifyAdminSession();
    if (!session.authorized) {
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    const result = await requestShiprocketPickup({ orderId });
    revalidatePath('/admin/orders');
    revalidatePath('/admin/dashboard');

    return {
      success: true,
      alreadyScheduled: result.alreadyScheduled,
      pickupId: result.pickupId,
      scheduledDate: result.scheduledDate,
      message: result.message,
    };
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error('[Admin Request Pickup Action Error]', err.message);
    return { success: false, error: err.message || 'Failed to request courier pickup' };
  }
}

export async function generateManifestAction(orderId: string) {
  try {
    const session = await verifyAdminSession();
    if (!session.authorized) {
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    const result = await generateShiprocketManifest({ orderId });
    revalidatePath('/admin/orders');

    return {
      success: true,
      manifestUrl: result.manifestUrl,
      message: result.message,
    };
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error('[Admin Generate Manifest Action Error]', err.message);
    return { success: false, error: err.message || 'Failed to generate shipping manifest' };
  }
}

export async function trackOrderAction(awbCode: string) {
  try {
    const session = await verifyAdminSession();
    if (!session.authorized) {
      return { success: false, error: 'Unauthorized: Admin access required', activities: [] };
    }

    const result = await trackShipmentByAwb(awbCode);
    return result;
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error('[Admin Track Order Action Error]', err.message);
    return { success: false, error: err.message || 'Failed to fetch tracking data', activities: [] };
  }
}

export async function syncTrackingAction(orderId: string) {
  try {
    const session = await verifyAdminSession();
    if (!session.authorized) {
      return { success: false, error: 'Unauthorized: Admin access required' };
    }

    const result = await syncOrderTracking(orderId);
    revalidatePath('/admin/orders');
    revalidatePath('/admin/dashboard');

    return result;
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error('[Admin Sync Tracking Action Error]', err.message);
    return { success: false, error: err.message || 'Failed to sync tracking' };
  }
}


