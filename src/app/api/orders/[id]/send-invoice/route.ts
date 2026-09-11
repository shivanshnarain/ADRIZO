import { NextRequest, NextResponse } from 'next/server';
import { resolveOrderFromSupabase } from '@/lib/order-resolver';
import { sendInvoiceEmail } from '@/lib/order-email';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const channel = (body.channel || 'EMAIL').toUpperCase(); // 'EMAIL' | 'WHATSAPP'

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ success: false, error: 'Order identifier is required' }, { status: 400 });
    }

    // 1. Resolve order safely from Supabase by UUID or ADR-XXXXXX
    const order = await resolveOrderFromSupabase(id);

    if (!order) {
      return NextResponse.json({ success: false, error: 'Order could not be found' }, { status: 404 });
    }

    const orderNumber = order.orderNumber;
    const customerEmail = order.customerEmail?.trim();
    const customerPhone = order.customerPhone?.replace(/[^0-9]/g, '') || '';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.adrizo.com';
    const isCod = order.paymentMethod === 'COD';

    // 2. Handle EMAIL Channel
    if (channel === 'EMAIL') {
      if (!customerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
        return NextResponse.json({
          success: false,
          error: 'Customer email is not available or invalid for this order.'
        }, { status: 400 });
      }

      const emailResult = await sendInvoiceEmail(order);

      if (!emailResult.success) {
        console.error('[send-invoice] Email delivery error:', emailResult.error);
        return NextResponse.json({
          success: false,
          error: 'Invoice could not be sent. Please check the email configuration and try again.'
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        mock: emailResult.mock,
        message: emailResult.mock
          ? emailResult.message
          : `Invoice sent successfully to ${customerEmail}`
      });
    }

    // 3. Handle WHATSAPP Channel
    if (channel === 'WHATSAPP') {
      if (!customerPhone) {
        return NextResponse.json({
          success: false,
          error: 'Customer phone number is not available on this order.'
        }, { status: 400 });
      }

      const cleanPhone = customerPhone.startsWith('91') && customerPhone.length === 12
        ? customerPhone
        : customerPhone.length === 10
        ? `91${customerPhone}`
        : customerPhone;

      const invoiceUrl = `${appUrl}/api/orders/${encodeURIComponent(orderNumber)}/invoice`;
      const whatsappMsg = `Hello ${order.customerName}, thank you for your order with AD(R)IZO!\n\nOrder Number: #${orderNumber}\nTotal Amount: ₹${order.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}\nPayment Method: ${isCod ? 'Cash on Delivery' : 'Online Payment'}\n\nYou can view and download your official tax invoice here:\n${invoiceUrl}\n\nWarm regards,\nAD(R)IZO Team`;

      const whatsappDirectUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(whatsappMsg)}`;

      return NextResponse.json({
        success: true,
        whatsappDirectUrl,
        message: `WhatsApp dispatch prepared for +91 ${cleanPhone.slice(-10)}.`
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid channel specified.' }, { status: 400 });

  } catch (error: any) {
    console.error('[Send Invoice Handler Error]', error);
    return NextResponse.json({
      success: false,
      error: 'Unable to process invoice request. Please try again.'
    }, { status: 500 });
  }
}
