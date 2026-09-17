import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SignJWT } from 'jose';
import { verifyAdminSession, getJwtSecret, getAuthCookieOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await verifyAdminSession();
    if (!session.authorized) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    // Refresh / slide admin_token so active admin session remains valid while working
    try {
      const cookieStore = await cookies();
      const secret = new TextEncoder().encode(getJwtSecret());
      const refreshedAdminToken = await new SignJWT({
        email: session.email,
        role: 'ADMIN',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('30d')
        .sign(secret);

      cookieStore.set('admin_token', refreshedAdminToken, getAuthCookieOptions(30 * 24 * 60 * 60));
    } catch {}

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
