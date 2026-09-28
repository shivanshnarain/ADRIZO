import { NextResponse } from 'next/server';
import { getRazorpaySsoStatus, syncRazorpayCustomerToAdrizo } from '@/lib/razorpay-sso';

export const dynamic = 'force-dynamic';

/**
 * Endpoint to check Razorpay SSO availability on the custom storefront.
 */
export async function GET() {
  const status = getRazorpaySsoStatus();
  return NextResponse.json(status);
}

/**
 * Handles server-side verification and customer session creation for Razorpay SSO.
 * If credentials/APIs are pending from Razorpay Support, returns clear integration boundary status.
 */
export async function POST(request: Request) {
  const status = getRazorpaySsoStatus();

  if (!status.available) {
    return NextResponse.json(
      {
        success: false,
        error: status.reason,
        pendingEnablement: true,
      },
      { status: 501 }
    );
  }

  try {
    const body = await request.json();
    const { token, phone, email, name, razorpayCustomerId } = body;

    // Secure server-side verification boundary:
    // Only accept cryptographically authentic tokens or verified payloads
    if (!token && !razorpayCustomerId) {
      return NextResponse.json(
        { success: false, error: 'Verified Razorpay authentication token or customer ID is required.' },
        { status: 400 }
      );
    }

    const syncResult = await syncRazorpayCustomerToAdrizo({
      razorpayCustomerId,
      phone,
      email,
      name,
      token,
    });

    if (syncResult.success) {
      return NextResponse.json({
        success: true,
        user: syncResult.user,
      });
    }

    return NextResponse.json(
      { success: false, error: syncResult.error || 'Failed to authenticate user.' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('[Razorpay SSO Endpoint Error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
