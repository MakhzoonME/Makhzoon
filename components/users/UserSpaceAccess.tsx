'use client';
import { useEffect } from 'react';
import { Lock } from 'lucide-react';
import { useT } from '@/hooks/ui';
import { useAllSpaces } from '@/hooks/spaces';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils/cn';

/**
 * "Space access" section for the user-config popup.
 *
 *  - Toggle: "Access all spaces". Default ON for org_owner, OFF otherwise.
 *  - When OFF: a list of all org spaces with a checkbox per space.
 *
 * Holds local state and notifies the parent on every change via `onChange`,
 * so the parent can submit alongside role/permissions when the user clicks
 * Save. Until then, nothing is persisted.
 */
export function UserSpaceAccess({
  value,
  onChange,
  role,
}: {
  value: { allSpaces: boolean; spaceIds: string[] };
  onChange: (next: { allSpaces: boolean; spaceIds: string[] }) => void;
  /** Caller's role for the user being edited. Owners default allSpaces=on. */
  role: string;
}) {
  const { t } = useT();
  const { data, isLoading } = useAllSpaces();
  const spaces = (data?.items ?? []).filter((s) => s.status === 'active');

  // If role flips to org_owner and allSpaces is off, prefill on; this is
  // purely UX so the form mirrors the typical case.
  useEffect(() => {
    if (role === 'org_owner' && !value.allSpaces) {
      onChange({ allSpaces: true, spaceIds: value.spaceIds });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  const selected = new Set(value.spaceIds);
  const allDisabled = value.allSpaces;

  function toggle(spaceId: string) {
    const next = new Set(selected);
    if (next.has(spaceId)) next.delete(spaceId);
    else next.add(spaceId);
    onChange({ allSpaces: value.allSpaces, spaceIds: [...next] });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900">{t('userSpaces.accessAll')}</p>
          <p className="text-xs text-gray-500 mt-0.5">{t('userSpaces.accessAllHelp')}</p>
        </div>
        <Switch
          checked={value.allSpaces}
          onCheckedChange={(checked: boolean) => onChange({ allSpaces: checked, spaceIds: value.spaceIds })}
          aria-label={t('userSpaces.accessAll')}
        />
      </div>

      <div className={cn('space-y-1.5 rounded-lg border border-border p-3', allDisabled && 'opacity-50')}>
        <p className="text-xs font-medium text-gray-700 uppercase tracking-wide">
          {t('userSpaces.assignedSpaces')}
        </p>
        {isLoading && <p className="text-xs text-gray-500">{t('userSpaces.loading')}</p>}
        {!isLoading && spaces.length === 0 && (
          <p className="text-xs text-gray-500">{t('userSpaces.noSpaces')}</p>
        )}
        {!isLoading && spaces.length > 0 && (
          <ul className="space-y-1">
            {spaces.map((s) => {
              const checked = allDisabled || selected.has(s.id);
              return (
                <li key={s.id}>
                  <label className="flex items-center gap-2 text-sm cursor-pointer py-1">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={allDisabled}
                      onChange={() => toggle(s.id)}
                      className="h-4 w-4 rounded border-border accent-primary-600"
                    />
                    <span className="font-medium text-gray-900">{s.name}</span>
                    {s.isDefault && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary-700 bg-primary-50 px-1.5 py-0.5 rounded">
                        <Lock className="h-3 w-3" strokeWidth={2} />
                        {t('spaces.default')}
                      </span>
                    )}
                  </label>
                </li>
              );
            })}
          </ul>
        )}
        {allDisabled && (
          <p className="text-xs text-gray-500 mt-1">{t('userSpaces.disabledHint')}</p>
        )}
      </div>
    </div>
  );
}
