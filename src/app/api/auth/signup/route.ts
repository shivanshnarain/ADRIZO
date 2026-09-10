import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SignJWT } from 'jose';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { getJwtSecret, getAuthCookieOptions } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { name, email, password, phone } = data;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Please enter your full name' }, { status: 400 });
    }

    if (!email || !email.trim()) {
      return NextResponse.json({ error: 'Please enter your email address' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const cleanEmail = email.trim().toLowerCase();
    if (!emailRegex.test(cleanEmail)) {
      return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 });
    }

    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long' }, { status: 400 });
    }

    const cleanPhone = phone ? phone.trim().replace(/\D/g, '').slice(0, 10) : null;
    const cleanName = name.trim();

    // 1. Initialize Server-Side Cookie-Aware Supabase Client
    const supabase = await createClient();
    const adminClient = getAdminClient();

    let newUserId: string | null = null;

    // 2. Attempt RPC to create confirmed customer account
    const { data: rpcData, error: rpcError } = await supabase.rpc('create_confirmed_customer', {
      p_email: cleanEmail,
      p_password: password,
      p_full_name: cleanName,
      p_phone: cleanPhone,
    });

    if (!rpcError && rpcData?.success) {
      newUserId = rpcData.user_id;
    } else {
      // Fallback 1: Admin API createUser with pre-confirmed email
      try {
        const { data: adminUserData, error: adminCreateErr } = await adminClient.auth.admin.createUser({
          email: cleanEmail,
          password: password,
          email_confirm: true,
          user_metadata: {
            full_name: cleanName,
            phone: cleanPhone,
          },
        });

        if (!adminCreateErr && adminUserData?.user) {
          newUserId = adminUserData.user.id;
        } else if (adminCreateErr) {
          console.warn('[Admin Create User Fallback Error]', adminCreateErr);
          // If already registered
          if (adminCreateErr.message?.toLowerCase().includes('already') || (adminCreateErr as any).status === 422) {
            return NextResponse.json({ error: 'An account with this email already exists. Please sign in.' }, { status: 400 });
          }
        }
      } catch (err) {
        console.warn('[Admin API Create Exception]', err);
      }

      // Fallback 2: Standard client-side signup if admin API didn't set newUserId
      if (!newUserId) {
        const { data: standardData, error: standardErr } = await supabase.auth.signUp({
          email: cleanEmail,
          password: password,
          options: {
            data: {
              full_name: cleanName,
              phone: cleanPhone,
            }
          }
        });

        if (standardErr) {
          return NextResponse.json({ error: standardErr.message || 'Registration failed. Please check your details.' }, { status: 400 });
        }
        newUserId = standardData?.user?.id || null;
      }
    }

    // Ensure customer_profiles record exists in Supabase (Single Source of Truth)
    if (newUserId) {
      await adminClient.from('customer_profiles').upsert({
        id: newUserId,
        full_name: cleanName,
        phone: cleanPhone,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });
    }

    // 3. Establish HTTP-Only session cookies
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: password,
    });

    if (signInError) {
      console.warn('[Auto-Login After Signup Warning]', signInError);
    }

    const resolvedUserId = newUserId || signInData?.user?.id;
    if (resolvedUserId) {
      const secret = new TextEncoder().encode(getJwtSecret());
      const customerToken = await new SignJWT({
        id: resolvedUserId,
        email: cleanEmail,
        phone: cleanPhone,
        name: cleanName,
        role: 'CUSTOMER',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('30d')
        .sign(secret);

      const cookieStore = await cookies();
      cookieStore.set('customer_token', customerToken, getAuthCookieOptions(30 * 24 * 60 * 60));
    }

    return NextResponse.json({
      success: true,
      user: {
        id: resolvedUserId,
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        role: 'CUSTOMER',
      },
    });
  } catch (error: any) {
    console.error('Supabase Signup Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
