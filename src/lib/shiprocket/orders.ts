import { ResolvedOrder } from '../order-resolver';
import { getAdminClient } from '../supabase/admin';
import { shiprocketRequest } from './client';
import { maskEmail } from './config';
import {
  ShiprocketCreateOrderPayload,
  ShiprocketCreateOrderResponse,
} from './types';

export interface CreateShiprocketOrderOptions {
  pickupLocation?: string;
  packageWeightKg?: number;
  packageDimensionsCm?: {
    length: number;
    breadth: number;
    height: number;
  };
}

export interface CreateShiprocketOrderResult {
  success: boolean;
  alreadySynced?: boolean;
  orderId: number;
  shipmentId: number;
  status: string;
  statusCode?: number;
  awbCode?: string;
  courierName?: string;
  message?: string;
}

/**
 * Validates and sanitizes an Indian 10-digit mobile number.
 */
function sanitizePhoneNumber(phone?: string | null): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  // If prefixed with 91 and total length is 12, take last 10
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  // If prefixed with 0 and total length is 11, take last 10
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1);
  }
  // Return last 10 digits if valid length
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return digits;
}

/**
 * Validates and sanitizes a 6-digit Indian PIN code.
 */
function sanitizePincode(pincode?: string | null): string {
  if (!pincode) return '';
  const digits = pincode.replace(/\D/g, '');
  if (digits.length === 6) return digits;
  return digits.slice(0, 6);
}

/**
 * Formats a Date instance or ISO string into Shiprocket's expected "YYYY-MM-DD HH:mm" format.
 */
function formatShiprocketDate(dateInput?: string | Date | null): string {
  const d = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(d.getTime())) {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  }

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

/**
 * Creates an adhoc Order & Shipment in Shiprocket from an existing AD(R)IZO order.
 * 
 * Features:
 * - Strict Idempotency: If the order already has a Shiprocket Order ID or Shipment ID, skips creation.
 * - Robust Validation: Ensures required address, pincode, phone, and item details.
 * - Zero Data Loss: Failures never delete or corrupt the AD(R)IZO order.
 * - Structured Persistence: Updates existing Supabase order with returned identifiers.
 */
