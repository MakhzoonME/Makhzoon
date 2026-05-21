/**
 * Browser-side Supabase client. Uses the public anon key and the user's
 * session cookie (managed by @supabase/ssr). Safe to import in Client
 * Components. Never use the service-role key here.
 *
 * NOTE: Uses dynamic import() of @supabase/ssr to work around a Turbopack
 * bug where static import + inlined NEXT_PUBLIC_* env vars produce a broken
 * IIFE in the client chunk (the env string values get passed as the module
 * context parameter, crashing with "e.i is not a function").
 *
 * Migration note: replaces lib/firebase/client.ts on the browser side.
 */
export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY',
    );
  }
  const { createBrowserClient } = await import('@supabase/ssr');
  // Permissive schema (no generated DB types in this env) — see admin.ts.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createBrowserClient<any>(url, anonKey);
}
