import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { getAuth } from 'firebase-admin/auth';

// Dev project credentials are stored in Secret Manager under DEV_SERVICE_ACCOUNT_JSON.
// Each trigger that needs the dev app declares the secret in its runtime options.
function devApp() {
  const existing = getApps().find((a) => a.name === 'dev');
  if (existing) return existing;

  const raw = process.env.DEV_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('DEV_SERVICE_ACCOUNT_JSON secret missing');
  const sa = JSON.parse(raw) as { project_id: string; client_email: string; private_key: string };

  return initializeApp(
    {
      credential: cert({
        projectId: sa.project_id,
        clientEmail: sa.client_email,
        privateKey: sa.private_key,
      }),
      projectId: sa.project_id,
      storageBucket: `${sa.project_id}.appspot.com`,
    },
    'dev',
  );
}

export const devDb = () => getFirestore(devApp());
export const devStorage = () => getStorage(devApp());
export const devAuth = () => getAuth(devApp());
export const devProjectId = () => {
  const raw = process.env.DEV_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try { return (JSON.parse(raw) as { project_id: string }).project_id; } catch { return null; }
};

// Local default app — uses the prod project's Application Default Credentials at runtime.
function prodApp() {
  return getApps().find((a) => a.name === '[DEFAULT]') ?? initializeApp();
}
export const prodDb = () => getFirestore(prodApp());
export const prodStorage = () => getStorage(prodApp());
