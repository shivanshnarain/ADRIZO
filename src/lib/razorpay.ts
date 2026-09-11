import Razorpay from 'razorpay';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

let envFallbackLoaded = false;

/**
 * Ensures active production credentials from .env.vercel or .env are loaded
 * and automatically overrides deprecated/placeholder credentials from stale Vercel dashboard states.
 */
export function loadEnvFallback() {
  if (envFallbackLoaded) return;
  envFallbackLoaded = true;

  try {
    const candidates = ['.env.vercel', '.env.local', '.env'];
    for (const filename of candidates) {
      const fullPath = path.resolve(process.cwd(), filename);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        for (const line of content.split('\n')) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
          const eqIdx = trimmed.indexOf('=');
          const key = trimmed.slice(0, eqIdx).trim();
          const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');

          if (key === 'RAZORPAY_KEY_ID' || key === 'NEXT_PUBLIC_RAZORPAY_KEY_ID' || key === 'RAZORPAY_KEY_SECRET') {
            const currentVal = process.env[key];
            if (
              !currentVal ||
              currentVal.includes('TYio72mColkjPN') ||
              currentVal.includes('U074TAZdfZv0BCcCTm7DblVm') ||
              currentVal.includes('REPLACE_WITH')
            ) {
              if (val && !val.includes('REPLACE_WITH')) {
                process.env[key] = val;
              }
            }
          }
        }
      }
    }
  } catch {
    // Non-fatal fallback
  }
}

/**
 * Returns the authoritative active Razorpay Key ID for client and server.
 */
export function getRazorpayKeyId(): string {
  loadEnvFallback();
  const rawKey = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  return rawKey?.trim().replace(/^["']|["']$/g, '') || '';
}

export const RAZORPAY_CURRENCY = process.env.RAZORPAY_CURRENCY || 'INR';

/**
 * Checks whether Razorpay credentials are actively configured in environment variables.
 * Returns false if keys are missing or using placeholder values.
 */
export function isRazorpayConfigured(): boolean {
  loadEnvFallback();
  const rawKey = getRazorpayKeyId();
  const rawSecret = process.env.RAZORPAY_KEY_SECRET?.trim().replace(/^["']|["']$/g, '');

  if (!rawKey || !rawSecret) return false;

  const trimmedKey = rawKey.toLowerCase();
  const trimmedSecret = rawSecret.toLowerCase();

  if (
    trimmedKey.includes('placeholder') ||
    trimmedSecret.includes('placeholder') ||
    trimmedKey.includes('your_razorpay') ||
    trimmedSecret.includes('your_razorpay') ||
    trimmedKey === 'your_key_id' ||
    trimmedSecret === 'your_key_secret' ||
    trimmedKey.includes('tyio72mcolkjpn') ||
    trimmedSecret.includes('u074tazdfzv0bccctm7dblvm')
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
  loadEnvFallback();
  const keyId = getRazorpayKeyId();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim().replace(/^["']|["']$/g, '');

  if (!keyId || !keySecret || !isRazorpayConfigured()) {
    throw new Error('Razorpay API keys are not configured in environment variables.');
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
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
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim().replace(/^["']|["']$/g, '');
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
