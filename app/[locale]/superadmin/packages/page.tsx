'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Power, PowerOff, Check, X } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { PackageForm } from '@/components/super-admin/PackageForm';
import { useT } from '@/hooks/ui';
import { toast } from '@/hooks/ui';
import { usePackages, useCreatePackage, useUpdatePackage, useDeletePackage } from '@/hooks/superadmin';
import type { Package } from '@/types';
import type { PackageFormData } from '@/lib/validations/package.schema';

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
  // Show inactive too: "delete" is a soft delete (is_active=false) surfaced in
  // the UI as Deactivate, so deactivated packages stay listed (as Inactive) and
  // can be reactivated.
  const { data: packages = [], isLoading } = usePackages({ includeInactive: true });
  const deleteMut = useDeletePackage();
  const qc = useQueryClient();
  const [confirmDeactivate, setConfirmDeactivate] = useState<Package | null>(null);
  const [reactivatingId, setReactivatingId] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Package | null>(null);
  const createMut = useCreatePackage();
  const updateMut = useUpdatePackage(editing?.id ?? '');

  async function handleCreate(data: PackageFormData) {
    try {
      await createMut.mutateAsync(data);
      toast.success(t('config.packageCreated'));
      setCreateOpen(false);
    } catch {
      toast.error(t('config.packageCreateFailed'));
    }
  }

  async function handleUpdate(data: PackageFormData) {
    if (!editing) return;
    try {
      await updateMut.mutateAsync(data);
      toast.success(t('config.packageUpdated'));
      setEditing(null);
    } catch {
      toast.error(t('config.packageUpdateFailed'));
    }
  }

  async function handleDeactivate() {
    if (!confirmDeactivate) return;
    try {
      await deleteMut.mutateAsync(confirmDeactivate.id);
      toast.success('Package deactivated');
      setConfirmDeactivate(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.deleteFailed'));
    }
  }

  async function handleReactivate(pkg: Package) {
    setReactivatingId(pkg.id);
    try {
      const res = await fetch(`/api/packages/${pkg.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: true }),
      });
      if (!res.ok) throw new Error('Failed to reactivate');
      toast.success('Package reactivated');
      qc.invalidateQueries({ queryKey: ['packages'] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reactivate');
    } finally {
      setReactivatingId(null);
    }
  }

  if (isLoading) return <LoadingSkeleton rows={5} columns={4} />;

  return (
    <div>
      <PageHeader
        title={t('nav.packages')}
        breadcrumb={[{ label: t('nav.packages') }]}
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus size={14} className="me-1" /> Add package
          </Button>
        }
      />

      <div className="bg-surface-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
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
                    <Button size="sm" variant="ghost" aria-label={t('common.edit')} onClick={() => setEditing(pkg)}>
                      <Pencil size={13} />
                    </Button>
                    {pkg.isActive ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-500 hover:text-red-600 hover:bg-red-50 gap-1"
                        onClick={() => setConfirmDeactivate(pkg)}
                      >
                        <PowerOff size={13} /> Deactivate
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-green-600 hover:text-green-700 hover:bg-green-50 gap-1"
                        disabled={reactivatingId === pkg.id}
                        onClick={() => handleReactivate(pkg)}
                      >
                        <Power size={13} /> {reactivatingId === pkg.id ? '…' : 'Reactivate'}
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      <ConfirmDialog
        open={!!confirmDeactivate}
        onOpenChange={(o) => !o && setConfirmDeactivate(null)}
        title="Deactivate package?"
        description={`"${confirmDeactivate?.name}" will be hidden from new assignments. Organizations already on it are unaffected, and you can reactivate it anytime.`}
        confirmLabel="Deactivate"
        variant="destructive"
        onConfirm={handleDeactivate}
        loading={deleteMut.isPending}
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('config.newPackageTitle')}</DialogTitle>
            <DialogDescription>{t('config.newPackageDesc')}</DialogDescription>
          </DialogHeader>
          <PackageForm
            onCancel={() => setCreateOpen(false)}
            onSubmit={handleCreate}
            submitting={createMut.isPending}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('config.editPackage')}</DialogTitle>
            <DialogDescription>{editing?.name}</DialogDescription>
          </DialogHeader>
          {editing && (
            <PackageForm
              key={editing.id}
              initial={editing}
              onCancel={() => setEditing(null)}
              onSubmit={handleUpdate}
              submitting={updateMut.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
