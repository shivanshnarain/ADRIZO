import { NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/auth';
import { testShiprocketAuth } from '@/lib/shiprocket';

export const dynamic = 'force-dynamic';

async function handleTest() {
  try {
    // 1. Enforce Admin Authorization
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

    // 2. Perform safe server-side Shiprocket health-check
    const result = await testShiprocketAuth();

    // 3. Return sanitized result (NEVER contains token or password)
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

export async function GET() {
  return handleTest();
}

export async function POST() {
  return handleTest();
}
