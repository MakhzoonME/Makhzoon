import 'server-only';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Service-role Supabase client. BYPASSES Row Level Security. Server-only.
 * Use exclusively for privileged operations that legitimately cross tenant
 * boundaries (superadmin tooling, invite acceptance, cron jobs, seed scripts)
 * — the Supabase equivalent of the firebase-admin SDK.
 *
 * The SUPABASE_SERVICE_ROLE_KEY must never be exposed to the browser or put
 * in a NEXT_PUBLIC_* variable.
 */
let _admin: ReturnType<typeof createSupabaseClient> | null = null;

export function getSupabaseAdmin() {
  if (_admin) return _admin;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY',
    );
  }

  _admin = createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return _admin;
}

export const supabaseAdmin = new Proxy(
  {} as ReturnType<typeof createSupabaseClient>,
  {
    get(_t, prop) {
      return (
        getSupabaseAdmin() as unknown as Record<string | symbol, unknown>
      )[prop];
    },
  },
);
