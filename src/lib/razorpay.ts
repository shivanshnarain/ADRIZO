import Razorpay from 'razorpay';
import crypto from 'crypto';

export const RAZORPAY_CURRENCY = process.env.RAZORPAY_CURRENCY || 'INR';

/**
 * Checks whether Razorpay credentials are actively configured in environment variables.
 * Returns false if keys are missing or using placeholder values.
 */
export function isRazorpayConfigured(): boolean {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) return false;

  const trimmedKey = keyId.trim().toLowerCase();
  const trimmedSecret = keySecret.trim().toLowerCase();

  if (
    trimmedKey.includes('placeholder') ||
    trimmedSecret.includes('placeholder') ||
    trimmedKey.includes('your_razorpay') ||
    trimmedSecret.includes('your_razorpay') ||
    trimmedKey === 'your_key_id' ||
    trimmedSecret === 'your_key_secret'
  ) {
    return false;
  }

  return trimmedKey.length > 5 && trimmedSecret.length > 5;
}

/**
 * Returns an authenticated Razorpay SDK instance.
 * Throws a clean descriptive error if keys are not configured.
 */
export function getRazorpayInstance(): Razorpay {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret || !isRazorpayConfigured()) {
    throw new Error('Razorpay API keys are not configured in environment variables.');
  }

  return new Razorpay({
    key_id: keyId.trim(),
    key_secret: keySecret.trim(),
  });
}

export interface CreateRazorpayOrderOptions {
  amountInPaise: number;
  currency?: string;
  receipt: string;
  notes?: Record<string, string>;
}

/**
 * Creates a server-side Razorpay Order using official SDK.
 * Amount MUST be in smallest currency units (e.g. paise for INR).
 */
export async function createRazorpayOrder(options: CreateRazorpayOrderOptions) {
  const rzp = getRazorpayInstance();
  return rzp.orders.create({
    amount: options.amountInPaise,
    currency: options.currency || RAZORPAY_CURRENCY,
    receipt: options.receipt,
    notes: options.notes,
  });
}

/**
 * Verifies Razorpay payment signature server-side using timing-safe HMAC-SHA256.
 * Formula: HMAC_SHA256(order_id + "|" + payment_id, secret) === signature
 */
export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret || !signature || !orderId || !paymentId) return false;

  try {
    const generatedSignature = crypto
      .createHmac('sha256', keySecret.trim())
      .update(`${orderId.trim()}|${paymentId.trim()}`)
      .digest('hex');

    const bufA = Buffer.from(generatedSignature, 'utf-8');
    const bufB = Buffer.from(signature.trim(), 'utf-8');

    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch (err) {
    console.error('[Razorpay Signature Verification Error]', err);
    return false;
  }
}

/**
 * Verifies Razorpay Webhook signature using webhook secret.
 * Formula: HMAC_SHA256(rawBody, webhookSecret) === signature
 */
export function verifyRazorpayWebhookSignature(
  rawBody: string,
  signature: string
): boolean {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret || !signature || !rawBody) return false;

  try {
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret.trim())
      .update(rawBody)
      .digest('hex');

    const bufA = Buffer.from(expectedSignature, 'utf-8');
    const bufB = Buffer.from(signature.trim(), 'utf-8');

    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch (err) {
    console.error('[Razorpay Webhook Verification Error]', err);
    return false;
  }
}

/**
 * Generates an authoritative, clean, unique Indian e-commerce order number.
 * Format: ADR-XXXXXX (e.g. ADR-849201)
 */
export function generateOrderNumber(): string {
  const randomSuffix = Math.floor(100000 + Math.random() * 900000);
  return `ADR-${randomSuffix}`;
}
