import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

export type { FirebaseApp, Auth, Firestore, FirebaseStorage };

export const REQUIRED_FIREBASE_ENV_VARS = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
] as const;

export function getMissingFirebaseEnvVars(): string[] {
  return REQUIRED_FIREBASE_ENV_VARS.filter((key) => {
    const val = process.env[key];
    return !val || typeof val !== 'string' || val.trim().length === 0;
  });
}

export function isFirebaseConfigured(): boolean {
  return getMissingFirebaseEnvVars().length === 0;
}

export function getFirebaseConfig() {
  const missing = getMissingFirebaseEnvVars();
  if (missing.length > 0) {
    throw new Error(
      `[Firebase Configuration Error]: Cannot initialize Firebase app. Missing required environment variable(s): ${missing.join(', ')}`
    );
  }
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
  };
}

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _storage: FirebaseStorage | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (getApps().length > 0) {
    return getApp();
  }
  if (_app) {
    return _app;
  }
  const config = getFirebaseConfig();
  _app = initializeApp(config);
  return _app;
}

export function getFirebaseAuth(): Auth {
  if (!_auth) {
    const appInstance = getFirebaseApp();
    _auth = getAuth(appInstance);
  }
  return _auth;
}

export function getFirebaseDb(): Firestore {
  if (!_db) {
    const appInstance = getFirebaseApp();
    _db = getFirestore(appInstance);
  }
  return _db;
}

export function getFirebaseStorage(): FirebaseStorage {
  if (!_storage) {
    const appInstance = getFirebaseApp();
    _storage = getStorage(appInstance);
  }
  return _storage;
}

/**
 * Lazy proxy helper to prevent eager initialization at module evaluation time.
 * This guarantees that Next.js build-time route scanning and page-data collection
 * compile successfully without throwing premature FirebaseError (e.g. auth/invalid-api-key).
 * When an actual Firebase operation is executed at runtime without valid configuration,
 * it will throw a descriptive diagnostic identifying the missing environment variable names.
 */
function createLazyServiceProxy<T extends object>(serviceName: string, getter: () => T): T {
  return new Proxy({} as T, {
    get(_target, prop, receiver) {
      const instance = getter();
      const value = Reflect.get(instance, prop, instance);
      if (typeof value === 'function') {
        return value.bind(instance);
      }
      return value;
    },
    has(_target, prop) {
      return Reflect.has(getter(), prop);
    },
    getPrototypeOf(_target) {
      return Reflect.getPrototypeOf(getter());
    },
    set(_target, prop, value) {
      return Reflect.set(getter(), prop, value);
    },
    deleteProperty(_target, prop) {
      return Reflect.deleteProperty(getter(), prop);
    },
    ownKeys(_target) {
      return Reflect.ownKeys(getter());
    },
    getOwnPropertyDescriptor(_target, prop) {
      return Reflect.getOwnPropertyDescriptor(getter(), prop);
    },
  });
}

export const app: FirebaseApp = createLazyServiceProxy('app', getFirebaseApp);
export const auth: Auth = createLazyServiceProxy('auth', getFirebaseAuth);
export const db: Firestore = createLazyServiceProxy('db', getFirebaseDb);
export const storage: FirebaseStorage = createLazyServiceProxy('storage', getFirebaseStorage);
