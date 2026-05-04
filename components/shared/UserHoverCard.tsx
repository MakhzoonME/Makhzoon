'use client';

import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '@/lib/utils/cn';

export interface UserCardData {
  uid: string;
  name?: string;
  email?: string;
  role?: string;
}

const ROLE_LABELS: Record<string, { label: string; className: string }> = {
  super_admin: { label: 'Super Admin', className: 'bg-purple-100 text-purple-700' },
  admin:       { label: 'Admin',       className: 'bg-primary-100 text-primary-700' },
  staff:       { label: 'Staff',       className: 'bg-surface-page   text-gray-600'   },
};

function getInitials(name?: string, email?: string): string {
  const source = name?.trim() || email?.trim() || '';
  if (!source) return '?';
  const parts = source.split(/[\s@]/);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

function AvatarPlaceholder({ name, email }: { name?: string; email?: string }) {
  const initials = getInitials(name, email);
  return (
    <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
      <span className="text-[13px] font-semibold text-primary-700 select-none">{initials}</span>
    </div>
  );
}

interface UserHoverCardProps {
  user: UserCardData;
  /** Text shown as the trigger link — defaults to name → email → uid */
  label?: string;
  className?: string;
}

export function UserHoverCard({ user, label, className }: UserHoverCardProps) {
  const displayLabel = label ?? user.name ?? user.email ?? user.uid;
  const roleInfo = user.role ? (ROLE_LABELS[user.role] ?? { label: user.role, className: 'bg-surface-page text-gray-600' }) : null;

  return (
    <TooltipPrimitive.Provider delayDuration={200}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>
          {/* Inline trigger — subtle underline so the user knows it's hoverable */}
          <span
            className={cn(
              'cursor-default underline decoration-dotted decoration-gray-400 underline-offset-2 font-medium text-gray-900',
              className
            )}
          >
            {displayLabel}
          </span>
        </TooltipPrimitive.Trigger>

        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            sideOffset={8}
            className={cn(
              'z-50 w-64 rounded-xl border border-border bg-surface-card p-4 shadow-lg',
              'animate-in fade-in-0 zoom-in-95',
              'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
              'data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2',
              'data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2',
            )}
          >
            {/* Header row — avatar + name/email */}
            <div className="flex items-center gap-3 mb-3">
              <AvatarPlaceholder name={user.name} email={user.email} />
              <div className="min-w-0">
                {user.name ? (
                  <>
                    <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
                    {user.email && (
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    )}
                  </>
                ) : (
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {user.email ?? 'Unknown user'}
                  </p>
                )}
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-border my-2" />

            {/* Details grid */}
            <dl className="space-y-1.5 text-xs">
              {roleInfo && (
                <div className="flex items-center justify-between">
                  <dt className="text-gray-500">Role</dt>
                  <dd>
                    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', roleInfo.className)}>
                      {roleInfo.label}
                    </span>
                  </dd>
                </div>
              )}
              {user.email && (
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-gray-500 flex-shrink-0">Email</dt>
                  <dd className="text-gray-700 truncate text-right">{user.email}</dd>
                </div>
              )}
              <div className="flex items-center justify-between gap-2">
                <dt className="text-gray-500 flex-shrink-0">User ID</dt>
                <dd className="font-mono text-gray-400 truncate text-right text-[10px]">{user.uid}</dd>
              </div>
            </dl>

            {/* Tooltip arrow */}
            <TooltipPrimitive.Arrow className="fill-white drop-shadow-sm" width={10} height={5} />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
