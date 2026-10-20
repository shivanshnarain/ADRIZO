import crypto from 'crypto';

const INVOICE_TOKEN_SECRET =
  process.env.JWT_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'adrizo_secure_invoice_token_salt_2026';

const TOKEN_EXPIRY_DAYS = 30; // 30 days valid for customer order invoices

/**
 * Generates an unguessable, scoped, expiring access token for order invoice sharing.
 */
export function generateInvoiceToken(orderId: string, orderNumber: string): string {
  const expiry = Date.now() + TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
  const data = `${orderId}:${orderNumber}:${expiry}`;
  const signature = crypto.createHmac('sha256', INVOICE_TOKEN_SECRET).update(data).digest('hex').slice(0, 32);
  const payloadB64 = Buffer.from(data).toString('base64url');
  return `${payloadB64}.${signature}`;
}

/**
 * Cryptographically verifies an invoice access token against expected order identifiers.
 */
export function verifyInvoiceToken(
  token: string | null | undefined,
  expectedOrderId: string,
  expectedOrderNumber: string
): boolean {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payloadB64, signature] = parts;

  try {
    const payload = Buffer.from(payloadB64, 'base64url').toString('utf8');
    const [orderId, orderNumber, expiryStr] = payload.split(':');
    const expiry = Number(expiryStr);

    if (!expiry || Date.now() > expiry) {
      return false;
    }

    if (orderId !== expectedOrderId || orderNumber !== expectedOrderNumber) {
      return false;
    }

    const expectedData = `${orderId}:${orderNumber}:${expiry}`;
    const expectedSig = crypto.createHmac('sha256', INVOICE_TOKEN_SECRET).update(expectedData).digest('hex').slice(0, 32);

    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig));
  } catch {
    return false;
  }
}
