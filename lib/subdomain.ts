import { headers } from 'next/headers';

const RESERVED = new Set(['', 'www', 'app', 'admin', 'api', 'static']);

// Platform hosts where the apex (e.g. makhzoon.vercel.app) is the app itself, not a subdomain.
// Any host ending in one of these is treated as "no subdomain" regardless of label count.
const PLATFORM_SUFFIXES = ['.vercel.app', '.netlify.app', '.pages.dev', '.onrender.com', '.fly.dev'];

export function extractSubdomain(host: string | null | undefined): string | null {
  if (!host) return null;
  const bare = host.split(':')[0].toLowerCase();
  if (bare === 'localhost' || bare === '127.0.0.1' || /^\d{1,3}(\.\d{1,3}){3}$/.test(bare)) return null;
  if (PLATFORM_SUFFIXES.some((s) => bare.endsWith(s))) return null;
  const parts = bare.split('.');

  // localhost dev: testco.localhost -> ['testco', 'localhost']
  if (parts.length === 2 && parts[1] === 'localhost') {
    const sub = parts[0];
    return RESERVED.has(sub) ? null : sub;
  }

  // Production: testco.example.com -> ['testco', 'example', 'com']
  if (parts.length >= 3) {
    const sub = parts[0];
    return RESERVED.has(sub) ? null : sub;
  }

  return null;
}

export async function getRequestSubdomain(): Promise<string | null> {
  try {
    const h = await headers();
    return extractSubdomain(h.get('host'));
  } catch {
    return null;
  }
}

export function getCookieDomain(host: string | null | undefined): string | undefined {
  if (!host) return undefined;
  const bare = host.split(':')[0].toLowerCase();
  // Don't set Domain for localhost / IP — Chrome inconsistently accepts Domain=.localhost.
  // Cookie scopes to the exact origin, which is what we want for admin/staff per-tenant.
  // Super-admin cross-subdomain handoff is handled via a bounce endpoint, not a shared cookie.
  if (bare === 'localhost' || bare.endsWith('.localhost')) return undefined;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(bare)) return undefined;
  const parts = bare.split('.');
  if (parts.length >= 2) return '.' + parts.slice(-2).join('.');
  return undefined;
}
