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
import {
  getCircuitBreakerStatus,
  recordCircuitBreakerFailure,
  recordCircuitBreakerSuccess,
} from './circuit-breaker';
import { prisma } from '../prisma';

const SHIPROCKET_TOKEN_SETTING_KEY = 'shiprocket_token_cache';

/**
 * Server-side in-memory token cache.
 * Stored on globalThis to preserve cache across development module reloads
 * and in-process execution.
 */
const globalForShiprocket = globalThis as unknown as {
  shiprocketTokenCache?: ShiprocketTokenCache | null;
  authInFlightPromise?: Promise<string> | null;
};

/**
 * Retrieves cached token from memory or MongoDB StoreSetting.
 * Preserves a 15-minute buffer before nominal expiration to guarantee safety.
 */
export async function getCachedToken(): Promise<ShiprocketTokenCache | null> {
  const safetyBufferMs = 15 * 60 * 1000;
  const now = Date.now();

  // 1. Check in-memory global cache (< 1ms)
  const memCache = globalForShiprocket.shiprocketTokenCache;
  if (memCache && memCache.token && now < memCache.expiresAt - safetyBufferMs) {
    return memCache;
  }

  // 2. Check persistent shared cache in MongoDB StoreSetting
  // This allows token reuse across multiple serverless lambda instances and workers
  try {
    const record = await prisma.storeSetting.findUnique({
      where: { key: SHIPROCKET_TOKEN_SETTING_KEY },
    });

    if (record && record.value) {
      const parsed = JSON.parse(record.value) as ShiprocketTokenCache;
      if (parsed.token && now < parsed.expiresAt - safetyBufferMs) {
        // Hydrate in-memory cache
        globalForShiprocket.shiprocketTokenCache = parsed;
        return parsed;
      }
    }
  } catch (dbErr) {
    // Non-fatal database read warning
  }

  return null;
}

/**
 * Stores token in memory cache and persists to MongoDB StoreSetting.
 */
export async function setCachedToken(
  token: string,
  email: string,
  ttlMs = SHIPROCKET_TOKEN_CACHE_TTL_MS
): Promise<void> {
  const cacheData: ShiprocketTokenCache = {
    token,
    expiresAt: Date.now() + ttlMs,
    email,
  };

  // 1. In-memory cache
  globalForShiprocket.shiprocketTokenCache = cacheData;

  // 2. Persistent MongoDB StoreSetting
  try {
    await prisma.storeSetting.upsert({
      where: { key: SHIPROCKET_TOKEN_SETTING_KEY },
      update: {
        value: JSON.stringify(cacheData),
        updatedAt: new Date(),
      },
      create: {
        key: SHIPROCKET_TOKEN_SETTING_KEY,
        value: JSON.stringify(cacheData),
      },
    });
  } catch (dbErr) {
    console.warn('[Shiprocket Auth DB Token Persistence Warning]:', dbErr);
  }
}

/**
 * Manually invalidates the token cache in both memory and MongoDB.
 * Called when a request encounters an HTTP 401 Unauthorized.
 */
export async function invalidateShiprocketToken(): Promise<void> {
  const previousEmail = globalForShiprocket.shiprocketTokenCache?.email;
  globalForShiprocket.shiprocketTokenCache = null;

  try {
    await prisma.storeSetting.delete({
      where: { key: SHIPROCKET_TOKEN_SETTING_KEY },
    }).catch(() => null);
  } catch {}

  console.log(`[Shiprocket Auth] Cached token invalidated for API User: ${maskEmail(previousEmail)}`);
}

/**
 * Authenticates with the official Shiprocket login endpoint:
 * POST https://apiv2.shiprocket.in/v1/external/auth/login
 * 
 * Safety & Resilience:
 * 1. Circuit Breaker Guard: If account is locked or in cooldown, fails fast without network calls.
 * 2. Token Reuse: Reuses shared valid token across serverless instances before attempting login.
 * 3. Single-Flight Concurrency: Concurrent callers await the same in-flight authentication promise.
 * 4. Lockout Prevention: Catches 403 / "User blocked" and trips circuit breaker for 2 hours.
 * 5. Structured Sanitized Logging: NEVER prints passwords, secrets, or raw bearer tokens.
 */
