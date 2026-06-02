'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { useT } from '@/hooks/ui';
import { toast } from '@/hooks/ui';
import { usePackages, useDeletePackage } from '@/hooks/superadmin';
import type { Package } from '@/types';

function PricingCell({ pkg }: { pkg: Package }) {
  if (pkg.pricing.isCustom) return <span className="text-sm text-gray-500 italic">Custom</span>;
  const m = pkg.pricing.monthlyPrice;
  const a = pkg.pricing.annualPrice;
  if (!m && !a) return <span className="text-sm text-gray-400">—</span>;
  return (
    <div className="text-sm">
      {m != null && <span className="font-medium tabular-nums">{m.toLocaleString()} {pkg.pricing.currency}/mo</span>}
      {m != null && a != null && <span className="text-gray-400 mx-1">·</span>}
      {a != null && <span className="text-gray-500 tabular-nums">{a.toLocaleString()} {pkg.pricing.currency}/yr</span>}
    </div>
  );
}

function LimitsCell({ pkg }: { pkg: Package }) {
  const { limits } = pkg;
  const items = [
    limits.maxAssets !== -1 && `${limits.maxAssets} assets`,
    limits.maxUsers  !== -1 && `${limits.maxUsers} users`,
    limits.maxSpaces !== -1 && `${limits.maxSpaces} spaces`,
  ].filter(Boolean);
  if (items.length === 0) return <span className="text-xs text-green-600 font-medium">Unlimited</span>;
  return <span className="text-xs text-gray-500">{items.join(' · ')}</span>;
}

export default function PackagesPage() {
  const { t } = useT();
  const { data: packages = [], isLoading } = usePackages({ includeInactive: true });
  const deleteMut = useDeletePackage();
  const [confirmDelete, setConfirmDelete] = useState<Package | null>(null);

  async function handleDelete() {
    if (!confirmDelete) return;
    try {
      await deleteMut.mutateAsync(confirmDelete.id);
      toast.success(t('common.deleted'));
      setConfirmDelete(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.deleteFailed'));
    }
  }

  if (isLoading) return <LoadingSkeleton rows={5} columns={4} />;

  return (
    <div>
      <PageHeader
        title={t('nav.packages')}
        breadcrumb={[{ label: t('nav.packages') }]}
        actions={
          <Button size="sm">
            <Plus size={14} className="me-1" /> Add package
          </Button>
        }
      />

      <div className="bg-surface-card rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-page border-b border-border">
            <tr>
              <th className="text-start px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Package</th>
              <th className="text-start px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Pricing</th>
              <th className="text-start px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Limits</th>
              <th className="text-start px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Trial</th>
              <th className="text-start px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {packages.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400">No packages yet.</td>
              </tr>
            )}
            {packages.map((pkg) => (
              <tr key={pkg.id} className="hover:bg-surface-page transition-colors duration-100">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{pkg.name}</p>
                  {pkg.description && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[200px]">{pkg.description}</p>
                  )}
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <PricingCell pkg={pkg} />
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <LimitsCell pkg={pkg} />
                </td>
                <td className="px-4 py-3 hidden lg:table-cell">
                  <span className="text-sm text-gray-500 tabular-nums">
                    {pkg.trialDays > 0 ? `${pkg.trialDays}d` : '—'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={pkg.isActive ? 'green' : 'default'} className="gap-1">
                    {pkg.isActive
                      ? <><Check size={10} /> Active</>
                      : <><X size={10} /> Inactive</>
                    }
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    <Button size="sm" variant="ghost" aria-label={t('common.edit')}>
                      <Pencil size={13} />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={t('common.delete')}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => setConfirmDelete(pkg)}
                    >
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
        title="Delete package?"
        description={`"${confirmDelete?.name}" will be permanently removed. Organizations on this package will not be affected.`}
        confirmLabel={t('common.delete')}
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleteMut.isPending}
      />
    </div>
  );
}
