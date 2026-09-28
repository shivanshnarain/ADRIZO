import { cookies } from 'next/headers';
import { SignJWT } from 'jose';
import { prisma } from '@/lib/prisma';
import { getJwtSecret, getAuthCookieOptions } from '@/lib/auth';
import { normalizePhoneNumber } from '@/lib/phone';
import { AuthenticatedCustomer } from '@/lib/customer-auth';
import { getAdminClient } from '@/lib/supabase/admin';

export interface RazorpayCustomerAddress {
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  country?: string | null;
  fullName?: string | null;
  phone?: string | null;
}

export interface RazorpaySsoIdentity {
  razorpayCustomerId?: string | null;
  phone?: string | null;
  email?: string | null;
  name?: string | null;
  token?: string;
  address?: RazorpayCustomerAddress | null;
  orderId?: string | null;
  setSessionCookie?: boolean;
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
 * Custom Next.js storefront enablement requires custom OAuth credentials/API from Razorpay support.
 */
export function getRazorpaySsoStatus(): RazorpaySsoStatus {
  const hasCustomSsoClient = Boolean(process.env.RAZORPAY_SSO_CLIENT_ID && process.env.RAZORPAY_SSO_CLIENT_SECRET);

  if (!hasCustomSsoClient) {
    return {
      available: false,
      platform: 'custom-nextjs',
      reason: 'Official "Login with Razorpay (SSO)" is currently restricted by Razorpay to Shopify platforms. Merchant enablement and custom platform API credentials (RAZORPAY_SSO_CLIENT_ID / RAZORPAY_SSO_CLIENT_SECRET) from Razorpay Support are required for standalone SSO.',
    };
  }

  return {
    available: true,
    platform: 'custom-nextjs',
    reason: 'Custom Razorpay SSO credentials configured.',
  };
}

/**
 * Authoritatively syncs a verified Razorpay customer identity and delivery address
 * to ADRIZO database (Prisma MongoDB + Supabase customer_profiles + customer_addresses),
 * links the order to the customer, and establishes a secure 30-day HTTP-only session cookie.
 * 
 * Rules:
 * 1. Matches existing ADRIZO customer by phone or email.
 * 2. Never overwrites existing customer information with empty/null values.
 * 3. Never creates duplicate saved addresses (checks pincode + normalized line1).
 * 4. Links ADRIZO customer ID to the order record in Supabase.
 * 5. Issues standard HTTP-only customer_token session cookie.
 */
export async function syncRazorpayCustomerToAdrizo(
  identity: RazorpaySsoIdentity
): Promise<{ success: boolean; user?: AuthenticatedCustomer; addressSynced?: boolean; isNewCustomer?: boolean; error?: string }> {
  try {
    const rawPhone = identity.phone ? String(identity.phone).trim() : '';
    const rawEmail = identity.email ? String(identity.email).trim().toLowerCase() : '';
    const rawName = identity.name ? String(identity.name).trim() : '';
    const validEmail = rawEmail && rawEmail.includes('@') && rawEmail !== 'checkout@adrizo.com' ? rawEmail : null;

    if (!rawPhone && !validEmail) {
      return { success: false, error: 'Customer phone or email is required for identity mapping.' };
    }

    let clean10DigitPhone: string | null = null;
    let e164Phone: string | null = null;

    if (rawPhone) {
      const norm = normalizePhoneNumber(rawPhone);
      clean10DigitPhone = norm.national;
      e164Phone = norm.international;
    }

    const adminSupabase = getAdminClient();

    // 1. Look up existing ADRIZO customer in MongoDB Prisma
    let existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          clean10DigitPhone ? { phone: clean10DigitPhone } : {},
          e164Phone ? { phone: e164Phone } : {},
          validEmail ? { email: validEmail } : {},
        ].filter(cond => Object.keys(cond).length > 0),
      },
    }).catch(() => null);

    // 2. Also check Supabase customer_profiles if not found in MongoDB
    let existingSupaProfile: any = null;
    if (!existingUser) {
      try {
        let supaQuery = adminSupabase.from('customer_profiles').select('*');
        if (clean10DigitPhone) {
          supaQuery = supaQuery.eq('phone', clean10DigitPhone);
        } else if (validEmail) {
          supaQuery = supaQuery.eq('email', validEmail);
        }
        const { data } = await supaQuery.limit(1);
        if (data && data.length > 0) {
          existingSupaProfile = data[0];
        }
      } catch (err) {
        console.warn('[syncRazorpayCustomerToAdrizo] Supabase profile check warning:', err);
      }
    }

    let customerId: string;
    let customerName: string;
    const customerEmail = validEmail || existingUser?.email || existingSupaProfile?.email || null;
    const customerPhone = clean10DigitPhone || existingUser?.phone || existingSupaProfile?.phone || null;
    let isNewCustomer = false;

    if (existingUser) {
      customerId = existingUser.id;
      customerName = existingUser.name;

      // Safely update profile fields if new verified information provided without overwriting
      const updates: Record<string, string> = {};
      if (!existingUser.phone && clean10DigitPhone) {
        updates.phone = clean10DigitPhone;
      }
      if (!existingUser.email && validEmail) {
        updates.email = validEmail;
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
    } else if (existingSupaProfile) {
      customerId = existingSupaProfile.id;
      customerName = existingSupaProfile.full_name || rawName || 'Customer';
      if ((!existingSupaProfile.full_name || existingSupaProfile.full_name.startsWith('Customer')) && rawName) {
        customerName = rawName;
      }
    } else {
      // 3. Create new verified ADRIZO customer
      isNewCustomer = true;
      customerName = rawName || (clean10DigitPhone ? `Customer ${clean10DigitPhone.slice(-4)}` : 'Customer');
      const newUser = await prisma.user.create({
        data: {
          name: customerName,
          phone: clean10DigitPhone || undefined,
          email: validEmail || undefined,
          role: 'CUSTOMER',
        },
      }).catch(async () => {
        // Fallback: check if created concurrently
        return await prisma.user.findFirst({
          where: {
            OR: [
              clean10DigitPhone ? { phone: clean10DigitPhone } : {},
              validEmail ? { email: validEmail } : {},
            ].filter(cond => Object.keys(cond).length > 0),
          },
        });
      });

      customerId = newUser?.id || `cust_${Date.now()}`;
    }

    // 4. Synchronize customer_profiles table in Supabase (Authoritative Admin & Account Store)
    const profileUpsert: any = {
      id: customerId,
      full_name: customerName,
      updated_at: new Date().toISOString(),
    };
    if (customerPhone) profileUpsert.phone = customerPhone;
    if (customerEmail) profileUpsert.email = customerEmail;

    const addr = identity.address;
    let addressSynced = false;

    if (addr && addr.line1 && addr.city) {
      const line1 = (addr.line1 || '').trim();
      const line2 = (addr.line2 || '').trim();
      const city = (addr.city || '').trim();
      const state = (addr.state || '').trim();
      const pin = (addr.pincode || '').replace(/\D/g, '').trim();
      const formattedAddress = [line1, line2, city, state ? `${state} - ${pin}` : pin, 'India'].filter(Boolean).join(', ');

      profileUpsert.delivery_address = formattedAddress;
      profileUpsert.city = city;
      if (state) profileUpsert.state = state;
      if (pin) profileUpsert.pincode = pin;

      // 5. Synchronize Saved Address in customer_addresses table (with Deduplication)
      try {
        const { data: existingAddrs } = await adminSupabase
          .from('customer_addresses')
          .select('id, address, pincode')
          .eq('customer_id', customerId);

        const isDuplicate = (existingAddrs || []).some((a: any) =>
          (pin && a.pincode === pin) &&
          (a.address?.toLowerCase().trim() === line1.toLowerCase().trim())
        );

        if (!isDuplicate) {
          const isFirst = !existingAddrs || existingAddrs.length === 0;
          await adminSupabase.from('customer_addresses').insert({
            customer_id: customerId,
            full_name: addr.fullName || customerName,
            phone: addr.phone || customerPhone || '',
            address: line1,
            area: line2 || null,
            city,
            state: state || 'Pending',
            pincode: pin || '000000',
            is_default: isFirst,
          });
          addressSynced = true;
        } else {
          addressSynced = true; // Address already securely saved
        }
      } catch (addrErr) {
        console.warn('[syncRazorpayCustomerToAdrizo] Address sync warning:', addrErr);
      }
    }

    try {
      await adminSupabase.from('customer_profiles').upsert(profileUpsert, { onConflict: 'id' });
    } catch (profErr) {
      console.warn('[syncRazorpayCustomerToAdrizo] Profile upsert warning:', profErr);
    }

    // 6. Link Order to Customer in Supabase if orderId is provided
    if (identity.orderId) {
      try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identity.orderId);
        let orderQuery = adminSupabase.from('orders').update({
          customer_id: customerId,
          customer_name: customerName,
          ...(customerPhone ? { customer_phone: customerPhone } : {}),
          ...(customerEmail ? { customer_email: customerEmail } : {}),
          updated_at: new Date().toISOString(),
        });

        if (isUuid) {
          await orderQuery.eq('id', identity.orderId);
        } else if (identity.orderId.startsWith('order_')) {
          await orderQuery.eq('razorpay_order_id', identity.orderId);
        } else {
          await orderQuery.eq('order_number', identity.orderId);
        }
      } catch (orderLinkErr) {
        console.warn('[syncRazorpayCustomerToAdrizo] Order customer_id link warning:', orderLinkErr);
      }
    }

    // 7. Issue persistent 30-day HTTP-only customer_token session cookie
    if (identity.setSessionCookie !== false) {
      try {
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
      } catch (cookieErr) {
        // In server-to-server webhook contexts where cookies() is not modifiable, gracefully continue
      }
    }

    return {
      success: true,
      user: {
        id: customerId,
        name: customerName,
        phone: customerPhone || undefined,
        email: customerEmail || undefined,
        isAdmin: false,
      },
      addressSynced,
      isNewCustomer,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to sync customer profile.';
    console.error('[Razorpay Customer Sync Error]', errorMsg);
    return { success: false, error: errorMsg };
  }
}

