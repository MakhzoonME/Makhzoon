#!/usr/bin/env node
/**
 * Security Audit — Makhzoon
 *
 * Checks:
 *   1. API routes missing auth guards
 *   2. Mutating API routes missing input validation (Zod)
 *   3. Secret env vars leaked to client code
 *   4. Dangerous code patterns (eval, innerHTML, etc.)
 *   5. Hardcoded secrets/tokens in source
 *   6. Server-only modules missing 'server-only' import
 *   7. RLS policy coverage across tables
 *
 * Usage:  node scripts/security-audit.mjs
 */

import { readFileSync, statSync, readdirSync } from 'fs';
import { join, relative, extname, sep } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const IGNORE_DIRS = new Set(['node_modules', '.next', '.open-next', '.wrangler', '.opencode', '.agents', '.claude', '.claude-flow', '.swarm', 'coverage', '.git', '.github']);

const report = { ok: 0, warn: 0, fail: 0, items: [] };

function log(msg, ok) {
  report.items.push({ msg, ok });
  if (ok) report.ok++;
  else if (msg.startsWith(' ⚠')) report.warn++;
  else report.fail++;
  console.log(msg);
}

function heading(s) {
  console.log(`\n═══ ${s} ═══`);
}

// Recursive file listing
function walkDir(dir, extSet = null) {
  const files = [];
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = join(dir, e.name);
      if (e.isDirectory()) {
        if (!IGNORE_DIRS.has(e.name)) files.push(...walkDir(full, extSet));
      } else if (e.isFile()) {
        if (!extSet || extSet.has(extname(e.name).toLowerCase())) files.push(full);
      }
    }
  } catch {}
  return files;
}

function findApiRoutes() {
  return walkDir(join(ROOT, 'app', 'api'), new Set(['.ts', '.tsx'])).filter(f => f.endsWith('route.ts') || f.endsWith('route.tsx'));
}

function findSourceFiles(extSet = new Set(['.ts', '.tsx', '.js', '.jsx'])) {
  const dirs = ['app', 'lib', 'hooks', 'components', 'store'];
  const files = [];
  for (const d of dirs) {
    const p = join(ROOT, d);
    if (existsSync(p)) files.push(...walkDir(p, extSet));
  }
  return files;
}

function findMigrations() {
  return walkDir(join(ROOT, 'supabase', 'migrations'), new Set(['.sql']));
}

function findClientFiles() {
  const all = findSourceFiles(new Set(['.tsx', '.ts']));
  return all.filter(f => {
    try {
      const c = readFileSync(f, 'utf-8');
      return c.includes("'use client'") || c.includes('"use client"');
    } catch { return false; }
  });
}

function existsSync(p) { try { statSync(p); return true; } catch { return false; } }

// =========================================================================
//  COLLECT API ROUTES
// =========================================================================
heading('SCANNING API ROUTES');
const apiRoutes = findApiRoutes();
console.log(`  Found ${apiRoutes.length} API route files`);

// =========================================================================
//  1. AUTH GUARDS ON API ROUTES
// =========================================================================
heading('1. AUTH GUARDS ON EXPORTED HANDLERS');
const authPatterns = ['verifySessionCookie', 'resolveTenant', 'requirePermission', 'getAuthenticatedUser', 'requireAuth', 'getServerSession', 'requireRole'];
// Routes that are intentionally public (webhooks, pre-auth, etc.)
const publicRoutes = new Set([
  'auth/check-email', 'auth/password-reset', 'auth/session',
  'ping', 'contact', 'early-access',
  'cron/', 'delivery/', 'packages/public',
  'invites/',
  'haraka/card-payment-result',   // webhook — HMAC signature verification
  'organizations/check-subdomain', // pre-signup — rate-limited
]);
let uncheckedCount = 0;

