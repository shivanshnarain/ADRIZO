import { NextRequest, NextResponse } from 'next/server';
import { resolveOrderFromSupabase } from '@/lib/order-resolver';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ success: false, error: 'Order ID is required' }, { status: 400 });
    }

    // Resolves either by database UUID or human-readable order number (ADR-XXXXXX)
    const order = await resolveOrderFromSupabase(id);

    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        customerId: order.customerId,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        customerPhone: order.customerPhone,
        houseFlat: order.houseFlat,
        areaStreet: order.areaStreet,
        landmark: order.landmark,
        shippingAddress: order.shippingAddress,
        city: order.city,
        state: order.state,
        pincode: order.pincode,
        country: order.country,
        subtotal: order.subtotal,
        shippingCharge: order.shippingCharge,
        codCharge: order.codCharge,
        discount: order.discount,
        couponCode: order.couponCode,
        total: order.total,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        orderStatus: order.orderStatus,
        razorpayOrderId: order.razorpayOrderId,
        razorpayPaymentId: order.razorpayPaymentId,
        deliveryPartner: order.deliveryPartner,
        trackingId: order.trackingId,
        trackingStatus: order.trackingStatus,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        items: order.items.map((it) => ({
          id: it.id,
          productId: it.productId,
          productName: it.productName,
          productImage: it.productImage,
          sku: it.sku,
          size: it.size,
          color: it.color,
          quantity: it.quantity,
          price: it.unitPrice,
          mrp: it.mrp,
          totalPrice: it.totalPrice,
        })),
      },
    });
  } catch (error: any) {
    console.error('[Order Fetch API Error]', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch order details' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ success: false, error: 'Order ID is required' }, { status: 400 });
    }

    const { deleteOrder } = await import('@/actions/orders');
    const result = await deleteOrder(id);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: result.message, deletedId: result.deletedId });
  } catch (error: any) {
    console.error('[Order Delete API Error]', error);
    return NextResponse.json({ success: false, error: 'Failed to delete order' }, { status: 500 });
  }
}
