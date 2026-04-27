import { auth } from '@/lib/firebase/client';
import { signOut } from 'firebase/auth';

async function forceSignOut() {
  try { await signOut(auth); } catch { /* ignore */ }
  await fetch('/api/auth/session', { method: 'DELETE' }).catch(() => {});
  window.location.href = '/login';
}

export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const res = await fetch(input, init);
  if (res.status === 401) {
    forceSignOut();
    // Return the response so callers don't crash — they'll never reach the redirect anyway
  }
  return res;
}
