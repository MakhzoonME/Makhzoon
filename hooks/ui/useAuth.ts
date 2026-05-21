'use client';
import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/auth.store';
import { AuthUser, UserRole } from '@/types';

export function useAuth() {
  const { user, loading, setUser, setLoading } = useAuthStore();

  useEffect(() => {
    let cancelled = false;
    let subscription: { unsubscribe: () => void } | null = null;
    let fallbackTimer: ReturnType<typeof setTimeout>;

    async function hydrate(
      uid: string,
      email: string,
      role: UserRole,
      organizationId: string | null,
    ) {
      let features: Record<string, boolean> = {};
      let permissions = null;
      let orgSlug: string | null = null;
      let avatarUrl: string | null = null;
      let resolvedRole = role;

      try {
        const res = await fetch('/api/auth/me', {
          headers: { 'Cache-Control': 'no-cache' },
        });
        if (res.ok) {
          const data = await res.json();
          resolvedRole = data.role ?? role;
          features = data.features ?? {};
          permissions = data.permissions ?? null;
          orgSlug = data.orgSlug ?? null;
          avatarUrl = data.avatarUrl ?? null;
        }
      } catch {
        // non-critical
      }

      if (cancelled) return;
      setUser({
        uid,
        email,
        displayName: '',
        avatarUrl,
        role: resolvedRole,
        organizationId,
        orgSlug,
        permissions,
        features,
      } as AuthUser);
      setLoading(false);
    }

    async function setup() {
      const supabase = await createClient();
      if (cancelled) return;

      // Fallback: recover the session from the server if the SDK is slow.
      fallbackTimer = setTimeout(async () => {
        if (!useAuthStore.getState().loading) return;
        try {
          const res = await fetch('/api/auth/me', {
            headers: { 'Cache-Control': 'no-cache' },
          });
          if (res.ok) {
            const data = await res.json();
            setUser({
              uid: data.uid ?? '',
              email: '',
              displayName: '',
              avatarUrl: data.avatarUrl ?? null,
              role: data.role,
              organizationId: data.organizationId ?? null,
              orgSlug: data.orgSlug ?? null,
              permissions: data.permissions ?? null,
              features: data.features ?? {},
            } as AuthUser);
          } else {
            setUser(null);
          }
        } catch {
          setUser(null);
        }
        setLoading(false);
      }, 6000);

      const {
        data: { subscription: sub },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        clearTimeout(fallbackTimer);
        if (session?.user) {
          const meta = session.user.app_metadata ?? {};
          const role = (meta.role as UserRole) ?? 'staff';
          const organizationId =
            (meta.organization_id as string | undefined) ?? null;
          void hydrate(
            session.user.id,
            session.user.email ?? '',
            role,
            organizationId,
          );
        } else {
          setUser(null);
          setLoading(false);
        }
      });
      subscription = sub;
    }

    setup();

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
      clearTimeout(fallbackTimer);
    };
  }, [setUser, setLoading]);

  return { user, loading };
}
