/**
 * ============================================================================
 * Cross-platform Firebase Auth user migration.
 * ============================================================================
 *
 * Runs `firebase auth:export` then `firebase auth:import` between two project
 * aliases declared in .firebaserc. Works on Windows PowerShell, macOS, and
 * Linux — no bash required.
 *
 * Usage:
 *   npx ts-node scripts/clone-auth.ts <source-alias> <target-alias>
 *
 * Aliases (from .firebaserc):
 *   legacy    office-asset-system
 *   prod      makhzoonme-prod
 *   staging   makhzoonme-stg
 *   dev       makhzoonme-dev
 *
 * Requirements:
 *   - `firebase login` complete locally
 *   - Same Google account has Owner role on both projects
 *   - Source project's password hash parameters available — find them via:
 *
 *       gcloud auth print-access-token  # then call:
 *       https://identitytoolkit.googleapis.com/admin/v2/projects/<id>/config
 *
 *     OR Firebase Console → Authentication → Users → ⋮ menu →
 *     "Password hash parameters" (Owner-only).
 *
 * IMPORTANT:
 *   - This OVERWRITES users in the target project that share the same UIDs.
 *   - The export JSON contains password hashes. Delete after import.
 * ============================================================================
 */

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as readline from 'readline';

// ---------- CLI args ----------
// Positional: <source-alias> <target-alias>
// Flags: --yes (skip confirmations; required for CI when target is prod/legacy)
const positional = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const flags = new Set(process.argv.slice(2).filter((a) => a.startsWith('--')));
const [SOURCE, TARGET] = positional;
const SKIP_CONFIRM = flags.has('--yes') || flags.has('-y');
if (!SOURCE || !TARGET) {
  console.error('Usage: clone-auth.ts <source-alias> <target-alias> [--yes]');
  process.exit(1);
}
if (SOURCE === TARGET) {
  console.error('❌ Source and target cannot be the same alias');
  process.exit(1);
}

// ---------- Helpers ----------
function prompt(question: string, opts: { silent?: boolean } = {}): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    if (opts.silent) {
      // Hide input for sensitive values like the signer key
      const stdout = process.stdout as NodeJS.WriteStream & { _writeToOutput?: (s: string) => void };
      const origWrite = stdout._writeToOutput?.bind(stdout);
      // Simple masked-input — the readline 'line' event will catch the answer
    }
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function runFirebase(args: string[]): Promise<number> {
  return new Promise((resolve, reject) => {
    // On Windows, Node 18+ refuses to spawn .cmd files without shell:true
    // (CVE-2024-27980 mitigation). Use shell:true so the shell resolves
    // `firebase` from PATH on every platform.
    const child = spawn('firebase', args, { stdio: 'inherit', shell: true });
    child.on('error', reject);
    child.on('exit', (code) => resolve(code ?? 0));
  });
}

// ---------- Main ----------
(async () => {
  // Refuse to overwrite production-class auth without explicit confirmation
  if (TARGET === 'prod' || TARGET === 'legacy') {
    if (SKIP_CONFIRM) {
      console.warn(`⚠️  Target is a production alias (${TARGET}). Proceeding due to --yes.`);
    } else {
      console.warn(`⚠️  Target is a production alias (${TARGET}).`);
      const ans = await prompt(`   Type 'yes' to overwrite production-class auth records: `);
      if (ans.toLowerCase() !== 'yes') {
        console.log('Aborted.');
        process.exit(0);
      }
    }
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15);
  const exportFile = `auth-export-${SOURCE}-${stamp}.json`;

  console.log(`\n📤 Exporting users from [${SOURCE}] → ${exportFile}`);
  const exportCode = await runFirebase(['auth:export', exportFile, '--project', SOURCE]);
  if (exportCode !== 0) {
    console.error(`❌ Export failed (exit ${exportCode}).`);
    process.exit(exportCode);
  }
  if (!fs.existsSync(exportFile) || fs.statSync(exportFile).size < 100) {
    console.error('❌ Export file is empty. Aborting.');
    process.exit(1);
  }
  const userCount = (fs.readFileSync(exportFile, 'utf8').match(/"localId"/g) ?? []).length;
  console.log(`   Exported ${userCount} user(s).\n`);

  // ---------- Hash parameters ----------
  // Env vars provide the unattended CI path; falls back to interactive prompts.
  // Get the values from:
  //   gcloud auth print-access-token
  //   GET https://identitytoolkit.googleapis.com/admin/v2/projects/<source-project-id>/config
  console.log(`📥 Importing into [${TARGET}]`);
  const envHashAlgo = process.env.AUTH_HASH_ALGO;
  const envHashKey  = process.env.AUTH_HASH_KEY;
  const envSaltSep  = process.env.AUTH_SALT_SEPARATOR;
  const envRounds   = process.env.AUTH_HASH_ROUNDS;
  const envMemCost  = process.env.AUTH_HASH_MEM_COST;
  const fromEnv = !!(envHashAlgo && envHashKey && envSaltSep && envRounds && envMemCost);
  if (!fromEnv) {
    console.log('');
    console.log("   You need the SOURCE project's hash parameters.");
    console.log("   Get them via gcloud:");
    console.log(`     gcloud auth print-access-token`);
    console.log(`     # Then GET https://identitytoolkit.googleapis.com/admin/v2/projects/<source-project-id>/config`);
    console.log("   Or set: AUTH_HASH_ALGO, AUTH_HASH_KEY, AUTH_SALT_SEPARATOR, AUTH_HASH_ROUNDS, AUTH_HASH_MEM_COST.");
    console.log('');
  } else {
    console.log('   (hash parameters supplied via AUTH_HASH_* env vars)');
  }
  const hashAlgo = envHashAlgo ?? await prompt('   hash-algo (e.g. SCRYPT): ');
  const hashKey  = envHashKey  ?? await prompt('   hash-key (signerKey, base64): ');
  const saltSep  = envSaltSep  ?? await prompt('   salt-separator (base64): ');
  const rounds   = envRounds   ?? await prompt('   rounds (e.g. 8): ');
  const memCost  = envMemCost  ?? await prompt('   mem-cost (e.g. 14): ');
  console.log('');

  const importCode = await runFirebase([
    'auth:import',
    exportFile,
    '--project', TARGET,
    `--hash-algo=${hashAlgo}`,
    `--hash-key=${hashKey}`,
    `--salt-separator=${saltSep}`,
    `--rounds=${rounds}`,
    `--mem-cost=${memCost}`,
  ]);
  if (importCode !== 0) {
    console.error(`❌ Import failed (exit ${importCode}). Export file kept for retry: ${exportFile}`);
    process.exit(importCode);
  }

  console.log('\n✅ Auth users cloned.');

  // Cleanup — try to delete, fallback to instruction
  try {
    fs.unlinkSync(exportFile);
    console.log(`   Deleted export file: ${exportFile}`);
  } catch (err) {
    console.log(`\n🗑️  IMPORTANT — delete the export file manually (contains password hashes):`);
    console.log(`     ${exportFile}`);
  }
})().catch((err) => {
  console.error('❌ clone-auth failed:', err);
  process.exit(1);
});
