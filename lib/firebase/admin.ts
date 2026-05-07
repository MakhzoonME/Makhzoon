import { App, getApps, initializeApp, cert, ServiceAccount } from 'firebase-admin/app';
import { Firestore, getFirestore } from 'firebase-admin/firestore';
import { Auth, getAuth } from 'firebase-admin/auth';

let _app: App | null = null;
let _db: Firestore | null = null;
let _auth: Auth | null = null;

function getCredential(): ServiceAccount {
  // Preferred: single base64-encoded JSON env var — avoids all newline escaping issues
  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    const json = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8');
    return JSON.parse(json) as ServiceAccount;
  }

  // Fallback: individual env vars
  const raw = process.env.FIREBASE_PRIVATE_KEY ?? '';
  // Strip surrounding quotes some env systems add
  let key = raw.replace(/^["']|["']$/g, '');
  // Normalize escaped newlines
  key = key.replace(/\\n/g, '\n');
  // If still no real newlines, reconstruct from single-line base64 body
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

  const rawLen = raw.length;
  const keyLen = key.length;
  const hasBegin = key.includes('-----BEGIN PRIVATE KEY-----');
  const hasEnd = key.includes('-----END PRIVATE KEY-----');
  const newlineCount = (key.match(/\n/g) || []).length;
  const firstChars = raw.slice(0, 30).replace(/\n/g, '\\n');
  const lastChars = raw.slice(-30).replace(/\n/g, '\\n');

  console.log('[firebase-admin] private key diagnostics', {
    rawLen,
    keyLen,
    hasBegin,
    hasEnd,
    newlineCount,
    firstChars,
    lastChars,
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  });

  return {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: key,
  };
}

function getAdminApp(): App {
  if (!_app) {
    if (getApps().length > 0) {
      _app = getApps()[0];
    } else {
      const credential = getCredential();
      console.log('[firebase-admin] init', {
        source: process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 ? 'base64-json' : 'individual-vars',
        projectId: credential.projectId,
        hasClientEmail: !!credential.clientEmail,
        hasPrivateKey: !!credential.privateKey,
      });
      _app = initializeApp({ credential: cert(credential) });
    }
  }
  return _app;
}

export function getAdminDb(): Firestore {
  if (!_db) {
    _db = getFirestore(getAdminApp());
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
