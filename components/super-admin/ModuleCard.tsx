'use client';
import { useState } from 'react';
import { cn } from '@/lib/utils/cn';

/**
 * Same collapsible-module chrome as components/users/PermissionsEditor.tsx
 * (master toggle pill, name, "X of Y" count badge, chevron, expandable body)
 * — extracted so admin surfaces that edit module-level config (here: package
 * subscriptions) look and behave the same as the one users already know from
 * the invite/edit-user permissions editor, instead of a bespoke layout.
 */

function ChevronSVG({ open }: { open: boolean }) {
  return (
    <svg
      width="12" height="12" viewBox="0 0 12 12" fill="none"
      className={cn('transition-transform duration-200', open && 'rotate-180')}
      aria-hidden
    >
      <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface ModuleCardProps {
  label: string;
  enabled: boolean;
  onToggleEnabled: (next: boolean) => void;
  /** e.g. "3 of 4" — shown next to the name when enabled. */
  countLabel?: string;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}

export function ModuleCard({ label, enabled, onToggleEnabled, countLabel, defaultExpanded, children }: ModuleCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded ?? false);

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-2.5 cursor-pointer select-none',
          enabled ? 'bg-surface-card hover:bg-surface-page' : 'bg-surface-page hover:bg-surface-page',
        )}
        onClick={() => setExpanded((v) => !v)}
      >
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggleEnabled(!enabled); }}
          className={cn(
            'relative flex-shrink-0 p-0 overflow-hidden rounded-full transition-colors duration-200',
            enabled ? 'bg-primary-600' : 'bg-gray-300',
          )}
          style={{ width: 32, height: 18 }}
          aria-label={`${enabled ? 'Disable' : 'Enable'} ${label}`}
        >
          <span
            className={cn(
              'absolute top-0.5 rounded-full bg-surface-card shadow transition-[inset-inline-start] duration-200',
              enabled ? 'start-[16px]' : 'start-[2px]',
            )}
            style={{ width: 14, height: 14 }}
          />
        </button>
        <span className={cn('text-sm flex-1 font-medium', enabled ? 'text-gray-900' : 'text-gray-400')}>
          {label}
        </span>
        {enabled && countLabel && <span className="text-xs text-gray-400">{countLabel}</span>}
        <ChevronSVG open={expanded} />
      </div>
      {expanded && (
        <div className="border-t border-border bg-surface-card px-3 py-3 space-y-2.5">
          {children}
        </div>
      )}
    </div>
  );
}
