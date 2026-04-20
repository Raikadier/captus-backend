/**
 * Firebase Admin SDK — lazy singleton.
 *
 * Requires FIREBASE_SERVICE_ACCOUNT_JSON env var containing the full JSON
 * of your Firebase service account key (as a single-line stringified object),
 * OR FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY
 * as individual env vars (useful for Vercel / Railway secrets).
 */
import { initializeApp, getApps, cert } from 'firebase-admin/app';

let initialized = false;

export function initFirebaseAdmin() {
  if (initialized || getApps().length > 0) return;

  try {
    let credential;

    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      // Full JSON blob (most convenient for local dev with a downloaded key file)
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      credential = cert(serviceAccount);
    } else if (
      process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY
    ) {
      // Individual vars (convenient for CI/CD secrets managers)
      credential = cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // Vercel/Railway encode newlines as \n literals — restore them.
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      });
    } else {
      console.warn('[Firebase Admin] No credentials found — FCM push disabled. Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY.');
      return;
    }

    initializeApp({ credential });
    initialized = true;
    console.info('[Firebase Admin] Initialized ✅');
  } catch (err) {
    console.error('[Firebase Admin] Initialization failed:', err.message);
  }
}
