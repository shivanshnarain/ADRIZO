import { getAdminClient } from '../../../lib/supabase/admin';
import OrdersClient from './OrdersClient';

export const dynamic = 'force-dynamic';

export default async function AdminOrders() {
  let orders: any[] = [];
  try {
    const supabase = getAdminClient();

    // Fetch customer profiles map to know joinedOn date for customers
    const { data: profiles } = await supabase
      .from('customer_profiles')
      .select('id, created_at');
    const profileMap = new Map<string, string>();
    if (profiles) {
      for (const p of profiles) {
        if (p.id) profileMap.set(p.id, p.created_at);
      }
    }

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
          product_image,
          mrp,
          sku,
          size,
          color,
          quantity,
          unit_price,
          total_price
        )
      `)
      .order('created_at', { ascending: false });

    if (!supaErr && supaOrders && supaOrders.length > 0) {
      orders = supaOrders.map(o => {
        const joinedDate = o.customer_id ? profileMap.get(o.customer_id) : null;
        return {
          id: o.id,
          orderNumber: o.order_number,
          customerId: o.customer_id,
          customerJoinedAt: joinedDate || null,
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
            productImage: it.product_image || null,
            mrp: Number(it.mrp || (Number(it.unit_price || 0) * 2)),
            sku: it.sku || 'TSH-ADR-DEFAULT',
            size: it.size || 'M',
            color: it.color || 'Standard',
            quantity: it.quantity,
            price: Number(it.unit_price || 0),
            total: Number(it.total_price || (Number(it.unit_price || 0) * Number(it.quantity || 1))),
          }))
        };
      });
    }
  } catch (err) {
    console.error('[Admin Orders Server Page Error]', err);
    orders = [];
  }

  return <OrdersClient initialOrders={orders} />;
}
