"use client";

// Firebase client initialization for Phone Authentication.
//
// Phone Auth is a client-side flow: this file boots the Firebase app in the
// browser so the login page can run reCAPTCHA + signInWithPhoneNumber. The
// backend only verifies the resulting ID token (see backend/app/firebase_auth.py).
//
// The NEXT_PUBLIC_FIREBASE_* values are the public Firebase web config. They are
// safe to expose client-side (this is Firebase's documented model): access is
// gated by Firebase's Authorized Domains + reCAPTCHA, not by secrecy of these
// values. When NEXT_PUBLIC_FIREBASE_API_KEY is absent, isFirebaseConfigured() is
// false and the login page falls back to the MSG91 phone OTP flow.

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = (): boolean =>
  Boolean(firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId);

let cachedAuth: Auth | null = null;

// Lazily initialise and return the Firebase Auth instance, or null when the
// public config is not present. Safe to call repeatedly (app is reused).
export const getFirebaseAuth = (): Auth | null => {
  if (!isFirebaseConfigured()) return null;
  if (cachedAuth) return cachedAuth;
  const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
  cachedAuth = getAuth(app);
  return cachedAuth;
};
