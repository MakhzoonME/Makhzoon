/**
 * Identifies the exact deployed build (CI sets this to the git commit SHA).
 * Defaults to 'dev' locally, where every load trivially "matches" so the
 * update-available banner never fires outside a real deployment.
 */
export const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID ?? 'dev';

/**
 * Current deployment environment indicator for UI affordances (env badge).
 * Prefers the explicit NEXT_PUBLIC_APP_ENV; falls back to inferring from the
 * Supabase project URL. (Previously lived in lib/firebase/client.ts.)
 */
export const APP_ENV: 'production' | 'staging' | 'development' | 'support' =
  (process.env.NEXT_PUBLIC_APP_ENV as
    | 'production'
    | 'staging'
    | 'development'
    | 'support'
    | undefined) ??
  (() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
    if (url.includes('prod')) return 'production';
    if (url.includes('staging') || url.includes('stg')) return 'staging';
    return 'development';
  })();

/**
 * Base URL for the public document app (doc-*.makhzoon.me — receipts,
 * invoices, reports, warranty certs), matched to the environment the user is
 * currently on. NEXT_PUBLIC_DOC_URL is inlined at build time and the CI build
 * has no per-env value, so it would bake the same host into every
 * deployment. Deriving from the live hostname keeps dev → doc-dev, stg →
 * doc-stg, sup → doc-sup, app → doc-app — and ensures the preview reads the
 * same database the settings page wrote to.
 */
const DOC_SUBDOMAINS = new Set(['dev', 'stg', 'sup']);

export function getDocBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host.endsWith('makhzoon.me')) {
      const sub = host.split('.')[0];
      const env = DOC_SUBDOMAINS.has(sub) ? sub : 'app';
      return `https://doc-${env}.makhzoon.me`;
    }
  }
  // Localhost / SSR fallback: explicit env var, else production document host.
  return (process.env.NEXT_PUBLIC_DOC_URL ?? 'https://doc-app.makhzoon.me').replace(/\/$/, '');
}
