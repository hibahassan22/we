import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY            ?? "AIzaSyDJdX1lcGLB35TG4FFxkFPxIhJtvpnhyZU",
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN        ?? "drivo-project-6f3fd.firebaseapp.com",
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID         ?? "drivo-project-6f3fd",
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET     ?? "drivo-project-6f3fd.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "961325177377",
  appId:             import.meta.env.VITE_FIREBASE_APP_ID             ?? "1:961325177377:web:3c702f8dd143d08693a160",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db   = getFirestore(app);
export default app;
