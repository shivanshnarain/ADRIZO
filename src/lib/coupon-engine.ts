import { prisma } from '@/lib/prisma';
import { getAdminClient } from '@/lib/supabase/admin';

export interface PromotionItemInput {
  productId?: string;
  categoryId?: string;
  categorySlug?: string;
  sku?: string;
  price?: number;
  quantity?: number;
}

export interface GetEligiblePromotionsOptions {
  subtotal?: number;
  items?: PromotionItemInput[];
  customerEmail?: string;
  customerPhone?: string;
  userId?: string;
  orderId?: string;
  razorpayOrderId?: string;
}

export interface ValidateCouponOptions {
  couponCode: string;
  subtotal: number;
  items?: PromotionItemInput[];
  customerEmail?: string;
  customerPhone?: string;
  userId?: string;
  orderId?: string;
  razorpayOrderId?: string;
}

export interface FormattedPromotion {
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minimumOrderValue: number;
  maximumDiscount: number | null;
  summary: string;
  description: string;
  firstOrderOnly?: boolean;
}

export interface CouponValidationResult {
  success: boolean;
  error?: {
    code?: string;
    description: string;
  };
  coupon?: {
    id: string;
    code: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    minimumOrderValue: number;
    maximumDiscount: number | null;
    firstOrderOnly: boolean;
  };
  discount: number; // in INR
  discountInPaise: number; // in paise for Razorpay
  amount: number; // in paise (Razorpay alias)
  subtotal: number; // in INR
  finalPayable: number; // in INR
  currency: string;
}

/**
 * Ensures default coupons exist in the MongoDB database if empty.
 */
export async function seedDefaultCouponsIfEmpty() {
  try {
    const count = await prisma.coupon.count();
    if (count > 0) return;

    const defaultCoupons = [
      {
        couponCode: 'WELCOME10',
        discountType: 'percentage',
        discountValue: 10,
        minimumOrderValue: 999,
        maximumDiscount: 300,
        firstOrderOnly: false,
        active: true,
        description: 'Get 10% discount on order subtotal above ₹999 (up to ₹300).',
      },
      {
        couponCode: 'ADRIZO50',
        discountType: 'percentage',
        discountValue: 50,
        minimumOrderValue: 1999,
        maximumDiscount: 1000,
        firstOrderOnly: false,
        active: true,
        description: 'Get 50% discount on order subtotal above ₹1999 (up to ₹1,000).',
      },
      {
        couponCode: 'FLAT200',
        discountType: 'fixed',
        discountValue: 200,
        minimumOrderValue: 1499,
        maximumDiscount: 200,
        firstOrderOnly: false,
        active: true,
        description: 'Flat ₹200 discount on minimum order of ₹1499.',
      },
      {
        couponCode: 'FIRST15',
        discountType: 'percentage',
        discountValue: 15,
        minimumOrderValue: 799,
        maximumDiscount: 350,
        firstOrderOnly: true,
        active: true,
        description: 'First order exclusive: 15% discount on orders above ₹799 (up to ₹350).',
      },
    ];

    for (const c of defaultCoupons) {
      await prisma.coupon.create({ data: c }).catch(() => null);
    }
  } catch (err) {
    console.warn('[seedDefaultCouponsIfEmpty] Non-fatal seed warning:', err);
  }
}

/**
 * Checks whether a customer has placed prior completed/confirmed orders.
 */
