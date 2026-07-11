'use client';
import { useT } from '@/hooks/ui';
import { formatAuditValue, formatKeyLabel } from '@/lib/utils/audit-labels';

/** Before/after diff table used in audit log detail views. */
export function DiffCards({ oldValue, newValue }: { oldValue?: Record<string, unknown> | null; newValue?: Record<string, unknown> | null }) {
  const { t } = useT();
  if (!oldValue && !newValue) return null;
  const allKeys = Array.from(new Set([...Object.keys(oldValue ?? {}), ...Object.keys(newValue ?? {})]));
  if (allKeys.length === 0) return null;
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="grid grid-cols-[1fr_1fr_1fr] text-[11px] font-semibold uppercase tracking-wide bg-surface-page border-b border-border">
        <div className="px-3 py-2 text-gray-500">Field</div>
        <div className="px-3 py-2 text-red-600 border-s border-border">{t('auditLogs.before')}</div>
        <div className="px-3 py-2 text-green-700 border-s border-border">{t('auditLogs.after')}</div>
      </div>
      {allKeys.map((key, i) => {
        const before = formatAuditValue(oldValue?.[key]);
        const after  = formatAuditValue(newValue?.[key]);
        const changed = before !== after;
        return (
          <div
            key={key}
            className={`grid grid-cols-[1fr_1fr_1fr] text-xs border-b border-border last:border-b-0 ${i % 2 === 0 ? 'bg-surface-card' : 'bg-surface-page'}`}
          >
            <div className="px-3 py-2 font-medium text-gray-900">{formatKeyLabel(key)}</div>
            <div className={`px-3 py-2 border-s border-border font-mono ${changed ? 'text-red-600 line-through opacity-70' : 'text-gray-500'}`}>
              {before || '—'}
            </div>
            <div className={`px-3 py-2 border-s border-border font-mono ${changed ? 'text-green-700 font-semibold' : 'text-gray-500'}`}>
              {after || '—'}
            </div>
          </div>
        );
      })}
    </div>
  );
}
