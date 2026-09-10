import {
  SHIPROCKET_API_BASE_URL,
  SHIPROCKET_AUTH_ENDPOINT,
  SHIPROCKET_DEFAULT_TIMEOUT_MS,
  SHIPROCKET_TOKEN_CACHE_TTL_MS,
  getShiprocketCredentials,
  isShiprocketConfigured,
  maskEmail,
} from './config';
import {
  ShiprocketAuthTestResult,
  ShiprocketLoginResponse,
  ShiprocketTokenCache,
} from './types';

/**
 * Server-side in-memory token cache.
 * Stored on globalThis to preserve cache across development module reloads
 * while avoiding permanent database persistence of ephemeral API tokens.
 */
const globalForShiprocket = globalThis as unknown as {
  shiprocketTokenCache?: ShiprocketTokenCache | null;
};

/**
 * Retrieves cached token from memory if it exists and has not expired.
 */
export function getCachedToken(): ShiprocketTokenCache | null {
  const cache = globalForShiprocket.shiprocketTokenCache;
  if (!cache || !cache.token) {
    return null;
  }

  // Check if token has expired or is within 15 minutes of expiration
  const safetyBufferMs = 15 * 60 * 1000;
  if (Date.now() >= cache.expiresAt - safetyBufferMs) {
    globalForShiprocket.shiprocketTokenCache = null;
    return null;
  }

  return cache;
}

/**
 * Stores token in memory cache with an expiration timestamp.
 */
export function setCachedToken(token: string, email: string, ttlMs = SHIPROCKET_TOKEN_CACHE_TTL_MS): void {
  globalForShiprocket.shiprocketTokenCache = {
    token,
    expiresAt: Date.now() + ttlMs,
    email,
  };
}

/**
 * Manually invalidates the in-memory token cache.
 * Called when a request encounters an HTTP 401 Unauthorized.
 */
export function invalidateShiprocketToken(): void {
  const previousEmail = globalForShiprocket.shiprocketTokenCache?.email;
  globalForShiprocket.shiprocketTokenCache = null;
  console.log(`[Shiprocket Auth] Cached token invalidated for API User: ${maskEmail(previousEmail)}`);
}

/**
 * Authenticates with the official Shiprocket login endpoint:
 * POST https://apiv2.shiprocket.in/v1/external/auth/login
 * 
 * Retrieves and caches the Bearer token.
 * Structured server logging is performed without logging the token or password.
 */
export async function getShiprocketToken(forceRefresh = false): Promise<string> {
  // 1. Return cached token if valid and refresh is not forced
  if (!forceRefresh) {
    const cached = getCachedToken();
    if (cached) {
      return cached.token;
    }
  }

  // 2. Fetch server credentials
  const credentials = getShiprocketCredentials();
  const startTime = Date.now();

  console.log(`[Shiprocket Auth] Requesting authentication token for API User: ${maskEmail(credentials.email)}...`);

  // 3. Prepare abort controller for timeout safety
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SHIPROCKET_DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(`${SHIPROCKET_API_BASE_URL}${SHIPROCKET_AUTH_ENDPOINT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        email: credentials.email,
        password: credentials.password,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const duration = Date.now() - startTime;

    if (!response.ok) {
      let errorMessage = `Shiprocket authentication failed with HTTP status ${response.status}`;
      try {
        const errorData: ShiprocketLoginResponse = await response.json();
        if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.errors) {
          const firstErr = Object.values(errorData.errors)[0];
          errorMessage = Array.isArray(firstErr) ? firstErr[0] : String(firstErr);
        }
      } catch {
        // Fallback to status text
        if (response.statusText) {
          errorMessage = `${errorMessage} (${response.statusText})`;
        }
      }

      console.error(
        `[Shiprocket Auth] Authentication failed for ${maskEmail(credentials.email)} (Status: ${response.status}, Time: ${duration}ms): ${errorMessage}`
      );
      throw new Error(`Shiprocket Authentication Error: ${errorMessage}`);
    }

    const data: ShiprocketLoginResponse = await response.json();

    if (!data.token || typeof data.token !== 'string') {
      console.error(`[Shiprocket Auth] Invalid response structure: missing token in response payload.`);
      throw new Error('Shiprocket Authentication Error: No token received in response.');
    }

    // Cache the token safely in server memory
    setCachedToken(data.token, credentials.email);

    console.log(
      `[Shiprocket Auth] Successfully authenticated API User: ${maskEmail(credentials.email)} (HTTP 200, Time: ${duration}ms). Token cached safely.`
    );

    return data.token;
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    const duration = Date.now() - startTime;
    const err = error as { name?: string; message?: string };

    if (err.name === 'AbortError') {
      console.error(`[Shiprocket Auth] Authentication timed out after ${SHIPROCKET_DEFAULT_TIMEOUT_MS}ms`);
      throw new Error('Shiprocket Authentication Error: Request timed out. Please try again.');
    }

    // Re-throw sanitized error without leaking passwords or internals
    console.error(`[Shiprocket Auth] Exception during authentication (${duration}ms):`, err.message || 'Unknown error');
    throw error;
  }
}

/**
 * Safe server-side health-check to verify Shiprocket credentials and connectivity.
 * Confirms whether authentication succeeds or fails.
 * 
 * NEVER returns the Bearer token or credentials in the output object.
 */
export async function testShiprocketAuth(): Promise<ShiprocketAuthTestResult> {
  if (!isShiprocketConfigured()) {
    return {
      success: false,
      configured: false,
      authenticated: false,
      message: 'Shiprocket API credentials are not configured in server environment variables.',
      error: 'Missing SHIPROCKET_API_EMAIL or SHIPROCKET_API_PASSWORD',
    };
  }

  try {
    // Attempt authentication (forceRefresh = true to ensure live endpoint test)
    await getShiprocketToken(true);
    const cached = getCachedToken();

    return {
      success: true,
      configured: true,
      authenticated: true,
      message: 'Shiprocket API authentication verified successfully. Token acquired and cached safely.',
      apiUser: maskEmail(process.env.SHIPROCKET_API_EMAIL),
      expiresAt: cached ? new Date(cached.expiresAt).toISOString() : undefined,
    };
  } catch (err: unknown) {
    const errorObj = err as { message?: string };
    return {
      success: false,
      configured: true,
      authenticated: false,
      message: 'Shiprocket API authentication test failed.',
      apiUser: maskEmail(process.env.SHIPROCKET_API_EMAIL),
      error: errorObj.message || 'Unknown authentication error',
    };
  }
}
