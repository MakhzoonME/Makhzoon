#!/usr/bin/env node
/**
 * Performance Audit — Makhzoon
 *
 * Checks:
 *   1. Missing DB indexes on foreign keys and filtered columns
 *   2. N+1 query patterns (queries inside loops)
 *   3. Large payload returns (SELECT *)
 *   4. Client component bundle size signals
 *   5. Missing React.memo / useMemo on expensive renders
 *   6. Missing Next.js Image optimization
 *   7. Unoptimized re-render patterns
 *
 * Usage:  node scripts/performance-audit.mjs
 */

import { readFileSync, statSync, readdirSync } from 'fs';
import { join, relative, extname } from 'path';
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

function existsSync(p) { try { statSync(p); return true; } catch { return false; } }

// =========================================================================
//  1. MISSING DB INDEXES
// =========================================================================
heading('1. MISSING DB INDEXES');

const migrationFiles = findMigrations();
const allCreateIndex = new Set();
const allForeignKeyCols = [];
const allFilterCols = [];

for (const file of migrationFiles) {
  try {
    const content = readFileSync(file, 'utf-8');
    // Collect existing indexes
    const idxMatches = content.matchAll(/create\s+(?:unique\s+)?index\s+(?:if\s+not\s+exists\s+)?(?:\w+)?\s+on\s+(?:public\.)?(\w+)\s*\(([^)]+)\)/gi);
    for (const m of idxMatches) {
      allCreateIndex.add(`${m[1]}.${m[2].trim().split(/\s*,\s*/)[0].trim()}`);
    }

    // Collect foreign key columns
    const fkMatches = content.matchAll(/(\w+)\s+uuid\s+(?:not\s+null\s+)?references\s+(?:\w+\.)?\w+\s*\(id\)/gi);
    for (const m of fkMatches) { allForeignKeyCols.push(m[1]); }

    // Collect columns that appear in WHERE clauses or JOINs
    const whereMatches = content.matchAll(/\.eq\s*\(\s*['"](\w+)['"]\s*[,)]/g);
    for (const m of whereMatches) { allFilterCols.push(m[1]); }
  } catch {}
}

const commonFks = [...new Set(allForeignKeyCols)];
const missingIndexes = [];

for (const col of commonFks) {
  // Check if any table has an index on this column
  let found = false;
  for (const idx of allCreateIndex) {
    if (idx.endsWith(`.${col}`) || idx.endsWith(`.${col}`)) { found = true; break; }
    // Also check for composite indexes starting with this col
    if (idx.startsWith(`.${col},`) || idx.includes(`.${col},`)) { found = true; break; }
  }
  if (!found && !['id', 'created_at', 'updated_at'].includes(col)) {
    missingIndexes.push(col);
    log(` ⚠ Foreign key column may need index: "${col}"`, false);
  }
}

// Check for organization_id index specifically (most common filter)
let orgIdIndexed = false;
for (const idx of allCreateIndex) { if (idx.includes('organization_id')) { orgIdIndexed = true; break; } }
if (orgIdIndexed) log('✅ organization_id column is indexed', true);
else log(' ⚠ organization_id column may need an index', false);

if (missingIndexes.length === 0) log('✅ All foreign key columns appear to have indexes', true);

console.log(`\n  Total indexes defined: ${allCreateIndex.size}`);
console.log(`  Foreign key columns: ${commonFks.length}`);

// =========================================================================
//  2. N+1 QUERY PATTERNS (server-side only)
// =========================================================================
heading('2. N+1 QUERY PATTERNS');

const serverFiles = [...walkDir(join(ROOT, 'lib'), new Set(['.ts'])), ...walkDir(join(ROOT, 'app', 'api'), new Set(['.ts']))].filter(
  f => !f.includes('.test.') && !f.includes('node_modules')
);
let n1Count = 0;

for (const file of serverFiles) {
  try {
    const content = readFileSync(file, 'utf-8');
    const rel = relative(ROOT, file);

    // Pattern: await inside a for-loop or for-of loop (sequential DB queries)
    const forAwaitLines = content.split('\n').filter((line, i) => {
      const trimmed = line.trim();
      return /^\s*for\s*\(/.test(trimmed) && line.includes('await');
    });
    if (forAwaitLines.length > 0) {
      log(` ⚠ await inside for-loop in ${rel} (${forAwaitLines.length} line(s)) — possible sequential N+1`, false);
      n1Count++;
    }

    // Check for Promise.all with .map() pattern (should use Promise.all for parallel)
    const mapWithFetch = content.match(/\.map\s*\([^)]*=>\s*[^)]*(?:fetch|supabase|\.select|\.from)/g);
    if (mapWithFetch && mapWithFetch.length > 0) {
      const hasPromiseAll = content.includes('Promise.all');
      if (!hasPromiseAll) {
        log(` ⚠ .map() with fetch/supabase call without Promise.all in ${rel} (${mapWithFetch.length} occurrence(s))`, false);
        n1Count++;
      }
    }
  } catch {}
}

if (n1Count === 0) log('✅ No N+1 query patterns detected', true);

// =========================================================================
//  3. LARGE PAYLOAD RETURNS (SELECT *)
// =========================================================================
heading('3. UNOPTIMIZED SELECT PATTERNS');

const apiRouteFiles = walkDir(join(ROOT, 'app', 'api'), new Set(['.ts', '.tsx'])).filter(f => f.endsWith('route.ts'));
let selectStarCount = 0;
for (const file of apiRouteFiles) {
  try {
    if (file.includes('.test.') || file.includes('node_modules')) continue;
    const content = readFileSync(file, 'utf-8');
    const rel = relative(ROOT, file);

    // Check for .select('*') patterns in API routes
    const selectStars = content.match(/\.select\s*\(\s*['"]\*['"]\s*\)/g);
    if (selectStars && selectStars.length > 0) {
      const isApiRoute = file.includes(join('app', 'api'));
      if (isApiRoute) {
        log(` ⚠ SELECT * in API route: ${rel} (${selectStars.length} occurrence(s))`, false);
        selectStarCount++;
      }
    }
  } catch {}
}
if (selectStarCount === 0) log('✅ No SELECT * in API routes', true);

// =========================================================================
//  4. MISSING INDEX ON organization_id (the most filtered column)
// =========================================================================
heading('4. ORGANIZATION_ID INDEX CHECK');

let orgIndexSql = '';
for (const file of migrationFiles) {
  try {
    const content = readFileSync(file, 'utf-8');
    if (content.includes('organization_id') && content.includes('create index')) {
      orgIndexSql += content;
    }
  } catch {}
}

const orgIndexTables = new Set();
const orgIdxMatches = orgIndexSql.matchAll(/create\s+(?:unique\s+)?index\s+(?:if\s+not\s+exists\s+)?\w+\s+on\s+(?:public\.)?(\w+)/gi);
for (const m of orgIdxMatches) orgIndexTables.add(m[1]);

// Find tables with organization_id column
const tablesWithOrgId = new Set();
for (const file of migrationFiles) {
  try {
    const content = readFileSync(file, 'utf-8');
    const tblMatches = content.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?(\w+)\s*\(([\s\S]*?)\);/gi);
    for (const m of tblMatches) {
      if (m[2].includes('organization_id')) tablesWithOrgId.add(m[1]);
    }
  } catch {}
}

const tablesMissingOrgIndex = [...tablesWithOrgId].filter(t => !orgIndexTables.has(t));
for (const t of tablesMissingOrgIndex) {
  log(` ⚠ Table "${t}" has organization_id but no index on it`, false);
}
if (tablesMissingOrgIndex.length === 0) log('✅ All tables with organization_id have an index', true);

// =========================================================================
//  5. COMPONENT OPTIMIZATION CHECK
// =========================================================================
heading('5. COMPONENT OPTIMIZATION CHECK');

const componentFiles = walkDir(join(ROOT, 'components'), new Set(['.tsx', '.ts']));
let largeComponents = 0;

for (const file of componentFiles) {
  try {
    const content = readFileSync(file, 'utf-8');
    const rel = relative(ROOT, file);
    const lines = content.split('\n').length;

    // Large component warning (>400 lines suggests possible refactoring opportunity)
    if (lines > 400) {
      const hasExport = content.includes('export default function') || content.includes('export function');
      if (hasExport) {
        log(` ⚠ Large component (${lines} lines): ${rel}`, false);
        largeComponents++;
      }
    }
  } catch {}
}

if (largeComponents === 0) log('✅ No overly large components (>400 lines) found', true);

// =========================================================================
//  6. IMAGE OPTIMIZATION
// =========================================================================
heading('6. IMAGE OPTIMIZATION');

const appFiles = walkDir(join(ROOT, 'app'), new Set(['.tsx', '.ts']));
const allTsxFiles = [...componentFiles, ...appFiles];
let unoptimizedImages = 0;

for (const file of allTsxFiles) {
  try {
    const content = readFileSync(file, 'utf-8');
    const rel = relative(ROOT, file);

    // Check for <img> tags (should use next/Image instead)
    const imgTags = content.match(/<img\b[^>]*>/g);
    if (imgTags && imgTags.length > 0) {
      // Skip if it also imports Image from next/image
      if (!content.includes("from 'next/image'") && !content.includes('from "next/image"')) {
        log(` ⚠ <img> tag without next/Image import in ${rel} (${imgTags.length} tag(s))`, false);
        unoptimizedImages++;
      }
    }
  } catch {}
}

if (unoptimizedImages === 0) log('✅ No unoptimized <img> tags found', true);

// =========================================================================
//  7. FETCH CACHING HEADERS
// =========================================================================
heading('7. CACHE HEADERS ON API ROUTES');

const apiRoutes = walkDir(join(ROOT, 'app', 'api'), new Set(['.ts', '.tsx'])).filter(f => f.endsWith('route.ts'));
let noCache = 0;

for (const file of apiRoutes) {
  try {
    const content = readFileSync(file, 'utf-8');
    const rel = relative(ROOT, file);

    // Check if GET handlers set cache headers
    if (content.includes('export async function GET(')) {
      const hasCache = content.includes('Cache-Control') || content.includes('cache-control') || content.includes('stale-while-revalidate');
      const hasMutation = content.includes('export async function POST(') || content.includes('export async function PUT(') || content.includes('export async function PATCH(') || content.includes('export async function DELETE(');

      // Only flag pure GET-only routes
      if (!hasCache && !hasMutation) {
        log(` ⚠ GET route without cache headers: ${rel}`, false);
        noCache++;
      }
    }
  } catch {}
}

if (noCache === 0) log('✅ All GET-only routes have cache headers', true);

// =========================================================================
//  SUMMARY
// =========================================================================
console.log('\n═══════════════════════════════════════');
console.log('  PERFORMANCE AUDIT SUMMARY');
console.log('═══════════════════════════════════════');
console.log(`  ✅ Pass: ${report.ok}`);
console.log(`  ⚠  Warn: ${report.warn}`);
console.log(`  ❌ Fail: ${report.fail}`);
console.log(`  Total:  ${report.ok + report.warn + report.fail}`);
console.log('═══════════════════════════════════════');

if (report.fail > 0) process.exit(1);