async function checkHasPriorOrders(customerEmail?: string, customerPhone?: string, userId?: string): Promise<boolean> {
  const email = (customerEmail || '').trim().toLowerCase();
  const phone = (customerPhone || '').trim().replace(/\D/g, '');
  const uid = (userId || '').trim();

  if (!email && !phone && !uid) return false;

  // 1. Check MongoDB orders
  try {
    const mongoConditions: any[] = [];
    if (email) mongoConditions.push({ customerEmail: email });
    if (phone) mongoConditions.push({ customerPhone: phone });
    if (uid && /^[0-9a-fA-F]{24}$/.test(uid)) mongoConditions.push({ userId: uid });

    if (mongoConditions.length > 0) {
      const priorCount = await prisma.order.count({
        where: {
          OR: mongoConditions,
          paymentStatus: { in: ['PAID', 'COD_CONFIRMATION_PAID'] },
        },
      });
      if (priorCount > 0) return true;
    }
  } catch (err) {
    console.warn('[checkHasPriorOrders] MongoDB check warning:', err);
  }

  // 2. Check Supabase orders
  try {
    const supabase = getAdminClient();
    const supaOrs: string[] = [];
    if (email) supaOrs.push(`customer_email.eq.${email}`);
    if (phone) supaOrs.push(`customer_phone.eq.${phone}`);
    if (uid) supaOrs.push(`customer_id.eq.${uid}`);

    if (supaOrs.length > 0) {
      const { data: priorSupaOrders } = await supabase
        .from('orders')
        .select('id, payment_status, order_status')
        .or(supaOrs.join(','))
        .in('payment_status', ['PAID', 'COD_CONFIRMATION_PAID'])
        .limit(1);

      if (priorSupaOrders && priorSupaOrders.length > 0) return true;
    }
  } catch (err) {
    console.warn('[checkHasPriorOrders] Supabase check warning:', err);
  }

  return false;
}

/**
 * Returns all active and currently eligible promotions.
 */
export async function getEligiblePromotions(options: GetEligiblePromotionsOptions = {}): Promise<FormattedPromotion[]> {
  await seedDefaultCouponsIfEmpty();

  const now = new Date();
  const subtotal = options.subtotal ?? 0;
  const items = options.items || [];
  const { customerEmail, customerPhone, userId } = options;

  let hasPriorOrders: boolean | null = null;

  const rawCoupons = await prisma.coupon.findMany({
    where: { active: true },
    orderBy: { createdAt: 'desc' },
  });

  const coupons = (rawCoupons as any[]).filter((c: any) => {
    if (c.startDate && new Date(c.startDate) > now) return false;
    if (c.expiryDate && new Date(c.expiryDate) < now) return false;
    return true;
  });

  const eligibleList: FormattedPromotion[] = [];

  for (const c of coupons) {
    // 0. Minimum spend check if subtotal > 0
    if (subtotal > 0 && c.minimumOrderValue && c.minimumOrderValue > 0 && subtotal < c.minimumOrderValue) {
      continue;
    }

    // 1. Global usage limit check
    if (c.usageLimit && c.usageLimit > 0 && c.usageCount >= c.usageLimit) {
      continue;
    }

    // 2. First order check
    if (c.firstOrderOnly) {
      if (hasPriorOrders === null) {
        hasPriorOrders = await checkHasPriorOrders(customerEmail, customerPhone, userId);
      }
      if (hasPriorOrders) {
        continue;
      }
    }

    // 3. Per-customer limit check
    if (customerEmail || customerPhone || userId) {
      const email = customerEmail?.trim().toLowerCase();
      const phone = customerPhone?.trim().replace(/\D/g, '');
      const uid = userId?.trim();

      const usageCount = await prisma.couponUsage.count({
        where: {
          couponCode: c.couponCode,
          OR: [
            email ? { customerEmail: email } : {},
            phone ? { customerPhone: phone } : {},
            uid ? { userId: uid } : {},
          ].filter(o => Object.keys(o).length > 0),
        },
      });

      const customerLimit = c.perCustomerLimit ?? 1;
      if (usageCount >= customerLimit) {
        continue;
      }
    }

    // 4. Product restrictions check (if cart items provided)
    if (items.length > 0 && c.applicableProducts && c.applicableProducts.length > 0) {
      const hasApplicableProduct = items.some(it => {
        return (it.productId && c.applicableProducts.includes(it.productId)) ||
               (it.sku && c.applicableProducts.includes(it.sku));
      });
      if (!hasApplicableProduct) continue;
    }

    // 5. Category restrictions check (if cart items provided)
    if (items.length > 0 && c.applicableCategories && c.applicableCategories.length > 0 && !c.applicableCategories.includes('all')) {
      const hasApplicableCategory = items.some(it => {
        const catSlug = (it.categorySlug || '').toLowerCase().trim();
        const catId = (it.categoryId || '').trim();
        return c.applicableCategories.some((ac: string) => {
          const norm = ac.toLowerCase().trim();
          return norm === catSlug || norm === catId;
        });
      });
      if (!hasApplicableCategory) continue;
    }

    // 6. Format promotional summary and description
    const isPercent = c.discountType === 'percentage';
    const minSpendText = c.minimumOrderValue && c.minimumOrderValue > 0
      ? `on orders above ₹${c.minimumOrderValue}`
      : 'on all orders';
    const capText = isPercent && c.maximumDiscount ? ` (up to ₹${c.maximumDiscount})` : '';
    const discountText = isPercent ? `${c.discountValue}% OFF${capText}` : `₹${c.discountValue} FLAT OFF`;

    eligibleList.push({
      code: c.couponCode,
      discountType: isPercent ? 'percentage' : 'fixed',
      discountValue: c.discountValue,
      minimumOrderValue: c.minimumOrderValue || 0,
      maximumDiscount: c.maximumDiscount || null,
      summary: `${discountText} ${minSpendText}`,
      description: c.description || (isPercent
        ? `Get ${c.discountValue}% discount ${minSpendText}${capText}.`
        : `Flat ₹${c.discountValue} discount ${minSpendText}.`),
      firstOrderOnly: c.firstOrderOnly,
    });
  }

  return eligibleList;
}

