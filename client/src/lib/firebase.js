import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyD-0xcRge58JKzg7AjlvQTVYkcZVBnpTxw',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'baber-company.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'baber-company',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'baber-company.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '819715122405',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:819715122405:web:608c01039f5c5eb7e0a00c',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || ''
};

export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);

export const googleProvider = new GoogleAuthProvider();

