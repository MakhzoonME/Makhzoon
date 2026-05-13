'use client';
import { useRouter } from 'next/navigation';
import { useOrgSlug, useT } from '@/hooks/ui';
import { useInventoryAudits } from '@/hooks/inventory';
import { useAuthStore } from '@/store/auth.store';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { InventoryAudit } from '@/types';
import { cn } from '@/lib/utils/cn';
import { formatDate } from '@/lib/utils/date';
import { Plus, Clock, ClipboardList, CheckCircle2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

const STATUS_MAP = {
  draft: { label: 'Draft', class: 'bg-surface-page text-gray-600', icon: <Clock className="h-4 w-4" strokeWidth={1.75} /> },
  in_progress: { label: 'In Progress', class: 'bg-[var(--yellow-100)] text-[var(--yellow-700)] border border-[var(--yellow-100)]', icon: <ClipboardList className="h-4 w-4" strokeWidth={1.75} /> },
  completed: { label: 'Completed', class: 'bg-[var(--green-100)] text-[var(--green-700)] border border-[var(--green-100)]', icon: <CheckCircle2 className="h-4 w-4" strokeWidth={1.75} /> },
};

export default function InventoryAuditsPage() {
  const router = useRouter();
  const orgSlug = useOrgSlug();
  const { locale } = useT();
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
        breadcrumb={[{ label: 'Inventory', href: `/${locale}/${orgSlug}/inventory` }, { label: 'Audits', href: `/${locale}/${orgSlug}/inventory/audits` }]}
        actions={isAdmin ? (
          <Button size="sm" onClick={() => router.push(`/${locale}/${orgSlug}/inventory/audits/new`)}>
            <Plus className="h-4 w-4" strokeWidth={1.75} /><span className="ml-1">Start Audit</span>
          </Button>
        ) : undefined}
      />

      {audits.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <ClipboardList className="h-10 w-10" strokeWidth={1.75} />
          <p className="mt-3 text-sm text-center">No audits yet. Start your first audit to reconcile stock.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {audits.map((audit: InventoryAudit) => {
            const s = STATUS_MAP[audit.status];
            return (
              <div
                key={audit.id}
                className="bg-surface-card border border-border rounded-xl p-5 cursor-pointer hover:border-primary-300 transition-colors"
                onClick={() => router.push(`/${locale}/${orgSlug}/inventory/audits/${audit.id}`)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 text-sm mb-1">{audit.title}</h3>
                    {audit.notes && (
                      <TooltipProvider delayDuration={300}><Tooltip><TooltipTrigger asChild><p className="text-xs text-gray-500 truncate mb-2">{audit.notes}</p></TooltipTrigger><TooltipContent>{audit.notes}</TooltipContent></Tooltip></TooltipProvider>
                    )}
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
