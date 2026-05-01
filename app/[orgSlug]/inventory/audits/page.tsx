'use client';
import { useRouter } from 'next/navigation';
import { useOrgSlug } from '@/hooks/ui';
import { useInventoryAudits } from '@/hooks/inventory';
import { useAuthStore } from '@/store/auth.store';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { InventoryAudit } from '@/types';
import { cn } from '@/lib/utils/cn';
import { formatDate } from '@/lib/utils/date';

function PlusSVG() { return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>; }
function ClockSVG() { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden><circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3" fill="none" /><path d="M7 4v3.5l2 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>; }
function ClipboardListSVG() { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden><rect x="2" y="1.5" width="10" height="11" rx="1" stroke="currentColor" strokeWidth="1.3" fill="none" /><path d="M5 1.5v1.5h4V1.5M4.5 6h5M4.5 8.5h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>; }
function CheckCircle2SVG() { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden><circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3" fill="none" /><path d="M4.5 7l2 2 3-3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function BigClipboardSVG() { return <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden><rect x="8" y="6" width="24" height="28" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" /><path d="M14 6v4h12V6M12 18h16M12 24h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>; }

const STATUS_MAP = {
  draft: { label: 'Draft', class: 'bg-gray-100 text-gray-600', icon: <ClockSVG /> },
  in_progress: { label: 'In Progress', class: 'bg-amber-50 text-amber-700 border border-amber-200', icon: <ClipboardListSVG /> },
  completed: { label: 'Completed', class: 'bg-emerald-50 text-emerald-700 border border-emerald-200', icon: <CheckCircle2SVG /> },
};

export default function InventoryAuditsPage() {
  const router = useRouter();
  const orgSlug = useOrgSlug();
  const { user } = useAuthStore();
  const { data: auditsData, isLoading } = useInventoryAudits();
  const audits = auditsData?.audits ?? [];
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'org_owner';

  if (isLoading) return <LoadingSkeleton rows={4} />;

  return (
    <div>
      <PageHeader
        title="Inventory Audits"
        description="Periodic counts to reconcile actual stock against system records."
        breadcrumb={[{ label: 'Inventory', href: `/${orgSlug}/inventory` }, { label: 'Audits', href: `/${orgSlug}/inventory/audits` }]}
        actions={isAdmin ? (
          <Button size="sm" onClick={() => router.push(`/${orgSlug}/inventory/audits/new`)}>
            <PlusSVG /><span className="ml-1">Start Audit</span>
          </Button>
        ) : undefined}
      />

      {audits.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <BigClipboardSVG />
          <p className="mt-3 text-sm text-center">No audits yet. Start your first audit to reconcile stock.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {audits.map((audit: InventoryAudit) => {
            const s = STATUS_MAP[audit.status];
            return (
              <div
                key={audit.id}
                className="bg-white border border-gray-200 rounded-xl p-5 cursor-pointer hover:border-indigo-300 transition-colors"
                onClick={() => router.push(`/${orgSlug}/inventory/audits/${audit.id}`)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 text-sm mb-1">{audit.title}</h3>
                    {audit.notes && <p className="text-xs text-gray-500 truncate mb-2">{audit.notes}</p>}
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>{formatDate(audit.createdAt)}</span>
                      {audit.completedAt && <span>· Completed {formatDate(audit.completedAt)}</span>}
                      <span>· {audit.totalAssets} items</span>
                    </div>
                  </div>
                  <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', s.class)}>
                    {s.icon} {s.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
