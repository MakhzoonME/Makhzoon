import { readFileSync } from 'node:fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const envFile = readFileSync('.env.local', 'utf8');
for (const line of envFile.split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (!m) continue;
  let [, k, v] = m;
  if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
  if (!process.env[k]) process.env[k] = v;
}

initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  }),
});

const db = getFirestore();

const orgsSnap = await db.collection('organizations').get();
console.log(`Orgs (${orgsSnap.size}):`);
for (const d of orgsSnap.docs) {
  const data = d.data();
  console.log(`  ${d.id}  name=${data.name}  subdomain=${data.subdomain}`);
}

const orgId = process.argv[2] || orgsSnap.docs.find((d) => d.data().name === 'qqqq' || d.data().subdomain === 'qqqq')?.id;
if (!orgId) { console.error('No target org'); process.exit(1); }
console.log(`\nTarget orgId: ${orgId}`);

const assetsSnap = await db.collection('assets').where('organizationId', '==', orgId).get();
console.log(`\nAssets for org (${assetsSnap.size}):`);
for (const d of assetsSnap.docs.slice(0, 5)) {
  console.log(`  ${d.id}  ${d.data().name}  status=${d.data().status}  createdAt=${d.data().createdAt?.toDate?.() || d.data().createdAt}`);
}

const warrSnap = await db.collection('warranties').where('organizationId', '==', orgId).get();
console.log(`\nWarranties for org (${warrSnap.size}):`);
for (const d of warrSnap.docs.slice(0, 5)) {
  console.log(`  ${d.id}  vendor=${d.data().vendor}  endDate=${d.data().endDate?.toDate?.() || d.data().endDate}`);
}

const reqSnap = await db.collection('requests').where('organizationId', '==', orgId).get();
console.log(`\nRequests for org (${reqSnap.size})`);

process.exit(0);
