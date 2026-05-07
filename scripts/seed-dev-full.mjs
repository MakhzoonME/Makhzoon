/**
 * Full environment seed (dev or staging).
 * Creates super admin, one demo org (AlNoor Retail), org users, subscription,
 * assets, warranties, inventory items, and requests.
 *
 * Run:
 *   node scripts/seed-dev-full.mjs            # dev  (reads .env.local)
 *   node scripts/seed-dev-full.mjs --env stg  # staging (reads .env.staging.example)
 */

import { readFileSync } from 'node:fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

/* ── Determine env file ───────────────────────────────────────── */
const envArg = process.argv.find((a) => a === '--env');
const envName = envArg ? process.argv[process.argv.indexOf('--env') + 1] : 'dev';

const ENV_FILES = {
  dev: '.env.local',
  stg: '.env.staging.example',
  staging: '.env.staging.example',
};
const envFilePath = ENV_FILES[envName];
if (!envFilePath) {
  console.error(`Unknown env "${envName}". Use: dev | stg`);
  process.exit(1);
}
console.log(`Loading credentials from: ${envFilePath} (${envName})`);

const envFile = readFileSync(envFilePath, 'utf8');
for (const line of envFile.split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (!m) continue;
  let [, k, v] = m;
  if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
  process.env[k] = v; // always overwrite so the chosen env wins
}

const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;
if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
  console.error('Missing Firebase admin credentials in .env.local');
  process.exit(1);
}

initializeApp({
  credential: cert({
    projectId: FIREBASE_PROJECT_ID,
    clientEmail: FIREBASE_CLIENT_EMAIL,
    privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  }),
});

const fbAuth = getAuth();
const db = getFirestore();
db.settings({ ignoreUndefinedProperties: true });

const now = new Date();
const daysFromNow = (d) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000);

/* ── Helpers ──────────────────────────────────────────────────── */
async function upsertUser(email, password, claims, displayName) {
  let user;
  try {
    user = await fbAuth.getUserByEmail(email);
    await fbAuth.updateUser(user.uid, { password, displayName });
    console.log(`  ✓ Updated: ${email}`);
  } catch (err) {
    if (err?.code !== 'auth/user-not-found') throw err;
    user = await fbAuth.createUser({ email, password, displayName, emailVerified: true });
    console.log(`  ✓ Created: ${email}`);
  }
  await fbAuth.setCustomUserClaims(user.uid, claims);
  return user;
}

/* ══════════════════════════════════════════════════════════════
   1. SUPER ADMIN
   ══════════════════════════════════════════════════════════════ */
console.log('\n[1/5] Super admin...');
const superAdmin = await upsertUser(
  'admin@makhzoon.me',
  'Makhzoon@Dev2026',
  { role: 'super_admin' },
  'Makhzoon Admin',
);
await db.collection('users').doc(superAdmin.uid).set({
  id: superAdmin.uid,
  email: 'admin@makhzoon.me',
  displayName: 'Makhzoon Admin',
  role: 'super_admin',
  organizationId: null,
  status: 'active',
  createdAt: FieldValue.serverTimestamp(),
  updatedAt: FieldValue.serverTimestamp(),
  createdBy: 'seed-script',
  updatedBy: 'seed-script',
}, { merge: true });

/* ══════════════════════════════════════════════════════════════
   2. ORGANIZATION
   ══════════════════════════════════════════════════════════════ */
console.log('\n[2/5] Organization...');

// Check if org already exists
const existingOrg = await db.collection('organizations').where('subdomain', '==', 'alnoor-retail').limit(1).get();
let orgId;
if (!existingOrg.empty) {
  orgId = existingOrg.docs[0].id;
  console.log(`  ✓ Org already exists (${orgId})`);
} else {
  const orgRef = db.collection('organizations').doc();
  orgId = orgRef.id;
  await orgRef.set({
    id: orgId,
    name: 'AlNoor Retail',
    subdomain: 'alnoor-retail',
    contactEmail: 'ops@alnoor-retail.com',
    description: 'Demo retail org with assets, inventory, and POS',
    category: 'Retail',
    assignedMemberId: null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    createdBy: superAdmin.uid,
    updatedBy: superAdmin.uid,
  });
  console.log(`  ✓ Created org "AlNoor Retail" (${orgId})`);
}

