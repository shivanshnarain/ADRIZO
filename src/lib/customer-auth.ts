import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { createClient } from './supabase/server';
import { verifyAdminSession, getJwtSecret } from './auth';
import { ResolvedOrder } from './order-resolver';

export interface AuthenticatedCustomer {
  id: string;
  email?: string;
  phone?: string;
  name?: string;
  isAdmin?: boolean;
}

/**
 * Resolves the currently authenticated customer from either Supabase Auth
 * or the verified persistent customer JWT cookie.
 * By default, returns the actual customer identity and NEVER masks customer as "Administrator".
 * Only if allowAdmin is explicitly true AND no customer session exists, checks admin session.
 */
export async function getAuthenticatedCustomer(options?: { allowAdmin?: boolean }): Promise<AuthenticatedCustomer | null> {
  // 1. Primary: Supabase Customer Session
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (user && !authError) {
      let customerName = user.user_metadata?.full_name || (user.email ? user.email.split('@')[0] : 'Customer');
      let customerPhone = user.phone || user.user_metadata?.phone;

      // Try fetching enriched name & phone from customer_profiles via service role
      try {
        const { getAdminClient } = await import('./supabase/admin');
        const adminSupabase = getAdminClient();
        const { data: prof } = await adminSupabase
          .from('customer_profiles')
          .select('full_name, phone')
          .eq('id', user.id)
          .single();
        if (prof?.full_name) customerName = prof.full_name;
        if (prof?.phone) customerPhone = prof.phone;
      } catch {}

      if (customerName.trim().toLowerCase() === 'administrator' || customerName.trim().toLowerCase() === 'admin') {
        customerName = user.email ? user.email.split('@')[0] : 'Customer';
      }

      return {
        id: user.id,
        email: user.email?.toLowerCase(),
        phone: customerPhone,
        name: customerName,
        isAdmin: false,
      };
    }
  } catch {
    // Supabase auth check failed, try persistent customer token
  }

  // 2. Persistent Customer JWT Token
  try {
    const cookieStore = await cookies();
    const customerToken = cookieStore.get('customer_token')?.value;
    const secret = getJwtSecret();

    if (customerToken && secret) {
      const { payload } = await jwtVerify(
        customerToken,
        new TextEncoder().encode(secret)
      );

      if (payload.role === 'CUSTOMER' && payload.id) {
        let name = typeof payload.name === 'string' ? payload.name : undefined;
        let phone = typeof payload.phone === 'string' ? payload.phone : undefined;
        let email = typeof payload.email === 'string' ? payload.email.toLowerCase() : undefined;

        // Fetch latest profile from Supabase customer_profiles if possible
        try {
          const { getAdminClient } = await import('./supabase/admin');
          const adminSupabase = getAdminClient();
          const { data: prof } = await adminSupabase
            .from('customer_profiles')
            .select('full_name, phone')
            .eq('id', payload.id as string)
            .single();
          if (prof?.full_name) name = prof.full_name;
          if (prof?.phone) phone = prof.phone;
        } catch {}

        if (name && (name.trim().toLowerCase() === 'administrator' || name.trim().toLowerCase() === 'admin')) {
          name = email ? email.split('@')[0] : 'Customer';
        }

        return {
          id: payload.id as string,
          email,
          phone,
          name,
          isAdmin: false,
        };
      }
    }
  } catch {
    // Token invalid
  }

  // 3. Optional: If caller explicitly permits admin override (e.g. admin managing customer orders)
  if (options?.allowAdmin) {
    try {
      const adminSession = await verifyAdminSession();
      if (adminSession.authorized) {
        return {
          id: 'admin',
          email: adminSession.email,
          name: 'Administrator',
          isAdmin: true,
        };
      }
    } catch {}
  }

  return null;
}

/**
 * Verifies whether an order belongs to the authenticated customer.
 * Prevents Insecure Direct Object References (IDOR).
 */
export function isOrderOwnedByCustomer(
  order: any,
  customer: AuthenticatedCustomer | null
): boolean {
  if (!customer) return false;

  // Admins have universal management authority
  if (customer.isAdmin) return true;

  const orderCustomerId = order.customerId || order.customer_id;
  const orderCustomerEmail = (order.customerEmail || order.customer_email || '').trim().toLowerCase();
  const orderCustomerPhone = (order.customerPhone || order.customer_phone || '').trim();

  // Match by Supabase User UUID
  if (orderCustomerId && customer.id && orderCustomerId === customer.id) {
    return true;
  }

  // Match by Customer Email (case-insensitive)
  if (orderCustomerEmail && customer.email && orderCustomerEmail === customer.email.toLowerCase()) {
    return true;
  }

  // Match by Customer Phone number
  if (orderCustomerPhone && customer.phone && orderCustomerPhone === customer.phone.trim()) {
    return true;
  }

  return false;
}
