import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizePhoneNumber } from '@/lib/phone';

export async function POST(request: Request) {
  try {
    const { phoneOrEmail } = await request.json();

    if (!phoneOrEmail) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    const { national, international, isValid } = normalizePhoneNumber(phoneOrEmail);

    if (!isValid && !phoneOrEmail.includes('@')) {
      return NextResponse.json({ error: 'Please enter a valid 10-digit mobile number' }, { status: 400 });
    }

    const targetIdentity = national || international;

    // 1. Generate a 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // 2. Set expiry to 10 minutes from now
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    // 3. Invalidate previous OTPs for both formats to be thorough
    await prisma.otpVerification.deleteMany({
      where: {
        phoneOrEmail: {
          in: [targetIdentity, national, international, phoneOrEmail].filter(Boolean),
        },
      },
    });

    const otpRecord = await prisma.otpVerification.create({
      data: {
        phoneOrEmail: national, // Store national 10-digit format
        code,
        expiresAt,
      },
    });

    // 4. Log for dev/local environments
    console.log(`\n========================================`);
    console.log(`[ADRIZO OTP] Mobile: +91 ${national} | Code: ${code}`);
    console.log(`========================================\n`);

    return NextResponse.json({
      success: true,
      message: 'OTP sent successfully',
      verificationId: otpRecord.id,
      phone: national,
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    return NextResponse.json({ error: 'Failed to send OTP. Please try again.' }, { status: 500 });
  }
}
