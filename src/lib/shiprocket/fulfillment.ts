import { resolveOrderFromSupabase, ResolvedOrder } from '../order-resolver';
import { getAdminClient } from '../supabase/admin';
import { shiprocketRequest } from './client';
import {
  ShiprocketAssignAwbResponse,
  ShiprocketGenerateLabelResponse,
  ShiprocketGenerateInvoiceResponse,
  ShiprocketGeneratePickupResponse,
  ShiprocketGenerateManifestResponse,
} from './types';

/**
 * Helper to update order fields in Supabase by UUID or order_number.
 */
async function updateSupabaseOrder(
  order: ResolvedOrder,
  updates: Record<string, any>
): Promise<void> {
  const supabase = getAdminClient();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(order.id);

  let query = supabase.from('orders').update({
    ...updates,
    updated_at: new Date().toISOString(),
  });

  if (isUuid) {
    query = query.eq('id', order.id);
  } else {
    query = query.eq('order_number', order.orderNumber);
  }

  const { error } = await query;
  if (error) {
    console.error(`[Shiprocket Fulfillment] Supabase update error for #${order.orderNumber}:`, error.message);
    throw new Error(`Database update failed: ${error.message}`);
  }
}

/**
 * Assigns a courier and generates an AWB for an existing Shiprocket shipment.
 * 
 * Strict Idempotency:
 * If the shipment already has an AWB assigned, returns the existing AWB without calling the external API.
 */
