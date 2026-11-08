import { env } from './env.js';

let authInstance;

// firebase-admin is imported dynamically on first use. Two reasons:
// 1. Tests inject a fake verifier and must never load firebase-admin (its
//    `jose` dependency is ESM-only, which Jest cannot require).
// 2. A misconfigured deployment fails at first auth call with a clear error
//    instead of crashing unrelated routes.
const loadFirebaseAuth = async () => {
  if (authInstance) {
    return authInstance;
  }

  const { cert, getApps, initializeApp } = await import('firebase-admin/app');
  const { getAuth } = await import('firebase-admin/auth');

  const app =
    getApps()[0] ??
    initializeApp({
      credential: cert({
        projectId: env.FIREBASE_PROJECT_ID,
        clientEmail: env.FIREBASE_CLIENT_EMAIL,
        privateKey: env.FIREBASE_PRIVATE_KEY,
      }),
    });

  authInstance = getAuth(app);
  return authInstance;
};

export const getFirebaseAuth = loadFirebaseAuth;

// The single token-verification dependency the middleware is built around
// (blueprint §14.1: injectable so tests can pass a fake).
export const verifyFirebaseIdToken = async (token, checkRevoked = false) => {
  const auth = await loadFirebaseAuth();
  return auth.verifyIdToken(token, checkRevoked);
};
