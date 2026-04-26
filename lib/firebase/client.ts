import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// initializeApp itself is safe; getAuth/getFirestore may throw during build-time
// prerender when NEXT_PUBLIC_ vars are absent. At runtime in the browser the
// vars are always baked in, so auth/db will be valid instances.
const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;
try {
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
} catch {
  auth = null as unknown as Auth;
  db = null as unknown as Firestore;
  storage = null as unknown as FirebaseStorage;
}

export { auth, db, storage };
export default app;
