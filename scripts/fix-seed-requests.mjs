// Deletes malformed seeded requests and reseeds with correct schema.
// Run: node scripts/fix-seed-requests.mjs <orgNameOrSubdomain>

import { readFileSync } from 'node:fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const envFile = readFileSync('.env.local', 'utf8');
for (const line of envFile.split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (!m) continue;
  let [, k, v] = m;
  if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
  if (!process.env[k]) process.env[k] = v;
}

const needle = process.argv[2];
if (!needle) {
  console.error('Usage: node scripts/fix-seed-requests.mjs <orgNameOrSubdomain>');
  process.exit(1);
}

initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  }),
});

const db = getFirestore();
db.settings({ ignoreUndefinedProperties: true });

const orgsSnap = await db.collection('organizations').get();
const org = orgsSnap.docs.find((d) => d.data().name === needle || d.data().subdomain === needle);
if (!org) { console.error(`No org "${needle}"`); process.exit(1); }
const orgId = org.id;

const reqSnap = await db.collection('requests').where('organizationId', '==', orgId).get();
console.log(`Deleting ${reqSnap.size} old requests...`);
for (const d of reqSnap.docs) await d.ref.delete();

const assetsSnap = await db.collection('assets').where('organizationId', '==', orgId).get();
const assets = assetsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
const anyAsset = assets[0];
const retiredAsset = assets.find((a) => a.status === 'Retired') ?? anyAsset;

const newRequests = [
  {
    type: 'REFILL',
    description: 'Need a second 27" monitor for my desk — current setup has only one.',
    status: 'PENDING',
    createdBy: 'staff-demo-1',
  },
  {
    type: 'BUY_NEW',
    description: 'Requesting a new Dell XPS laptop for the frontend team.',
    status: 'PENDING',
    createdBy: 'staff-demo-2',
  },
  {
    type: 'RETIRE',
    description: 'This ThinkPad no longer powers on reliably. Requesting retirement.',
    status: 'APPROVED',
    createdBy: 'staff-demo-2',
    assetId: retiredAsset?.id,
    decisionBy: 'TestingAdmin@test.com',
  },
  {
    type: 'EXTEND_WARRANTY',
    description: 'Warranty on the HP printer is about to expire. Please extend for another year.',
    status: 'REJECTED',
    createdBy: 'staff-demo-1',
    assetId: anyAsset?.id,
    decisionBy: 'TestingAdmin@test.com',
  },
];

for (const r of newRequests) {
  await db.collection('requests').add({
    organizationId: orgId,
    type: r.type,
    assetId: r.assetId,
    description: r.description,
    status: r.status,
    createdBy: r.createdBy,
    updatedBy: r.createdBy,
    decisionBy: r.decisionBy,
    decisionAt: r.decisionBy ? FieldValue.serverTimestamp() : undefined,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

console.log(`Reseeded ${newRequests.length} requests with correct schema.`);
process.exit(0);
