import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyAxWcl41GMvjIp5wU3tg5UGBszTGdGnYZI',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'oriente-auth.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'oriente-auth',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'oriente-auth.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '749576006943',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:749576006943:web:cc72a4fab0fdf4ffed542a',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-M4SKX0KTZK'
};

export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

