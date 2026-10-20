import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/auth';
import { getAdminNotifications, markNotificationsAsRead } from '@/lib/admin-notifications';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await verifyAdminSession();
    if (!session.authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const limitParam = req.nextUrl.searchParams.get('limit');
    const limit = limitParam ? Math.min(50, Math.max(1, parseInt(limitParam, 10))) : 20;

    const result = await getAdminNotifications(limit);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[Admin Notifications API GET Error]', err.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await verifyAdminSession();
    if (!session.authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { notificationId, markAll } = body;

    const result = await markNotificationsAsRead(markAll ? undefined : notificationId);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[Admin Notifications API POST Error]', err.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
