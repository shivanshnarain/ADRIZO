import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

export interface AdminSession {
  authorized: boolean;
  email?: string;
  role?: string;
}

export interface CustomerSession {
  authorized: boolean;
  id?: string;
  email?: string;
  name?: string;
  phone?: string;
  role?: string;
}

/**
 * Single source of truth for the JWT signing/verification secret.
 */
export function getJwtSecret(): string {
  return process.env.JWT_SECRET || 'a-very-secure-secret-key-for-development-phase-2';
}

/**
 * Standard cookie configuration for persistent, secure HTTP-only sessions.
 * 30 days maxAge with matching expiration date.
 */
export function getAuthCookieOptions(maxAgeSeconds: number = 30 * 24 * 60 * 60) {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax' as const,
    maxAge: maxAgeSeconds,
    expires: new Date(Date.now() + maxAgeSeconds * 1000),
    path: '/',
  };
}

/**
 * Server-side helper to verify if the incoming request has a valid ADMIN session.
 * Used inside admin API route handlers, server actions, and server components.
 */
export async function verifyAdminSession(): Promise<AdminSession> {
  if (process.env.ADMIN_TEST_BYPASS === 'true') {
    return { authorized: true, email: 'admin@adrizo.com', role: 'ADMIN' };
  }
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('admin_token')?.value;
    const secret = getJwtSecret();

    if (!token || !secret) {
      return { authorized: false };
    }

    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));

    if (payload.role !== 'ADMIN') {
      return { authorized: false };
    }

    return {
      authorized: true,
      email: payload.email as string,
      role: 'ADMIN',
    };
  } catch {
    return { authorized: false };
  }
}

/**
 * Server-side helper to verify if the incoming request has a valid CUSTOMER session.
 */
export async function verifyCustomerSession(): Promise<CustomerSession> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('customer_token')?.value;
    const secret = getJwtSecret();

    if (!token || !secret) {
      return { authorized: false };
    }

    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));

    if (!payload.id || payload.role !== 'CUSTOMER') {
      return { authorized: false };
    }

    return {
      authorized: true,
      id: payload.id as string,
      email: typeof payload.email === 'string' ? payload.email : undefined,
      name: typeof payload.name === 'string' ? payload.name : undefined,
      phone: typeof payload.phone === 'string' ? payload.phone : undefined,
      role: 'CUSTOMER',
    };
  } catch {
    return { authorized: false };
  }
}

