'use client';
import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils/cn';
import {
  UserPermissions,
  DEFAULT_STAFF_PERMISSIONS,
  MODULE_PERMISSIONS_CONFIG,
  MODULE_GROUP_LABEL_KEYS,
  MODULE_GROUP_ORDER,
  type ModuleConfig,
  type ModuleGroup,
} from '@/types';
import { useT } from '@/hooks/ui';

interface Props {
  value: UserPermissions;
  onChange: (v: UserPermissions) => void;
  availableFeatures: Record<string, boolean>;
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

export function PermissionsEditor({ value, onChange, availableFeatures }: Props) {
  const { t } = useT();
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  function toggleModule(key: string) {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(key)) { next.delete(key); } else { next.add(key); }
      return next;
    });
  }

  function setModuleEnabled(moduleKey: keyof UserPermissions, enabled: boolean) {
    const mod = value[moduleKey] as unknown as Record<string, boolean>;
    const modConfig = MODULE_PERMISSIONS_CONFIG.find((m) => m.key === moduleKey);
    const updated: Record<string, boolean> = {};
    for (const k of Object.keys(mod)) {
      if (enabled) {
        const opCfg = modConfig?.operations.find((op) => op.key === k);
        updated[k] = !opCfg?.featureKey || !!availableFeatures[opCfg.featureKey];
      } else {
        updated[k] = false;
      }
    }
    onChange({ ...value, [moduleKey]: updated as never });
    if (enabled) {
      setExpandedModules((prev) => new Set(Array.from(prev).concat(moduleKey)));
    }
  }

  function setOp(moduleKey: keyof UserPermissions, opKey: string, checked: boolean, modConfig?: ModuleConfig) {
    const mod = { ...(value[moduleKey] as unknown as Record<string, boolean>) };
    mod[opKey] = checked;

    if (!checked) {
      // turning off this op: cascade-disable all ops that require it as their gate key
      for (const op of (modConfig?.operations ?? [])) {
        const gateKey = op.requiresKey ?? 'view';
        if (op.requiresView && gateKey === opKey) {
          mod[op.key] = false;
        }
      }
      // if turning off the generic 'view' key, disable everything
      if (opKey === 'view') {
        for (const k of Object.keys(mod)) mod[k] = false;
      }
    } else {
      // turning on an op: also enable its gate key
      const opCfg = modConfig?.operations.find((o) => o.key === opKey);
      const gateKey = opCfg?.requiresKey ?? 'view';
      if (opCfg?.requiresView) {
        mod[gateKey] = true;
      }
    }

    onChange({ ...value, [moduleKey]: mod as never });
  }

  const visibleModules = MODULE_PERMISSIONS_CONFIG.filter((m) => {
    if (m.hideFromEditor) return false;
    if (m.featureKey && !availableFeatures[m.featureKey]) return false;
    return true;
  });

  const groupedModules = useMemo(() => {
    const map = new Map<ModuleGroup, ModuleConfig[]>();
    for (const m of visibleModules) {
      const g: ModuleGroup = m.group ?? 'core';
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(m);
    }
    return MODULE_GROUP_ORDER.filter((g) => map.has(g)).map((g) => ({ group: g, modules: map.get(g)! }));
  }, [visibleModules]);

  return (
    <div className="space-y-5">
      {groupedModules.map(({ group, modules }) => (
        <div key={group} className="space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 px-1">
            {t(MODULE_GROUP_LABEL_KEYS[group])}
          </div>
          {modules.map((mod) => {
        const modulePerms = value[mod.key] as unknown as Record<string, boolean>;
        const visibleOps = mod.operations.filter((op) => !op.featureKey || !!availableFeatures[op.featureKey]);
        const isModuleEnabled = modulePerms?.view === true;
        const isExpanded = expandedModules.has(mod.key);
        const hasAnyOp = visibleOps.some((op) => modulePerms?.[op.key] === true);

        return (
          <div key={mod.key} className="rounded-lg border border-border overflow-hidden">
            {/* Module header row */}
            <div
              className={cn(
                'flex items-center gap-2 px-3 py-2.5 cursor-pointer select-none',
                isModuleEnabled
                  ? 'bg-surface-card hover:bg-surface-page'
                  : 'bg-surface-page hover:bg-surface-page'
              )}
              onClick={() => toggleModule(mod.key)}
            >
              {/* Master toggle */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setModuleEnabled(mod.key, !hasAnyOp); }}
                className={cn(
                  'relative flex-shrink-0 p-0 overflow-hidden rounded-full transition-colors duration-200',
                  hasAnyOp ? 'bg-primary-600' : 'bg-gray-300'
                )}
                style={{ width: 32, height: 18 }}
                aria-label={`${hasAnyOp ? t('common.no') : t('common.yes')} ${t(mod.labelKey)}`}
              >
                <span
                  className={cn(
                    'absolute top-0.5 rounded-full bg-surface-card shadow transition-[inset-inline-start] duration-200',
                    hasAnyOp ? 'start-[16px]' : 'start-[2px]'
                  )}
                  style={{ width: 14, height: 14 }}
                />
              </button>
              <span className={cn('text-sm flex-1 font-medium', hasAnyOp ? 'text-gray-900' : 'text-gray-400')}>
                {t(mod.labelKey)}
              </span>
              {hasAnyOp && (
                <span className="text-xs text-gray-400">
                  {visibleOps.filter((op) => modulePerms?.[op.key] === true).length} of {visibleOps.length}
                </span>
              )}
              <ChevronSVG open={isExpanded} />
            </div>

            {/* Operations */}
            {isExpanded && (
              <div className="border-t border-border bg-surface-card px-3 py-2 flex flex-col gap-1.5">
                {visibleOps.map((op) => {
                  const checked = modulePerms?.[op.key] === true;
                  const gateKey = op.requiresKey ?? 'view';
                  const disabled = op.requiresView && modulePerms?.[gateKey] !== true;
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
                        onChange={(e) => setOp(mod.key, op.key, e.target.checked, mod)}
                        className="w-3.5 h-3.5 rounded border-gray-300 text-primary-600 focus:ring-primary-500 disabled:cursor-not-allowed"
                      />
                      <span className={cn('text-gray-600', checked && 'text-gray-900 font-medium')}>{t(op.labelKey)}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
        </div>
      ))}
    </div>
  );
}

export { DEFAULT_STAFF_PERMISSIONS };
