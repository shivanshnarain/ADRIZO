import { NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await verifyAdminSession();
    if (!session.authorized) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      email: session.email,
      role: 'ADMIN',
      admin: {
        email: session.email,
        role: 'ADMIN',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
