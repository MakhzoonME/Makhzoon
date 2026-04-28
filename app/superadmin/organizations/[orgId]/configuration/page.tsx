'use client';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { toast } from '@/hooks/useToast';
import { useOrgConfig } from '@/hooks/useOrgConfig';
import type {
  ConfigCategory,
  ConfigLocation,
  ConfigStatus,
  Organization,
  OrganizationConfig,
} from '@/types';

function PlusSVG() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
function EditSVG() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M9.5 2.5l2 2-7 7H2.5v-2l7-7z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" fill="none" />
    </svg>
  );
}
function Trash2SVG() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M2 3.5h10M5.5 3.5V2.5h3v1M4 3.5l.75 8h4.5L10 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const PRESET_COLORS = [
  '#22c55e', '#9ca3af', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#06b6d4', '#10b981',
];

type StatusDialogState =
  | { mode: 'create' }
  | { mode: 'edit'; status: ConfigStatus }
  | null;

type SimpleDialogState<T> =
  | { mode: 'create' }
  | { mode: 'edit'; item: T }
  | null;

export default function OrgConfigurationPage({ params }: { params: { orgId: string } }) {
  const { orgId } = params;
  const qc = useQueryClient();

  const { data: org } = useQuery<Organization>({
    queryKey: ['org', orgId],
    queryFn: async () => {
      const res = await fetch(`/api/organizations/${orgId}`);
      if (!res.ok) throw new Error('Failed to load organization');
      return res.json();
    },
  });
  const { data: config, isLoading } = useOrgConfig(orgId);

  const [statusDialog, setStatusDialog] = useState<StatusDialogState>(null);
  const [locationDialog, setLocationDialog] = useState<SimpleDialogState<ConfigLocation>>(null);
  const [categoryDialog, setCategoryDialog] = useState<SimpleDialogState<ConfigCategory>>(null);
  const [confirm, setConfirm] = useState<{
    section: 'statuses' | 'locations' | 'categories';
    id: string;
    label: string;
  } | null>(null);
  const [confirming, setConfirming] = useState(false);

  function refresh(updated?: OrganizationConfig) {
    if (updated) {
      qc.setQueryData(['org-config', orgId], updated);
    } else {
      qc.invalidateQueries({ queryKey: ['org-config', orgId] });
    }
  }

  async function handleConfirmDelete() {
    if (!confirm) return;
    setConfirming(true);
    try {
      const url =
        confirm.section === 'statuses'
          ? `/api/organizations/${orgId}/config/statuses/${confirm.id}`
          : confirm.section === 'locations'
          ? `/api/organizations/${orgId}/config/locations/${confirm.id}`
          : `/api/organizations/${orgId}/config/categories/${confirm.id}`;
      const res = await fetch(url, { method: 'DELETE' });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? 'Failed to delete');
      }
      toast.success(`${confirm.label} deleted`);
      refresh();
      setConfirm(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Organization Configuration"
        description={org ? `Manage dropdown options for ${org.name}` : '—'}
        breadcrumb={[
          { label: 'Organizations', href: '/superadmin' },
          { label: org?.name ?? 'Organization', href: `/superadmin/organizations/${orgId}/edit` },
          { label: 'Configuration', href: '' },
        ]}
      />

      {isLoading || !config ? (
        <Card><CardContent className="p-8 text-sm text-gray-500">Loading configuration…</CardContent></Card>
      ) : (
        <div className="space-y-6 max-w-3xl">
          {/* Asset Statuses */}
          <Card>
            <CardContent className="p-6">
              <SectionHeader
                title="Asset Statuses"
                description="Statuses that can be assigned to assets in this organization."
                onAdd={() => setStatusDialog({ mode: 'create' })}
                addLabel="Add Status"
              />
              <ul className="divide-y divide-gray-100 mt-3">
                {config.assetStatuses.length === 0 && (
                  <li className="py-3 text-sm text-gray-400">No statuses yet.</li>
                )}
                {config.assetStatuses.map((s) => (
                  <li key={s.id} className="flex items-center justify-between py-2.5">
                    <div className="flex items-center gap-3">
                      <span
                        className="inline-block h-3 w-3 rounded-full border border-black/10"
                        style={{ background: s.color }}
                      />
                      <span className="text-sm font-medium text-gray-900">{s.label}</span>
                      <span className="text-xs font-mono text-gray-400">{s.color}</span>
                    </div>
                    <RowActions
                      onEdit={() => setStatusDialog({ mode: 'edit', status: s })}
                      onDelete={() =>
                        setConfirm({ section: 'statuses', id: s.id, label: s.label })
                      }
                    />
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Locations */}
          <Card>
            <CardContent className="p-6">
              <SectionHeader
                title="Locations"
                description="Physical or logical locations where assets can be assigned."
                onAdd={() => setLocationDialog({ mode: 'create' })}
                addLabel="Add Location"
              />
              <ul className="divide-y divide-gray-100 mt-3">
                {config.locations.length === 0 && (
                  <li className="py-3 text-sm text-gray-400">No locations yet.</li>
                )}
                {config.locations.map((l) => (
                  <li key={l.id} className="flex items-center justify-between py-2.5">
                    <span className="text-sm font-medium text-gray-900">{l.name}</span>
                    <RowActions
                      onEdit={() => setLocationDialog({ mode: 'edit', item: l })}
                      onDelete={() =>
                        setConfirm({ section: 'locations', id: l.id, label: l.name })
                      }
                    />
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Categories */}
          <Card>
            <CardContent className="p-6">
              <SectionHeader
                title="Categories"
                description="Categories used to classify assets in this organization."
                onAdd={() => setCategoryDialog({ mode: 'create' })}
                addLabel="Add Category"
              />
              <ul className="divide-y divide-gray-100 mt-3">
                {config.categories.length === 0 && (
                  <li className="py-3 text-sm text-gray-400">No categories yet.</li>
                )}
                {config.categories.map((c) => (
                  <li key={c.id} className="flex items-center justify-between py-2.5">
                    <span className="text-sm font-medium text-gray-900">{c.name}</span>
                    <RowActions
                      onEdit={() => setCategoryDialog({ mode: 'edit', item: c })}
                      onDelete={() =>
                        setConfirm({ section: 'categories', id: c.id, label: c.name })
                      }
                    />
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}

      {statusDialog && (
        <StatusFormDialog
          orgId={orgId}
          state={statusDialog}
          onClose={() => setStatusDialog(null)}
          onSaved={refresh}
        />
      )}

      {locationDialog && (
        <SimpleNameDialog
          title={locationDialog.mode === 'create' ? 'Add Location' : 'Edit Location'}
          fieldLabel="Location Name"
          initialValue={locationDialog.mode === 'edit' ? locationDialog.item.name : ''}
          submit={async (name) => {
            const url =
              locationDialog.mode === 'create'
                ? `/api/organizations/${orgId}/config/locations`
                : `/api/organizations/${orgId}/config/locations/${locationDialog.item.id}`;
            const res = await fetch(url, {
              method: locationDialog.mode === 'create' ? 'POST' : 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name }),
            });
            if (!res.ok) {
              const e = await res.json().catch(() => ({}));
              throw new Error(e.error ?? 'Failed to save location');
            }
          }}
          onClose={() => setLocationDialog(null)}
          onSaved={() => {
            refresh();
            setLocationDialog(null);
          }}
        />
      )}

      {categoryDialog && (
        <SimpleNameDialog
          title={categoryDialog.mode === 'create' ? 'Add Category' : 'Edit Category'}
          fieldLabel="Category Name"
          initialValue={categoryDialog.mode === 'edit' ? categoryDialog.item.name : ''}
          submit={async (name) => {
            const url =
              categoryDialog.mode === 'create'
                ? `/api/organizations/${orgId}/config/categories`
                : `/api/organizations/${orgId}/config/categories/${categoryDialog.item.id}`;
            const res = await fetch(url, {
              method: categoryDialog.mode === 'create' ? 'POST' : 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name }),
            });
            if (!res.ok) {
              const e = await res.json().catch(() => ({}));
              throw new Error(e.error ?? 'Failed to save category');
            }
          }}
          onClose={() => setCategoryDialog(null)}
          onSaved={() => {
            refresh();
            setCategoryDialog(null);
          }}
        />
      )}

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={`Delete ${confirm?.label ?? ''}?`}
        description="This removes the value from the dropdown. Existing records keep their value."
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
        loading={confirming}
      />
    </div>
  );
}

function SectionHeader({
  title,
  description,
  onAdd,
  addLabel,
}: {
  title: string;
  description: string;
  onAdd: () => void;
  addLabel: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
      <Button size="sm" onClick={onAdd}>
        <PlusSVG />
        <span className="ml-1">{addLabel}</span>
      </Button>
    </div>
  );
}

function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex items-center gap-1">
      <Button
        size="sm"
        variant="ghost"
        className="text-gray-500 hover:text-indigo-600 hover:bg-indigo-50"
        onClick={onEdit}
        title="Edit"
      >
        <EditSVG />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="text-gray-500 hover:text-red-600 hover:bg-red-50"
        onClick={onDelete}
        title="Delete"
      >
        <Trash2SVG />
      </Button>
    </div>
  );
}

function StatusFormDialog({
  orgId,
  state,
  onClose,
  onSaved,
}: {
  orgId: string;
  state: { mode: 'create' } | { mode: 'edit'; status: ConfigStatus };
  onClose: () => void;
  onSaved: () => void;
}) {
  const initial = state.mode === 'edit' ? state.status : null;
  const [label, setLabel] = useState(initial?.label ?? '');
  const [color, setColor] = useState(initial?.color ?? PRESET_COLORS[0]);
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const url =
        state.mode === 'create'
          ? `/api/organizations/${orgId}/config/statuses`
          : `/api/organizations/${orgId}/config/statuses/${state.status.id}`;
      const res = await fetch(url, {
        method: state.mode === 'create' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: label.trim(), color }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(typeof e.error === 'string' ? e.error : 'Failed to save status');
      }
      toast.success(state.mode === 'create' ? 'Status added' : 'Status updated');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save status');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{state.mode === 'create' ? 'Add Asset Status' : 'Edit Asset Status'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="status-label">Label *</Label>
            <Input
              id="status-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              required
              maxLength={40}
              placeholder="Maintenance"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="status-color">Color *</Label>
            <div className="flex items-center gap-2">
              <input
                id="status-color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-9 w-12 rounded border border-gray-300 cursor-pointer"
              />
              <Input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                pattern="^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$"
                className="font-mono text-xs"
                maxLength={7}
              />
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="h-5 w-5 rounded-full border border-black/10 transition-transform hover:scale-110"
                  style={{ background: c }}
                  aria-label={`Use color ${c}`}
                />
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !label.trim()}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SimpleNameDialog({
  title,
  fieldLabel,
  initialValue,
  submit,
  onClose,
  onSaved,
}: {
  title: string;
  fieldLabel: string;
  initialValue: string;
  submit: (name: string) => Promise<void>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(initialValue);
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await submit(name.trim());
      toast.success('Saved');
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="simple-name">{fieldLabel} *</Label>
            <Input
              id="simple-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={60}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !name.trim()}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
