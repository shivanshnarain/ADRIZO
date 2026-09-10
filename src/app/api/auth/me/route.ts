import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify, SignJWT } from 'jose';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { prisma } from '@/lib/prisma';
import { getJwtSecret, getAuthCookieOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cookieStore = await cookies();

    // 1. Primary: Check Supabase Customer Session
    try {
      const supabase = await createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (user && !authError) {
        // Fetch customer profile from Supabase customer_profiles table via admin client
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
      // Supabase session check failed, proceed to verified customer_token check
    }

    // 2. Persistent Customer JWT Token
    const customerToken = cookieStore.get('customer_token')?.value;
    if (customerToken) {
      try {
        const secret = getJwtSecret();
        if (secret) {
          const { payload } = await jwtVerify(customerToken, new TextEncoder().encode(secret));

          if (payload.role === 'CUSTOMER' && payload.id) {
            const adminSupabase = getAdminClient();
            const customerId = payload.id as string;
            const payloadEmail = typeof payload.email === 'string' ? payload.email.toLowerCase() : null;
            const payloadPhone = typeof payload.phone === 'string' ? payload.phone : null;
            const payloadName = typeof payload.name === 'string' ? payload.name : null;

            // Fetch latest profile from Supabase customer_profiles table (service role query never expires)
            let profile: any = null;
            try {
              const { data: supaProfile } = await adminSupabase
                .from('customer_profiles')
                .select('*')
                .eq('id', customerId)
                .single();
              profile = supaProfile;
            } catch {}

            // If user has MongoDB record (e.g. from OTP verification), safely fetch it
            const isMongoObjectId = /^[0-9a-fA-F]{24}$/.test(customerId);
            let mongoUser: any = null;
            try {
              if (isMongoObjectId) {
                mongoUser = await prisma.user.findUnique({
                  where: { id: customerId },
                  select: { id: true, name: true, email: true, phone: true, address: true, city: true, state: true, pincode: true, role: true },
                });
              } else if (payloadEmail || payloadPhone) {
                mongoUser = await prisma.user.findFirst({
                  where: {
                    OR: [
                      payloadEmail ? { email: payloadEmail } : {},
                      payloadPhone ? { phone: payloadPhone } : {},
                    ].filter(o => Object.keys(o).length > 0),
                  },
                  select: { id: true, name: true, email: true, phone: true, address: true, city: true, state: true, pincode: true, role: true },
                });
              }
            } catch {}

            let resolvedName = profile?.full_name || mongoUser?.name || payloadName || '';
            if (resolvedName.trim().toLowerCase() === 'administrator' || resolvedName.trim().toLowerCase() === 'admin') {
              resolvedName = (payloadEmail ? payloadEmail.split('@')[0] : '') || '';
            }
            if (!resolvedName && payloadEmail) {
              resolvedName = payloadEmail.split('@')[0];
            }

            const resolvedUser = {
              id: customerId,
              name: resolvedName,
              email: profile?.email || mongoUser?.email || payloadEmail || null,
              phone: profile?.phone || mongoUser?.phone || payloadPhone || null,
              address: profile?.delivery_address || mongoUser?.address || null,
              city: profile?.city || mongoUser?.city || null,
              state: profile?.state || mongoUser?.state || null,
              pincode: profile?.pincode || mongoUser?.pincode || null,
              avatar_url: profile?.avatar_url || null,
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

    return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  }
}