for (const file of apiRoutes) {
  const content = readFileSync(file, 'utf-8');
  const rel = relative(ROOT, file);
  // Skip routes that are explicitly public or are known public endpoints
  const isPublic = content.includes('// public') || content.includes('/* public */') ||
    [...publicRoutes].some(r => rel.replace(/\\/g, '/').includes(r));
  if (isPublic) continue;

  // Find all exported async functions (GET, POST, PUT, PATCH, DELETE)
  const handlers = content.match(/export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)\s*\(/g);
  if (!handlers) continue;
  const hasGuard = authPatterns.some(p => content.includes(p));
  if (!hasGuard) {
    log(`❌ No auth guard in ${rel} (handlers: ${handlers.map(h => h.replace('export async function ', '')).join(', ')})`, false);
    uncheckedCount++;
  }
}
if (uncheckedCount === 0) log('✅ All API route handlers have auth guards', true);

// =========================================================================
//  2. INPUT VALIDATION ON MUTATING ROUTES
// =========================================================================
heading('2. INPUT VALIDATION ON MUTATING API ROUTES');

const mutatingHandlers = ['POST', 'PUT', 'PATCH'];
let missingVal = 0;

for (const file of apiRoutes) {
  const content = readFileSync(file, 'utf-8');
  const rel = relative(ROOT, file);
  const hasMutation = mutatingHandlers.some(m => content.includes(`export async function ${m}(`));
  if (!hasMutation) continue;

  const hasValidation = content.includes('safeParse') || content.includes('.parse(') ||
    content.includes('z.object') || content.includes("from 'zod'") || content.includes('from "zod"');

  if (!hasValidation) {
    log(` ⚠ Mutating route without Zod validation: ${rel}`, false);
    missingVal++;
  }
}
if (missingVal === 0) log('✅ All mutating routes use input validation', true);
else log(` ⚠ ${missingVal} route(s) may be missing input validation`, false);

// =========================================================================
//  3. SECRET ENV VARS LEAKED TO CLIENT
// =========================================================================
heading('3. SECRET ENV VAR LEAKAGE TO CLIENT CODE');

const secretEnvPatterns = [
  'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET',
  'RESEND_API_KEY', 'ENCRYPTION_KEY',
  'JWT_SECRET', 'PRIVATE_KEY',
];
const clientFiles = findClientFiles();
let leakedCount = 0;

for (const file of clientFiles) {
  const content = readFileSync(file, 'utf-8');
  const rel = relative(ROOT, file);
  for (const pat of secretEnvPatterns) {
    if (content.includes(pat) && !content.includes('.example')) {
      log(`❌ Secret env var "${pat}" referenced in client code: ${rel}`, false);
      leakedCount++;
      break;
    }
  }
}
if (leakedCount === 0) log('✅ No secret env vars leaked to client code', true);

// =========================================================================
//  4. DANGEROUS CODE PATTERNS
// =========================================================================
heading('4. DANGEROUS CODE PATTERNS');

const sourceFiles = findSourceFiles();
const dangerChecks = [
  { pattern: 'eval(', desc: 'eval() usage' },
  { pattern: 'new Function(', desc: 'new Function() usage' },
  { pattern: 'dangerouslySetInnerHTML', desc: 'dangerouslySetInnerHTML' },
  { pattern: '.innerHTML =', desc: 'innerHTML assignment' },
  { pattern: 'document.write(', desc: 'document.write()' },
];

for (const { pattern, desc } of dangerChecks) {
  let found = 0;
  for (const file of sourceFiles) {
    try {
      const content = readFileSync(file, 'utf-8');
      // Skip test files and node_modules
      if (file.includes('.test.') || file.includes('node_modules')) continue;
      if (content.includes(pattern)) {
        const rel = relative(ROOT, file);
        log(` ⚠ ${desc} found in ${rel}`, false);
        found++;
      }
    } catch {}
  }
  if (found === 0) log(`✅ No ${desc} found`, true);
}

// =========================================================================
//  5. HARDCODED SECRETS
// =========================================================================
heading('5. HARDCODED SECRETS / TOKENS');