/**
 * Authoritatively fetches official verified order & payment data from Razorpay
 * and invokes syncRazorpayCustomerToAdrizo.
 */
export async function syncVerifiedRazorpayOrder({
  orderId,
  razorpayOrderId,
  razorpayPaymentId,
  setSessionCookie = true,
}: {
  orderId?: string | null;
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  setSessionCookie?: boolean;
}) {
  try {
    const { getRazorpayInstance } = await import('@/lib/razorpay');
    const rzp = getRazorpayInstance();

    const [rzpOrder, rzpPayment] = await Promise.all([
      razorpayOrderId ? rzp.orders.fetch(razorpayOrderId).catch(() => null) : null,
      razorpayPaymentId ? rzp.payments.fetch(razorpayPaymentId).catch(() => null) : null,
    ]);

    const rawContact = rzpPayment?.contact || (rzpOrder as any)?.customer_details?.contact || '';
    const rawEmail = rzpPayment?.email || (rzpOrder as any)?.customer_details?.email || '';
    const magicAddress = (rzpOrder as any)?.shipping_address;

    const line1 = magicAddress?.line1 || magicAddress?.address1 || '';
    const line2 = magicAddress?.line2 || magicAddress?.address2 || '';
    const city = magicAddress?.city || '';
    const state = magicAddress?.state || '';
    const pin = magicAddress?.zipcode || magicAddress?.postal_code || magicAddress?.pincode || '';
    const name = magicAddress?.name || magicAddress?.full_name || (rzpPayment as any)?.notes?.customerName || '';

    const identity: RazorpaySsoIdentity = {
      phone: rawContact || null,
      email: rawEmail || null,
      name: name || null,
      orderId: orderId || razorpayOrderId,
      setSessionCookie,
      address: line1 && city ? {
        line1,
        line2,
        city,
        state,
        pincode: pin,
        country: magicAddress?.country || 'India',
        fullName: name || null,
        phone: rawContact || null,
      } : null,
    };

    return await syncRazorpayCustomerToAdrizo(identity);
  } catch (err: any) {
    console.warn('[syncVerifiedRazorpayOrder Exception]', err?.message || err);
    return { success: false, error: err?.message || 'Sync exception' };
  }
}
