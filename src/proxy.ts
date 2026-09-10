import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const secret = process.env.JWT_SECRET || 'a-very-secure-secret-key-for-development-phase-2';

  // --- Admin Routes & Admin APIs ---
  if (
    (path.startsWith('/admin') || path.startsWith('/api/admin')) &&
    !path.startsWith('/api/admin/logout') &&
    path !== '/admin/login'
  ) {
    const token = request.cookies.get('admin_token')?.value;

    if (!token || !secret) {
      if (path.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
      if (payload.role !== 'ADMIN') {
        throw new Error('User does not possess ADMIN role');
      }
    } catch (err) {
      if (path.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized: Invalid admin session' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  // If already logged in as admin and visiting /admin/login
  if (path === '/admin/login') {
    const token = request.cookies.get('admin_token')?.value;
    if (token && secret) {
      try {
        const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
        if (payload.role === 'ADMIN') {
          return NextResponse.redirect(new URL('/admin/dashboard', request.url));
        }
      } catch (err) {
        // Invalid token, allow access to /admin/login
      }
    }
  }

  // --- Customer Protected Routes ---
  if (path.startsWith('/account')) {
    // If tracking a specific order, allow direct access so customers can view tracking
    if (request.nextUrl.searchParams.has('track')) {
      return NextResponse.next();
    }

    const customerToken = request.cookies.get('customer_token')?.value;
    const allCookies = request.cookies.getAll();
    const hasSupabaseCookie = allCookies.some(c => c.name.startsWith('sb-') && c.value);

    let isAuthorized = false;

    if (customerToken && secret) {
      try {
        const { payload } = await jwtVerify(customerToken, new TextEncoder().encode(secret));
        if (payload && payload.id) {
          isAuthorized = true;
        }
      } catch {
        isAuthorized = false;
      }
    }

    if (!isAuthorized && hasSupabaseCookie) {
      // Supabase session cookie is present; allow page to verify with Supabase Auth client
      isAuthorized = true;
    }

    if (!isAuthorized) {
      const returnUrl = encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search);
      return NextResponse.redirect(new URL(`/login?returnUrl=${returnUrl}`, request.url));
    }
  }

  // Allow /login and /signup pages to render cleanly without forcing to home
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*', '/account/:path*'],
};
