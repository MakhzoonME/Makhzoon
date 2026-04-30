'use client';
import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { useAuthStore } from '@/store/auth.store';
import { AuthUser, UserRole } from '@/types';

const ORG_ROLES = new Set(['org_owner', 'admin', 'staff']);

export function useAuth() {
  const { user, loading, setUser, setLoading } = useAuthStore();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Force-refresh the ID token so custom claims (role, orgId) are always current
        await firebaseUser.getIdToken(true);
        const tokenResult = await firebaseUser.getIdTokenResult();
        const role = tokenResult.claims.role as UserRole;

        let features: Record<string, boolean> = {};
        let permissions = null;

        // For org users: fetch features + permissions from API
        if (ORG_ROLES.has(role)) {
          try {
            const res = await fetch('/api/auth/me', {
              headers: { 'Cache-Control': 'no-cache' },
            });
            if (res.ok) {
              const data = await res.json();
              features = data.features ?? {};
              permissions = data.permissions ?? null;
            }
          } catch {
            // non-critical
          }
        }

        const authUser: AuthUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email ?? '',
          displayName: firebaseUser.displayName ?? '',
          role,
          organizationId: tokenResult.claims.organizationId as string | null,
          permissions,
          features,
        };
        setUser(authUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [setUser, setLoading]);

  return { user, loading };
}
