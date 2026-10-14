import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

const hasFirebaseConfig = Object.values(firebaseConfig).every(Boolean);

if (!hasFirebaseConfig) {
  console.warn('Missing Firebase environment variables. Add VITE_FIREBASE_* values in .env.local to enable authentication.');
}

export const app = hasFirebaseConfig ? getApps().length ? getApps()[0] : initializeApp(firebaseConfig) : null;
export const auth = app ? getAuth(app) : null;
