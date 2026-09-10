import {
  SHIPROCKET_API_BASE_URL,
  SHIPROCKET_DEFAULT_TIMEOUT_MS,
  isShiprocketConfigured,
} from './config';
import {
  getShiprocketToken,
  invalidateShiprocketToken,
} from './auth';
import { ShiprocketRequestOptions } from './types';

/**
 * Reusable server-side client for interacting with protected Shiprocket API endpoints.
 * 
 * Features:
 * - Automatically resolves and attaches Bearer authorization header.
 * - Detects 401 Unauthorized (expired token), invalidates cache, re-authenticates, and retries once.
 * - Strict timeout enforcement.
 * - Sanitized logging and error handling: NEVER prints tokens, passwords, or raw auth headers.
 */
export async function shiprocketRequest<T = unknown>(
  endpoint: string,
  options: ShiprocketRequestOptions = {},
  retryCount = 0
): Promise<T> {
  if (!isShiprocketConfigured()) {
    throw new Error('Shiprocket API credentials are not configured in server environment variables.');
  }

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${SHIPROCKET_API_BASE_URL}${cleanEndpoint}`;
  const method = options.method || 'GET';
  const startTime = Date.now();

  console.log(`[Shiprocket Client] Request: ${method} ${cleanEndpoint} (Attempt: ${retryCount + 1})`);

  // 1. Obtain Bearer token
  let token: string | null = null;
  if (!options.skipAuth) {
    token = await getShiprocketToken();
  }

  // 2. Build headers securely
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(options.headers || {}),
  };

  if (token && !options.skipAuth) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // 3. Prepare abort controller for timeout safety
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SHIPROCKET_DEFAULT_TIMEOUT_MS);

  try {
    const fetchOptions: RequestInit = {
      method,
      body: options.body,
      cache: options.cache,
      credentials: options.credentials,
      integrity: options.integrity,
      keepalive: options.keepalive,
      mode: options.mode,
      redirect: options.redirect,
      referrer: options.referrer,
      referrerPolicy: options.referrerPolicy,
      headers,
      signal: controller.signal,
    };

    const response = await fetch(url, fetchOptions);

    clearTimeout(timeoutId);
    const duration = Date.now() - startTime;

    // 4. Handle 401 Unauthorized (Expired or Invalid Token)
    if (response.status === 401 && retryCount === 0 && !options.skipAuth) {
      console.warn(
        `[Shiprocket Client] Received 401 Unauthorized for ${method} ${cleanEndpoint}. Invalidating cached token and retrying...`
      );
      invalidateShiprocketToken();

      // Force refresh token on next attempt
      await getShiprocketToken(true);
      return shiprocketRequest<T>(endpoint, options, retryCount + 1);
    }

    if (!response.ok) {
      let errorMessage = `Shiprocket API error: HTTP ${response.status} ${response.statusText}`;
      try {
        const errJson = await response.json();
        if (errJson.message) {
          errorMessage = errJson.message;
        } else if (errJson.errors) {
          const first = Object.values(errJson.errors)[0];
          errorMessage = Array.isArray(first) ? first[0] : String(first);
        }
      } catch {
        // Fallback to text if JSON parsing fails
      }

      console.error(
        `[Shiprocket Client] Request failed: ${method} ${cleanEndpoint} (Status: ${response.status}, Time: ${duration}ms): ${errorMessage}`
      );
      throw new Error(`Shiprocket API Error (${response.status}): ${errorMessage}`);
    }

    const data: T = await response.json();
    console.log(
      `[Shiprocket Client] Request succeeded: ${method} ${cleanEndpoint} (Status: 200, Time: ${duration}ms)`
    );
    return data;
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    const duration = Date.now() - startTime;
    const err = error as { name?: string; message?: string };

    if (err.name === 'AbortError') {
      console.error(`[Shiprocket Client] Request timed out for ${method} ${cleanEndpoint} after ${SHIPROCKET_DEFAULT_TIMEOUT_MS}ms`);
      throw new Error(`Shiprocket Request Timeout: The request to ${cleanEndpoint} timed out.`);
    }

    // Re-throw without leaking secrets
    console.error(`[Shiprocket Client] Exception on ${method} ${cleanEndpoint} (${duration}ms):`, err.message || 'Unknown error');
    throw error;
  }
}
