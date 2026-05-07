import { App, getApps, initializeApp, cert } from 'firebase-admin/app';
import { Firestore, getFirestore } from 'firebase-admin/firestore';
import { Auth, getAuth } from 'firebase-admin/auth';

let _app: App | null = null;
let _db: Firestore | null = null;
let _auth: Auth | null = null;

function parsePrivateKey(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  // Strip surrounding quotes that some env var systems add
  let key = raw.replace(/^["']|["']$/g, '');
  // Normalize escaped newlines (handles \n and \\n variants)
  key = key.replace(/\\n/g, '\n');
  // If still no real newlines, the key is likely one long line — reconstruct it
  if (!key.includes('\n')) {
    const start = '-----BEGIN PRIVATE KEY-----';
    const end = '-----END PRIVATE KEY-----';
    const startIdx = key.indexOf(start);
    const endIdx = key.indexOf(end);
    if (startIdx !== -1 && endIdx !== -1) {
      const body = key.slice(startIdx + start.length, endIdx).trim().replace(/\s+/g, '\n');
      key = `${start}\n${body}\n${end}\n`;
    }
  }
  return key;
}

function getAdminApp(): App {
  if (!_app) {
    if (getApps().length > 0) {
      _app = getApps()[0];
    } else {
      const privateKey = parsePrivateKey(process.env.FIREBASE_PRIVATE_KEY);
      console.log('[firebase-admin] init', {
        projectId: process.env.FIREBASE_PROJECT_ID,
        hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
        privateKeyLength: privateKey?.length,
        privateKeyValid: privateKey?.includes('BEGIN PRIVATE KEY'),
        privateKeyHasNewlines: privateKey?.includes('\n'),
      });
      _app = initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey,
        }),
      });
    }
  }
  return _app;
}

export function getAdminDb(): Firestore {
  if (!_db) {
    _db = getFirestore(getAdminApp());
    // settings() can only be called once per Firestore instance. Under Next.js HMR the
    // module-scope `_db` cache resets, but the underlying instance from firebase-admin
    // is cached at the App level, so a re-init throws. Swallowing is safe — settings
    // were already applied on first init.
    try {
      _db.settings({ ignoreUndefinedProperties: true });
    } catch (err) {
      if (!(err instanceof Error) || !/already.*initialized|once/i.test(err.message)) throw err;
    }
  }
  return _db;
}

export function getAdminAuth(): Auth {
  if (!_auth) _auth = getAuth(getAdminApp());
  return _auth;
}

export const adminDb = new Proxy({} as Firestore, {
  get(_target, prop) {
    return (getAdminDb() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export const adminAuth = new Proxy({} as Auth, {
  get(_target, prop) {
    return (getAdminAuth() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
