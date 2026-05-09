/**
 * ============================================================================
 * Clone Firestore data from production to a lower environment (staging | dev).
 * ============================================================================
 *
 * ⚠️  NEVER POINT --target AT PRODUCTION. The script will refuse to run if the
 *     source and target service accounts share a project_id, but the human is
 *     the last line of defense. Sanity check both project IDs before saying
 *     "yes" at the confirmation prompt.
 *
 * Usage:
 *   npm run clone:dry:staging
 *   npm run clone:staging
 *   npx ts-node scripts/clone-firestore.ts --target=dev --dry-run
 *   npx ts-node scripts/clone-firestore.ts --target=dev --collections=users,organizations
 *
 * Required env vars:
 *   PROD_SERVICE_ACCOUNT_PATH    — path to source (prod) service account JSON
 *   TARGET_SERVICE_ACCOUNT_PATH  — path to target (staging|dev) service account JSON
 *
 * Default behavior:
 *   • Top-level collections are discovered at runtime via listCollections().
 *     Override with --collections=foo,bar to limit scope.
 *   • Subcollections are recursively cloned for every document.
 *   • Writes are batched (500 ops per commit).
 *   • PII fields listed in SCRUB_FIELDS_BY_COLLECTION are replaced before write.
 * ============================================================================
 */

import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

// ---------- CLI args ----------
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? 'true'];
  }),
);
const TARGET = args.target as 'staging' | 'dev' | 'prod' | undefined;
const DRY_RUN = args['dry-run'] === 'true';
const NO_SCRUB = args['no-scrub'] === 'true';
const COLLECTION_FILTER = args.collections ? (args.collections as string).split(',') : null;
const SKIP_CONFIRM = args['yes'] === 'true' || args['y'] === 'true';

if (!TARGET || !['staging', 'dev', 'prod'].includes(TARGET)) {
  console.error('❌ --target=staging|dev|prod is required');
  process.exit(1);
}

// Prod target requires --no-scrub explicitly (PII must survive prod->prod)
// AND the operator has to opt in to this rare path.
if (TARGET === 'prod' && !NO_SCRUB) {
  console.error('❌ --target=prod requires --no-scrub (prod migrations preserve PII).');
  console.error('   Example: --target=prod --no-scrub');
  process.exit(1);
}
if (TARGET === 'prod') {
  console.warn('⚠️  Targeting prod — this is a one-time migration, not a routine clone.');
}

// ---------- PII scrub rules ----------
// Field-level replacements applied to top-level documents in each collection.
// Replacer receives the doc id so the substitute can be deterministic.
const SCRUB_FIELDS_BY_COLLECTION: Record<string, Record<string, (id: string) => unknown>> = {
  users: {
    email: (id) => `user-${id}@example.test`,
    phone: () => null,
    displayName: (id) => `Test User ${id.slice(0, 6)}`,
  },
  organizations: {
    contactEmail: (id) => `org-${id}@example.test`,
  },
  contactSales: {
    email: (id) => `lead-${id}@example.test`,
    phone: () => null,
    name: () => 'Test Lead',
    organizationName: () => 'Test Organization',
    notes: () => '[scrubbed]',
    ip: () => null,
  },
  earlyAccess: {
    email: (id) => `early-${id}@example.test`,
    ip: () => null,
  },
  paymentLogs: {
    reference: () => null,
    notes: () => null,
  },
  // Audit logs may contain PII inside oldValue/newValue maps — drop them
  // entirely rather than try to scrub deep paths. The audit metadata (action,
  // module, recordId, timestamps) is preserved for analytics in the env.
  auditLogs: {
    oldValue: () => null,
    newValue: () => null,
  },
};

// ---------- Init two admin apps ----------
const prodKeyPath = process.env.PROD_SERVICE_ACCOUNT_PATH;
const targetKeyPath = process.env.TARGET_SERVICE_ACCOUNT_PATH;
if (!prodKeyPath || !targetKeyPath) {
  console.error('❌ Set PROD_SERVICE_ACCOUNT_PATH and TARGET_SERVICE_ACCOUNT_PATH');
  process.exit(1);
}

