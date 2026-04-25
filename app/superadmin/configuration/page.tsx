'use client';
import { useState } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, ColumnDef } from '@/components/shared/DataTable';
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
import { PackageForm } from '@/components/super-admin/PackageForm';
import {
  usePackages,
  useCreatePackage,
  useUpdatePackage,
  useDeletePackage,
} from '@/hooks/usePackages';
import { toast } from '@/hooks/useToast';
import {
  FEATURE_KEYS,
  FEATURE_LABELS,
  FEATURE_DESCRIPTIONS,
  type Package,
  type FeatureKey,
} from '@/types';
import type { PackageFormData } from '@/lib/validations/package.schema';

type Tab = 'packages' | 'features';

export default function ConfigurationPage() {
  const [tab, setTab] = useState<Tab>('packages');
  const [showInactive, setShowInactive] = useState(false);
  const { data: packages = [], isLoading } = usePackages({ includeInactive: showInactive });

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Package | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Package | null>(null);

  const createMut = useCreatePackage();
  const updateMut = useUpdatePackage(editing?.id ?? '');
  const deleteMut = useDeletePackage();

  async function handleCreate(data: PackageFormData) {
    try {
      await createMut.mutateAsync(data);
      toast.success('Package created');
      setCreateOpen(false);
    } catch {
      toast.error('Failed to create package');
    }
  }

  async function handleUpdate(data: PackageFormData) {
    if (!editing) return;
    try {
      await updateMut.mutateAsync(data);
      toast.success('Package updated');
      setEditing(null);
    } catch {
      toast.error('Failed to update package');
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteMut.mutateAsync(deleteTarget.id);
      toast.success('Package deactivated');
      setDeleteTarget(null);
    } catch {
      toast.error('Failed to deactivate package');
    }
  }

  const packageColumns: ColumnDef<Package>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (p) => (
        <div>
          <p className="font-medium text-gray-900">{p.name}</p>
          <p className="text-xs text-gray-500 line-clamp-1">{p.description}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (p) =>
        p.isActive ? (
          <Badge variant="green">Active</Badge>
        ) : (
          <Badge variant="default">Inactive</Badge>
        ),
    },
    {
      key: 'maxAssets',
      header: 'Max Assets',
      render: (p) => (p.limits.maxAssets === -1 ? 'Unlimited' : p.limits.maxAssets),
    },
    {
      key: 'maxUsers',
      header: 'Max Users',
      render: (p) => (p.limits.maxUsers === -1 ? 'Unlimited' : p.limits.maxUsers),
    },
    {
      key: 'features',
      header: 'Features',
      render: (p) => {
        const enabled = (Object.entries(p.features) as [FeatureKey, boolean][])
          .filter(([, v]) => v)
          .map(([k]) => FEATURE_LABELS[k] ?? k);
        return (
          <div className="flex flex-wrap gap-1">
            {enabled.length === 0 ? (
              <span className="text-xs text-gray-400">none</span>
            ) : (
              enabled.slice(0, 3).map((f) => (
                <span key={f} className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded">
                  {f}
                </span>
              ))
            )}
            {enabled.length > 3 && <span className="text-[10px] text-gray-500">+{enabled.length - 3}</span>}
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (p) => (
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={() => setEditing(p)}>
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          {p.isActive && (
            <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(p)}>
              <Trash2 className="h-3.5 w-3.5 text-red-600" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Configuration" description="Manage subscription tiers and feature catalog." />

      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-6" aria-label="Tabs">
          <button
            type="button"
            onClick={() => setTab('packages')}
            className={`py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === 'packages'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Packages
          </button>
          <button
            type="button"
            onClick={() => setTab('features')}
            className={`py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === 'features'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Features Reference
          </button>
        </nav>
      </div>

      {tab === 'packages' ? (
        <>
          <div className="flex justify-between items-center mb-4">
            <label className="inline-flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
              />
              Show inactive
            </label>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              New Package
            </Button>
          </div>

          <div className="bg-white rounded-lg border border-gray-200">
            <DataTable
              data={packages}
              columns={packageColumns}
              isLoading={isLoading}
              emptyMessage="No packages yet."
              keyExtractor={(p) => p.id}
            />
          </div>
        </>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  Feature Key
                </th>
                <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  Label
                </th>
                <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  Description
                </th>
              </tr>
            </thead>
            <tbody>
              {FEATURE_KEYS.map((k) => (
                <tr key={k} className="border-b border-gray-100">
                  <td className="px-4 py-3 font-mono text-xs text-indigo-700">{k}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{FEATURE_LABELS[k]}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{FEATURE_DESCRIPTIONS[k]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Package</DialogTitle>
            <DialogDescription>Define limits, features, and activation state.</DialogDescription>
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
            <DialogTitle>Edit Package</DialogTitle>
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

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Deactivate package?"
        description={`"${deleteTarget?.name}" will no longer be assignable to new subscriptions. Existing subscriptions are unaffected.`}
        confirmLabel="Deactivate"
        onConfirm={handleDelete}
        loading={deleteMut.isPending}
      />
    </div>
  );
}