export async function getShiprocketToken(forceRefresh = false): Promise<string> {
  // 1. Check cached token if refresh is not forced
  if (!forceRefresh) {
    const cached = await getCachedToken();
    if (cached) {
      return cached.token;
    }
  }

  // 2. Check Circuit Breaker before making ANY external network call
  const breaker = await getCircuitBreakerStatus();
  if (breaker.isBlocked) {
    const blockMsg = breaker.message || 
      `Shiprocket authentication is temporarily blocked. Automatic retries are paused to protect your account. Verify API credentials and retry after access is restored (${breaker.remainingMinutes}m remaining).`;
    console.warn(`[Shiprocket Auth Guard] Request blocked by circuit breaker: ${blockMsg}`);
    throw new Error(blockMsg);
  }

  // 3. Single-Flight Concurrency: If an auth request is currently in-flight, await it
  if (globalForShiprocket.authInFlightPromise) {
    console.log('[Shiprocket Auth] In-flight login request in progress. Awaiting shared promise...');
    return globalForShiprocket.authInFlightPromise;
  }

  // 4. Initiate single-flight authentication
  globalForShiprocket.authInFlightPromise = (async () => {
    const credentials = getShiprocketCredentials();
    const startTime = Date.now();

    console.log(`[Shiprocket Auth] Requesting authentication token for API User: ${maskEmail(credentials.email)}...`);

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

      // Extract explicit retry-after header if provided by Shiprocket
      const retryAfterHeader = response.headers.get('retry-after');
      const retryAfterSec = retryAfterHeader ? parseInt(retryAfterHeader, 10) : undefined;

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
          if (response.statusText) {
            errorMessage = `${errorMessage} (${response.statusText})`;
          }
        }

        console.error(
          `[Shiprocket Auth] Authentication failed for ${maskEmail(credentials.email)} (Status: ${response.status}, Time: ${duration}ms): ${errorMessage}`
        );

        // Trip circuit breaker to prevent retry storm and lockouts
        await recordCircuitBreakerFailure(errorMessage, response.status, retryAfterSec);

        throw new Error(`Shiprocket Authentication Error: ${errorMessage}`);
      }

      const data: ShiprocketLoginResponse = await response.json();

      if (!data.token || typeof data.token !== 'string') {
        console.error(`[Shiprocket Auth] Invalid response structure: missing token in response payload.`);
        await recordCircuitBreakerFailure('Missing token in response', 500);
        throw new Error('Shiprocket Authentication Error: No token received in response.');
      }

      // Cache token safely in memory and MongoDB
      await setCachedToken(data.token, credentials.email);

      // Record healthy authentication in circuit breaker
      await recordCircuitBreakerSuccess();

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
        await recordCircuitBreakerFailure('Request timed out', 408);
        throw new Error('Shiprocket Authentication Error: Request timed out. Please try again.');
      }

      console.error(`[Shiprocket Auth] Exception during authentication (${duration}ms):`, err.message || 'Unknown error');
      throw error;
    } finally {
      globalForShiprocket.authInFlightPromise = null;
    }
  })();

  return globalForShiprocket.authInFlightPromise;
}

/**
 * Safe server-side health-check to verify Shiprocket credentials and connectivity.
 * 
 * Safety:
 * - Checks circuit breaker first. If locked or in cooldown, returns honest blocked status
 *   WITHOUT calling the external API.
 * - allowProbe = true permits 1 controlled probe if the administrator explicitly requests it.
 * - NEVER exposes the Bearer token, password, or sensitive internal credentials.
 */
export async function testShiprocketAuth(allowProbe = false): Promise<ShiprocketAuthTestResult> {
  if (!isShiprocketConfigured()) {
    return {
      success: false,
      configured: false,
      authenticated: false,
      message: 'Shiprocket API credentials are not configured in server environment variables.',
      error: 'Missing SHIPROCKET_API_EMAIL or SHIPROCKET_API_PASSWORD',
    };
  }

  // 1. Check circuit breaker state first
  const breaker = await getCircuitBreakerStatus();
  if (breaker.isBlocked && !allowProbe) {
    return {
      success: false,
      configured: true,
      authenticated: false,
      isBlocked: true,
      lockoutUntil: breaker.lockoutUntil,
      remainingMinutes: breaker.remainingMinutes,
      message: breaker.message || 'Shiprocket authentication is temporarily blocked to protect your account.',
      apiUser: maskEmail(process.env.SHIPROCKET_API_EMAIL),
      error: breaker.lastError || 'Account locked or cooling down due to previous failed attempts.',
    };
  }

  try {
    // Attempt authentication (forceRefresh = true to ensure live endpoint test)
    await getShiprocketToken(true);
    const cached = await getCachedToken();

    return {
      success: true,
      configured: true,
      authenticated: true,
      isBlocked: false,
      message: 'Shiprocket API authentication verified successfully. Token acquired and cached safely.',
      apiUser: maskEmail(process.env.SHIPROCKET_API_EMAIL),
      expiresAt: cached ? new Date(cached.expiresAt).toISOString() : undefined,
    };
  } catch (err: unknown) {
    const errorObj = err as { message?: string };
    const latestBreaker = await getCircuitBreakerStatus();

    return {
      success: false,
      configured: true,
      authenticated: false,
      isBlocked: latestBreaker.isBlocked,
      lockoutUntil: latestBreaker.lockoutUntil,
      remainingMinutes: latestBreaker.remainingMinutes,
      message: latestBreaker.message || 'Shiprocket API authentication test failed.',
      apiUser: maskEmail(process.env.SHIPROCKET_API_EMAIL),
      error: errorObj.message || 'Unknown authentication error',
    };
  }
}
