import { NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/auth';
import { testShiprocketAuth } from '@/lib/shiprocket';
import { resetCircuitBreaker } from '@/lib/shiprocket/circuit-breaker';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const adminCheck = await verifyAdminSession();
    if (!adminCheck.authorized) {
      return NextResponse.json(
        {
          success: false,
          configured: false,
          authenticated: false,
          error: 'Unauthorized: Admin access required',
        },
        { status: 401 }
      );
    }

    // Default GET performs safe check without probe if circuit breaker is active
    const result = await testShiprocketAuth(false);
    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error('[Admin Shiprocket Test Route Exception]:', err.message || 'Unknown server error');
    return NextResponse.json(
      {
        success: false,
        configured: false,
        authenticated: false,
        message: 'Internal server error while testing Shiprocket authentication.',
        error: err.message || 'Unknown server error',
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const adminCheck = await verifyAdminSession();
    if (!adminCheck.authorized) {
      return NextResponse.json(
        {
          success: false,
          configured: false,
          authenticated: false,
          error: 'Unauthorized: Admin access required',
        },
        { status: 401 }
      );
    }

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Body may be empty
    }

    if (body.resetBreaker) {
      const resetRes = await resetCircuitBreaker('Admin test route reset', { force: Boolean(body.force) });
      if (!resetRes.success) {
        return NextResponse.json({
          success: false,
          configured: true,
          authenticated: false,
          isBlocked: true,
          message: resetRes.message,
          error: resetRes.message,
        }, { status: 400 });
      }
    }

    const allowProbe = Boolean(body.allowProbe);
    const result = await testShiprocketAuth(allowProbe);
    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error('[Admin Shiprocket Test Route Exception]:', err.message || 'Unknown server error');
    return NextResponse.json(
      {
        success: false,
        configured: false,
        authenticated: false,
        message: 'Internal server error while testing Shiprocket authentication.',
        error: err.message || 'Unknown server error',
      },
      { status: 500 }
    );
  }
}
