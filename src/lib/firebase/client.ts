// Client-side Firebase — browser only.

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, initializeRecaptchaConfig, type Auth } from "firebase/auth";
import { initializeAppCheck, getToken, ReCaptchaEnterpriseProvider, type AppCheck } from "firebase/app-check";
import { getFirestore, type Firestore } from "firebase/firestore";

const config = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseConfigured = !!(config.apiKey && config.authDomain && config.projectId);

/** reCAPTCHA Enterprise site key: turns on App Check and bot protection for email sign-up when set. */
const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

let app: FirebaseApp | null = null;
let appCheck: AppCheck | null = null;

function firebaseApp(): FirebaseApp {
  if (!firebaseConfigured) {
    throw new Error("Firebase is not configured. Set the NEXT_PUBLIC_FIREBASE_* environment variables.");
  }
  if (!app) {
    app = getApps().length ? getApp() : initializeApp(config);
    if (RECAPTCHA_SITE_KEY && typeof window !== "undefined") {
      appCheck = initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(RECAPTCHA_SITE_KEY), isTokenAutoRefreshEnabled: true });
      // reCAPTCHA protection for email/password sign-up (when enabled in Firebase Auth settings)
      initializeRecaptchaConfig(getAuth(app)).catch(() => {});
    }
  }
  return app;
}

/** App Check token for our own API routes, or null when App Check isn't set up. */
export async function appCheckToken(): Promise<string | null> {
  firebaseApp();
  if (!appCheck) return null;
  try {
    return (await getToken(appCheck)).token;
  } catch {
    return null;
  }
}

export const clientAuth = (): Auth => getAuth(firebaseApp());
export const clientDb = (): Firestore => getFirestore(firebaseApp());
