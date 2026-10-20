import { prisma } from '../prisma';
import { maskEmail } from './config';

export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';
export type CircuitBreakerFailureType = 'ACCOUNT_LOCKED' | 'INVALID_CREDENTIALS' | 'RATE_LIMITED' | 'NETWORK_ERROR' | 'NONE';

export interface ShiprocketCircuitBreakerData {
  state: CircuitBreakerState;
  lastFailureTime: number;
  consecutiveFailures: number;
  lockoutUntil: number;
  lastError: string;
  failureType: CircuitBreakerFailureType;
  apiUserMasked: string;
  updatedAt: string;
}

export interface CircuitBreakerStatus {
  state: CircuitBreakerState;
  isBlocked: boolean;
  lockoutUntil: number;
  remainingSeconds: number;
  remainingMinutes: number;
  consecutiveFailures: number;
  lastError: string;
  failureType: CircuitBreakerFailureType;
  lastFailureTime: number;
  apiUserMasked: string;
  message?: string;
}

const CIRCUIT_BREAKER_SETTING_KEY = 'shiprocket_circuit_breaker';

// Default durations
export const SHIPROCKET_LOCKOUT_2HR_MS = 2 * 60 * 60 * 1000; // 2 hours official Shiprocket account lockout window
export const SHIPROCKET_CREDENTIAL_BACKOFF_1_MS = 5 * 60 * 1000; // 5 min
export const SHIPROCKET_CREDENTIAL_BACKOFF_2_MS = 15 * 60 * 1000; // 15 min
export const SHIPROCKET_CREDENTIAL_BACKOFF_3_MS = 60 * 60 * 1000; // 1 hr proactive pause

// In-memory cache for ultra-fast check (< 1ms)
let cachedBreaker: {
  data: ShiprocketCircuitBreakerData;
  timestamp: number;
} | null = null;
const BREAKER_CACHE_TTL_MS = 5 * 1000; // 5 seconds cache

