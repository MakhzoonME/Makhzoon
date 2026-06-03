/**
 * Current deployment environment indicator for UI affordances (env badge).
 * Prefers the explicit NEXT_PUBLIC_APP_ENV; falls back to inferring from the
 * Supabase project URL. (Previously lived in lib/firebase/client.ts.)
 */
export const APP_ENV: 'production' | 'staging' | 'development' =
  (process.env.NEXT_PUBLIC_APP_ENV as
    | 'production'
    | 'staging'
    | 'development'
    | undefined) ??
  (() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
    if (url.includes('prod')) return 'production';
    if (url.includes('staging') || url.includes('stg')) return 'staging';
    return 'development';
  })();

/**
 * Base URL for the public receipt app (rcpt-*.makhzoon.me), matched to the
 * environment the user is currently on. NEXT_PUBLIC_RECEIPT_URL is inlined at
 * build time and the CI build has no per-env value, so it would bake the same
 * host into every deployment. Deriving from the live hostname keeps dev →
 * rcpt-dev, stg → rcpt-stg, app → rcpt-app — and ensures the preview reads the
 * same database the settings page wrote to.
 */
export function getReceiptBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host.endsWith('makhzoon.me')) {
      const sub = host.split('.')[0];
      const env = sub === 'dev' || sub === 'stg' ? sub : 'app';
      return `https://rcpt-${env}.makhzoon.me`;
    }
  }
  // Localhost / SSR fallback: explicit env var, else production receipt host.
  return (process.env.NEXT_PUBLIC_RECEIPT_URL ?? 'https://rcpt-app.makhzoon.me').replace(/\/$/, '');
}