// Subscription
const existingSub = await db.collection('subscriptions').where('organizationId', '==', orgId).limit(1).get();
if (existingSub.empty) {
  await db.collection('subscriptions').add({
    organizationId: orgId,
    packageId: null,
    features: {
      assets: true,
      inventory: true,
      warranties: true,
      pos: true,
      requests: true,
      reports: true,
    },
    notes: 'Dev seed subscription',
    packageDetails: {},
    startDate: daysFromNow(-30),
    endDate: daysFromNow(335),
    status: 'ACTIVE',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    createdBy: superAdmin.uid,
    updatedBy: superAdmin.uid,
  });
  console.log('  ✓ Subscription created');
}

/* ══════════════════════════════════════════════════════════════
   3. ORG USERS
   ══════════════════════════════════════════════════════════════ */
console.log('\n[3/5] Org users...');

const orgUserDefs = [
  { email: 'owner@alnoor-retail.com',  password: 'AlNoor@Owner2026', role: 'org_owner', displayName: 'Rania Al-Hassan',  username: null },
  { email: 'manager@alnoor-retail.com',password: 'AlNoor@Admin2026', role: 'admin',     displayName: 'Khalid Mubarak',   username: null },
  { email: 'staff@alnoor-retail.com',  password: 'AlNoor@Staff2026', role: 'staff',     displayName: 'Sara Al-Otaibi',   username: 'sara.staff' },
];

for (const def of orgUserDefs) {
  const user = await upsertUser(def.email, def.password, { role: def.role, organizationId: orgId }, def.displayName);
  await db.collection('users').doc(user.uid).set({
    id: user.uid,
    organizationId: orgId,
    email: def.email,
    username: def.username ?? undefined,
    displayName: def.displayName,
    role: def.role,
    status: 'active',
    permissions: null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    createdBy: superAdmin.uid,
    updatedBy: superAdmin.uid,
  }, { merge: true });
}

/* ══════════════════════════════════════════════════════════════
   4. ASSETS + WARRANTIES
   ══════════════════════════════════════════════════════════════ */
console.log('\n[4/5] Assets, warranties, requests...');