export async function createShiprocketOrder(
  order: ResolvedOrder,
  options: CreateShiprocketOrderOptions = {}
): Promise<CreateShiprocketOrderResult> {
  const orderRef = order.orderNumber || order.id;

  // 1. Idempotency Check: Prevent duplicate Shiprocket orders
  if (order.shiprocketOrderId && order.shiprocketShipmentId) {
    console.log(
      `[Shiprocket Order] Order #${orderRef} is already synced with Shiprocket (Order ID: ${order.shiprocketOrderId}, Shipment ID: ${order.shiprocketShipmentId}). Skipping creation.`
    );
    return {
      success: true,
      alreadySynced: true,
      orderId: Number(order.shiprocketOrderId),
      shipmentId: Number(order.shiprocketShipmentId),
      status: order.shiprocketStatus || 'NEW',
      message: `Order #${orderRef} is already synced with Shiprocket.`,
    };
  }

  // 2. Data Validation
  const cleanPhone = sanitizePhoneNumber(order.customerPhone);
  if (cleanPhone.length !== 10) {
    throw new Error(
      `Validation Error: Order #${orderRef} has an invalid customer phone number ("${order.customerPhone}"). A valid 10-digit Indian phone number is required for Shiprocket.`
    );
  }

  const cleanPincode = sanitizePincode(order.pincode);
  if (cleanPincode.length !== 6) {
    throw new Error(
      `Validation Error: Order #${orderRef} has an invalid delivery PIN code ("${order.pincode}"). A 6-digit Indian PIN code is required for Shiprocket.`
    );
  }

  const address = (order.shippingAddress || '').trim();
  if (address.length < 5) {
    throw new Error(
      `Validation Error: Order #${orderRef} has an incomplete delivery address. Minimum 5 characters required.`
    );
  }

  const city = (order.city || '').trim() || 'City';
  const state = (order.state || '').trim() || 'State';

  if (!order.items || order.items.length === 0) {
    throw new Error(`Validation Error: Order #${orderRef} has no order items.`);
  }

  // 3. Name Parsing (First and Last Name)
  const nameParts = (order.customerName || 'Valued Customer').trim().split(/\s+/);
  const firstName = nameParts[0] || 'Valued';
  const lastName = nameParts.slice(1).join(' ') || 'Customer';

  // 4. Garment Packaging Calculation
  const totalUnits = order.items.reduce((sum, item) => sum + (item.quantity || 1), 0);
  const calculatedWeight = Math.max(0.4, Number((totalUnits * 0.35).toFixed(2)));
  const finalWeight = options.packageWeightKg ? Math.max(0.1, options.packageWeightKg) : calculatedWeight;

  const dims = options.packageDimensionsCm || { length: 30, breadth: 20, height: 5 };

  // 5. Line items mapping
  const orderItems = order.items.map(item => ({
    name: (item.productName || 'Garment Product').slice(0, 100),
    sku: item.sku || 'TSH-ADR-DEFAULT',
    units: Math.max(1, item.quantity),
    selling_price: Math.max(0, item.unitPrice),
    discount: 0,
    tax: 0,
    hsn: 610910, // Standard garment HSN for cotton knitted apparel
  }));

  // 6. Payment method mapping
  const isCod = order.paymentMethod === 'COD';
  const paymentMethod = isCod ? 'COD' : 'Prepaid';

  // 7. Pickup location (defaults to primary verified location "work")
  const pickupLocation = options.pickupLocation || 'work';

  // 8. Build Shiprocket Adhoc Order Payload
  const payload: ShiprocketCreateOrderPayload = {
    order_id: order.orderNumber,
    order_date: formatShiprocketDate(order.createdAt),
    pickup_location: pickupLocation,
    comment: `AD(R)IZO Order #${order.orderNumber}`,
    billing_customer_name: firstName,
    billing_last_name: lastName,
    billing_address: address,
    billing_address_2: order.landmark || '',
    billing_city: city,
    billing_pincode: cleanPincode,
    billing_state: state,
    billing_country: 'India',
    billing_email: order.customerEmail || 'care.adrizo@gmail.com',
    billing_phone: cleanPhone,
    shipping_is_billing: true,
    order_items: orderItems,
    payment_method: paymentMethod,
    shipping_charges: isCod ? 0 : Number(order.shippingCharge || 0),
    giftwrap_charges: 0,
    transaction_charges: 0,
    total_discount: isCod ? 0 : Number(order.discount || 0),
    sub_total: isCod 
      ? Math.max(0, Number(order.total) - Number(order.codCharge || 99))
      : Number(order.subtotal || order.total),
    length: dims.length,
    breadth: dims.breadth,
    height: dims.height,
    weight: finalWeight,
  };

  console.log(
    `[Shiprocket Order] Creating Shiprocket order for #${order.orderNumber} (Customer: ${firstName} ${lastName}, Destination: ${cleanPincode}, Items: ${orderItems.length}, Total: ₹${order.total})...`
  );

  const startTime = Date.now();

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(order.id);

  try {
    // 9. API Request to Shiprocket
    const res = await shiprocketRequest<ShiprocketCreateOrderResponse>('/orders/create/adhoc', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const duration = Date.now() - startTime;

    if (!res || !res.order_id || !res.shipment_id) {
      console.error(
        `[Shiprocket Order] Invalid response for #${order.orderNumber} (${duration}ms): missing order_id or shipment_id`,
        res
      );
      throw new Error(`Shiprocket order creation returned an incomplete response.`);
    }

    console.log(
      `[Shiprocket Order] Order #${order.orderNumber} created successfully on Shiprocket! (Shiprocket Order ID: ${res.order_id}, Shipment ID: ${res.shipment_id}, Time: ${duration}ms)`
    );

    // 10. Persist returned Shiprocket identifiers in Supabase orders table
    const supabase = getAdminClient();

    let updateQuery = supabase
      .from('orders')
      .update({
        shiprocket_order_id: String(res.order_id),
        shiprocket_shipment_id: String(res.shipment_id),
        shiprocket_status: res.status || 'NEW',
        shiprocket_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (isUuid) {
      updateQuery = updateQuery.eq('id', order.id);
    } else {
      updateQuery = updateQuery.eq('order_number', order.orderNumber);
    }

    const { error: dbErr } = await updateQuery;

    if (dbErr) {
      console.error(
        `[Shiprocket Order] Warning: Order created in Shiprocket (Order: ${res.order_id}, Shipment: ${res.shipment_id}), but saving to Supabase encountered an error:`,
        dbErr.message
      );
    } else {
      console.log(`[Shiprocket Order] Successfully saved Shiprocket IDs to Supabase order record #${order.orderNumber}`);
    }

    return {
      success: true,
      alreadySynced: false,
      orderId: res.order_id,
      shipmentId: res.shipment_id,
      status: res.status || 'NEW',
      statusCode: res.status_code,
      awbCode: res.awb_code,
      courierName: res.courier_name,
      message: `Shiprocket Order #${res.order_id} & Shipment #${res.shipment_id} created successfully.`,
    };
  } catch (err: unknown) {
    const errorObj = err as { message?: string };
    const duration = Date.now() - startTime;

    console.error(
      `[Shiprocket Order] Failed to create order in Shiprocket for #${order.orderNumber} (${duration}ms):`,
      errorObj.message || 'Unknown error'
    );

    // Update status to FAILED in Supabase defensively without affecting customer order
    try {
      const supabase = getAdminClient();
      let failQuery = supabase
        .from('orders')
        .update({
          shiprocket_status: 'SYNC_FAILED',
          updated_at: new Date().toISOString(),
        });
      if (isUuid) {
        failQuery = failQuery.eq('id', order.id);
      } else {
        failQuery = failQuery.eq('order_number', order.orderNumber);
      }
      await failQuery;
    } catch {
      // Non-critical fallback
    }

    throw new Error(`Shiprocket Order Creation Failed: ${errorObj.message || 'Unknown error'}`);
  }
}

/**
 * Cancels an order on Shiprocket if eligible.
 * Calls POST /orders/cancel with { ids: [order_id] }.
 */
export async function cancelShiprocketOrder(shiprocketOrderId: number | string): Promise<{
  success: boolean;
  message: string;
}> {
  const numericId = Number(shiprocketOrderId);
  if (!numericId || isNaN(numericId)) {
    return { success: false, message: 'Invalid Shiprocket order ID' };
  }

  console.log(`[Shiprocket Cancel] Cancelling Shiprocket Order #${numericId}...`);

  try {
    const res: any = await shiprocketRequest('/orders/cancel', {
      method: 'POST',
      body: JSON.stringify({
        ids: [numericId],
      }),
    });

    const msg = typeof res?.message === 'string' ? res.message : '';
    const isOk = res?.status_code === 200 || res?.status === 200 || msg.toLowerCase().includes('cancel') || msg.toLowerCase().includes('success');
    return {
      success: !!isOk,
      message: msg || (isOk ? 'Order cancellation processed with Shiprocket.' : 'Unable to cancel order with Shiprocket.'),
    };
  } catch (err: unknown) {
    const errorObj = err as { message?: string };
    console.error(`[Shiprocket Cancel] Error for Order #${numericId}:`, errorObj.message);
    return {
      success: false,
      message: errorObj.message || 'Shiprocket order cancellation failed.',
    };
  }
}

