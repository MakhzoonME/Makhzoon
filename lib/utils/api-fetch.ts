import { createClient } from '@/lib/supabase/client';

async function forceSignOut() {
  try { const supabase = await createClient(); await supabase.auth.signOut(); } catch { /* ignore */ }
  await fetch('/api/auth/session', { method: 'DELETE' }).catch(() => {});
  const locale = typeof localStorage !== 'undefined' ? (() => { try { const l = JSON.parse(localStorage.getItem('makhzoon-locale') || ''); return l?.state?.locale; } catch { return null; } })() : null;
  window.location.href = `/${locale ?? 'en'}/login`;
}

export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const res = await fetch(input, init);
  if (res.status === 401) {
    forceSignOut();
    // Return the response so callers don't crash — they'll never reach the redirect anyway
  }
  return res;
}
