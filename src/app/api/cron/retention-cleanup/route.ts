import { NextRequest, NextResponse } from 'next/server';
import { ORDER_RETENTION_DAYS } from '@/config/order-retention';
import { cleanupExpiredOrders } from '@/lib/order-cleanup';

export const dynamic = 'force-dynamic';

/**
 * 30-Day Automated Data Retention Cleanup Endpoint
 * Can be called via Vercel Cron, GitHub Actions, or external monitoring bots.
 * Protected by CRON_SECRET or ADMIN token header if configured.
 */
export async function GET(req: NextRequest) {
  return handleCleanup(req);
}

export async function POST(req: NextRequest) {
  return handleCleanup(req);
}

async function handleCleanup(req: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.get('authorization');
    const querySecret = req.nextUrl.searchParams.get('secret');

    if (cronSecret) {
      const isAuthorized =
        authHeader === `Bearer ${cronSecret}` ||
        querySecret === cronSecret;

      if (!isAuthorized) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
      }
    }

    const retentionDaysParam = req.nextUrl.searchParams.get('days');
    const parsedDays = retentionDaysParam ? parseInt(retentionDaysParam, 10) : ORDER_RETENTION_DAYS;
    const retentionDays = isNaN(parsedDays) || parsedDays < 1 ? ORDER_RETENTION_DAYS : parsedDays;

    const result = await cleanupExpiredOrders(retentionDays);

    if (!result.success) {
      console.error('[Retention Cleanup Error]', result.error);
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

    console.log('[Retention Cleanup Success]', result);
    return NextResponse.json({
      success: true,
      message: `Cleaned up orders older than ${retentionDays} days`,
      details: result,
    });
  } catch (err: any) {
    console.error('[Retention Cleanup Exception]', err);
    return NextResponse.json({
      success: false,
      error: err.message || 'Failed to execute retention cleanup',
    }, { status: 500 });
  }
}

