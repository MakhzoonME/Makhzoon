// Seed demo data (assets, warranties, requests) into an existing organization.
// Run: node scripts/seed-org-data.mjs <orgNameOrSubdomain>
// Example: node scripts/seed-org-data.mjs qqqq

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
  console.error('Usage: node scripts/seed-org-data.mjs <orgNameOrSubdomain>');
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
const org = orgsSnap.docs.find((d) => {
  const data = d.data();
  return data.name === needle || data.subdomain === needle;
});
if (!org) {
  console.error(`No organization found with name or subdomain "${needle}".`);
  console.error('Existing orgs:', orgsSnap.docs.map((d) => ({ id: d.id, name: d.data().name, subdomain: d.data().subdomain })));
  process.exit(1);
}

const orgId = org.id;
const orgData = org.data();
console.log(`Seeding into org "${orgData.name}" (${orgId})...`);

const now = new Date();
const daysFromNow = (d) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000);

const seededBy = 'seed-script';
const batch = db.batch();

const assets = [
  { name: 'MacBook Pro 16"',   category: 'Laptop',    status: 'Active',  serialNumber: 'MBP-001-2024', assignedTo: 'Alice Hart',  location: 'HQ - Floor 3', purchaseCost: 2499, purchaseDate: daysFromNow(-300) },
  { name: 'Dell XPS 13',        category: 'Laptop',    status: 'Active',  serialNumber: 'DXP-002-2024', assignedTo: 'Bob Rivera',  location: 'HQ - Floor 2', purchaseCost: 1299, purchaseDate: daysFromNow(-150) },
  { name: 'Dell UltraSharp 27', category: 'Monitor',   status: 'Active',  serialNumber: 'MON-010-2023', assignedTo: 'Alice Hart',  location: 'HQ - Floor 3', purchaseCost: 480,  purchaseDate: daysFromNow(-420) },
  { name: 'Logitech MX Master', category: 'Peripheral',status: 'Active',  serialNumber: 'LOG-005-2024', assignedTo: 'Bob Rivera',  location: 'HQ - Floor 2', purchaseCost: 99,   purchaseDate: daysFromNow(-60)  },
  { name: 'HP LaserJet Pro',    category: 'Printer',   status: 'Active',  serialNumber: 'HPL-003-2022', assignedTo: null,          location: 'HQ - Shared',  purchaseCost: 380,  purchaseDate: daysFromNow(-730) },
  { name: 'iPad Pro 12.9"',     category: 'Tablet',    status: 'Active',  serialNumber: 'IPD-007-2024', assignedTo: 'Carol Nguyen',location: 'Remote',       purchaseCost: 1099, purchaseDate: daysFromNow(-200) },
  { name: 'Office Chair Herman',category: 'Furniture', status: 'Active',  serialNumber: null,           assignedTo: 'Alice Hart',  location: 'HQ - Floor 3', purchaseCost: 820,  purchaseDate: daysFromNow(-500) },
  { name: 'ThinkPad T480',      category: 'Laptop',    status: 'Retired', serialNumber: 'TPT-099-2019', assignedTo: null,          location: 'Storage',      purchaseCost: 1150, purchaseDate: daysFromNow(-1600) },
  { name: 'Samsung Monitor 24"',category: 'Monitor',   status: 'Retired', serialNumber: 'SMS-022-2018', assignedTo: null,          location: 'Storage',      purchaseCost: 210,  purchaseDate: daysFromNow(-1800) },
];

const assetIds = [];
for (const a of assets) {
  const ref = db.collection('assets').doc();
  assetIds.push({ id: ref.id, name: a.name, category: a.category });
  batch.set(ref, {
    organizationId: orgId,
    name: a.name,
    category: a.category,
    status: a.status,
    serialNumber: a.serialNumber ?? undefined,
    assignedTo: a.assignedTo ?? undefined,
    location: a.location ?? undefined,
    purchaseCost: a.purchaseCost ?? undefined,
    purchaseDate: a.purchaseDate ?? undefined,
    notes: undefined,
    createdBy: seededBy,
    updatedBy: seededBy,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

// Warranties: mix of expired, expiring soon (<30d), far future.
const warranties = [
  { assetIdx: 0, vendor: 'Apple',        start: daysFromNow(-300), end: daysFromNow(400) },  // far future
  { assetIdx: 1, vendor: 'Dell',         start: daysFromNow(-150), end: daysFromNow(15)  },  // expiring soon
  { assetIdx: 2, vendor: 'Dell',         start: daysFromNow(-420), end: daysFromNow(-60) },  // expired
  { assetIdx: 3, vendor: 'Logitech',     start: daysFromNow(-60),  end: daysFromNow(300) },
  { assetIdx: 4, vendor: 'HP',           start: daysFromNow(-730), end: daysFromNow(5)   },  // expiring soon
  { assetIdx: 5, vendor: 'Apple',        start: daysFromNow(-200), end: daysFromNow(530) },
  { assetIdx: 6, vendor: 'Herman Miller',start: daysFromNow(-500), end: daysFromNow(-120)},  // expired
];
for (const w of warranties) {
  const ref = db.collection('warranties').doc();
  batch.set(ref, {
    organizationId: orgId,
    assetId: assetIds[w.assetIdx].id,
    vendor: w.vendor,
    startDate: w.start,
    endDate: w.end,
    reminder: true,
    notes: undefined,
    createdBy: seededBy,
    updatedBy: seededBy,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

// Sample pending requests (staff-style add/update/retire)
const requests = [
  { type: 'ADD',    status: 'PENDING',  requestedBy: 'staff-sample-1', reason: 'Need a second monitor for development.', payload: { name: 'LG 27" 4K Monitor', category: 'Monitor', purchaseCost: 520 } },
  { type: 'UPDATE', status: 'PENDING',  requestedBy: 'staff-sample-1', assetId: assetIds[3].id, reason: 'Moved to Floor 2.', payload: { location: 'HQ - Floor 2' } },
  { type: 'RETIRE', status: 'APPROVED', requestedBy: 'staff-sample-2', assetId: assetIds[8].id, reason: 'Device no longer powers on.', payload: {}, reviewedBy: seededBy },
];
for (const r of requests) {
  const ref = db.collection('requests').doc();
  batch.set(ref, {
    organizationId: orgId,
    type: r.type,
    status: r.status,
    requestedBy: r.requestedBy,
    assetId: r.assetId ?? null,
    reason: r.reason,
    payload: r.payload,
    reviewedBy: r.reviewedBy ?? null,
    reviewedAt: r.reviewedBy ? FieldValue.serverTimestamp() : null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

await batch.commit();

console.log(`\nSeeded:`);
console.log(`  ${assets.length} assets`);
console.log(`  ${warranties.length} warranties (mix of expired, expiring soon, active)`);
console.log(`  ${requests.length} requests`);
console.log(`\nSign in as super_admin, click "Enter Org" on "${orgData.name}", and the dashboard will populate.`);
process.exit(0);
