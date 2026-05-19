import { createBrowserClient } from '@supabase/ssr';

/**
 * Browser-side Supabase client. Uses the public anon key and the user's
 * session cookie (managed by @supabase/ssr). Safe to import in Client
 * Components. Never use the service-role key here.
 *
 * Migration note: replaces lib/firebase/client.ts on the browser side.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY',
    );
  }
  // Permissive schema (no generated DB types in this env) — see admin.ts.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createBrowserClient<any, any>(url, anonKey);
}
