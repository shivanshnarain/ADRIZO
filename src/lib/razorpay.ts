import Razorpay from 'razorpay';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

let envFallbackLoaded = false;

export function isDeprecatedKey(key?: string): boolean {
  if (!key) return true;
  const lower = key.toLowerCase();
  return (
    lower.includes('tyio72mcolkjpn') ||
    lower.includes('taj9ubralpmyhj') ||
    lower.includes('u074tazdfzv0bccctm7dblvm') ||
    lower.includes('placeholder') ||
    lower.includes('replace_with') ||
    lower.includes('your_key') ||
    lower.includes('your_razorpay') ||
    key.trim().length < 8
  );
}

/**
 * Ensures active production credentials from .env.vercel or .env are loaded
 * and automatically overrides deprecated/placeholder credentials from stale Vercel dashboard states.
 */
export function loadEnvFallback() {
  if (envFallbackLoaded) return;
  envFallbackLoaded = true;

  // On Vercel / serverless production, check if already valid before skipping disk
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    const currentKey = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const currentSecret = process.env.RAZORPAY_KEY_SECRET;
    if (
      currentKey &&
      currentSecret &&
      !isDeprecatedKey(currentKey) &&
      !isDeprecatedKey(currentSecret)
    ) {
      return;
    }
  }

  try {
    const candidates = [
      path.resolve(process.cwd(), '.env.local'),
      path.resolve(process.cwd(), '.env'),
      path.resolve(process.cwd(), '.env.vercel'),
    ];
    for (const fullPath of candidates) {
      if (fs.existsSync(/*turbopackIgnore: true*/ fullPath)) {
        const content = fs.readFileSync(/*turbopackIgnore: true*/ fullPath, 'utf-8');
        for (const line of content.split('\n')) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
          const eqIdx = trimmed.indexOf('=');
          const key = trimmed.slice(0, eqIdx).trim();
          const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');

          if (key === 'RAZORPAY_KEY_ID' || key === 'NEXT_PUBLIC_RAZORPAY_KEY_ID' || key === 'RAZORPAY_KEY_SECRET') {
            if (val && !isDeprecatedKey(val)) {
              const currentVal = process.env[key];
              if (!currentVal || isDeprecatedKey(currentVal)) {
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
  const keys = [
    process.env.RAZORPAY_KEY_ID,
    process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    process.env.RAZORPAY_API_KEY,
    process.env.RAZORPAY_KEY,
    process.env.NEXT_PUBLIC_RAZORPAY_KEY,
  ];

  for (const rawKey of keys) {
    const clean = rawKey?.trim().replace(/^["']|["']$/g, '') || '';
    if (clean && !isDeprecatedKey(clean)) {
      return clean;
    }
  }

  return '';
}

/**
 * Returns the authoritative active Razorpay Key Secret.
 */
export function getRazorpaySecret(): string {
  loadEnvFallback();
  const secrets = [
    process.env.RAZORPAY_KEY_SECRET,
    process.env.RAZORPAY_SECRET,
    process.env.RAZORPAY_API_SECRET,
  ];

  for (const rawSecret of secrets) {
    const clean = rawSecret?.trim().replace(/^["']|["']$/g, '') || '';
    if (clean && !isDeprecatedKey(clean)) {
      return clean;
    }
  }

  return '';
}

export const RAZORPAY_CURRENCY = process.env.RAZORPAY_CURRENCY || 'INR';

/**
 * Returns detailed status and human-readable reason if Razorpay is not configured.
 */
export function getRazorpayConfigStatus(): { configured: boolean; reason?: string } {
  const rawKey = getRazorpayKeyId();
  const rawSecret = getRazorpaySecret();

  if (!rawKey && !rawSecret) {
    return { configured: false, reason: 'Razorpay keys are not configured in environment variables.' };
  }
  if (!rawKey) {
    return { configured: false, reason: 'RAZORPAY_KEY_ID is missing or set to a deprecated/placeholder key in environment variables.' };
  }
  if (!rawSecret) {
    return { configured: false, reason: 'RAZORPAY_KEY_SECRET is missing or set to a deprecated/placeholder key in environment variables.' };
  }

  const trimmedKey = rawKey.toLowerCase();
  const trimmedSecret = rawSecret.toLowerCase();

  if (trimmedSecret.includes('u074tazdfzv0bccctm7dblvm')) {
    return {
      configured: false,
      reason: 'The environment contains the deprecated OLD Razorpay API Secret. Please update RAZORPAY_KEY_SECRET in environment settings.',
    };
  }

  if (trimmedKey.includes('tyio72mcolkjpn') || trimmedKey.includes('taj9ubralpmyhj')) {
    return {
      configured: false,
      reason: 'The environment contains a deprecated Razorpay Key ID. Please update RAZORPAY_KEY_ID in environment settings to the active live key.',
    };
  }

  if (isDeprecatedKey(trimmedKey) || isDeprecatedKey(trimmedSecret)) {
    return { configured: false, reason: 'Razorpay environment variables are set to placeholder or deprecated values.' };
  }

  const isValid = trimmedKey.length > 5 && trimmedSecret.length > 5;
  return { configured: isValid, reason: isValid ? undefined : 'Razorpay credentials are invalid or too short.' };
}

/**
 * Checks whether Razorpay credentials are actively configured in environment variables.
 * Returns false if keys are missing or using placeholder values.
 */
export function isRazorpayConfigured(): boolean {
  return getRazorpayConfigStatus().configured;
}

let cachedRazorpayInstance: Razorpay | null = null;
let cachedKeyId: string | null = null;
let cachedKeySecret: string | null = null;

/**
 * Returns an authenticated Razorpay SDK instance.
 * Caches and safely reuses the instance across requests in the Node.js runtime.
 * Throws a clean descriptive error if keys are not configured.
 */
export function getRazorpayInstance(): Razorpay {
  const keyId = getRazorpayKeyId();
  const keySecret = getRazorpaySecret();

  if (!keyId || !keySecret || !isRazorpayConfigured()) {
    throw new Error('Razorpay API keys are not configured in environment variables.');
  }

  if (cachedRazorpayInstance && cachedKeyId === keyId && cachedKeySecret === keySecret) {
    return cachedRazorpayInstance;
  }

  cachedKeyId = keyId;
  cachedKeySecret = keySecret;
  cachedRazorpayInstance = new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });

  return cachedRazorpayInstance;
}

export interface RazorpayOrderLineItem {
  sku: string;
  variant_id: string;
  price: number; // Price in paise
  offer_price: number; // Discounted/selling price charged to customer in paise
  quantity: number;
  name: string;
  description?: string;
  image_url?: string;
}

export interface CreateRazorpayOrderOptions {
  amountInPaise: number;
  currency?: string;
  receipt: string;
  notes?: Record<string, string>;
  line_items?: RazorpayOrderLineItem[];
  line_items_total?: number;
  shipping_fee?: number;
  cod_fee?: number;
}

/**
 * Creates a server-side Razorpay Order using official SDK.
 * Amount MUST be in smallest currency units (e.g. paise for INR).
 * Automatically passes Magic Checkout fields (line_items, line_items_total, shipping_fee)
 * when provided.
 */
export async function createRazorpayOrder(options: CreateRazorpayOrderOptions) {
  const rzp = getRazorpayInstance();
  const payload: any = {
    amount: options.amountInPaise,
    currency: options.currency || RAZORPAY_CURRENCY,
    receipt: options.receipt,
    notes: options.notes,
  };

  if (options.line_items && options.line_items.length > 0) {
    payload.line_items = options.line_items;
    payload.line_items_total =
      options.line_items_total !== undefined
        ? options.line_items_total
        : options.line_items.reduce((acc, it) => acc + (it.offer_price * it.quantity), 0);
  }

  if (options.shipping_fee !== undefined) {
    payload.shipping_fee = options.shipping_fee;
  }

  if (options.cod_fee !== undefined) {
    payload.cod_fee = options.cod_fee;
  }

  return rzp.orders.create(payload);
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
  const keySecret = getRazorpaySecret();
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
  loadEnvFallback();
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim().replace(/^["']|["']$/g, '');
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
