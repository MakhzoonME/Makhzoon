import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join, relative } from 'path';

/**
 * Contract test for the supabaseAdmin (service-role, RLS-bypassing) client
 * (audit finding + docs/SECURITY.md "The supabaseAdmin rule").
 *
 * Every API route that uses the admin client MUST manually scope its queries
 * by organization_id — RLS won't do it for them. This test enumerates all
 * admin-client routes and requires each to EITHER reference organization_id
 * OR appear in the documented allowlist of routes that legitimately do not
 * scope by org (public token lookups, pre-auth, platform-wide superadmin,
 * per-user rows keyed by the authed uid).
 *
 * A new route that reaches for supabaseAdmin without org scoping and isn't
 * consciously added to the allowlist will fail here — that is the point.
 */

const API_DIR = join(process.cwd(), 'app', 'api');

// Routes that genuinely never reference organization_id, each with a reason.
// (Routes that DO reference it — public token/slug lookups, cron, session —
// pass the main check on their own and don't belong here.)
const CROSS_TENANT_ALLOWLIST: Record<string, string> = {
  'auth/password-reset/route.ts': 'pre-auth: token lookup, no org context yet',
  'auth/send-password-reset/route.ts': 'pre-auth: email lookup, no org context yet',
  'push-subscriptions/route.ts': 'per-user/device subscription keyed by uid',
  'users/[userId]/reset-password/route.ts': 'admin-guarded user admin action, keyed by uid',
  'users/[userId]/route.ts': 'admin-guarded user admin action (role/permissions), keyed by uid',
};

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else if (entry.name === 'route.ts') out.push(p);
  }
  return out;
}

function usesAdminClient(src: string): boolean {
  return src.includes('supabaseAdmin') || src.includes('getSupabaseAdmin');
}

function scopesByOrg(src: string): boolean {
  return src.includes('organization_id');
}

describe('supabaseAdmin tenant-scoping contract', () => {
  const routes = walk(API_DIR).map((f) => relative(API_DIR, f).replace(/\\/g, '/'));

  it('finds admin-client routes to check (guards against a broken glob)', () => {
    const adminRoutes = routes.filter((r) => usesAdminClient(readFileSync(join(API_DIR, r), 'utf8')));
    expect(adminRoutes.length).toBeGreaterThan(10);
  });

  it('every admin-client route scopes by organization_id or is explicitly allowlisted', () => {
    const offenders: string[] = [];
    for (const rel of routes) {
      const src = readFileSync(join(API_DIR, rel), 'utf8');
      if (!usesAdminClient(src)) continue;
      if (scopesByOrg(src)) continue;
      if (rel in CROSS_TENANT_ALLOWLIST) continue;
      offenders.push(rel);
    }
    expect(offenders, `Unscoped admin-client routes (add org scoping, or allowlist with a reason):\n${offenders.join('\n')}`).toEqual([]);
  });

  it('allowlist has no stale entries (every entry still exists and still uses the admin client unscoped)', () => {
    const stale: string[] = [];
    for (const rel of Object.keys(CROSS_TENANT_ALLOWLIST)) {
      let src: string;
      try {
        src = readFileSync(join(API_DIR, rel), 'utf8');
      } catch {
        stale.push(`${rel} (file missing)`);
        continue;
      }
      if (!usesAdminClient(src) || scopesByOrg(src)) {
        stale.push(`${rel} (no longer an unscoped admin-client route)`);
      }
    }
    expect(stale, `Stale allowlist entries to remove:\n${stale.join('\n')}`).toEqual([]);
  });
});
