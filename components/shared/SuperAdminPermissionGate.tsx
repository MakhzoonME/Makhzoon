'use client';

import type { ReactNode } from 'react';
import { useAuth } from '@/hooks/ui/useAuth';
import { resolveSuperAdminPermissions } from '@/lib/permissions/superadmin';
import type { SuperAdminPermissions } from '@/types/superadmin-permissions.types';

interface Props {
  module: keyof SuperAdminPermissions;
  operation: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export function SuperAdminPermissionGate({ module, operation, children, fallback = null }: Props) {
  const { user, loading } = useAuth();
  if (loading || !user) return <>{fallback}</>;

  const perms = resolveSuperAdminPermissions(user);
  const mod = perms[module] as unknown as Record<string, boolean> | undefined;
  const allowed = mod?.[operation] === true;

  return allowed ? <>{children}</> : <>{fallback}</>;
}
