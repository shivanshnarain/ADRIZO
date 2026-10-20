import { NextRequest, NextResponse } from 'next/server';
import { runSlaAuditAndNotify } from '@/lib/order-sla';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  return handleSlaCheck(req);
}

export async function POST(req: NextRequest) {
  return handleSlaCheck(req);
}

async function handleSlaCheck(req: NextRequest) {
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

    const result = await runSlaAuditAndNotify();
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[Order SLA Cron Route Error]', err.message);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
