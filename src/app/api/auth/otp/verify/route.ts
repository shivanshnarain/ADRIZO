import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SignJWT } from 'jose';
import { cookies } from 'next/headers';
import { normalizePhoneNumber } from '@/lib/phone';
import { getJwtSecret, getAuthCookieOptions } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { phoneOrEmail, code } = await request.json();

    if (!phoneOrEmail || !code) {
      return NextResponse.json({ error: 'Missing phone number or OTP code' }, { status: 400 });
    }

    const { national, international, raw } = normalizePhoneNumber(phoneOrEmail);
    const searchTargets = Array.from(new Set([national, international, raw, phoneOrEmail].filter(Boolean)));

    const otpRecord = await prisma.otpVerification.findFirst({
      where: {
        phoneOrEmail: {
          in: searchTargets,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      return NextResponse.json({ error: 'No OTP requested for this number. Please click Resend OTP.' }, { status: 400 });
    }

    if (otpRecord.expiresAt < new Date()) {
      return NextResponse.json({ error: 'OTP has expired. Please request a new one.' }, { status: 400 });
    }

    if (otpRecord.attempts >= 5) {
      return NextResponse.json({ error: 'Too many failed attempts. Please request a new OTP.' }, { status: 400 });
    }

    if (otpRecord.code.trim() !== code.trim()) {
      await prisma.otpVerification.update({
        where: { id: otpRecord.id },
        data: { attempts: { increment: 1 } },
      });
      return NextResponse.json({ error: 'Invalid OTP. Please check the code and try again.' }, { status: 400 });
    }

    // Mark as verified
    await prisma.otpVerification.update({
      where: { id: otpRecord.id },
      data: { verified: true },
    });

    // Check if user already exists
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { phone: national },
          { phone: international },
          { phone: raw },
          { email: raw },
          { email: phoneOrEmail },
        ],
      },
    });

    if (user) {
      const secret = new TextEncoder().encode(getJwtSecret());

      // Customer token strictly uses user's role (CUSTOMER)
      const token = await new SignJWT({
        id: user.id,
        email: user.email,
        phone: user.phone,
        name: user.name,
        role: user.role || 'CUSTOMER',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('30d')
        .sign(secret);

      const cookieStore = await cookies();
      cookieStore.set('customer_token', token, getAuthCookieOptions(30 * 24 * 60 * 60));

      return NextResponse.json({
        success: true,
        isNewUser: false,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          address: user.address,
          city: user.city,
          state: user.state,
          pincode: user.pincode,
          role: user.role,
        },
      });
    } else {
      // New user registration flow
      return NextResponse.json({
        success: true,
        isNewUser: true,
        verificationId: otpRecord.id,
        phone: national,
      });
    }
  } catch (error) {
    console.error('Verify OTP error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