// Skip if already seeded
const existingAssets = await db.collection('assets').where('organizationId', '==', orgId).limit(1).get();
if (!existingAssets.empty) {
  console.log('  ✓ Assets already seeded — skipping');
} else {
  const batch = db.batch();

  const assetRows = [
    { name: 'MacBook Pro 16"',       category: 'Laptop',     status: 'Active',  serialNumber: 'MBP-001-2024', assignedTo: 'Rania Al-Hassan',  location: 'Main Office',   purchaseCost: 2499, purchaseDate: daysFromNow(-300) },
    { name: 'Dell XPS 15',           category: 'Laptop',     status: 'Active',  serialNumber: 'DXP-002-2024', assignedTo: 'Khalid Mubarak',   location: 'Main Office',   purchaseCost: 1399, purchaseDate: daysFromNow(-180) },
    { name: 'iPad Pro 12.9"',        category: 'Tablet',     status: 'Active',  serialNumber: 'IPD-003-2024', assignedTo: 'Sara Al-Otaibi',   location: 'Store Floor',   purchaseCost: 1099, purchaseDate: daysFromNow(-90)  },
    { name: 'Samsung Monitor 27"',   category: 'Monitor',    status: 'Active',  serialNumber: 'MON-004-2023', assignedTo: 'Rania Al-Hassan',  location: 'Main Office',   purchaseCost: 450,  purchaseDate: daysFromNow(-400) },
    { name: 'HP LaserJet Pro M428',  category: 'Printer',    status: 'Active',  serialNumber: 'HPL-005-2022', assignedTo: null,               location: 'Back Office',   purchaseCost: 380,  purchaseDate: daysFromNow(-700) },
    { name: 'Barcode Scanner Zebra', category: 'POS Device', status: 'Active',  serialNumber: 'ZBR-006-2024', assignedTo: 'Sara Al-Otaibi',   location: 'Store Floor',   purchaseCost: 320,  purchaseDate: daysFromNow(-45)  },
    { name: 'Cash Drawer APG',       category: 'POS Device', status: 'Active',  serialNumber: 'APG-007-2024', assignedTo: null,               location: 'Store Floor',   purchaseCost: 150,  purchaseDate: daysFromNow(-45)  },
    { name: 'NEC Display 24"',       category: 'Monitor',    status: 'Active',  serialNumber: 'NEC-008-2022', assignedTo: 'Khalid Mubarak',   location: 'Main Office',   purchaseCost: 280,  purchaseDate: daysFromNow(-600) },
    { name: 'ThinkPad T480',         category: 'Laptop',     status: 'Retired', serialNumber: 'TPT-099-2019', assignedTo: null,               location: 'Storage',       purchaseCost: 1150, purchaseDate: daysFromNow(-1600) },
    { name: 'Old Epson Printer',     category: 'Printer',    status: 'Retired', serialNumber: 'EPS-088-2018', assignedTo: null,               location: 'Storage',       purchaseCost: 220,  purchaseDate: daysFromNow(-1800) },
  ];

  const assetIds = [];
  for (const a of assetRows) {
    const ref = db.collection('assets').doc();
    assetIds.push({ id: ref.id, name: a.name });
    batch.set(ref, {
      organizationId: orgId,
      name: a.name,
      category: a.category,
      status: a.status,
      serialNumber: a.serialNumber ?? undefined,
      assignedTo: a.assignedTo ?? undefined,
      location: a.location ?? undefined,
      purchaseCost: a.purchaseCost,
      purchaseDate: a.purchaseDate,
      createdBy: 'seed-script',
      updatedBy: 'seed-script',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  const warranties = [
    { idx: 0, vendor: 'Apple',          start: daysFromNow(-300), end: daysFromNow(400)  }, // active
    { idx: 1, vendor: 'Dell',           start: daysFromNow(-180), end: daysFromNow(20)   }, // expiring soon
    { idx: 2, vendor: 'Apple',          start: daysFromNow(-90),  end: daysFromNow(640)  }, // active
    { idx: 3, vendor: 'Samsung',        start: daysFromNow(-400), end: daysFromNow(-50)  }, // expired
    { idx: 4, vendor: 'HP',             start: daysFromNow(-700), end: daysFromNow(10)   }, // expiring soon
    { idx: 5, vendor: 'Zebra Tech',     start: daysFromNow(-45),  end: daysFromNow(320)  }, // active
  ];
  for (const w of warranties) {
    const ref = db.collection('warranties').doc();
    batch.set(ref, {
      organizationId: orgId,
      assetId: assetIds[w.idx].id,
      assetName: assetRows[w.idx].name,
      vendor: w.vendor,
      startDate: w.start,
      endDate: w.end,
      reminder: true,
      createdBy: 'seed-script',
      updatedBy: 'seed-script',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  const requests = [
    { type: 'ADD',    status: 'PENDING',  reason: 'Need a receipt printer for the store counter.', payload: { name: 'Epson TM-T88VI', category: 'POS Device', purchaseCost: 280 } },
    { type: 'UPDATE', status: 'PENDING',  assetId: assetIds[2].id, reason: 'Moved from store floor to back office.', payload: { location: 'Back Office' } },
    { type: 'RETIRE', status: 'APPROVED', assetId: assetIds[9].id, reason: 'Device no longer powers on. Replaced.', payload: {}, reviewedBy: 'seed-script' },
  ];
  for (const r of requests) {
    const ref = db.collection('requests').doc();
    batch.set(ref, {
      organizationId: orgId,
      type: r.type,
      status: r.status,
      requestedBy: 'seed-staff',
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
  console.log(`  ✓ ${assetRows.length} assets, ${warranties.length} warranties, ${requests.length} requests`);
}

/* ══════════════════════════════════════════════════════════════
   5. INVENTORY
   ══════════════════════════════════════════════════════════════ */
console.log('\n[5/5] Inventory...');

const existingInv = await db.collection('inventory').where('organizationId', '==', orgId).limit(1).get();
if (!existingInv.empty) {
  console.log('  ✓ Inventory already seeded — skipping');
} else {
  const invBatch = db.batch();

  const items = [
    { name: 'A4 Paper Ream',           category: 'Office Supplies', sku: 'OFS-001', unit: 'pack',  qty: 45, min: 10, cost: 12,   posEnabled: false },
    { name: 'Ballpoint Pens Box',       category: 'Office Supplies', sku: 'OFS-002', unit: 'box',   qty: 8,  min: 5,  cost: 8,    posEnabled: false },
    { name: 'Thermal Receipt Rolls',    category: 'POS Consumables', sku: 'POS-001', unit: 'pack',  qty: 3,  min: 10, cost: 25,   posEnabled: false },
    { name: 'Hand Sanitizer 500ml',     category: 'Hygiene',         sku: 'HYG-001', unit: 'each',  qty: 12, min: 6,  cost: 9,    posEnabled: true,  price: 15   },
    { name: 'Toner Cartridge HP 26A',   category: 'Printer Supplies',sku: 'PRT-001', unit: 'each',  qty: 2,  min: 2,  cost: 62,   posEnabled: false },
    { name: 'HDMI Cable 2m',            category: 'Electronics',     sku: 'ELC-001', unit: 'each',  qty: 7,  min: 3,  cost: 14,   posEnabled: true,  price: 25   },
    { name: 'USB-C Hub 7-in-1',         category: 'Electronics',     sku: 'ELC-002', unit: 'each',  qty: 0,  min: 2,  cost: 38,   posEnabled: true,  price: 65   },
    { name: 'Bubble Wrap Roll 50m',     category: 'Packaging',       sku: 'PKG-001', unit: 'roll',  qty: 4,  min: 2,  cost: 30,   posEnabled: false },
    { name: 'Label Stickers A4',        category: 'Office Supplies', sku: 'OFS-003', unit: 'pack',  qty: 20, min: 5,  cost: 7,    posEnabled: false },
    { name: 'Extension Cord 3-outlet',  category: 'Electronics',     sku: 'ELC-003', unit: 'each',  qty: 5,  min: 3,  cost: 22,   posEnabled: true,  price: 35   },
  ];

  for (const item of items) {
    const stockStatus = item.qty === 0 ? 'out' : item.qty <= item.min ? 'low' : 'ok';
    const ref = db.collection('inventory').doc();
    invBatch.set(ref, {
      organizationId: orgId,
      name: item.name,
      category: item.category,
      sku: item.sku,
      unit: item.unit,
      quantityOnHand: item.qty,
      minimumThreshold: item.min,
      unitCost: item.cost,
      stockStatus,
      posEnabled: item.posEnabled,
      posPrice: item.price ?? null,
      barcode: null,
      taxRateId: null,
      createdBy: 'seed-script',
      updatedBy: 'seed-script',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  await invBatch.commit();
  console.log(`  ✓ ${items.length} inventory items`);
}

/* ── Summary ──────────────────────────────────────────────────── */
console.log(`
╔═══════════════════════════════════════════════════════════╗
║              DEV SEED COMPLETE — AlNoor Retail            ║
╠═══════════════════════════════════════════════════════════╣
║  SUPER ADMIN                                              ║
║    Email   : admin@makhzoon.me                            ║
║    Password: Makhzoon@Dev2026                             ║
╠═══════════════════════════════════════════════════════════╣
║  ORG: AlNoor Retail  (subdomain: alnoor-retail)           ║
╠═══════════════════════════════════════════════════════════╣
║  Org Owner (email login)                                  ║
║    Email   : owner@alnoor-retail.com                      ║
║    Password: AlNoor@Owner2026                             ║
╠═══════════════════════════════════════════════════════════╣
║  Org Admin (email login)                                  ║
║    Email   : manager@alnoor-retail.com                    ║
║    Password: AlNoor@Admin2026                             ║
╠═══════════════════════════════════════════════════════════╣
║  Staff (username login)                                   ║
║    Username: sara.staff                                   ║
║    Email   : staff@alnoor-retail.com                      ║
║    Password: AlNoor@Staff2026                             ║
╚═══════════════════════════════════════════════════════════╝
`);

process.exit(0);
