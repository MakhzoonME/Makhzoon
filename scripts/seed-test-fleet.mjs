// Seed a full fleet of test orgs, employees, and rich cross-feature data.
// Idempotent: safe to re-run. Users use password "Staff@123".
// Run: node scripts/seed-test-fleet.mjs

import { readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
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

if (getApps().length === 0) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
}

const auth = getAuth();
const db = getFirestore();
db.settings({ ignoreUndefinedProperties: true });

const PASSWORD = 'Staff@123';
const now = new Date();
const daysFromNow = (d) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000);

async function ensureUser({ email, displayName, role, organizationId, password = PASSWORD }) {
  let user;
  try {
    user = await auth.getUserByEmail(email);
    await auth.updateUser(user.uid, { password, displayName, emailVerified: true });
  } catch (err) {
    if (err?.code === 'auth/user-not-found') {
      user = await auth.createUser({ email, password, displayName, emailVerified: true });
    } else {
      throw err;
    }
  }
  await auth.setCustomUserClaims(user.uid, { role, organizationId });
  await db.collection('users').doc(user.uid).set({
    id: user.uid,
    email,
    displayName,
    name: displayName,
    role,
    organizationId,
    status: 'active',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  return user.uid;
}

async function ensureOrganization({ name, subdomain, contactEmail }) {
  const existing = await db.collection('organizations').where('subdomain', '==', subdomain).limit(1).get();
  if (!existing.empty) {
    const doc = existing.docs[0];
    await doc.ref.set({ name, contactEmail, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return doc.id;
  }
  const ref = await db.collection('organizations').add({
    name,
    subdomain,
    contactEmail,
    createdBy: 'seed-fleet',
    updatedBy: 'seed-fleet',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

async function ensureSubscription(orgId) {
  const existing = await db.collection('subscriptions').where('organizationId', '==', orgId).limit(1).get();
  if (!existing.empty) return;
  await db.collection('subscriptions').add({
    organizationId: orgId,
    packageDetails: { plan: 'pro', seats: 10 },
    startDate: daysFromNow(-30),
    endDate: daysFromNow(335),
    status: 'ACTIVE',
    createdBy: 'seed-fleet',
    updatedBy: 'seed-fleet',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

async function wipeOrgCollections(orgId) {
  const collections = ['assets', 'warranties', 'requests', 'assetNotes', 'maintenanceRecords', 'assetCheckouts', 'invites'];
  for (const c of collections) {
    const snap = await db.collection(c).where('organizationId', '==', orgId).get();
    if (snap.empty) continue;
    const chunks = [];
    for (let i = 0; i < snap.docs.length; i += 400) chunks.push(snap.docs.slice(i, i + 400));
    for (const chunk of chunks) {
      const batch = db.batch();
      chunk.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  }
}

async function seedOrg(cfg) {
  console.log(`\n=== ${cfg.name} (${cfg.subdomain}) ===`);
  const orgId = await ensureOrganization({ name: cfg.name, subdomain: cfg.subdomain, contactEmail: cfg.contactEmail });
  await ensureSubscription(orgId);

  const adminUid = await ensureUser({ email: cfg.admin.email, displayName: cfg.admin.name, role: 'admin', organizationId: orgId });
  const staffUids = [];
  for (const s of cfg.staff) {
    staffUids.push(await ensureUser({ email: s.email, displayName: s.name, role: 'staff', organizationId: orgId }));
  }
  console.log(`  users: 1 admin + ${staffUids.length} staff`);

  await wipeOrgCollections(orgId);

  const batch = db.batch();
  const assetIds = [];
  cfg.assets.forEach((a, idx) => {
    const ref = db.collection('assets').doc();
    assetIds.push(ref.id);
    batch.set(ref, {
      organizationId: orgId,
      name: a.name,
      category: a.category,
      status: a.status,
      serialNumber: a.serialNumber,
      assignedTo: a.assignedTo,
      location: a.location,
      purchaseCost: a.purchaseCost,
      purchaseDate: a.purchaseDate,
      createdBy: adminUid,
      updatedBy: adminUid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  cfg.warranties.forEach((w) => {
    const ref = db.collection('warranties').doc();
    batch.set(ref, {
      organizationId: orgId,
      assetId: assetIds[w.assetIdx],
      vendor: w.vendor,
      startDate: w.start,
      endDate: w.end,
      reminder: true,
      createdBy: adminUid,
      updatedBy: adminUid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  cfg.requests.forEach((r) => {
    const ref = db.collection('requests').doc();
    batch.set(ref, {
      organizationId: orgId,
      type: r.type,
      status: r.status,
      description: r.description,
      assetId: r.assetIdx != null ? assetIds[r.assetIdx] : undefined,
      createdBy: staffUids[r.staffIdx ?? 0],
      updatedBy: staffUids[r.staffIdx ?? 0],
      decisionBy: r.decisionByAdmin ? cfg.admin.email : undefined,
      decisionAt: r.decisionByAdmin ? FieldValue.serverTimestamp() : undefined,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  cfg.notes.forEach((n) => {
    const ref = db.collection('assetNotes').doc();
    batch.set(ref, {
      organizationId: orgId,
      assetId: assetIds[n.assetIdx],
      text: n.text,
      createdBy: staffUids[n.staffIdx ?? 0],
      createdByEmail: cfg.staff[n.staffIdx ?? 0].email,
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  cfg.maintenance.forEach((m) => {
    const ref = db.collection('maintenanceRecords').doc();
    batch.set(ref, {
      organizationId: orgId,
      assetId: assetIds[m.assetIdx],
      type: m.type,
      description: m.description,
      performedBy: m.performedBy,
      cost: m.cost,
      date: m.date,
      createdBy: adminUid,
      createdByEmail: cfg.admin.email,
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  cfg.checkouts.forEach((c) => {
    const ref = db.collection('assetCheckouts').doc();
    batch.set(ref, {
      organizationId: orgId,
      assetId: assetIds[c.assetIdx],
      checkedOutTo: c.to,
      checkedOutBy: staffUids[c.staffIdx ?? 0],
      checkedOutByEmail: cfg.staff[c.staffIdx ?? 0].email,
      dueDate: c.due,
      notes: c.notes,
      checkedOutAt: c.at,
      returnedAt: c.returnedAt,
      returnedBy: c.returnedAt ? adminUid : undefined,
      returnedByEmail: c.returnedAt ? cfg.admin.email : undefined,
    });
  });

  cfg.invites.forEach((inv) => {
    const ref = db.collection('invites').doc();
    const token = randomBytes(24).toString('base64url');
    batch.set(ref, {
      organizationId: orgId,
      email: inv.email.toLowerCase(),
      displayName: inv.name,
      role: inv.role,
      token,
      status: 'pending',
      invitedBy: adminUid,
      invitedByEmail: cfg.admin.email,
      invitedByName: cfg.admin.name,
      expiresAt: daysFromNow(7),
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  await batch.commit();
  console.log(`  seeded: ${assetIds.length} assets, ${cfg.warranties.length} warranties, ${cfg.requests.length} requests, ${cfg.notes.length} notes, ${cfg.maintenance.length} maintenance, ${cfg.checkouts.length} checkouts, ${cfg.invites.length} invites`);
}

const orgs = [
  {
    name: 'Acme Corp',
    subdomain: 'acme',
    contactEmail: 'it@acme.test',
    admin: { email: 'admin@acme.test', name: 'Alice Reed' },
    staff: [
      { email: 'bob@acme.test',    name: 'Bob Martin'  },
      { email: 'carol@acme.test',  name: 'Carol Vance' },
      { email: 'dave@acme.test',   name: 'Dave Kim'    },
    ],
    assets: [
      { name: 'MacBook Pro 16" M3',    category: 'Laptop',    status: 'Active',  serialNumber: 'ACM-MBP-001', assignedTo: 'Bob Martin',  location: 'HQ - Floor 3', purchaseCost: 2499, purchaseDate: daysFromNow(-220) },
      { name: 'Dell UltraSharp 32" 4K',category: 'Monitor',   status: 'Active',  serialNumber: 'ACM-MON-002', assignedTo: 'Bob Martin',  location: 'HQ - Floor 3', purchaseCost: 720,  purchaseDate: daysFromNow(-220) },
      { name: 'Logitech MX Keys',      category: 'Peripheral',status: 'Active',  serialNumber: 'ACM-KB-003',  assignedTo: 'Carol Vance', location: 'HQ - Floor 2', purchaseCost: 119,  purchaseDate: daysFromNow(-90)  },
      { name: 'iPhone 15 Pro',         category: 'Phone',     status: 'Active',  serialNumber: 'ACM-PH-004',  assignedTo: 'Dave Kim',    location: 'Remote',       purchaseCost: 1099, purchaseDate: daysFromNow(-180) },
      { name: 'Brother HL Printer',    category: 'Printer',   status: 'Active',  serialNumber: 'ACM-PR-005',  location: 'HQ - Shared',  purchaseCost: 260,  purchaseDate: daysFromNow(-500) },
      { name: 'HP EliteBook G9',       category: 'Laptop',    status: 'Retired', serialNumber: 'ACM-LT-099',  location: 'Storage',      purchaseCost: 1450, purchaseDate: daysFromNow(-1400) },
    ],
    warranties: [
      { assetIdx: 0, vendor: 'Apple',   start: daysFromNow(-220), end: daysFromNow(510) },
      { assetIdx: 1, vendor: 'Dell',    start: daysFromNow(-220), end: daysFromNow(20)  },
      { assetIdx: 3, vendor: 'Apple',   start: daysFromNow(-180), end: daysFromNow(185) },
      { assetIdx: 4, vendor: 'Brother', start: daysFromNow(-500), end: daysFromNow(-40) },
    ],
    requests: [
      { type: 'BUY_NEW',  status: 'PENDING',  description: 'Need a second monitor for development work.', staffIdx: 0 },
      { type: 'REFILL',   status: 'APPROVED', description: 'Printer needs new toner cartridge.', staffIdx: 1, assetIdx: 4, decisionByAdmin: true },
      { type: 'RETIRE',   status: 'APPROVED', description: 'EliteBook screen is cracked and battery dead.', staffIdx: 2, assetIdx: 5, decisionByAdmin: true },
      { type: 'EXTEND_WARRANTY', status: 'REJECTED', description: 'Extend warranty on the printer.', staffIdx: 1, assetIdx: 4, decisionByAdmin: true },
    ],
    notes: [
      { assetIdx: 0, text: 'Battery health at 92%. Monitor quarterly.', staffIdx: 0 },
      { assetIdx: 3, text: 'Screen protector replaced on 2026-03-15.', staffIdx: 2 },
    ],
    maintenance: [
      { assetIdx: 4, type: 'service',    description: 'Cleaned rollers, replaced drum.',         performedBy: 'IT Team', cost: 45, date: daysFromNow(-40) },
      { assetIdx: 0, type: 'inspection', description: 'Annual preventive inspection — all OK.',  performedBy: 'IT Team', cost: 0,  date: daysFromNow(-15) },
    ],
    checkouts: [
      { assetIdx: 2, to: 'Evan Walsh',   staffIdx: 0, at: daysFromNow(-5), due: daysFromNow(10), notes: 'Loaner for client trip.' },
      { assetIdx: 3, to: 'Carol Vance',  staffIdx: 1, at: daysFromNow(-30), returnedAt: daysFromNow(-2) },
    ],
    invites: [
      { email: 'new.hire@acme.test', name: 'New Hire',   role: 'staff' },
    ],
  },
  {
    name: 'Globex Inc',
    subdomain: 'globex',
    contactEmail: 'ops@globex.test',
    admin: { email: 'admin@globex.test', name: 'George Okafor' },
    staff: [
      { email: 'hannah@globex.test', name: 'Hannah Liu'   },
      { email: 'ian@globex.test',    name: 'Ian Torres'   },
    ],
    assets: [
      { name: 'ThinkPad X1 Carbon',   category: 'Laptop',    status: 'Active',  serialNumber: 'GLX-LT-010', assignedTo: 'Hannah Liu', location: 'HQ',         purchaseCost: 1850, purchaseDate: daysFromNow(-100) },
      { name: 'Surface Pro 9',        category: 'Tablet',    status: 'Active',  serialNumber: 'GLX-TB-011', assignedTo: 'Ian Torres', location: 'Remote',     purchaseCost: 1299, purchaseDate: daysFromNow(-70)  },
      { name: 'LG 34" UltraWide',     category: 'Monitor',   status: 'Active',  serialNumber: 'GLX-MN-012', assignedTo: 'Hannah Liu', location: 'HQ',         purchaseCost: 650,  purchaseDate: daysFromNow(-110) },
      { name: 'Cisco IP Phone',       category: 'Phone',     status: 'Active',  serialNumber: 'GLX-PH-013', location: 'HQ - Lobby', purchaseCost: 180,  purchaseDate: daysFromNow(-900) },
      { name: 'Standing Desk Uplift', category: 'Furniture', status: 'Active',  assignedTo: 'Ian Torres', location: 'Remote',     purchaseCost: 780,  purchaseDate: daysFromNow(-60)  },
    ],
    warranties: [
      { assetIdx: 0, vendor: 'Lenovo',    start: daysFromNow(-100), end: daysFromNow(630) },
      { assetIdx: 1, vendor: 'Microsoft', start: daysFromNow(-70),  end: daysFromNow(10)  },
      { assetIdx: 2, vendor: 'LG',        start: daysFromNow(-110), end: daysFromNow(620) },
    ],
    requests: [
      { type: 'BUY_NEW', status: 'PENDING',  description: 'Request for noise-cancelling headphones.', staffIdx: 0 },
      { type: 'REFILL',  status: 'PENDING',  description: 'Low on printer paper.',                    staffIdx: 1 },
    ],
    notes: [
      { assetIdx: 1, text: 'Pen tip replaced.', staffIdx: 1 },
    ],
    maintenance: [
      { assetIdx: 2, type: 'repair', description: 'Replaced HDMI cable.', performedBy: 'IT Team', cost: 12, date: daysFromNow(-5) },
    ],
    checkouts: [
      { assetIdx: 4, to: 'Ian Torres', staffIdx: 1, at: daysFromNow(-60), due: daysFromNow(-5), notes: 'WFH equipment.' }, // overdue
    ],
    invites: [],
  },
  {
    name: 'Stark Industries',
    subdomain: 'stark',
    contactEmail: 'jarvis@stark.test',
    admin: { email: 'admin@stark.test', name: 'Pepper Potts' },
    staff: [
      { email: 'tony@stark.test',    name: 'Tony Stark'    },
      { email: 'rhodey@stark.test',  name: 'James Rhodes'  },
      { email: 'happy@stark.test',   name: 'Happy Hogan'   },
    ],
    assets: [
      { name: 'Mark 85 Gauntlet Prototype', category: 'R&D',       status: 'Active',  serialNumber: 'STK-RD-001', assignedTo: 'Tony Stark',   location: 'Malibu Lab', purchaseCost: 85000, purchaseDate: daysFromNow(-400) },
      { name: 'Mac Pro Tower M2 Ultra',     category: 'Workstation',status: 'Active', serialNumber: 'STK-WS-002', assignedTo: 'Tony Stark',   location: 'Malibu Lab', purchaseCost: 6999,  purchaseDate: daysFromNow(-200) },
      { name: 'Pro Display XDR',            category: 'Monitor',   status: 'Active',  serialNumber: 'STK-MN-003', assignedTo: 'Tony Stark',   location: 'Malibu Lab', purchaseCost: 4999,  purchaseDate: daysFromNow(-200) },
      { name: 'Audi R8 (Company Fleet)',    category: 'Vehicle',   status: 'Active',  serialNumber: 'STK-VH-004', assignedTo: 'Happy Hogan',  location: 'NYC Garage', purchaseCost: 158000,purchaseDate: daysFromNow(-600) },
      { name: 'Sat-Com Transceiver',        category: 'Comms',     status: 'Active',  serialNumber: 'STK-CM-005', assignedTo: 'James Rhodes', location: 'HQ',         purchaseCost: 2400,  purchaseDate: daysFromNow(-45)  },
      { name: 'Mark 42 Helmet',             category: 'R&D',       status: 'Retired', serialNumber: 'STK-RD-998', location: 'Vault',       purchaseCost: 12000, purchaseDate: daysFromNow(-2000) },
      { name: 'iPhone 15 Ultra (Custom)',   category: 'Phone',     status: 'Active',  serialNumber: 'STK-PH-006', assignedTo: 'Tony Stark',   location: 'Malibu Lab', purchaseCost: 1399,  purchaseDate: daysFromNow(-30)  },
    ],
    warranties: [
      { assetIdx: 1, vendor: 'Apple',     start: daysFromNow(-200), end: daysFromNow(530) },
      { assetIdx: 2, vendor: 'Apple',     start: daysFromNow(-200), end: daysFromNow(530) },
      { assetIdx: 3, vendor: 'Audi AG',   start: daysFromNow(-600), end: daysFromNow(-200) },
      { assetIdx: 4, vendor: 'Motorola',  start: daysFromNow(-45),  end: daysFromNow(25) },
      { assetIdx: 6, vendor: 'Apple',     start: daysFromNow(-30),  end: daysFromNow(335) },
    ],
    requests: [
      { type: 'BUY_NEW',         status: 'APPROVED', description: 'Additional sat-com unit for field ops.', staffIdx: 1, decisionByAdmin: true },
      { type: 'EXTEND_WARRANTY', status: 'PENDING',  description: 'Extend vehicle warranty.',               staffIdx: 2, assetIdx: 3 },
      { type: 'RETIRE',          status: 'PENDING',  description: 'Helmet Mk42 archived display only.',     staffIdx: 0, assetIdx: 5 },
    ],
    notes: [
      { assetIdx: 0, text: 'Servo motor #3 needs recalibration.',        staffIdx: 0 },
      { assetIdx: 0, text: 'Battery cell vented during stress test.',   staffIdx: 0 },
      { assetIdx: 3, text: 'Scheduled oil change April 30.',              staffIdx: 2 },
    ],
    maintenance: [
      { assetIdx: 3, type: 'service',    description: 'Scheduled service — oil, filters, tires.', performedBy: 'Audi Beverly Hills', cost: 1850, date: daysFromNow(-20) },
      { assetIdx: 0, type: 'repair',     description: 'Servo housing replacement.',               performedBy: 'R&D Workshop', cost: 4200, date: daysFromNow(-60) },
      { assetIdx: 1, type: 'upgrade',    description: 'RAM upgrade to 192GB.',                    performedBy: 'Apple Authorized', cost: 1800, date: daysFromNow(-80) },
    ],
    checkouts: [
      { assetIdx: 4, to: 'James Rhodes', staffIdx: 1, at: daysFromNow(-10), due: daysFromNow(20), notes: 'Overseas deployment.' },
      { assetIdx: 6, to: 'Tony Stark',   staffIdx: 0, at: daysFromNow(-30), returnedAt: daysFromNow(-3) },
    ],
    invites: [
      { email: 'peter@stark.test', name: 'Peter Parker', role: 'staff' },
      { email: 'hank@stark.test',  name: 'Hank Pym',     role: 'admin' },
    ],
  },
];

for (const o of orgs) {
  await seedOrg(o);
}

console.log('\nDone. Sign in with any of:');
for (const o of orgs) {
  console.log(`\n  ${o.name}  →  http://${o.subdomain}.localhost:3000`);
  console.log(`    admin: ${o.admin.email}   pw: ${PASSWORD}`);
  for (const s of o.staff) console.log(`    staff: ${s.email}   pw: ${PASSWORD}`);
}
console.log(`\nSuper admin: SuperAdmin@test.com  (pw Admin@123) — enter any org from http://localhost:3000/super-admin`);
process.exit(0);
