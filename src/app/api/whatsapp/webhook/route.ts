import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// One-way SHA-256 hash of authorized default token to verify without exposing plain-text in Git
const VERIFY_TOKEN_HASH = '4475223690dd25373fd55cd5b19f24e243a969fa7aa7d0074afec3da3723baa7';

/**
 * Meta WhatsApp Cloud API Webhook Handler
 * Route: /api/whatsapp/webhook
 * 
 * GET: Handles Webhook Verification handshake from Meta
 * Meta sends:
 *  - hub.mode ('subscribe')
 *  - hub.verify_token (matches WHATSAPP_VERIFY_TOKEN)
 *  - hub.challenge (plain text string to echo back with HTTP 200)
 * 
 * POST: Handles incoming WhatsApp events (messages, status updates)
 */

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl ? req.nextUrl.searchParams : new URL(req.url).searchParams;
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token) {
      const isAuthorized = verifyTokenMatch(token);

      if (isAuthorized) {
        // Meta expects the exact hub.challenge as plain text with HTTP 200
        return new Response(challenge || '', {
          status: 200,
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
          },
        });
      }
    }

    return new Response('Forbidden', {
      status: 403,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  } catch (error: any) {
    console.error('[WhatsApp Webhook Verification Error]', error);
    return new Response('Internal Server Error', {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();

    // 1. Validate Meta signature if WHATSAPP_APP_SECRET is configured
    const appSecret = process.env.WHATSAPP_APP_SECRET || process.env.META_APP_SECRET;
    if (appSecret) {
      const signatureHeader = req.headers.get('x-hub-signature-256');
      if (!signatureHeader || !isValidMetaSignature(rawBody, signatureHeader, appSecret)) {
        console.warn('[WhatsApp Webhook] Invalid signature received on POST.');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    // 2. Parse payload safely
    let payload: any = {};
    if (rawBody) {
      try {
        payload = JSON.parse(rawBody);
      } catch (parseErr) {
        console.warn('[WhatsApp Webhook] Invalid JSON payload received.');
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
      }
    }

    // 3. Process WhatsApp events
    if (payload.object === 'whatsapp_business_account') {
      const entries = Array.isArray(payload.entry) ? payload.entry : [];

      for (const entry of entries) {
        const changes = Array.isArray(entry.changes) ? entry.changes : [];

        for (const change of changes) {
          if (change.field === 'messages') {
            const value = change.value || {};

            // Handle incoming customer messages
            if (Array.isArray(value.messages)) {
              for (const message of value.messages) {
                const messageType = message.type || 'unknown';
                const messageId = message.id || 'unknown';
                console.log(`[WhatsApp Webhook] Incoming message [${messageType}] ID: ${messageId}`);
              }
            }

            // Handle message status updates (sent, delivered, read, failed)
            if (Array.isArray(value.statuses)) {
              for (const status of value.statuses) {
                const statusType = status.status || 'unknown';
                const statusId = status.id || 'unknown';
                console.log(`[WhatsApp Webhook] Message status update: ${statusType} for ID: ${statusId}`);
              }
            }
          }
        }
      }
    }

    // 4. Return HTTP 200 quickly to acknowledge receipt to Meta
    return NextResponse.json({ status: 'EVENT_RECEIVED' }, { status: 200 });
  } catch (error: any) {
    console.error('[WhatsApp Webhook POST Error]', error);
    // Acknowledge receipt to prevent Meta from retrying or disabling the webhook
    return NextResponse.json({ status: 'ERROR_RECORDED' }, { status: 200 });
  }
}

/**
 * Validates verification token against environment or secure hash.
 */
function verifyTokenMatch(receivedToken: string): boolean {
  if (!receivedToken) return false;

  // 1. Direct environment variable comparison
  const envToken = process.env.WHATSAPP_VERIFY_TOKEN;
  if (envToken && timingSafeEqualString(receivedToken, envToken)) {
    return true;
  }

  // 2. Cryptographic one-way hash comparison (ensures zero token exposure in Git/bundles)
  const tokenHash = crypto.createHash('sha256').update(receivedToken, 'utf8').digest('hex');
  return timingSafeEqualString(tokenHash, VERIFY_TOKEN_HASH);
}

/**
 * Constant-time string comparison to prevent timing attacks.
 */
function timingSafeEqualString(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Validates Meta x-hub-signature-256 header using SHA256 HMAC.
 */
function isValidMetaSignature(rawBody: string, signatureHeader: string, secret: string): boolean {
  if (!signatureHeader.startsWith('sha256=')) return false;
  const signature = signatureHeader.substring(7);
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(rawBody, 'utf8');
  const digest = hmac.digest('hex');
  return timingSafeEqualString(digest, signature);
}
