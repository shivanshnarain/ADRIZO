import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SignJWT } from 'jose';
import { cookies } from 'next/headers';
import { normalizePhoneNumber } from '@/lib/phone';
import { getJwtSecret, getAuthCookieOptions } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { verificationId, name, email: rawEmail, address, city, state, pincode } = await request.json();

    if (!verificationId || !name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const otpRecord = await prisma.otpVerification.findUnique({
      where: { id: verificationId },
    });

    if (!otpRecord || !otpRecord.verified) {
      return NextResponse.json({ error: 'OTP verification expired or not found. Please try again.' }, { status: 400 });
    }

    const { national, raw } = normalizePhoneNumber(otpRecord.phoneOrEmail);
    const isEmailVerification = otpRecord.phoneOrEmail.includes('@');
    const verifiedPhone = isEmailVerification ? null : (national || raw);
    const inputEmail = rawEmail?.trim() ? rawEmail.trim().toLowerCase() : null;
    const finalEmail = isEmailVerification ? otpRecord.phoneOrEmail.toLowerCase() : inputEmail;

    // Check if email already used by someone else
    if (finalEmail) {
      const existingWithEmail = await prisma.user.findFirst({
        where: { email: finalEmail },
      });
      if (existingWithEmail && (!verifiedPhone || existingWithEmail.phone !== verifiedPhone)) {
        return NextResponse.json({ error: 'This email address is already associated with another account.' }, { status: 400 });
      }
    }

    // Check if phone already registered
    let user = verifiedPhone ? await prisma.user.findFirst({
      where: { phone: verifiedPhone },
    }) : null;

    if (user) {
      // Update existing record
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: name.trim(),
          email: finalEmail || user.email,
          address: address?.trim() || user.address,
          city: city?.trim() || user.city,
          state: state?.trim() || user.state,
          pincode: pincode?.trim() || user.pincode,
        },
      });
    } else {
      // Create new customer
      user = await prisma.user.create({
        data: {
          name: name.trim(),
          email: finalEmail,
          phone: verifiedPhone,
          address: address?.trim() || null,
          city: city?.trim() || null,
          state: state?.trim() || null,
          pincode: pincode?.trim() || null,
          role: 'CUSTOMER',
        },
      });
    }

    // Create Customer Session Token
    const secret = new TextEncoder().encode(getJwtSecret());

    const token = await new SignJWT({
      id: user.id,
      email: user.email,
      phone: user.phone,
      name: user.name,
      role: 'CUSTOMER',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('30d')
      .sign(secret);

    const cookieStore = await cookies();
    cookieStore.set('customer_token', token, getAuthCookieOptions(30 * 24 * 60 * 60));

    return NextResponse.json({
      success: true,
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
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Failed to complete registration. Please try again.' }, { status: 500 });
  }
}
