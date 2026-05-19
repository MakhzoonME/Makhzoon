import 'server-only';
import {
  createClient as createSupabaseClient,
  type SupabaseClient,
} from '@supabase/supabase-js';

// No generated DB types available in this environment, so use a permissive
// schema: this keeps .from(t).insert/update/upsert payloads typed as `any`
// instead of `never`. Swap for `SupabaseClient<Database>` once
// `supabase gen types` output is committed.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = SupabaseClient<any, any, any>;

/**
 * Service-role Supabase client. BYPASSES Row Level Security. Server-only.
 * Use exclusively for privileged operations that legitimately cross tenant
 * boundaries (superadmin tooling, invite acceptance, cron jobs, seed scripts)
 * — the Supabase equivalent of the firebase-admin SDK.
 *
 * The SUPABASE_SERVICE_ROLE_KEY must never be exposed to the browser or put
 * in a NEXT_PUBLIC_* variable.
 */
let _admin: AnyClient | null = null;

export function getSupabaseAdmin(): AnyClient {
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
  }) as AnyClient;
  return _admin;
}

export const supabaseAdmin = new Proxy(
  {} as AnyClient,
  {
    get(_t, prop) {
      return (
        getSupabaseAdmin() as unknown as Record<string | symbol, unknown>
      )[prop];
    },
  },
);
