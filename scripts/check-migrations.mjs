#!/usr/bin/env node
/**
 * Migration-sequence guard (T2.4).
 *
 * Fails CI if the supabase/migrations directory has:
 *   - a duplicate numeric prefix (two files claiming the same slot), or
 *   - a file that doesn't match the NNNN_name.sql convention.
 *
 * Numeric GAPS are allowed (0018/0020 are absent by history) — a gap is
 * harmless; a duplicate or a descending re-use is not, because `db push`
 * applies in lexical order and a collision silently shadows a migration.
 */
import { readdirSync } from 'fs';
import { join } from 'path';

const DIR = join(process.cwd(), 'supabase', 'migrations');
const files = readdirSync(DIR).filter((f) => f.endsWith('.sql')).sort();

const errors = [];
const seen = new Map();

for (const f of files) {
  const m = f.match(/^(\d{4})_[a-z0-9_]+\.sql$/i);
  if (!m) {
    errors.push(`Malformed migration name: ${f} (expected NNNN_name.sql)`);
    continue;
  }
  const num = m[1];
  if (seen.has(num)) {
    errors.push(`Duplicate migration number ${num}: ${seen.get(num)} and ${f}`);
  } else {
    seen.set(num, f);
  }
}

if (errors.length) {
  console.error('✖ Migration sequence check failed:');
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}

console.log(`✓ ${files.length} migrations, numbering clean (highest: ${[...seen.keys()].sort().at(-1)})`);
