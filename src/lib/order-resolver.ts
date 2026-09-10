import { getAdminClient } from './supabase/admin';

export interface ResolvedOrderItem {
  id: string;
  productId: string;
  productName: string;
  productImage?: string | null;
  sku: string;
  size: string;
  color: string;
  quantity: number;
  unitPrice: number;
  mrp: number;
  totalPrice: number;
}

export interface ResolvedOrder {
  id: string; // Database UUID
  orderNumber: string; // Human-readable e.g. ADR-810231
  customerId?: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  houseFlat?: string | null;
  areaStreet?: string | null;
  landmark?: string | null;
  shippingAddress: string;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  country: string;
  subtotal: number;
  shippingCharge: number;
  codCharge: number;
  discount: number;
  couponCode?: string | null;
  total: number;
  paymentMethod: string; // 'COD' | 'ONLINE_RAZORPAY'
  paymentStatus: string; // 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED'
  orderStatus: string;   // 'PLACED' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  razorpaySignature?: string | null;
  deliveryPartner?: string | null;
  trackingId?: string | null;
  trackingStatus?: string | null;
  shiprocketOrderId?: string | null;
  shiprocketShipmentId?: string | null;
  pickupId?: string | null;
  shiprocketStatus?: string | null;
  shiprocketSyncStatus?: string | null;
  shiprocketSyncError?: string | null;
  shiprocketSyncedAt?: string | null;
  labelUrl?: string | null;
  invoiceUrl?: string | null;
  manifestUrl?: string | null;
  courierCompanyId?: string | null;
  cancellationSource?: string | null;
  cancellationReason?: string | null;
  cancelledAt?: string | null;
  createdAt: string;
  updatedAt: string;
  items: ResolvedOrderItem[];
}

/**
 * Safely resolves an order from Supabase by either UUID or human-readable order number (e.g. ADR-810231).
 * Never attempts to pass ADR-XXXXXX into an ObjectId field or Prisma MongoDB query.
 */
export async function resolveOrderFromSupabase(identifier: string): Promise<ResolvedOrder | null> {
  if (!identifier || typeof identifier !== 'string') {
    return null;
  }

  const cleanId = identifier.trim();
  if (!cleanId) return null;

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);
  const supabase = getAdminClient();

  let query = supabase
    .from('orders')
    .select(`
      *,
      order_items (*)
    `);

  if (isUuid) {
    query = query.eq('id', cleanId);
  } else {
    query = query.eq('order_number', cleanId);
  }

  const { data: supaOrders, error } = await query;

  if (error) {
    console.error('[resolveOrderFromSupabase] Supabase Query Error:', error.message);
    return null;
  }

  if (!supaOrders || supaOrders.length === 0) {
    return null;
  }

  const o = supaOrders[0];
  const isCod = o.payment_method === 'COD';
  const defaultCodCharge = isCod ? 99 : 0;
  const rawCodCharge = o.cod_charge !== null && o.cod_charge !== undefined 
    ? Number(o.cod_charge) 
    : defaultCodCharge;

  const items: ResolvedOrderItem[] = (o.order_items || []).map((it: any) => {
    const qty = Math.max(1, Number(it.quantity || 1));
    const uPrice = Number(it.unit_price || 0);
    const tPrice = it.total_price !== null && it.total_price !== undefined 
      ? Number(it.total_price) 
      : uPrice * qty;
    const mrpVal = it.mrp !== null && it.mrp !== undefined 
      ? Number(it.mrp) 
      : (uPrice > 0 ? uPrice * 2 : 999);

    return {
      id: it.id,
      productId: it.product_id || '',
      productName: it.product_name || 'Garment Product',
      productImage: it.product_image || null,
      sku: it.sku || 'TSH-ADR-DEFAULT',
      size: it.size || 'M',
      color: it.color || 'Standard',
      quantity: qty,
      unitPrice: uPrice,
      mrp: mrpVal,
      totalPrice: tPrice,
    };
  });

  return {
    id: o.id,
    orderNumber: o.order_number || o.id.slice(0, 8).toUpperCase(),
    customerId: o.customer_id || null,
    customerName: o.customer_name || 'Valued Customer',
    customerEmail: o.customer_email || '',
    customerPhone: o.customer_phone || '',
    houseFlat: o.house_flat || null,
    areaStreet: o.area_street || null,
    landmark: o.landmark || null,
    shippingAddress: o.shipping_address || '',
    city: o.city || null,
    state: o.state || null,
    pincode: o.pincode || null,
    country: 'India',
    subtotal: Number(o.subtotal || 0),
    shippingCharge: Number(o.shipping_charge || 0),
    codCharge: rawCodCharge,
    discount: Number(o.discount || 0),
    couponCode: o.coupon_code || null,
    total: Number(o.total_amount || 0),
    paymentMethod: o.payment_method || (isCod ? 'COD' : 'ONLINE_RAZORPAY'),
    paymentStatus: o.payment_status || 'PENDING',
    orderStatus: o.order_status || 'PLACED',
    razorpayOrderId: o.razorpay_order_id || null,
    razorpayPaymentId: o.razorpay_payment_id || null,
    razorpaySignature: o.razorpay_signature || null,
    deliveryPartner: o.delivery_partner || null,
    trackingId: o.tracking_id || null,
    trackingStatus: o.tracking_status || 'ORDER_RECEIVED',
    shiprocketOrderId: o.shiprocket_order_id || null,
    shiprocketShipmentId: o.shiprocket_shipment_id || null,
    pickupId: o.pickup_id || null,
    shiprocketStatus: o.shiprocket_status || null,
    shiprocketSyncStatus: o.shiprocket_sync_status || (o.shiprocket_shipment_id ? 'SYNCED' : 'PENDING'),
    shiprocketSyncError: o.shiprocket_sync_error || null,
    shiprocketSyncedAt: o.shiprocket_synced_at || null,
    labelUrl: o.label_url || null,
    invoiceUrl: o.invoice_url || null,
    manifestUrl: o.manifest_url || null,
    courierCompanyId: o.courier_company_id || null,
    cancellationSource: o.cancellation_source || null,
    cancellationReason: o.cancellation_reason || null,
    cancelledAt: o.cancelled_at || null,
    createdAt: o.created_at,
    updatedAt: o.updated_at || o.created_at,
    items,
  };
}
