'use client';

import type { ReactNode } from 'react';
import { useAuth } from '@/hooks/ui/useAuth';
import {
  DEFAULT_SUPER_ADMIN_PERMISSIONS,
  DEFAULT_MAKHZOON_ADMIN_PERMISSIONS,
  DEFAULT_SUPPORT_PERMISSIONS,
} from '@/types/superadmin-permissions.types';
import type { SuperAdminPermissions } from '@/types/superadmin-permissions.types';

const SUPERADMIN_ROLES = new Set(['super_admin', 'makhzoon_admin', 'makhzoon_support']);

function getRoleDefaults(role: string): SuperAdminPermissions {
  if (role === 'super_admin') return DEFAULT_SUPER_ADMIN_PERMISSIONS;
  if (role === 'makhzoon_admin') return DEFAULT_MAKHZOON_ADMIN_PERMISSIONS;
  return DEFAULT_SUPPORT_PERMISSIONS;
}

interface Props {
  module: keyof SuperAdminPermissions;
  operation: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export function SuperAdminPermissionGate({ module, operation, children, fallback = null }: Props) {
  const { user, loading } = useAuth();
  if (loading || !user) return <>{fallback}</>;
  if (!SUPERADMIN_ROLES.has(user.role)) return <>{fallback}</>;

  const perms: SuperAdminPermissions = (user.saPermissions as SuperAdminPermissions | null | undefined) ?? getRoleDefaults(user.role);
  const mod = perms[module] as unknown as Record<string, boolean> | undefined;
  const allowed = mod?.[operation] === true;

  return allowed ? <>{children}</> : <>{fallback}</>;
}
