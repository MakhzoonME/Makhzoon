import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join, relative } from 'path';

/**
 * Contract test mirroring scripts/security-audit.mjs checks 1 & 2, promoted
 * into the test suite so CI blocks a regression instead of relying on someone
 * running the script. Keep the two allowlists in sync with that script.
 */

const API_DIR = join(process.cwd(), 'app', 'api');

const AUTH_PATTERNS = [
  'verifySessionCookie', 'resolveTenant', 'requirePermission',
  'getAuthenticatedUser', 'requireAuth', 'getServerSession', 'requireRole',
];

// Intentionally public routes (webhooks, pre-auth, public shares).
const PUBLIC_ROUTES = [
  'auth/check-email', 'auth/password-reset', 'auth/session',
  'ping', 'contact', 'early-access', 'cron/', 'delivery/', 'packages/public',
  'invites/', 'haraka/card-payment-result', 'organizations/check-subdomain',
  'auth/send-password-reset', 'public/assets', 'push-subscriptions/vapid-key',
];

const MUTATING = ['POST', 'PUT', 'PATCH'];

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else if (entry.name === 'route.ts') out.push(p);
  }
  return out;
}

const routes = walk(API_DIR).map((f) => ({
  rel: relative(API_DIR, f).replace(/\\/g, '/'),
  src: readFileSync(f, 'utf8'),
}));

function isPublic(rel: string, src: string): boolean {
  return src.includes('// public') || src.includes('/* public */') ||
    PUBLIC_ROUTES.some((r) => rel.includes(r));
}

describe('API auth-guard contract', () => {
  it('every non-public route with exported handlers has an auth guard', () => {
    const offenders: string[] = [];
    for (const { rel, src } of routes) {
      if (isPublic(rel, src)) continue;
      if (!/export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)\s*\(/.test(src)) continue;
      if (!AUTH_PATTERNS.some((p) => src.includes(p))) offenders.push(rel);
    }
    expect(offenders, `Routes missing an auth guard:\n${offenders.join('\n')}`).toEqual([]);
  });
});

describe('API input-validation contract', () => {
  it('every mutating route that reads a body validates it with zod', () => {
    const offenders: string[] = [];
    for (const { rel, src } of routes) {
      const hasMutation = MUTATING.some((m) => src.includes(`export async function ${m}(`));
      if (!hasMutation) continue;
      const readsBody = src.includes('.json()') || src.includes('.formData()') || src.includes('.text()');
      if (!readsBody) continue;
      const hasValidation = src.includes('safeParse') || src.includes('.parse(') ||
        src.includes('z.object') || src.includes("from 'zod'") || src.includes('from "zod"');
      if (!hasValidation) offenders.push(rel);
    }
    expect(offenders, `Mutating routes missing zod validation:\n${offenders.join('\n')}`).toEqual([]);
  });
});
