'use client';
import { useState } from 'react';
import { Combobox } from '@/components/ui/combobox';
import { Label } from '@/components/ui/label';
import { PermissionsEditor } from './PermissionsEditor';
import { UserSpaceAccess } from './UserSpaceAccess';
import { useT } from '@/hooks/ui';
import type { UserPermissions } from '@/types';

export interface RoleOption {
  value: string;
  label: string;
}

export interface SpaceAccessValue {
  allSpaces: boolean;
  spaceIds: string[];
}

interface UserAccessFormProps {
  role: string;
  onRoleChange: (role: string) => void;
  roleOptions: RoleOption[];
  permissions: UserPermissions;
  onPermissionsChange: (v: UserPermissions) => void;
  spaceAccess: SpaceAccessValue;
  onSpaceAccessChange: (v: SpaceAccessValue) => void;
  availableFeatures: Record<string, boolean>;
}

/**
 * Shared "who is this and what can they do" section reused by the invite and
 * edit pages: role select (drives the permission preset), a collapsible
 * granular permissions editor, and space access. Identity fields (email/
 * username, display name) and the submit/result UI stay in each page since
 * they differ between inviting a new member and editing an existing one.
 */
export function UserAccessForm({
  role,
  onRoleChange,
  roleOptions,
  permissions,
  onPermissionsChange,
  spaceAccess,
  onSpaceAccessChange,
  availableFeatures,
}: UserAccessFormProps) {
  const { t } = useT();
  const [showPermissions, setShowPermissions] = useState(false);

  const permissionsLabel = role === 'staff'
    ? t('users.staffDefaultAccessHint')
    : t('users.fullDefaultAccessHint');

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <Label>{t('users.role')} *</Label>
        <Combobox
          value={role}
          onChange={(v) => onRoleChange(v ?? role)}
          options={roleOptions}
          searchable={false}
          clearable={false}
        />
      </div>

      <div className="space-y-3 rounded-lg border border-border p-4">
        <button
          type="button"
          onClick={() => setShowPermissions((v) => !v)}
          className="flex items-center gap-2 text-sm font-medium text-primary-700 hover:text-primary-800 cursor-pointer"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <rect x="1" y="1" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.3" fill="none" />
            <path d="M4 7h6M7 4v6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          {showPermissions ? t('permissions.hideAccess') : t('permissions.editAccess')}
        </button>
        {showPermissions ? (
          <PermissionsEditor
            value={permissions}
            onChange={onPermissionsChange}
            availableFeatures={availableFeatures}
          />
        ) : (
          <p className="text-xs text-gray-400">{permissionsLabel}</p>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-900">{t('userSpaces.title')}</p>
        <UserSpaceAccess value={spaceAccess} onChange={onSpaceAccessChange} role={role} />
      </div>
    </div>
  );
}