const prodKey = JSON.parse(fs.readFileSync(path.resolve(prodKeyPath), 'utf-8')) as {
  project_id: string;
};
const targetKey = JSON.parse(fs.readFileSync(path.resolve(targetKeyPath), 'utf-8')) as {
  project_id: string;
};

if (prodKey.project_id === targetKey.project_id) {
  console.error('❌ Refusing to run: prod and target service accounts point at the same project.');
  process.exit(1);
}

const prodApp = admin.initializeApp({ credential: admin.credential.cert(prodKey as admin.ServiceAccount) }, 'prod');
const targetApp = admin.initializeApp({ credential: admin.credential.cert(targetKey as admin.ServiceAccount) }, 'target');
const prodDb = prodApp.firestore();
const targetDb = targetApp.firestore();

// ---------- Helpers ----------
function scrubDoc(collection: string, id: string, data: FirebaseFirestore.DocumentData) {
  if (NO_SCRUB) return data;
  const rules = SCRUB_FIELDS_BY_COLLECTION[collection];
  if (!rules) return data;
  const out = { ...data };
  for (const [field, replacer] of Object.entries(rules)) {
    if (field in out) out[field] = replacer(id);
  }
  return out;
}

async function cloneCollection(
  srcRef: FirebaseFirestore.CollectionReference,
  dstRef: FirebaseFirestore.CollectionReference,
  collectionName: string,
): Promise<number> {
  const snap = await srcRef.get();
  if (snap.empty) return 0;

  let total = 0;
  let batch = targetDb.batch();
  let opCount = 0;

  for (const doc of snap.docs) {
    const scrubbed = scrubDoc(collectionName, doc.id, doc.data());
    if (!DRY_RUN) {
      batch.set(dstRef.doc(doc.id), scrubbed);
      opCount++;
      if (opCount === 500) {
        await batch.commit();
        batch = targetDb.batch();
        opCount = 0;
      }
    }
    total++;

    // Recurse into subcollections (e.g. organizations/{id}/assets/...)
    const subcollections = await doc.ref.listCollections();
    for (const sub of subcollections) {
      const subTotal = await cloneCollection(sub, dstRef.doc(doc.id).collection(sub.id), sub.id);
      total += subTotal;
    }
  }
  if (!DRY_RUN && opCount > 0) await batch.commit();
  return total;
}

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

// ---------- Main ----------
(async () => {
  // Discover top-level collections at runtime unless an explicit allowlist was passed.
  let collections: string[];
  if (COLLECTION_FILTER) {
    collections = COLLECTION_FILTER;
  } else {
    const topLevel = await prodDb.listCollections();
    collections = topLevel.map((c) => c.id).sort();
  }

  console.log(`🚀 Cloning prod → ${TARGET} ${DRY_RUN ? '(DRY RUN)' : ''}`);
  console.log(`   Source : ${prodKey.project_id}`);
  console.log(`   Target : ${targetKey.project_id}`);
  console.log(`   Collections (${collections.length}): ${collections.join(', ')}`);
  console.log('');

  if (!DRY_RUN && !SKIP_CONFIRM) {
    const answer = await prompt(
      `⚠️  This will OVERWRITE matching docs in [${targetKey.project_id}]. Type "yes" to continue: `,
    );
    if (answer !== 'yes') {
      console.log('Aborted.');
      process.exit(0);
    }
  }

  for (const c of collections) {
    process.stdout.write(`  • ${c} ... `);
    const count = await cloneCollection(prodDb.collection(c), targetDb.collection(c), c);
    console.log(`${count} docs`);
  }

  console.log('\n✅ Done.');
  process.exit(0);
})().catch((err) => {
  console.error('❌ Clone failed:', err);
  process.exit(1);
});
