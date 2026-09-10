import { ShiprocketCredentials } from './types';

/**
 * Shiprocket Base API Configuration
 */
export const SHIPROCKET_API_BASE_URL = 'https://apiv2.shiprocket.in/v1/external';
export const SHIPROCKET_AUTH_ENDPOINT = '/auth/login';
export const SHIPROCKET_DEFAULT_TIMEOUT_MS = 15000;

/**
 * Shiprocket tokens have a documented validity period of ~240 hours (10 days).
 * We maintain a conservative in-memory expiration buffer of 216 hours (9 days)
 * to proactively refresh before expiration without unnecessary repeated logins.
 */
export const SHIPROCKET_TOKEN_CACHE_TTL_MS = 216 * 60 * 60 * 1000;

/**
 * Validates whether the server environment contains valid Shiprocket API User credentials.
 * Returns false if keys are missing, empty, or set to initial placeholder values.
 */
export function isShiprocketConfigured(): boolean {
  const email = process.env.SHIPROCKET_API_EMAIL?.trim();
  const password = process.env.SHIPROCKET_API_PASSWORD?.trim();

  if (!email || !password) {
    return false;
  }

  // Reject placeholder values
  if (
    email.includes('placeholder') ||
    email.includes('your_') ||
    password.includes('placeholder') ||
    password.includes('your_')
  ) {
    return false;
  }

  return email.length > 5 && password.length >= 6;
}

/**
 * Safely extracts server-side Shiprocket credentials.
 * Throws a clean descriptive error if missing.
 * NEVER prints or includes the password in error messages.
 */
export function getShiprocketCredentials(): ShiprocketCredentials {
  const email = process.env.SHIPROCKET_API_EMAIL?.trim();
  const password = process.env.SHIPROCKET_API_PASSWORD?.trim();

  if (!email || !password) {
    throw new Error('Shiprocket API credentials are not configured in server environment variables.');
  }

  if (
    email.includes('placeholder') ||
    password.includes('placeholder') ||
    email.length <= 5 ||
    password.length < 6
  ) {
    throw new Error('Shiprocket API credentials appear to be invalid or placeholder values.');
  }

  return { email, password };
}

/**
 * Mask an email address safely for structured server logging without exposing full PII.
 * Example: testuser@domain.com -> t***r@domain.com
 */
export function maskEmail(email?: string | null): string {
  if (!email || typeof email !== 'string') return '***';
  const parts = email.split('@');
  if (parts.length !== 2) return '***';
  const name = parts[0];
  const domain = parts[1];
  if (name.length <= 2) {
    return `${name[0]}***@${domain}`;
  }
  return `${name[0]}***${name[name.length - 1]}@${domain}`;
}
