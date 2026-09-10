try {
  process.loadEnvFile('.env.local');
} catch {}
try {
  process.loadEnvFile('.env');
} catch {}

import {
  isShiprocketConfigured,
  testShiprocketAuth,
  getCachedToken,
  invalidateShiprocketToken,
  getShiprocketToken,
  maskEmail,
} from '../src/lib/shiprocket';

async function runShiprocketVerification() {
  console.log('====================================================');
  console.log('AD(R)IZO Shiprocket API Authentication Verification');
  console.log('====================================================\n');

  // Step 1: Configuration check
  const configured = isShiprocketConfigured();
  console.log(`[Check 1] Is Shiprocket configured in environment? -> ${configured ? 'YES' : 'NO'}`);

  if (!configured) {
    console.log('\nResult: Shiprocket API credentials are not yet set in .env.local.');
    console.log('Please add the following to your .env.local file:');
    console.log('  SHIPROCKET_API_EMAIL="your_dedicated_api_user_email"');
    console.log('  SHIPROCKET_API_PASSWORD="your_dedicated_api_user_password"\n');

    // Verify safe handling when unconfigured
    const testRes = await testShiprocketAuth();
    console.log('[Check 2] Safe unconfigured response test:');
    console.log(JSON.stringify(testRes, null, 2));

    if (!testRes.authenticated && !testRes.configured) {
      console.log('\n[PASS] System safely reports unconfigured status without throwing unhandled exceptions.');
    }
    return;
  }

  const maskedUser = maskEmail(process.env.SHIPROCKET_API_EMAIL);
  console.log(`[Check 2] Testing real authentication with Shiprocket for API user: ${maskedUser}`);

  try {
    // Step 2: Live endpoint test
    const authResult = await testShiprocketAuth();
    console.log('\n[Check 3] Authentication Health-Check Result:');
    console.log(JSON.stringify(authResult, null, 2));

    if (!authResult.authenticated) {
      console.error('\n[FAIL] Authentication failed with Shiprocket API.');
      console.error('Error:', authResult.error);
      return;
    }

    console.log('\n[PASS] Successfully authenticated with Shiprocket API!');

    // Step 3: Verify token caching
    const cached = getCachedToken();
    if (cached && cached.token && cached.token.length > 20) {
      console.log(`[Check 4] In-memory token cache: ACTIVE (Valid until: ${new Date(cached.expiresAt).toISOString()})`);
      console.log('[PASS] Token acquired internally and verified without exposing value.');
    } else {
      console.error('[FAIL] Token cache was not populated.');
    }

    // Step 4: Verify cache hit
    console.log('\n[Check 5] Verifying cache reuse on subsequent call...');
    const token2 = await getShiprocketToken(false);
    if (token2 === cached?.token) {
      console.log('[PASS] Cached token was reused without unnecessary re-authentication.');
    }

    // Step 5: Test invalidation
    console.log('\n[Check 6] Testing manual token invalidation...');
    invalidateShiprocketToken();
    const afterInvalidation = getCachedToken();
    if (!afterInvalidation) {
      console.log('[PASS] Token cache invalidated successfully.');
    }

    console.log('\n====================================================');
    console.log('Phase 1 Shiprocket Authentication Verified Successfully!');
    console.log('====================================================');
  } catch (err: unknown) {
    const errObj = err as { message?: string };
    console.error('\n[ERROR] Unexpected exception during verification:', errObj.message || 'Unknown error');
  }
}

runShiprocketVerification().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