export async function assignShiprocketAwb(params: {
  orderId: string;
  courierId: number | string;
  courierName?: string;
  forceReassign?: boolean;
}): Promise<{
  success: boolean;
  alreadyAssigned?: boolean;
  awbCode: string;
  courierName: string;
  courierCompanyId: string;
  message: string;
}> {
  const order = await resolveOrderFromSupabase(params.orderId);
  if (!order) {
    throw new Error(`Order "${params.orderId}" not found in database.`);
  }

  if (!order.shiprocketShipmentId) {
    throw new Error(
      `Order #${order.orderNumber} has not been created on Shiprocket yet. Please create the Shiprocket order first.`
    );
  }

  // Idempotency check: if AWB is already assigned and not forcing reassign, return existing AWB
  if (order.trackingId && !params.forceReassign) {
    console.log(
      `[Shiprocket AWB] Order #${order.orderNumber} already has AWB "${order.trackingId}". Skipping assignment.`
    );
    return {
      success: true,
      alreadyAssigned: true,
      awbCode: order.trackingId,
      courierName: order.deliveryPartner || params.courierName || 'Assigned Courier',
      courierCompanyId: order.courierCompanyId || String(params.courierId),
      message: `AWB ${order.trackingId} is already assigned to Order #${order.orderNumber}.`,
    };
  }

  console.log(
    `[Shiprocket AWB] Assigning courier ID ${params.courierId} to Shipment #${order.shiprocketShipmentId} for Order #${order.orderNumber}...`
  );

  try {
    const payload = {
      shipment_id: Number(order.shiprocketShipmentId),
      courier_id: Number(params.courierId),
    };

    const res = await shiprocketRequest<ShiprocketAssignAwbResponse>('/courier/assign/awb', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const data = res?.response?.data;
    const awbCode = data?.awb_code;

    if (!awbCode) {
      const errMsg = res?.message || 'Shiprocket did not return an AWB code for this courier.';
      console.error(`[Shiprocket AWB] Assignment failed for #${order.orderNumber}:`, res);
      await updateSupabaseOrder(order, {
        shiprocket_status: 'AWB_FAILED',
      });
      throw new Error(`AWB Assignment Failed: ${errMsg}`);
    }

    const courierName = data?.courier_name || params.courierName || 'Courier Partner';
    const courierCompanyId = String(data?.courier_company_id || params.courierId);

    console.log(
      `[Shiprocket AWB] AWB "${awbCode}" successfully assigned via ${courierName} for Order #${order.orderNumber}!`
    );

    // Save returned fulfillment details to Supabase
    await updateSupabaseOrder(order, {
      tracking_id: awbCode,
      delivery_partner: courierName,
      courier_company_id: courierCompanyId,
      shiprocket_status: 'AWB_ASSIGNED',
      tracking_status: 'PACKED',
      shiprocket_synced_at: new Date().toISOString(),
    });

    return {
      success: true,
      alreadyAssigned: false,
      awbCode,
      courierName,
      courierCompanyId,
      message: `AWB ${awbCode} assigned successfully with ${courierName}.`,
    };
  } catch (err: unknown) {
    const errorObj = err as { message?: string };
    console.error(`[Shiprocket AWB] Error for #${order.orderNumber}:`, errorObj.message);
    throw new Error(`Shiprocket AWB Assignment Failed: ${errorObj.message || 'Unknown error'}`);
  }
}

/**
 * Generates a shipping label PDF URL from Shiprocket for an order with an assigned AWB.
 * 
 * Strict Idempotency:
 * Returns the existing label URL if already generated, unless force is true.
 */
export async function generateShiprocketLabel(params: {
  orderId: string;
  force?: boolean;
}): Promise<{
  success: boolean;
  labelUrl: string;
  message: string;
}> {
  const order = await resolveOrderFromSupabase(params.orderId);
  if (!order) {
    throw new Error(`Order "${params.orderId}" not found in database.`);
  }

  if (!order.shiprocketShipmentId) {
    throw new Error(`Order #${order.orderNumber} does not have a Shiprocket shipment ID.`);
  }

  // Idempotency
  if (order.labelUrl && !params.force) {
    return {
      success: true,
      labelUrl: order.labelUrl,
      message: 'Shipping label already generated.',
    };
  }

  console.log(`[Shiprocket Label] Generating label for Shipment #${order.shiprocketShipmentId} (#${order.orderNumber})...`);

  try {
    const res = await shiprocketRequest<ShiprocketGenerateLabelResponse>('/courier/generate/label', {
      method: 'POST',
      body: JSON.stringify({
        shipment_id: [Number(order.shiprocketShipmentId)],
      }),
    });

    const labelUrl = res?.label_url;
    if (!labelUrl) {
      const msg = res?.message || res?.response || 'Shiprocket did not return a label URL.';
      throw new Error(`Label Generation Failed: ${msg}`);
    }

    console.log(`[Shiprocket Label] Label created successfully for #${order.orderNumber}: ${labelUrl}`);

    await updateSupabaseOrder(order, {
      label_url: labelUrl,
      shiprocket_synced_at: new Date().toISOString(),
    });

    return {
      success: true,
      labelUrl,
      message: 'Shipping label generated successfully.',
    };
  } catch (err: unknown) {
    const errorObj = err as { message?: string };
    console.error(`[Shiprocket Label] Error for #${order.orderNumber}:`, errorObj.message);
    throw new Error(`Shiprocket Label Generation Failed: ${errorObj.message || 'Unknown error'}`);
  }
}

/**
 * Generates a shipping invoice PDF URL from Shiprocket for an order.
 * 
 * Strict Idempotency:
 * Returns the existing invoice URL if already generated, unless force is true.
 */
export async function generateShiprocketInvoice(params: {
  orderId: string;
  force?: boolean;
}): Promise<{
  success: boolean;
  invoiceUrl: string;
  message: string;
}> {
  const order = await resolveOrderFromSupabase(params.orderId);
  if (!order) {
    throw new Error(`Order "${params.orderId}" not found in database.`);
  }

  if (!order.shiprocketOrderId) {
    throw new Error(`Order #${order.orderNumber} does not have a Shiprocket order ID.`);
  }

  // Idempotency
  if (order.invoiceUrl && !params.force) {
    return {
      success: true,
      invoiceUrl: order.invoiceUrl,
      message: 'Shipping invoice already generated.',
    };
  }

  console.log(`[Shiprocket Invoice] Generating invoice for Order #${order.shiprocketOrderId} (#${order.orderNumber})...`);

  try {
    const res = await shiprocketRequest<ShiprocketGenerateInvoiceResponse>('/orders/print/invoice', {
      method: 'POST',
      body: JSON.stringify({
        ids: [Number(order.shiprocketOrderId)],
      }),
    });

    const invoiceUrl = res?.invoice_url;
    if (!invoiceUrl) {
      const msg = res?.message || 'Shiprocket did not return an invoice URL.';
      throw new Error(`Invoice Generation Failed: ${msg}`);
    }

    console.log(`[Shiprocket Invoice] Invoice created successfully for #${order.orderNumber}: ${invoiceUrl}`);

    await updateSupabaseOrder(order, {
      invoice_url: invoiceUrl,
      shiprocket_synced_at: new Date().toISOString(),
    });

    return {
      success: true,
      invoiceUrl,
      message: 'Shipping invoice generated successfully.',
    };
  } catch (err: unknown) {
    const errorObj = err as { message?: string };
    console.error(`[Shiprocket Invoice] Error for #${order.orderNumber}:`, errorObj.message);
    throw new Error(`Shiprocket Invoice Generation Failed: ${errorObj.message || 'Unknown error'}`);
  }
}

/**
 * Schedules a courier pickup for an order that has an assigned AWB.
 * 
 * Strict Idempotency:
 * If pickup is already scheduled (pickup_id exists), returns the existing pickup ID without re-requesting.
 */
export async function requestShiprocketPickup(params: {
  orderId: string;
}): Promise<{
  success: boolean;
  alreadyScheduled?: boolean;
  pickupId: string;
  scheduledDate?: string;
  message: string;
}> {
  const order = await resolveOrderFromSupabase(params.orderId);
  if (!order) {
    throw new Error(`Order "${params.orderId}" not found in database.`);
  }

  if (!order.shiprocketShipmentId) {
    throw new Error(`Order #${order.orderNumber} does not have a Shiprocket shipment.`);
  }

  if (!order.trackingId) {
    throw new Error(
      `Order #${order.orderNumber} does not have an AWB assigned yet. Assign an AWB before scheduling pickup.`
    );
  }

  // Idempotency: Check if pickup ID already exists
  if (order.pickupId) {
    console.log(`[Shiprocket Pickup] Order #${order.orderNumber} already has pickup ID "${order.pickupId}".`);
    return {
      success: true,
      alreadyScheduled: true,
      pickupId: order.pickupId,
      message: `Pickup already scheduled (Pickup ID: ${order.pickupId}).`,
    };
  }

  console.log(`[Shiprocket Pickup] Requesting pickup for Shipment #${order.shiprocketShipmentId} (#${order.orderNumber})...`);

  try {
    const res = await shiprocketRequest<ShiprocketGeneratePickupResponse>('/courier/generate/pickup', {
      method: 'POST',
      body: JSON.stringify({
        shipment_id: [Number(order.shiprocketShipmentId)],
      }),
    });

    const pickupIdVal = res?.response?.pickup_id || res?.response?.pickup_token_number;
    if (!pickupIdVal) {
      const msg = res?.response?.data || res?.message || 'Failed to schedule pickup with courier.';
      throw new Error(`Pickup Request Failed: ${msg}`);
    }

    const pickupId = String(pickupIdVal);
    const scheduledDate = res?.response?.pickup_scheduled_date;

    console.log(
      `[Shiprocket Pickup] Pickup scheduled successfully for #${order.orderNumber} (Pickup ID: ${pickupId})!`
    );

    await updateSupabaseOrder(order, {
      pickup_id: pickupId,
      shiprocket_status: 'PICKUP_SCHEDULED',
      tracking_status: 'PACKED',
      shiprocket_synced_at: new Date().toISOString(),
    });

    return {
      success: true,
      alreadyScheduled: false,
      pickupId,
      scheduledDate,
      message: `Pickup scheduled successfully (Pickup ID: ${pickupId}).`,
    };
  } catch (err: unknown) {
    const errorObj = err as { message?: string };
    console.error(`[Shiprocket Pickup] Error for #${order.orderNumber}:`, errorObj.message);
    throw new Error(`Shiprocket Pickup Request Failed: ${errorObj.message || 'Unknown error'}`);
  }
}

/**
 * Generates a shipping manifest for an eligible shipment.
 * 
 * Strict Idempotency:
 * Returns existing manifest URL if already generated.
 */
export async function generateShiprocketManifest(params: {
  orderId: string;
}): Promise<{
  success: boolean;
  manifestUrl: string;
  message: string;
}> {
  const order = await resolveOrderFromSupabase(params.orderId);
  if (!order) {
    throw new Error(`Order "${params.orderId}" not found in database.`);
  }

  if (!order.shiprocketShipmentId) {
    throw new Error(`Order #${order.orderNumber} does not have a Shiprocket shipment.`);
  }

  if (!order.trackingId) {
    throw new Error(`Order #${order.orderNumber} must have an AWB assigned before manifest generation.`);
  }

  // Idempotency
  if (order.manifestUrl) {
    return {
      success: true,
      manifestUrl: order.manifestUrl,
      message: 'Manifest already generated.',
    };
  }

  console.log(`[Shiprocket Manifest] Generating manifest for Shipment #${order.shiprocketShipmentId} (#${order.orderNumber})...`);

  try {
    const res = await shiprocketRequest<ShiprocketGenerateManifestResponse>('/manifests/generate', {
      method: 'POST',
      body: JSON.stringify({
        shipment_id: [Number(order.shiprocketShipmentId)],
      }),
    });

    const manifestUrl = res?.manifest_url;
    if (!manifestUrl) {
      const msg = res?.message || 'Shiprocket did not return a manifest URL. Ensure pickup has been scheduled.';
      throw new Error(`Manifest Generation Failed: ${msg}`);
    }

    console.log(`[Shiprocket Manifest] Manifest created for #${order.orderNumber}: ${manifestUrl}`);

    await updateSupabaseOrder(order, {
      manifest_url: manifestUrl,
      shiprocket_synced_at: new Date().toISOString(),
    });

    return {
      success: true,
      manifestUrl,
      message: 'Manifest generated successfully.',
    };
  } catch (err: unknown) {
    const errorObj = err as { message?: string };
    console.error(`[Shiprocket Manifest] Error for #${order.orderNumber}:`, errorObj.message);
    throw new Error(`Shiprocket Manifest Generation Failed: ${errorObj.message || 'Unknown error'}`);
  }
}