function getDefaultBreakerData(): ShiprocketCircuitBreakerData {
  return {
    state: 'CLOSED',
    lastFailureTime: 0,
    consecutiveFailures: 0,
    lockoutUntil: 0,
    lastError: '',
    failureType: 'NONE',
    apiUserMasked: maskEmail(process.env.SHIPROCKET_API_EMAIL || process.env.SHIPROCKET_EMAIL),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Reads circuit breaker state from memory or MongoDB StoreSetting.
 */
export async function getCircuitBreakerStatus(): Promise<CircuitBreakerStatus> {
  const now = Date.now();

  // 1. Check in-memory cache
  let data: ShiprocketCircuitBreakerData | null = null;
  if (cachedBreaker && (now - cachedBreaker.timestamp < BREAKER_CACHE_TTL_MS)) {
    data = cachedBreaker.data;
  }

  // 2. Query MongoDB if not cached
  if (!data) {
    try {
      const record = await prisma.storeSetting.findUnique({
        where: { key: CIRCUIT_BREAKER_SETTING_KEY },
      });
      if (record && record.value) {
        data = JSON.parse(record.value) as ShiprocketCircuitBreakerData;
      }
    } catch (dbErr) {
      // Fallback to memory
      data = cachedBreaker ? cachedBreaker.data : null;
    }
  }

  if (!data) {
    data = getDefaultBreakerData();
  }

  // 3. Evaluate state against current time
  let state = data.state;
  let isBlocked = false;
  let remainingSeconds = 0;

  if (state === 'OPEN') {
    if (now < data.lockoutUntil) {
      isBlocked = true;
      remainingSeconds = Math.max(1, Math.ceil((data.lockoutUntil - now) / 1000));
    } else {
      // Cooldown expired -> automatically transition to HALF_OPEN for 1 controlled probe attempt
      state = 'HALF_OPEN';
    }
  }

  // Update in-memory cache
  cachedBreaker = {
    data: { ...data, state },
    timestamp: now,
  };

  const remainingMinutes = Math.ceil(remainingSeconds / 60);

  let message: string | undefined = undefined;
  if (isBlocked) {
    if (data.failureType === 'ACCOUNT_LOCKED') {
      message = `Shiprocket access is temporarily locked after repeated failed login attempts. Automatic retries have been paused. Verify the API User credentials and wait until access is restored before retrying (${remainingMinutes}m remaining).`;
    } else {
      message = `Shiprocket authentication is temporarily blocked. Automatic retries are paused to protect your account. Verify API credentials and retry after access is restored (${remainingMinutes}m remaining).`;
    }
  }

  return {
    state,
    isBlocked,
    lockoutUntil: data.lockoutUntil,
    remainingSeconds,
    remainingMinutes,
    consecutiveFailures: data.consecutiveFailures || 0,
    lastError: data.lastError,
    failureType: data.failureType,
    lastFailureTime: data.lastFailureTime,
    apiUserMasked: data.apiUserMasked || maskEmail(process.env.SHIPROCKET_API_EMAIL || process.env.SHIPROCKET_EMAIL),
    message,
  };
}

/**
 * Checks whether automated background sync, webhooks, or scheduled jobs
 * are allowed to attempt Shiprocket synchronization.
 * Strictly requires the circuit breaker to be fully CLOSED (healthy).
 */
export function isAutomatedSyncAllowed(status: CircuitBreakerStatus): boolean {
  return !status.isBlocked && status.state === 'CLOSED';
}

/**
 * Records an authentication failure and opens the circuit breaker
 * to prevent retry storms and repeated lockouts.
 */
export async function recordCircuitBreakerFailure(
  errorMessage: string,
  statusCode?: number,
  retryAfterSeconds?: number
): Promise<ShiprocketCircuitBreakerData> {
  const now = Date.now();
  const lowerErr = (errorMessage || '').toLowerCase();
  const currentStatus = await getCircuitBreakerStatus();
  const consecutiveFailures = currentStatus.consecutiveFailures + 1;

  let failureType: CircuitBreakerFailureType = 'INVALID_CREDENTIALS';
  let cooldownMs = SHIPROCKET_CREDENTIAL_BACKOFF_1_MS;

  // Detect confirmed Account Lockout (2 hours cooldown)
  const isLockout = 
    lowerErr.includes('blocked') || 
    lowerErr.includes('too many failed') || 
    lowerErr.includes('account access was temporarily locked') ||
    lowerErr.includes('locked for') ||
    lowerErr.includes('temporarily locked') ||
    lowerErr.includes('try again after') ||
    lowerErr.includes('user is inactive') ||
    lowerErr.includes('user blocked') ||
    statusCode === 429;

  if (isLockout) {
    failureType = 'ACCOUNT_LOCKED';
    cooldownMs = retryAfterSeconds ? (retryAfterSeconds * 1000) : SHIPROCKET_LOCKOUT_2HR_MS;
  } else if (
    statusCode === 403 || 
    statusCode === 401 || 
    lowerErr.includes('invalid email and password') ||
    lowerErr.includes('invalid credentials') ||
    lowerErr.includes('unauthorized')
  ) {
    failureType = 'INVALID_CREDENTIALS';
    // Exponential backoff to avoid reaching Shiprocket's hard lockout limit
    if (consecutiveFailures === 1) {
      cooldownMs = SHIPROCKET_CREDENTIAL_BACKOFF_1_MS; // 5 min
    } else if (consecutiveFailures === 2) {
      cooldownMs = SHIPROCKET_CREDENTIAL_BACKOFF_2_MS; // 15 min
    } else {
      cooldownMs = SHIPROCKET_CREDENTIAL_BACKOFF_3_MS; // 1 hr proactive pause
    }
  } else {
    failureType = 'NETWORK_ERROR';
    cooldownMs = 60 * 1000; // 1 min network jitter pause
  }

  const lockoutUntil = now + cooldownMs;
  const breakerData: ShiprocketCircuitBreakerData = {
    state: 'OPEN',
    lastFailureTime: now,
    consecutiveFailures,
    lockoutUntil,
    lastError: errorMessage,
    failureType,
    apiUserMasked: maskEmail(process.env.SHIPROCKET_API_EMAIL || process.env.SHIPROCKET_EMAIL),
    updatedAt: new Date(now).toISOString(),
  };

  // 1. Update in-memory cache
  cachedBreaker = {
    data: breakerData,
    timestamp: now,
  };

  // 2. Persist to MongoDB StoreSetting
  try {
    await prisma.storeSetting.upsert({
      where: { key: CIRCUIT_BREAKER_SETTING_KEY },
      update: {
        value: JSON.stringify(breakerData),
        updatedAt: new Date(),
      },
      create: {
        key: CIRCUIT_BREAKER_SETTING_KEY,
        value: JSON.stringify(breakerData),
      },
    });
  } catch (dbErr) {
    console.warn('[Circuit Breaker DB Persistence Warning]:', dbErr);
  }

  console.warn(
    `[Shiprocket Circuit Breaker] State -> OPEN. Type: ${failureType}. Consecutive: ${consecutiveFailures}. Lockout until: ${new Date(lockoutUntil).toISOString()} (${Math.ceil(cooldownMs / 60000)} min cooldown). Error: ${errorMessage}`
  );

  return breakerData;
}

/**
 * Records a successful authentication, resetting the circuit breaker to CLOSED.
 */
export async function recordCircuitBreakerSuccess(): Promise<void> {
  const now = Date.now();
  const breakerData: ShiprocketCircuitBreakerData = {
    state: 'CLOSED',
    lastFailureTime: 0,
    consecutiveFailures: 0,
    lockoutUntil: 0,
    lastError: '',
    failureType: 'NONE',
    apiUserMasked: maskEmail(process.env.SHIPROCKET_API_EMAIL || process.env.SHIPROCKET_EMAIL),
    updatedAt: new Date(now).toISOString(),
  };

  cachedBreaker = {
    data: breakerData,
    timestamp: now,
  };

  try {
    await prisma.storeSetting.upsert({
      where: { key: CIRCUIT_BREAKER_SETTING_KEY },
      update: {
        value: JSON.stringify(breakerData),
        updatedAt: new Date(),
      },
      create: {
        key: CIRCUIT_BREAKER_SETTING_KEY,
        value: JSON.stringify(breakerData),
      },
    });
  } catch (dbErr) {
    console.warn('[Circuit Breaker DB Success Warning]:', dbErr);
  }

  console.log('[Shiprocket Circuit Breaker] State -> CLOSED (Auth healthy, failure counter reset).');
}

/**
 * Manually resets or clears the circuit breaker (e.g. admin has verified credentials
 * or external lock period has elapsed). Allows 1 probe attempt (HALF_OPEN).
 * 
 * Safety:
 * Rejects reset if external Shiprocket account is actively locked, unless force is explicitly set.
 */
export async function resetCircuitBreaker(
  reason = 'Admin manual reset',
  options: { force?: boolean } = {}
): Promise<{ success: boolean; message: string; blocked?: boolean }> {
  const current = await getCircuitBreakerStatus();
  const now = Date.now();

  // If external account lockout is active and not forced, refuse bypass
  if (current.isBlocked && current.failureType === 'ACCOUNT_LOCKED' && !options.force) {
    const remainingMins = current.remainingMinutes || 1;
    const msg = `Shiprocket external account lockout is currently active (~${remainingMins}m remaining). Resetting the circuit breaker locally cannot bypass external Shiprocket lockout and will result in further failed attempts. Please wait until the cooldown window expires.`;
    console.warn(`[Shiprocket Circuit Breaker] Reset rejected: ${msg}`);
    return {
      success: false,
      blocked: true,
      message: msg,
    };
  }

  const breakerData: ShiprocketCircuitBreakerData = {
    state: 'HALF_OPEN',
    lastFailureTime: 0,
    consecutiveFailures: 0,
    lockoutUntil: 0,
    lastError: '',
    failureType: 'NONE',
    apiUserMasked: maskEmail(process.env.SHIPROCKET_API_EMAIL || process.env.SHIPROCKET_EMAIL),
    updatedAt: new Date(now).toISOString(),
  };

  cachedBreaker = {
    data: breakerData,
    timestamp: now,
  };

  try {
    await prisma.storeSetting.upsert({
      where: { key: CIRCUIT_BREAKER_SETTING_KEY },
      update: {
        value: JSON.stringify(breakerData),
        updatedAt: new Date(),
      },
      create: {
        key: CIRCUIT_BREAKER_SETTING_KEY,
        value: JSON.stringify(breakerData),
      },
    });
  } catch (dbErr) {
    console.warn('[Circuit Breaker DB Reset Warning]:', dbErr);
  }

  console.log(`[Shiprocket Circuit Breaker] Reset to HALF_OPEN (${reason}). Ready for 1 controlled attempt.`);
  return {
    success: true,
    message: 'Circuit breaker reset to HALF_OPEN. You may perform 1 controlled authentication probe.',
  };
}
