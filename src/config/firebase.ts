import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDlNao8OE8JPQ2p2VCR9VfgkxGMKKMXUTA",
  authDomain: "xxxtremo-dev.firebaseapp.com",
  projectId: "xxxtremo-dev",
  storageBucket: "xxxtremo-dev.firebasestorage.app",
  messagingSenderId: "260809516692",
  appId: "1:260809516692:web:3769ee700fb8d5211fb681",
  measurementId: "G-494TZMC047"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

// Initialize Analytics (optional)
// export const analytics = getAnalytics(app);

export default app;
