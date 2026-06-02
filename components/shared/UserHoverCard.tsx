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
  org_owner:        { label: 'Owner',            className: 'bg-[var(--blue-100)] text-[var(--blue-700)]' },
  admin:            { label: 'Admin',            className: 'bg-[var(--blue-100)] text-[var(--blue-700)]' },
  super_admin:      { label: 'Super Admin',      className: 'bg-[var(--blue-100)] text-[var(--blue-700)]' },
  makhzoon_admin:   { label: 'Makhzoon Admin',   className: 'bg-[var(--blue-100)] text-[var(--blue-700)]' },
  makhzoon_support: { label: 'Makhzoon Support', className: 'bg-[var(--blue-100)] text-[var(--blue-700)]' },
  staff:            { label: 'Staff',            className: 'bg-surface-page text-gray-600'               },
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
  /** When true, renders an initials circle + name as the trigger instead of plain underlined text */
  showAvatar?: boolean;
  className?: string;
}

export function UserHoverCard({ user, label, showAvatar = false, className }: UserHoverCardProps) {
  const displayLabel = label ?? user.name ?? user.email ?? 'Unknown user';
  const roleInfo = user.role ? (ROLE_LABELS[user.role] ?? { label: user.role, className: 'bg-surface-page text-gray-600' }) : null;
  const initials = getInitials(user.name, user.email);

  return (
    <TooltipPrimitive.Provider delayDuration={200}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>
          {showAvatar ? (
            <span className={cn('inline-flex items-center gap-2 cursor-default', className)}>
              <span
                aria-hidden
                className="inline-flex items-center justify-center rounded-full text-[10px] font-semibold flex-shrink-0"
                style={{ width: 24, height: 24, background: 'var(--primary-100)', color: 'var(--primary-700)' }}
              >
                {initials}
              </span>
              <span className="text-sm font-medium text-gray-900 underline decoration-dotted decoration-gray-400 underline-offset-2">
                {displayLabel}
              </span>
            </span>
          ) : (
            /* Default trigger — subtle underline so the user knows it's hoverable */
            <span
              className={cn(
                'cursor-default underline decoration-dotted decoration-gray-400 underline-offset-2 font-medium text-gray-900',
                className
              )}
            >
              {displayLabel}
            </span>
          )}
        </TooltipPrimitive.Trigger>

        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            sideOffset={8}
            className={cn(
              'z-50 w-52 rounded-xl border border-border bg-surface-card p-3 shadow-lg',
              'animate-in fade-in-0 zoom-in-95',
              'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
              'data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2',
              'data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2',
            )}
          >
            <div className="flex items-center gap-2.5">
              <AvatarPlaceholder name={user.name} email={user.email} />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{user.name ?? user.email ?? 'Unknown user'}</p>
                {user.name && user.email && <p className="text-xs text-gray-500 truncate">{user.email}</p>}
                {roleInfo && (
                  <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium mt-1', roleInfo.className)}>
                    {roleInfo.label}
                  </span>
                )}
              </div>
            </div>
            <TooltipPrimitive.Arrow className="fill-white drop-shadow-sm" width={10} height={5} />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
