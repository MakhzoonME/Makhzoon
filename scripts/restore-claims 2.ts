/**
 * ============================================================================
 * Restore Firebase Auth custom claims from an auth export JSON.
 * ============================================================================
 *
 * firebase auth:import restores password hashes but silently drops
 * customAttributes (custom claims). This script reads the same export file
 * and applies claims to every user in the target project via the admin SDK.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=path/to/sa.json \
 *     npx ts-node scripts/restore-claims.ts <export-file.json>
 *
 * The service account must be for the TARGET project (stg or dev), not prod.
 * Download it from Firebase Console → Project Settings → Service Accounts.
 *
 * ============================================================================
 */

import * as fs from 'fs';
import * as admin from 'firebase-admin';

const [, , exportFile] = process.argv;

if (!exportFile) {
  console.error('Usage: npx ts-node scripts/restore-claims.ts <export-file.json>');
  console.error('       Set GOOGLE_APPLICATION_CREDENTIALS to the TARGET service account JSON.');
  process.exit(1);
}

if (!fs.existsSync(exportFile)) {
  console.error(`❌ File not found: ${exportFile}`);
  process.exit(1);
}

const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!credPath || !fs.existsSync(credPath)) {
  console.error('❌ GOOGLE_APPLICATION_CREDENTIALS must point to the TARGET service account JSON.');
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(credPath, 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
console.log(`\n🔑 Target project: ${serviceAccount.project_id}`);

interface ExportedUser {
  localId: string;
  email?: string;
  customAttributes?: string;
}
interface ExportData {
  users?: ExportedUser[];
}

async function main() {
  const raw = fs.readFileSync(exportFile, 'utf8');
  const data = JSON.parse(raw) as ExportData;
  const users = data.users ?? [];

  if (users.length === 0) {
    console.error('❌ No users found in export file.');
    process.exit(1);
  }

  console.log(`📋 Processing ${users.length} user(s) from ${exportFile}\n`);

  let restored = 0;
  let skipped = 0;
  let failed = 0;

  for (const user of users) {
    const label = user.email ?? user.localId;

    if (!user.customAttributes) {
      console.log(`  SKIP  ${label} — no customAttributes`);
      skipped++;
      continue;
    }

    let claims: Record<string, unknown>;
    try {
      claims = JSON.parse(user.customAttributes);
    } catch {
      console.warn(`  SKIP  ${label} — malformed customAttributes`);
      skipped++;
      continue;
    }

    if (!claims.role) {
      console.log(`  SKIP  ${label} — no role in claims`);
      skipped++;
      continue;
    }

    try {
      await admin.auth().setCustomUserClaims(user.localId, claims);
      console.log(`  ✅    ${label} → role=${claims.role}${claims.organizationId ? `, org=${claims.organizationId}` : ''}`);
      restored++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('no user record')) {
        // User doesn't exist in target yet — import may not have run
        console.warn(`  ⚠️    ${label} — user not found in target project (run auth:import first)`);
      } else {
        console.error(`  ❌    ${label} — ${msg}`);
      }
      failed++;
    }
  }

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`✅ Restored: ${restored}`);
  console.log(`⏭️  Skipped:  ${skipped}`);
  if (failed > 0) console.log(`❌ Failed:   ${failed}`);
  console.log('');

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error('❌ restore-claims failed:', err);
  process.exit(1);
});
