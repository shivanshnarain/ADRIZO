import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedCustomer } from '@/lib/customer-auth';
import { cancelCustomerOrder } from '@/lib/order-cancellation';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Order identifier is required' },
        { status: 400 }
      );
    }

    // 1. Verify customer authentication
    const customer = await getAuthenticatedCustomer();
    if (!customer) {
      return NextResponse.json(
        { success: false, error: 'Please log in to cancel this order' },
        { status: 401 }
      );
    }

    // 2. Parse cancellation reason
    let reason = '';
    try {
      const body = await req.json();
      reason = body.reason || '';
    } catch {
      // Body may be empty
    }

    // 3. Process cancellation safely
    const result = await cancelCustomerOrder({
      orderIdentifier: id,
      reason,
      customer,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.message },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (err: unknown) {
    const errorObj = err as { message?: string };
    console.error('[Customer Order Cancel API Error]', errorObj.message);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while processing cancellation.' },
      { status: 500 }
    );
  }
}
