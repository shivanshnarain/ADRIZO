import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify, SignJWT } from 'jose';
import { prisma } from '@/lib/prisma';
import { getJwtSecret, getAuthCookieOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cookieStore = await cookies();

    // ----------------------------------------------------
    // 1. Primary: Fast Persistent Customer JWT Token (< 1ms, zero network calls)
    // ----------------------------------------------------
    const customerToken = cookieStore.get('customer_token')?.value;
    if (customerToken) {
      try {
        const secret = getJwtSecret();
        if (secret) {
          const { payload } = await jwtVerify(customerToken, new TextEncoder().encode(secret));

          if (payload.role === 'CUSTOMER' && payload.id) {
            const customerId = payload.id as string;
            const payloadEmail = typeof payload.email === 'string' ? payload.email.toLowerCase() : null;
            const payloadPhone = typeof payload.phone === 'string' ? payload.phone : null;
            const payloadName = typeof payload.name === 'string' ? payload.name : null;

            const isMongoObjectId = /^[0-9a-fA-F]{24}$/.test(customerId);
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(customerId);

            let mongoUser: any = null;
            let supaProfile: any = null;

            // Route directly to authoritative database based on customer ID format
            if (isMongoObjectId) {
              try {
                mongoUser = await prisma.user.findUnique({
                  where: { id: customerId },
                  select: { id: true, name: true, email: true, phone: true, address: true, city: true, state: true, pincode: true },
                });
              } catch (dbErr) {
                console.warn('[auth/me MongoDB Lookup Warning]', dbErr);
              }
            } else if (isUuid) {
              try {
                const { getAdminClient } = await import('@/lib/supabase/admin');
                const adminSupabase = getAdminClient();
                const { data } = await adminSupabase
                  .from('customer_profiles')
                  .select('*')
                  .eq('id', customerId)
                  .single();
                supaProfile = data;
              } catch (supaErr) {
                console.warn('[auth/me Supabase Profile Lookup Warning]', supaErr);
              }
            }

            let resolvedName = mongoUser?.name || supaProfile?.full_name || payloadName || '';
            if (resolvedName.trim().toLowerCase() === 'administrator' || resolvedName.trim().toLowerCase() === 'admin') {
              resolvedName = (payloadEmail ? payloadEmail.split('@')[0] : '') || '';
            }
            if (!resolvedName && payloadEmail) {
              resolvedName = payloadEmail.split('@')[0];
            }

            const resolvedUser = {
              id: customerId,
              name: resolvedName,
              email: mongoUser?.email || supaProfile?.email || payloadEmail || null,
              phone: mongoUser?.phone || supaProfile?.phone || payloadPhone || null,
              address: mongoUser?.address || supaProfile?.delivery_address || null,
              city: mongoUser?.city || supaProfile?.city || null,
              state: mongoUser?.state || supaProfile?.state || null,
              pincode: mongoUser?.pincode || supaProfile?.pincode || null,
              avatar_url: supaProfile?.avatar_url || null,
              role: 'CUSTOMER',
            };

            // Slide session: re-issue fresh 30-day customer_token
            try {
              const signSecret = new TextEncoder().encode(secret);
              const refreshedToken = await new SignJWT({
                id: resolvedUser.id,
                email: resolvedUser.email,
                phone: resolvedUser.phone,
                name: resolvedUser.name,
                role: 'CUSTOMER',
              })
                .setProtectedHeader({ alg: 'HS256' })
                .setIssuedAt()
                .setExpirationTime('30d')
                .sign(signSecret);

              cookieStore.set('customer_token', refreshedToken, getAuthCookieOptions(30 * 24 * 60 * 60));
            } catch {}

            return NextResponse.json({
              authenticated: true,
              user: resolvedUser,
            });
          }
        }
      } catch {
        // Token invalid or expired
      }
    }

    // ----------------------------------------------------
    // 2. Secondary: Supabase Customer Session (ONLY if a Supabase auth cookie exists)
    // ----------------------------------------------------
    const allCookies = cookieStore.getAll();
    const hasSupabaseCookie = allCookies.some(c => c.name.startsWith('sb-') && c.name.endsWith('-auth-token'));

    if (hasSupabaseCookie) {
      try {
        const { createClient } = await import('@/lib/supabase/server');
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (user && !authError) {
          const { getAdminClient } = await import('@/lib/supabase/admin');
          const adminSupabase = getAdminClient();
          const { data: profile } = await adminSupabase
            .from('customer_profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          let customerName = profile?.full_name || user.user_metadata?.full_name || '';
          if (customerName.trim().toLowerCase() === 'administrator' || customerName.trim().toLowerCase() === 'admin') {
            customerName = user.email ? user.email.split('@')[0] : '';
          }
          if (!customerName && user.email) {
            customerName = user.email.split('@')[0];
          }

          const safeUser = {
            id: user.id,
            name: customerName,
            email: user.email?.toLowerCase(),
            phone: profile?.phone || user.phone || user.user_metadata?.phone || null,
            address: profile?.delivery_address || null,
            city: profile?.city || null,
            state: profile?.state || null,
            pincode: profile?.pincode || null,
            avatar_url: profile?.avatar_url || user.user_metadata?.avatar_url || null,
            role: 'CUSTOMER',
          };

          // Slide session: re-issue fresh 30-day customer_token
          try {
            const secret = new TextEncoder().encode(getJwtSecret());
            const refreshedToken = await new SignJWT({
              id: safeUser.id,
              email: safeUser.email,
              phone: safeUser.phone,
              name: safeUser.name,
              role: 'CUSTOMER',
            })
              .setProtectedHeader({ alg: 'HS256' })
              .setIssuedAt()
              .setExpirationTime('30d')
              .sign(secret);

            cookieStore.set('customer_token', refreshedToken, getAuthCookieOptions(30 * 24 * 60 * 60));
          } catch {}

          return NextResponse.json({
            authenticated: true,
            user: safeUser,
          });
        }
      } catch {
        // Supabase session check failed
      }
    }

    return NextResponse.json({ authenticated: false, user: null }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 200 });
  }
}
