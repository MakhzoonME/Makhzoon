'use client';
import { useState } from 'react';
import { cn } from '@/lib/utils/cn';
import {
  SuperAdminPermissions,
  SUPERADMIN_MODULE_CONFIG,
} from '@/types';

interface Props {
  value: SuperAdminPermissions;
  onChange: (v: SuperAdminPermissions) => void;
}

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

export function SuperAdminPermissionsEditor({ value, onChange }: Props) {
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  function toggleModule(key: string) {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(key)) { next.delete(key); } else { next.add(key); }
      return next;
    });
  }

  function setModuleEnabled(moduleKey: keyof SuperAdminPermissions, enabled: boolean) {
    const mod = value[moduleKey] as unknown as Record<string, boolean>;
    const updated: Record<string, boolean> = {};
    for (const k of Object.keys(mod)) updated[k] = enabled;
    onChange({ ...value, [moduleKey]: updated as never });
    if (enabled) {
      setExpandedModules((prev) => new Set(Array.from(prev).concat(moduleKey)));
    }
  }

  function setOp(moduleKey: keyof SuperAdminPermissions, opKey: string, checked: boolean) {
    const mod = { ...(value[moduleKey] as unknown as Record<string, boolean>) };
    mod[opKey] = checked;
    if (opKey === 'view' && !checked) {
      for (const k of Object.keys(mod)) mod[k] = false;
    }
    if (opKey !== 'view' && checked) {
      mod['view'] = true;
    }
    onChange({ ...value, [moduleKey]: mod as never });
  }

  return (
    <div className="space-y-2">
      {SUPERADMIN_MODULE_CONFIG.map((mod) => {
        const modulePerms = value[mod.key] as unknown as Record<string, boolean>;
        const isExpanded = expandedModules.has(mod.key);
        const hasAnyOp = Object.values(modulePerms ?? {}).some(Boolean);

        return (
          <div key={mod.key} className="rounded-lg border border-gray-200 overflow-hidden">
            <div
              className={cn(
                'flex items-center gap-2 px-3 py-2.5 cursor-pointer select-none',
                hasAnyOp ? 'bg-white hover:bg-gray-50' : 'bg-gray-50 hover:bg-gray-100'
              )}
              onClick={() => toggleModule(mod.key)}
            >
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setModuleEnabled(mod.key, !hasAnyOp); }}
                className={cn(
                  'relative flex-shrink-0 rounded-full transition-colors duration-200',
                  hasAnyOp ? 'bg-violet-600' : 'bg-gray-300'
                )}
                style={{ width: 32, height: 18 }}
                aria-label={`${hasAnyOp ? 'Disable' : 'Enable'} ${mod.label}`}
              >
                <span
                  className={cn(
                    'absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-transform duration-200',
                    hasAnyOp ? 'translate-x-[14px]' : 'translate-x-0.5'
                  )}
                  style={{ width: 14, height: 14 }}
                />
              </button>
              <span className={cn('text-sm flex-1 font-medium', hasAnyOp ? 'text-gray-900' : 'text-gray-400')}>
                {mod.label}
              </span>
              {hasAnyOp && (
                <span className="text-xs text-gray-400">
                  {Object.values(modulePerms).filter(Boolean).length} of {Object.keys(modulePerms).length}
                </span>
              )}
              <ChevronSVG open={isExpanded} />
            </div>

            {isExpanded && (
              <div className="border-t border-gray-100 px-3 py-2 flex flex-col gap-1.5">
                {mod.operations.map((op) => {
                  const checked = modulePerms?.[op.key] === true;
                  const disabled = op.requiresView && modulePerms?.view !== true;
                  return (
                    <label
                      key={op.key}
                      className={cn(
                        'flex items-center gap-2 text-xs cursor-pointer',
                        disabled ? 'opacity-40 cursor-not-allowed' : 'hover:text-gray-900'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={disabled}
                        onChange={(e) => setOp(mod.key, op.key, e.target.checked)}
                        className="w-3.5 h-3.5 rounded border-gray-300 text-violet-600 focus:ring-violet-500 disabled:cursor-not-allowed"
                      />
                      <span className={cn('text-gray-600', checked && 'text-gray-900 font-medium')}>{op.label}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
