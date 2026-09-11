import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SignJWT } from 'jose';
import { prisma } from '@/lib/prisma';
import { getAdminClient } from '@/lib/supabase/admin';
import { getJwtSecret, getAuthCookieOptions } from '@/lib/auth';
import { normalizePhoneNumber } from '@/lib/phone';

/**
 * Handles server session creation after Firebase Client verifies the Phone OTP.
 * Expects { firebaseUid: string, phone: string }
 * Sets customer_token JWT cookie so all existing orders, profile, and checkout flows work seamlessly.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { firebaseUid, phone, name } = body;

    if (!firebaseUid || !phone) {
      return NextResponse.json(
        { error: 'Firebase UID and Phone number are required' },
        { status: 400 }
      );
    }

    const { national: clean10DigitPhone, international: e164Phone } = normalizePhoneNumber(phone);
    if (!clean10DigitPhone || clean10DigitPhone.length !== 10) {
      return NextResponse.json(
        { error: 'Invalid 10-digit mobile number format' },
        { status: 400 }
      );
    }

    const customerName = (name || '').trim() || `Customer ${clean10DigitPhone.slice(-4)}`;

    // 1. Sync or retrieve user in MongoDB Prisma (for direct customer relations)
    let customerId = firebaseUid;
    let existingUser: any = null;

    try {
      existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { phone: clean10DigitPhone },
            { phone: e164Phone },
          ],
        },
      });

      if (existingUser) {
        customerId = existingUser.id;
      } else {
        const newUser = await prisma.user.create({
          data: {
            name: customerName,
            phone: clean10DigitPhone,
            role: 'CUSTOMER',
          },
        });
        customerId = newUser.id;
      }
    } catch (dbErr) {
      console.warn('[Phone Session DB Upsert Warning]', dbErr);
    }

    // 2. Sync profile in Supabase customer_profiles table if configured
    try {
      const adminClient = getAdminClient();
      await adminClient.from('customer_profiles').upsert(
        {
          id: customerId,
          full_name: customerName,
          phone: clean10DigitPhone,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
    } catch (supaErr) {
      console.warn('[Phone Session Supabase Sync Warning]', supaErr);
    }

    // 3. Issue persistent 30-day HTTP-Only Customer JWT Cookie
    const secret = new TextEncoder().encode(getJwtSecret());
    const customerToken = await new SignJWT({
      id: customerId,
      phone: clean10DigitPhone,
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
      user: {
        id: customerId,
        name: customerName,
        phone: clean10DigitPhone,
        role: 'CUSTOMER',
      },
    });
  } catch (error: any) {
    console.error('Phone session creation error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