/**
 * Validates a coupon and calculates the exact discount server-side.
 * Never trusts frontend-supplied discount amounts.
 */
export async function validateAndCalculateCouponDiscount(
  options: ValidateCouponOptions
): Promise<CouponValidationResult> {
  await seedDefaultCouponsIfEmpty();

  const { couponCode, subtotal, items = [], customerEmail, customerPhone, userId } = options;

  if (!couponCode || typeof couponCode !== 'string' || !couponCode.trim()) {
    return {
      success: false,
      error: { code: 'EMPTY_CODE', description: 'Promo code is required.' },
      discount: 0,
      discountInPaise: 0,
      amount: 0,
      subtotal,
      finalPayable: subtotal,
      currency: 'INR',
    };
  }

  const cleanCode = couponCode.trim().toUpperCase();
  const now = new Date();

  // 1. Fetch coupon from database
  let coupon = await prisma.coupon.findUnique({
    where: { couponCode: cleanCode },
  });

  // Backward compatibility fallback: check store_discounts setting if not in Coupon collection
  if (!coupon) {
    try {
      const setting = await prisma.storeSetting.findUnique({ where: { key: 'store_discounts' } });
      if (setting && setting.value) {
        const parsed = JSON.parse(setting.value);
        if (Array.isArray(parsed)) {
          const match = parsed.find((c: any) => String(c.code).trim().toUpperCase() === cleanCode);
          if (match) {
            coupon = await prisma.coupon.create({
              data: {
                couponCode: cleanCode,
                discountType: match.type?.toLowerCase().includes('percent') ? 'percentage' : 'fixed',
                discountValue: Number(match.value) || 0,
                minimumOrderValue: Number(match.minSpend) || 0,
                active: match.status === 'ACTIVE',
              },
            }).catch(() => null);
          }
        }
      }
    } catch {}
  }

  if (!coupon) {
    return {
      success: false,
      error: { code: 'INVALID_COUPON', description: `Promo code "${cleanCode}" is invalid.` },
      discount: 0,
      discountInPaise: 0,
      amount: 0,
      subtotal,
      finalPayable: subtotal,
      currency: 'INR',
    };
  }

  // 2. Active status check
  if (!coupon.active) {
    return {
      success: false,
      error: { code: 'COUPON_INACTIVE', description: `Promo code "${coupon.couponCode}" is currently inactive.` },
      discount: 0,
      discountInPaise: 0,
      amount: 0,
      subtotal,
      finalPayable: subtotal,
      currency: 'INR',
    };
  }

  // 3. Start date check
  if (coupon.startDate && now < coupon.startDate) {
    return {
      success: false,
      error: { code: 'COUPON_NOT_STARTED', description: `Promo code "${coupon.couponCode}" is not active yet.` },
      discount: 0,
      discountInPaise: 0,
      amount: 0,
      subtotal,
      finalPayable: subtotal,
      currency: 'INR',
    };
  }

  // 4. Expiry date check
  if (coupon.expiryDate && now > coupon.expiryDate) {
    return {
      success: false,
      error: { code: 'COUPON_EXPIRED', description: `Promo code "${coupon.couponCode}" has expired.` },
      discount: 0,
      discountInPaise: 0,
      amount: 0,
      subtotal,
      finalPayable: subtotal,
      currency: 'INR',
    };
  }

  // 5. Global usage limit check
  if (coupon.usageLimit && coupon.usageLimit > 0 && coupon.usageCount >= coupon.usageLimit) {
    return {
      success: false,
      error: { code: 'USAGE_LIMIT_EXCEEDED', description: `Promo code "${coupon.couponCode}" usage limit has been reached.` },
      discount: 0,
      discountInPaise: 0,
      amount: 0,
      subtotal,
      finalPayable: subtotal,
      currency: 'INR',
    };
  }

  // 6. First order only check
  if (coupon.firstOrderOnly) {
    const hasPrior = await checkHasPriorOrders(customerEmail, customerPhone, userId);
    if (hasPrior) {
      return {
        success: false,
        error: { code: 'FIRST_ORDER_ONLY', description: `Promo code "${coupon.couponCode}" is only valid on your first order.` },
        discount: 0,
        discountInPaise: 0,
        amount: 0,
        subtotal,
        finalPayable: subtotal,
        currency: 'INR',
      };
    }
  }

  // 7. Per-customer limit check
  if (customerEmail || customerPhone || userId) {
    const email = customerEmail?.trim().toLowerCase();
    const phone = customerPhone?.trim().replace(/\D/g, '');
    const uid = userId?.trim();

    const customerUsageCount = await prisma.couponUsage.count({
      where: {
        couponCode: coupon.couponCode,
        OR: [
          email ? { customerEmail: email } : {},
          phone ? { customerPhone: phone } : {},
          uid ? { userId: uid } : {},
        ].filter(o => Object.keys(o).length > 0),
      },
    });

    const perCustomerLimit = coupon.perCustomerLimit ?? 1;
    if (customerUsageCount >= perCustomerLimit) {
      return {
        success: false,
        error: { code: 'CUSTOMER_LIMIT_REACHED', description: `You have already used promo code "${coupon.couponCode}" the maximum allowed number of times.` },
        discount: 0,
        discountInPaise: 0,
        amount: 0,
        subtotal,
        finalPayable: subtotal,
        currency: 'INR',
      };
    }
  }

  // 8. Product restrictions check
  if (items.length > 0 && coupon.applicableProducts && coupon.applicableProducts.length > 0) {
    const matchesProduct = items.some(it => {
      return (it.productId && coupon!.applicableProducts.includes(it.productId)) ||
             (it.sku && coupon!.applicableProducts.includes(it.sku));
    });
    if (!matchesProduct) {
      return {
        success: false,
        error: { code: 'PRODUCT_NOT_APPLICABLE', description: `Promo code "${coupon.couponCode}" is not applicable to the items in your cart.` },
        discount: 0,
        discountInPaise: 0,
        amount: 0,
        subtotal,
        finalPayable: subtotal,
        currency: 'INR',
      };
    }
  }

  // 9. Category restrictions check
  if (items.length > 0 && coupon.applicableCategories && coupon.applicableCategories.length > 0 && !coupon.applicableCategories.includes('all')) {
    const matchesCategory = items.some(it => {
      const catSlug = (it.categorySlug || '').toLowerCase().trim();
      const catId = (it.categoryId || '').trim();
      return coupon!.applicableCategories.some((ac: string) => {
        const norm = ac.toLowerCase().trim();
        return norm === catSlug || norm === catId;
      });
    });
    if (!matchesCategory) {
      return {
        success: false,
        error: { code: 'CATEGORY_NOT_APPLICABLE', description: `Promo code "${coupon.couponCode}" is only applicable to selected categories.` },
        discount: 0,
        discountInPaise: 0,
        amount: 0,
        subtotal,
        finalPayable: subtotal,
        currency: 'INR',
      };
    }
  }

  // 10. Minimum order value check
  const minSpend = coupon.minimumOrderValue || 0;
  if (subtotal < minSpend) {
    return {
      success: false,
      error: { code: 'MIN_SPEND_NOT_MET', description: `Promo code "${coupon.couponCode}" requires a minimum order of ₹${minSpend}.` },
      discount: 0,
      discountInPaise: 0,
      amount: 0,
      subtotal,
      finalPayable: subtotal,
      currency: 'INR',
    };
  }

  // 11. Calculate authoritative discount
  let calculatedDiscount = 0;
  if (coupon.discountType === 'percentage') {
    const rawDiscount = Math.round((subtotal * coupon.discountValue) / 100);
    const cappedDiscount = coupon.maximumDiscount && coupon.maximumDiscount > 0
      ? Math.min(rawDiscount, coupon.maximumDiscount)
      : rawDiscount;
    calculatedDiscount = Math.min(cappedDiscount, subtotal);
  } else {
    // Fixed amount discount
    calculatedDiscount = Math.min(coupon.discountValue, subtotal);
  }

  const discountInPaise = Math.round(calculatedDiscount * 100);
  const finalPayable = Math.max(0, subtotal - calculatedDiscount);

  return {
    success: true,
    coupon: {
      id: coupon.id,
      code: coupon.couponCode,
      discountType: coupon.discountType as 'percentage' | 'fixed',
      discountValue: coupon.discountValue,
      minimumOrderValue: coupon.minimumOrderValue || 0,
      maximumDiscount: coupon.maximumDiscount || null,
      firstOrderOnly: coupon.firstOrderOnly,
    },
    discount: calculatedDiscount,
    discountInPaise,
    amount: discountInPaise,
    subtotal,
    finalPayable,
    currency: 'INR',
  };
}

/**
 * Records an authorized coupon redemption into database upon order confirmation.
 */
export async function recordCouponUsage(options: {
  couponCode: string;
  orderId?: string;
  orderNumber?: string;
  customerEmail?: string;
  customerPhone?: string;
  userId?: string;
  discountAmount: number;
}) {
  const { couponCode, orderId, orderNumber, customerEmail, customerPhone, userId, discountAmount } = options;
  if (!couponCode) return;

  try {
    const cleanCode = couponCode.trim().toUpperCase();
    const coupon = await prisma.coupon.findUnique({
      where: { couponCode: cleanCode },
    });

    if (coupon) {
      await prisma.couponUsage.create({
        data: {
          couponId: coupon.id,
          couponCode: cleanCode,
          userId: userId || null,
          customerEmail: customerEmail?.toLowerCase() || null,
          customerPhone: customerPhone || null,
          orderId: orderId || null,
          orderNumber: orderNumber || null,
          discountAmount: discountAmount || 0,
        },
      });

      await prisma.coupon.update({
        where: { id: coupon.id },
        data: { usageCount: { increment: 1 } },
      });
    }
  } catch (err) {
    console.error('[recordCouponUsage] Error recording usage:', err);
  }
}