const secretChecks = [
  { regex: /(?:api[_-]?key|secret|token|password)\s*[:=]\s*['"](?:sk_|pk_|test_|prod_|live_|sandbox_|whsec_|wh_[a-z])[A-Za-z0-9_]{10,}/i, desc: 'Potential API key/token' },
];

for (const { regex, desc } of secretChecks) {
  let found = 0;
  for (const file of sourceFiles) {
    try {
      if (file.includes('.test.') || file.includes('example') || file.includes('/node_modules/') || file.includes('.env.')) continue;
      const content = readFileSync(file, 'utf-8');
      if (regex.test(content)) {
        const rel = relative(ROOT, file);
        log(` ⚠ ${desc}: ${rel}`, false);
        found++;
      }
    } catch {}
  }
  if (found === 0) log(`✅ No ${desc} found in source`, true);
}

// =========================================================================
//  6. SERVER-ONLY IMPORT CHECK
// =========================================================================
heading('6. SERVER-ONLY IMPORT CHECK');

const libFiles = walkDir(join(ROOT, 'lib'), new Set(['.ts']));
let missingServerOnly = 0;

for (const file of libFiles) {
  try {
    const content = readFileSync(file, 'utf-8');
    if (content.includes("'use client'") || content.includes('"use client"')) continue;
    if (content.includes("'server-only'") || content.includes('"server-only"')) continue;
    if (content.includes('supabaseAdmin') || content.includes('@/lib/supabase/admin') || content.includes('getSupabaseAdmin')) {
      const rel = relative(ROOT, file);
      log(` ⚠ Uses supabaseAdmin but missing 'server-only' import: ${rel}`, false);
      missingServerOnly++;
    }
  } catch {}
}
if (missingServerOnly === 0) log('✅ All supabaseAdmin consumers have server-only import', true);

// =========================================================================
//  7. RLS COVERAGE
// =========================================================================
heading('7. RLS POLICY COVERAGE');

const migrationFiles = findMigrations();
const allTables = [];
const rlsEnabled = new Set();
const rlsPolicies = new Set();

for (const file of migrationFiles) {
  try {
    const content = readFileSync(file, 'utf-8');
    const tblMatches = content.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?(\w+)/gi);
    for (const m of tblMatches) allTables.push(m[1]);

    const rlsMatches = content.matchAll(/alter\s+table\s+(?:public\.)?(\w+)\s+enable\s+row\s+level\s+security/gi);
    for (const m of rlsMatches) rlsEnabled.add(m[1]);

    const policyMatches = content.matchAll(/(?:create\s+policy|CREATE\s+POLICY).+?on\s+(?:public\.)?(\w+)/gis);
    for (const m of policyMatches) rlsPolicies.add(m[1]);
  } catch {}
}

const uniqueTables = [...new Set(allTables)];
const tablesWithRLS = new Set([...rlsEnabled, ...rlsPolicies]);
const missingRLS = uniqueTables.filter(t => !tablesWithRLS.has(t));

// Filter out system/internal tables that may not need RLS
const skipTables = new Set(['revoked_sessions', 'password_reset_tokens', 'audit_logs', 'backend_logs']);
const trulyMissing = missingRLS.filter(t => !skipTables.has(t));

if (trulyMissing.length === 0) {
  log('✅ All application tables have RLS policies', true);
} else {
  for (const t of trulyMissing) {
    log(` ⚠ Table may be missing RLS: ${t}`, false);
  }
}

// Print RLS coverage
console.log(`\n  Total tables: ${uniqueTables.length}`);
console.log(`  Tables with RLS: ${tablesWithRLS.size}`);
console.log(`  Tables without RLS: ${trulyMissing.length}`);

// =========================================================================
//  SUMMARY
// =========================================================================
console.log('\n══════════════════════════════════════');
console.log('  SECURITY AUDIT SUMMARY');
console.log('══════════════════════════════════════');
console.log(`  ✅ Pass: ${report.ok}`);
console.log(`  ⚠  Warn: ${report.warn}`);
console.log(`  ❌ Fail: ${report.fail}`);
console.log(`  Total:  ${report.ok + report.warn + report.fail}`);
console.log('══════════════════════════════════════');

if (report.fail > 0) process.exit(1);
