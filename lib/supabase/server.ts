import 'server-only';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

/**
 * Request-scoped server Supabase client bound to the caller's session cookie.
 * Use in Server Components, Route Handlers, and middleware-adjacent code where
 * RLS must run as the authenticated user.
 *
 * Migration note: replaces server-side reads in lib/firebase/* that ran with
 * admin privileges. With Supabase, normal reads go through RLS as the user;
 * privileged operations use lib/supabase/admin.ts explicitly.
 */
export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY',
    );
  }

  const cookieStore = await cookies();

  // Permissive schema (no generated DB types in this env) — see admin.ts.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createServerClient<any, any, any>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // setAll throws when called from a Server Component (cookies are
          // read-only there). Session refresh is handled in middleware, so
          // this is safe to ignore.
        }
      },
    },
  });
}
