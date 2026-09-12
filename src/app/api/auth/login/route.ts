import { NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getJwtSecret, getAuthCookieOptions } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // ----------------------------------------------------
    // 1. Check Server-Side Configured Administrator Credentials
    // ----------------------------------------------------
    const envAdminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const envAdminPassword = process.env.ADMIN_PASSWORD;

    if (
      envAdminEmail &&
      envAdminPassword &&
      cleanEmail === envAdminEmail &&
      password === envAdminPassword
    ) {
      const secret = new TextEncoder().encode(getJwtSecret());

      const adminToken = await new SignJWT({
        email: cleanEmail,
        role: 'ADMIN',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('30d')
        .sign(secret);

      const cookieStore = await cookies();
      cookieStore.set('admin_token', adminToken, getAuthCookieOptions(30 * 24 * 60 * 60));

      return NextResponse.json({
        success: true,
        role: 'ADMIN',
        redirect: '/admin/dashboard',
        message: 'Admin authentication successful',
      });
    }

    // ----------------------------------------------------
    // 2. Customer Authentication via Supabase Auth
    // ----------------------------------------------------
    const supabase = await createClient();

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (authError || !authData.user) {
      let userExists = false;
      try {
        const { getAdminClient } = await import('@/lib/supabase/admin');
        const adminClient = getAdminClient();
        const { data: usersData } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
        if (usersData?.users?.some(u => u.email?.trim().toLowerCase() === cleanEmail)) {
          userExists = true;
        }
      } catch (checkErr) {
        console.warn('[Check User Existence Error]', checkErr);
      }

      if (!userExists) {
        try {
          const { prisma } = await import('@/lib/prisma');
          const pUser = await prisma.user.findFirst({ where: { email: cleanEmail } });
          if (pUser) userExists = true;
        } catch {}
      }

      if (!userExists) {
        return NextResponse.json(
          {
            success: false,
            code: 'USER_NOT_FOUND',
            error: 'No account found with this email. Please create an account to continue.',
            email: cleanEmail,
          },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          code: 'INVALID_PASSWORD',
          error: 'Incorrect password. Please try again or click Forgot Password.',
        },
        { status: 401 }
      );
    }

    const user = authData.user;

    // Fetch customer profile from Supabase database
    let { data: profile } = await supabase
      .from('customer_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    // If profile is missing, ensure it is created in customer_profiles table
    if (!profile) {
      try {
        const { getAdminClient } = await import('@/lib/supabase/admin');
        const adminClient = getAdminClient();
        const initialName = user.user_metadata?.full_name || cleanEmail.split('@')[0];
        await adminClient.from('customer_profiles').upsert({
          id: user.id,
          full_name: initialName,
          phone: user.user_metadata?.phone || null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });

        const { data: refreshedProfile } = await supabase
          .from('customer_profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        profile = refreshedProfile;
      } catch (profErr) {
        console.warn('[Profile Auto-Sync Error]', profErr);
      }
    }

    let customerName = profile?.full_name || user.user_metadata?.full_name || cleanEmail.split('@')[0];
    if (customerName.trim().toLowerCase() === 'administrator' || customerName.trim().toLowerCase() === 'admin') {
      customerName = cleanEmail.split('@')[0];
    }

    const secret = new TextEncoder().encode(getJwtSecret());
    const customerToken = await new SignJWT({
      id: user.id,
      email: user.email,
      phone: profile?.phone || user.user_metadata?.phone,
      name: customerName,
      role: 'CUSTOMER',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('30d')
      .sign(secret);

    const cookieStore = await cookies();
    cookieStore.set('customer_token', customerToken, getAuthCookieOptions(30 * 24 * 60 * 60));

    return NextResponse.json({
      success: true,
      role: 'CUSTOMER',
      redirect: '/account',
      user: {
        id: user.id,
        name: customerName,
        email: user.email,
        phone: profile?.phone || user.user_metadata?.phone || null,
        address: profile?.delivery_address || null,
        city: profile?.city || null,
        state: profile?.state || null,
        pincode: profile?.pincode || null,
        avatar_url: profile?.avatar_url || user.user_metadata?.avatar_url || null,
        role: 'CUSTOMER',
      },
    });
  } catch (error: any) {
    console.error('Supabase Login error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
