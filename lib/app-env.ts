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
