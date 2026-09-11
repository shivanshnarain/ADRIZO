import { createRemoteJWKSet, jwtVerify } from 'jose';

// Google Firebase public keys endpoint
const FIREBASE_JWKS_URL = new URL(
  'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'
);

const remoteJWKSet = createRemoteJWKSet(FIREBASE_JWKS_URL);

export interface VerifiedFirebaseToken {
  uid: string;
  phone_number?: string;
  email?: string;
  name?: string;
}

/**
 * Validates a Firebase client ID token securely using Google's public JWK certificates.
 * No service-account JSON or private server credentials needed!
 */
export async function verifyFirebaseIdToken(
  idToken: string
): Promise<VerifiedFirebaseToken | null> {
  try {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (!projectId) {
      console.error('[Firebase Token Verification] NEXT_PUBLIC_FIREBASE_PROJECT_ID is not configured');
      return null;
    }

    const { payload } = await jwtVerify(idToken, remoteJWKSet, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
    });

    if (!payload.sub) {
      return null;
    }

    return {
      uid: payload.sub,
      phone_number: payload.phone_number as string | undefined,
      email: payload.email as string | undefined,
      name: payload.name as string | undefined,
    };
  } catch (error: any) {
    console.error('[Firebase ID Token Verification Failed]:', error.message || error);
    return null;
  }
}
