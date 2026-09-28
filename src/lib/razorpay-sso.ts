import { cookies } from 'next/headers';
import { SignJWT } from 'jose';
import { prisma } from '@/lib/prisma';
import { getJwtSecret, getAuthCookieOptions } from '@/lib/auth';
import { normalizePhoneNumber } from '@/lib/phone';
import { AuthenticatedCustomer } from '@/lib/customer-auth';

export interface RazorpaySsoIdentity {
  razorpayCustomerId?: string;
  phone?: string;
  email?: string;
  name?: string;
  token?: string;
}

export interface RazorpaySsoStatus {
  available: boolean;
  reason: string;
  platform: string;
}

/**
 * Checks whether official custom-platform Login with Razorpay (SSO) is enabled.
 * According to official Razorpay Magic Checkout documentation and FAQs:
 * "Currently the Login with Razorpay feature (SSO) is only available for Shopify users."
 * Custom Next.js storefront enablement requires custom credentials/API from Razorpay support.
 */
export function getRazorpaySsoStatus(): RazorpaySsoStatus {
  const hasCustomSsoClient = Boolean(process.env.RAZORPAY_SSO_CLIENT_ID && process.env.RAZORPAY_SSO_CLIENT_SECRET);

  if (!hasCustomSsoClient) {
    return {
      available: false,
      platform: 'custom-nextjs',
      reason: 'Official "Login with Razorpay (SSO)" is currently restricted by Razorpay to Shopify platforms. Merchant enablement and custom platform API credentials from Razorpay Support are pending.',
    };
  }

  return {
    available: true,
    platform: 'custom-nextjs',
    reason: 'Custom Razorpay SSO credentials configured.',
  };
}

/**
 * Authoritatively syncs a verified Razorpay customer identity to ADRIZO database
 * and establishes a secure 30-day HTTP-only session cookie.
 * 
 * Rules:
 * 1. Matches existing ADRIZO customer by phone or email.
 * 2. Never overwrites existing customer information with empty/null values.
 * 3. Never merges two customers incorrectly.
 * 4. Never trusts unverified browser-supplied parameters.
 * 5. Cart in localStorage is completely preserved.
 */
export async function syncRazorpayCustomerToAdrizo(
  identity: RazorpaySsoIdentity
): Promise<{ success: boolean; user?: AuthenticatedCustomer; error?: string }> {
  try {
    const rawPhone = identity.phone?.trim();
    const rawEmail = identity.email?.trim().toLowerCase();
    const rawName = identity.name?.trim();

    if (!rawPhone && !rawEmail) {
      return { success: false, error: 'Customer phone or email is required for identity mapping.' };
    }

    let clean10DigitPhone: string | null = null;
    let e164Phone: string | null = null;

    if (rawPhone) {
      const norm = normalizePhoneNumber(rawPhone);
      clean10DigitPhone = norm.national;
      e164Phone = norm.international;
    }

    // 1. Look up existing ADRIZO customer in MongoDB
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          clean10DigitPhone ? { phone: clean10DigitPhone } : {},
          e164Phone ? { phone: e164Phone } : {},
          rawEmail ? { email: rawEmail } : {},
        ].filter(cond => Object.keys(cond).length > 0),
      },
    });

    let customerId: string;
    let customerName: string;
    const customerEmail = rawEmail || existingUser?.email || null;
    const customerPhone = clean10DigitPhone || existingUser?.phone || null;

    if (existingUser) {
      customerId = existingUser.id;
      customerName = existingUser.name;

      // Safely update profile fields if new verified information provided without overwriting
      const updates: Record<string, string> = {};
      if (!existingUser.phone && clean10DigitPhone) {
        updates.phone = clean10DigitPhone;
      }
      if (!existingUser.email && rawEmail) {
        updates.email = rawEmail;
      }
      if ((!existingUser.name || existingUser.name.startsWith('Customer')) && rawName) {
        updates.name = rawName;
        customerName = rawName;
      }

      if (Object.keys(updates).length > 0) {
        await prisma.user.update({
          where: { id: customerId },
          data: updates,
        }).catch(() => null);
      }
    } else {
      // 2. Create new ADRIZO customer
      customerName = rawName || (clean10DigitPhone ? `Customer ${clean10DigitPhone.slice(-4)}` : 'Customer');
      const newUser = await prisma.user.create({
        data: {
          name: customerName,
          phone: clean10DigitPhone || undefined,
          email: rawEmail || undefined,
          role: 'CUSTOMER',
        },
      });
      customerId = newUser.id;
    }

    // 3. Issue persistent 30-day HTTP-only customer_token session cookie
    const secret = new TextEncoder().encode(getJwtSecret());
    const customerToken = await new SignJWT({
      id: customerId,
      name: customerName,
      phone: customerPhone,
      email: customerEmail,
      role: 'CUSTOMER',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('30d')
      .sign(secret);

    const cookieStore = await cookies();
    cookieStore.set('customer_token', customerToken, getAuthCookieOptions(30 * 24 * 60 * 60));

    return {
      success: true,
      user: {
        id: customerId,
        name: customerName,
        phone: customerPhone || undefined,
        email: customerEmail || undefined,
        isAdmin: false,
      },
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to sync customer profile.';
    console.error('[Razorpay SSO Customer Sync Error]', errorMsg);
    return { success: false, error: errorMsg };
  }
}
