'use client';

import type { ReactNode } from 'react';
import { useAuth } from '@/hooks/ui/useAuth';
import { hasPermission, hasPermByKey } from '@/lib/permissions';
import type { UserPermissions } from '@/types/user-permissions.types';

type ByPair = {
  module: keyof UserPermissions;
  operation: string;
  permission?: never;
};
type ByKey = {
  permission: string;
  module?: never;
  operation?: never;
};

type Props = (ByPair | ByKey) & {
  children: ReactNode;
  fallback?: ReactNode;
};

export function PermissionGate(props: Props) {
  const { user, loading } = useAuth();
  if (loading || !user) return props.fallback ?? null;

  const allowed =
    'permission' in props && props.permission
      ? hasPermByKey(user, props.permission)
      : hasPermission(user, props.module!, props.operation!);

  return allowed ? <>{props.children}</> : (props.fallback ?? null);
}
