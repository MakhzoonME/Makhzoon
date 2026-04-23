// Debug helper: inspect org + user state for a given subdomain + email.
// Run: node scripts/check-user.mjs <subdomain> <email>

import { readFileSync } from 'node:fs';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const envFile = readFileSync('.env.local', 'utf8');
for (const line of envFile.split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (!m) continue;
  let [, k, v] = m;
  if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
  if (!process.env[k]) process.env[k] = v;
}

if (getApps().length === 0) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
}

const [subdomain, email] = process.argv.slice(2);
if (!subdomain || !email) {
  console.error('Usage: node scripts/check-user.mjs <subdomain> <email>');
  process.exit(1);
}

const db = getFirestore();
const auth = getAuth();

const orgSnap = await db.collection('organizations').where('subdomain', '==', subdomain).limit(1).get();
if (orgSnap.empty) {
  console.log(`NO ORG with subdomain="${subdomain}"`);
  const all = await db.collection('organizations').get();
  console.log('All orgs:');
  all.docs.forEach((d) => console.log(`  ${d.id}  name=${d.data().name}  subdomain=${d.data().subdomain}`));
} else {
  const org = orgSnap.docs[0];
  console.log(`ORG found: id=${org.id} name=${org.data().name} subdomain=${org.data().subdomain}`);
}

try {
  const u = await auth.getUserByEmail(email);
  console.log(`AUTH user: uid=${u.uid}`);
  console.log(`  emailVerified=${u.emailVerified}  disabled=${u.disabled}`);
  console.log(`  customClaims=${JSON.stringify(u.customClaims)}`);
  const doc = await db.collection('users').doc(u.uid).get();
  if (doc.exists) {
    const d = doc.data();
    console.log(`  users doc: role=${d.role} organizationId=${d.organizationId} displayName=${d.displayName}`);
  } else {
    console.log('  NO users doc');
  }
} catch (err) {
  console.log(`AUTH error: ${err.code ?? err.message}`);
}

process.exit(0);
