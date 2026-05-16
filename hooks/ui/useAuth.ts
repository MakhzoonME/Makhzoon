'use client';
import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/auth.store';
import { AuthUser, UserRole } from '@/types';

const ORG_ROLES = new Set<UserRole>(['org_owner', 'admin', 'staff']);

export function useAuth() {
  const { user, loading, setUser, setLoading } = useAuthStore();

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function hydrate(
      uid: string,
      email: string,
      role: UserRole,
      organizationId: string | null,
    ) {
      let features: Record<string, boolean> = {};
      let permissions = null;
      let orgSlug: string | null = null;

      if (ORG_ROLES.has(role)) {
        try {
          const res = await fetch('/api/auth/me', {
            headers: { 'Cache-Control': 'no-cache' },
          });
          if (res.ok) {
            const data = await res.json();
            features = data.features ?? {};
            permissions = data.permissions ?? null;
            orgSlug = data.orgSlug ?? null;
          }
        } catch {
          // non-critical
        }
      }

      if (cancelled) return;
      setUser({
        uid,
        email,
        displayName: '',
        role,
        organizationId,
        orgSlug,
        permissions,
        features,
      } as AuthUser);
      setLoading(false);
    }

    // Fallback: recover the session from the server if the SDK is slow.
    const fallbackTimer = setTimeout(async () => {
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
      data: { subscription },
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

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      clearTimeout(fallbackTimer);
    };
  }, [setUser, setLoading]);

  return { user, loading };
}
