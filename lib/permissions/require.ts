import { NextResponse } from 'next/server';
import type { AuthUser } from '@/types/auth.types';
import type { UserPermissions } from '@/types/user-permissions.types';
import { hasPermission, hasPermByKey } from './index';

export function requirePermission(
  user: AuthUser,
  module: keyof UserPermissions,
  operation: string,
): void {
  if (!hasPermission(user, module, operation)) {
    throw NextResponse.json(
      { error: 'Forbidden', module, operation },
      { status: 403 },
    );
  }
}

export function requirePermByKey(user: AuthUser, permissionKey: string): void {
  if (!hasPermByKey(user, permissionKey)) {
    throw NextResponse.json(
      { error: 'Forbidden', permission: permissionKey },
      { status: 403 },
    );
  }
}
