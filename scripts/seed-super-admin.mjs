// One-time seed: create (or update) a super_admin user.
// Run with: node scripts/seed-super-admin.mjs <email> <password>
// Requires FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY in .env.local.

import { readFileSync } from 'node:fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const envFile = readFileSync('.env.local', 'utf8');
for (const line of envFile.split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (!m) continue;
  let [, k, v] = m;
  if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
  if (!process.env[k]) process.env[k] = v;
}

const [email, password] = process.argv.slice(2);
if (!email || !password) {
  console.error('Usage: node scripts/seed-super-admin.mjs <email> <password>');
  process.exit(1);
}

const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;
if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
  console.error('Missing FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY in .env.local.');
  process.exit(1);
}

initializeApp({
  credential: cert({
    projectId: FIREBASE_PROJECT_ID,
    clientEmail: FIREBASE_CLIENT_EMAIL,
    privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  }),
});

const auth = getAuth();
const db = getFirestore();

let user;
try {
  user = await auth.getUserByEmail(email);
  await auth.updateUser(user.uid, { password });
  console.log(`Found existing user ${email} — password updated.`);
} catch (err) {
  if (err?.code === 'auth/user-not-found') {
    user = await auth.createUser({ email, password, emailVerified: true });
    console.log(`Created new user ${email}.`);
  } else {
    throw err;
  }
}

await auth.setCustomUserClaims(user.uid, { role: 'super_admin' });
console.log('Set role=super_admin claim.');

await db.collection('users').doc(user.uid).set({
  id: user.uid,
  email,
  name: 'Super Admin',
  role: 'super_admin',
  organizationId: null,
  createdAt: FieldValue.serverTimestamp(),
  updatedAt: FieldValue.serverTimestamp(),
}, { merge: true });
console.log('Wrote users/' + user.uid + ' doc.');

console.log('\nDone. Sign in with:\n  email:    ' + email + '\n  password: ' + password);
console.log('\nNOTE: If you were already signed in, sign out and back in so the new claim is in your token.');
process.exit(0);
