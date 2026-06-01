'use client';
import { use, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Lock } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import {
  useCreatePlatformListItem,
  useUpdatePlatformListItem,
  useDeletePlatformListItem,
} from '@/hooks/superadmin';
import { toast, useT } from '@/hooks/ui';
import { LIST_REGISTRY, LIST_KEYS, type ListKey, type PlatformListItem, type OrgListItem } from '@/types';
import { cn } from '@/lib/utils/cn';

const FREE_KEYS = LIST_KEYS.filter((k) => !LIST_REGISTRY[k].isSystem);
const SYSTEM_KEYS = LIST_KEYS.filter((k) => LIST_REGISTRY[k].isSystem);

interface PlatformEditState {
  id?: string;
  value: string;
  label: string;
  labelAr: string;
  color: string;
  sortOrder: number;
}

interface OrgEditState {
  value: string;
  label: string;
  labelAr: string;
  color: string;
  isCustom: boolean;
  isExistingOverride: boolean;
}

export default function OrgListsPage(props: { params: Promise<{ orgId: string; locale: string }> }) {
  const { orgId, locale } = use(props.params);
  const { t } = useT();
  const qc = useQueryClient();

  const [selected, setSelected] = useState<ListKey>('asset_status');
  const meta = LIST_REGISTRY[selected];

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery<{ platform: PlatformListItem[]; org: OrgListItem[] }>({
    queryKey: ['sa-org-lists', orgId, selected],
    queryFn: async () => {
      const res = await fetch(`/api/superadmin/organizations/${orgId}/lists?key=${selected}`);
      if (!res.ok) throw new Error('Failed to load');
      return res.json();
    },
  });

  const platformItems = useMemo(
    () => (data?.platform ?? []).sort((a, b) => a.sortOrder - b.sortOrder),
    [data],
  );
  const orgItems = useMemo(() => data?.org ?? [], [data]);
  const orgByValue = useMemo(() => new Map(orgItems.map((o) => [o.value, o])), [orgItems]);

  // ── Platform mutations (reuse existing hooks) ──────────────────────────────
  const createPlatformMut = useCreatePlatformListItem();
  const updatePlatformMut = useUpdatePlatformListItem();
  const deletePlatformMut = useDeletePlatformListItem();

  const [platformEdit, setPlatformEdit] = useState<PlatformEditState | null>(null);
  const [platformDeleteTarget, setPlatformDeleteTarget] = useState<PlatformListItem | null>(null);

  function openPlatformAdd() {
    setPlatformEdit({
      value: '',
      label: '',
      labelAr: '',
      color: '',
      sortOrder: (platformItems.at(-1)?.sortOrder ?? 0) + 1,
    });
  }
  function openPlatformEdit(item: PlatformListItem) {
    setPlatformEdit({
      id: item.id,
      value: item.value,
      label: item.label,
      labelAr: item.labelAr ?? '',
      color: item.color ?? '',
      sortOrder: item.sortOrder,
    });
  }

  async function savePlatform() {
    if (!platformEdit) return;
    const color = platformEdit.color.trim() || null;
    const labelAr = platformEdit.labelAr.trim() || null;
    try {
      if (platformEdit.id) {
        await updatePlatformMut.mutateAsync({
          id: platformEdit.id,
          patch: { label: platformEdit.label.trim(), labelAr, color, sortOrder: platformEdit.sortOrder },
        });
      } else {
        await createPlatformMut.mutateAsync({
          listKey: selected,
          value: platformEdit.value.trim(),
          label: platformEdit.label.trim(),
          labelAr,
          color,
          sortOrder: platformEdit.sortOrder,
        });
      }
      toast.success('Saved');
      setPlatformEdit(null);
      qc.invalidateQueries({ queryKey: ['sa-org-lists', orgId, selected] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    }
  }

  async function togglePlatformEnabled(item: PlatformListItem) {
    try {
      await updatePlatformMut.mutateAsync({ id: item.id, patch: { enabled: !item.enabled } });
      qc.invalidateQueries({ queryKey: ['sa-org-lists', orgId, selected] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Update failed');
    }
  }

  async function confirmPlatformDelete() {
    if (!platformDeleteTarget) return;
    try {
      await deletePlatformMut.mutateAsync(platformDeleteTarget.id);
      toast.success('Deleted');
      setPlatformDeleteTarget(null);
      qc.invalidateQueries({ queryKey: ['sa-org-lists', orgId, selected] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Delete failed');
    }
  }

  // ── Org-specific mutations ─────────────────────────────────────────────────
  const upsertOrgMut = useMutation({
    mutationFn: async (body: object) => {
      const res = await fetch(`/api/superadmin/organizations/${orgId}/lists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? 'Failed');
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sa-org-lists', orgId, selected] }),
  });

  const deleteOrgMut = useMutation({
    mutationFn: async (body: object) => {
      const res = await fetch(`/api/superadmin/organizations/${orgId}/lists`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? 'Failed');
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sa-org-lists', orgId, selected] }),
  });

  const [orgEdit, setOrgEdit] = useState<OrgEditState | null>(null);
  const [orgDeleteTarget, setOrgDeleteTarget] = useState<OrgListItem | null>(null);
  const [addingCustom, setAddingCustom] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const [customLabel, setCustomLabel] = useState('');
  const [customLabelAr, setCustomLabelAr] = useState('');
  const [customColor, setCustomColor] = useState('');

  function openOrgOverride(item: PlatformListItem) {
    const existing = orgByValue.get(item.value);
    setOrgEdit({
      value: item.value,
      label: existing?.label ?? item.label,
      labelAr: existing?.labelAr ?? item.labelAr ?? '',
      color: existing?.color ?? item.color ?? '',
      isCustom: false,
      isExistingOverride: !!existing,
    });
  }

  function openOrgEditCustom(item: OrgListItem) {
    setOrgEdit({
      value: item.value,
      label: item.label ?? item.value,
      labelAr: item.labelAr ?? '',
      color: item.color ?? '',
      isCustom: true,
      isExistingOverride: true,
    });
  }

  async function saveOrgEdit() {
    if (!orgEdit) return;
    try {
      await upsertOrgMut.mutateAsync({
        listKey: selected,
        value: orgEdit.value,
        label: orgEdit.label.trim() || null,
        labelAr: orgEdit.labelAr.trim() || null,
        color: orgEdit.color || null,
        isCustom: orgEdit.isCustom,
      });
      toast.success('Saved');
      setOrgEdit(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    }
  }

  async function hideDefault(item: PlatformListItem) {
    try {
      await upsertOrgMut.mutateAsync({
        listKey: selected,
        value: item.value,
        enabled: false,
        isCustom: false,
      });
      toast.success('Hidden for this org');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    }
  }

  async function restoreDefault(value: string) {
    try {
      await deleteOrgMut.mutateAsync({ listKey: selected, value });
      toast.success('Restored');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    }
  }

  async function confirmOrgDelete() {
    if (!orgDeleteTarget) return;
    try {
      await deleteOrgMut.mutateAsync({ listKey: selected, value: orgDeleteTarget.value });
      toast.success('Deleted');
      setOrgDeleteTarget(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Delete failed');
    }
  }

  async function addCustom() {
    if (!customValue.trim() || !customLabel.trim()) return;
    try {
      await upsertOrgMut.mutateAsync({
        listKey: selected,
        value: customValue.trim(),
        label: customLabel.trim(),
        labelAr: customLabelAr.trim() || null,
        color: customColor || null,
        isCustom: true,
      });
      toast.success('Added');
      setAddingCustom(false);
      setCustomValue('');
      setCustomLabel('');
      setCustomLabelAr('');
      setCustomColor('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    }
  }

  // Custom items are org items with no matching platform value
  const customOrgItems = orgItems.filter(
    (o) => o.isCustom && !platformItems.some((p) => p.value === o.value),
  );

  return (
    <div>
      <PageHeader
        title="Lists"
        description="Manage platform defaults and per-org customizations."
        breadcrumb={[
          { label: 'Organizations', href: `/${locale}/superadmin` },
          { label: 'Lists', href: '' },
        ]}
      />

      <div className="flex flex-col md:flex-row gap-6 mt-4">
        {/* List selector */}
        <aside className="md:w-56 flex-shrink-0 space-y-4">
          <ListGroup title="Business lists" keys={FREE_KEYS} selected={selected} onSelect={setSelected} />
          <ListGroup title="System lists" keys={SYSTEM_KEYS} selected={selected} onSelect={setSelected} locked />
        </aside>

        {/* Main content */}
        <section className="flex-1 min-w-0 space-y-6">

          {/* ── Platform defaults ─────────────────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="t-h2 text-gray-900 flex items-center gap-2">
                  {meta.label}
                  {meta.isSystem && (
                    <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                      <Lock className="h-3 w-3" /> values locked
                    </span>
                  )}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">Platform defaults — inherited by all organizations</p>
              </div>
              {!meta.isSystem && (
                <Button size="sm" onClick={openPlatformAdd}>
                  <Plus className="h-4 w-4 me-1" /> Add default
                </Button>
              )}
            </div>

            <div className="rounded-lg border border-border divide-y divide-border">
              {isLoading && <div className="p-4 text-sm text-gray-500">Loading…</div>}
              {!isLoading && platformItems.length === 0 && (
                <div className="p-4 text-sm text-gray-500">No platform items yet.</div>
              )}
              {platformItems.map((item) => {
                const orgOverride = orgByValue.get(item.value);
                const hiddenForOrg = orgOverride && !orgOverride.enabled;
                return (
                  <div
                    key={item.id}
                    className={cn('flex items-center gap-3 px-3 py-2.5', (!item.enabled || hiddenForOrg) && 'opacity-50')}
                  >
                    <span
                      className="h-4 w-4 rounded-full border border-border flex-shrink-0"
                      style={{ background: orgOverride?.color ?? item.color ?? 'transparent' }}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-gray-900">{orgOverride?.label ?? item.label}</span>
                      <span className="ms-2 text-xs text-gray-400 font-mono">{item.value}</span>
                      {orgOverride && orgOverride.enabled && (
                        <Badge variant="blue" className="ms-2">org override</Badge>
                      )}
                      {hiddenForOrg && (
                        <Badge variant="default" className="ms-2">hidden for org</Badge>
                      )}
                    </div>
                    {/* Platform enabled toggle */}
                    <Switch
                      checked={item.enabled}
                      onCheckedChange={() => togglePlatformEnabled(item)}
                      aria-label="Platform enabled"
                    />
                    {/* Edit platform item */}
                    <Button variant="ghost" size="icon" onClick={() => openPlatformEdit(item)} aria-label="Edit platform item">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {/* Hide/restore for this org */}
                    {hiddenForOrg ? (
                      <Button variant="ghost" size="sm" onClick={() => restoreDefault(item.value)} className="text-xs">
                        Restore for org
                      </Button>
                    ) : (
                      <Button variant="ghost" size="icon" onClick={() => hideDefault(item)} aria-label="Hide for this org">
                        <Trash2 className="h-4 w-4 text-orange-400" title="Hide for this org" />
                      </Button>
                    )}
                    {/* Override label/color for this org */}
                    <Button variant="ghost" size="sm" onClick={() => openOrgOverride(item)} className="text-xs text-blue-600">
                      Override for org
                    </Button>
                    {!item.isSystem && (
                      <Button variant="ghost" size="icon" onClick={() => setPlatformDeleteTarget(item)} aria-label="Delete platform item">
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Org-specific custom items ─────────────────────────────────── */}
          {!meta.isSystem && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="t-h3 text-gray-900">Org-only custom items</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Items added only for this organization</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setAddingCustom(true)}>
                  <Plus className="h-4 w-4 me-1" /> Add custom item
                </Button>
              </div>

              <div className="rounded-lg border border-border divide-y divide-border">
                {customOrgItems.length === 0 && (
                  <div className="p-4 text-sm text-gray-500">No custom items for this org.</div>
                )}
                {customOrgItems.map((item) => (
                  <div key={item.value} className={cn('flex items-center gap-3 px-3 py-2.5', !item.enabled && 'opacity-50')}>
                    <span
                      className="h-4 w-4 rounded-full border border-border flex-shrink-0"
                      style={{ background: item.color ?? 'transparent' }}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-gray-900">{item.label ?? item.value}</span>
                      <span className="ms-2 text-xs text-gray-400 font-mono">{item.value}</span>
                      <Badge variant="blue" className="ms-2">custom</Badge>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => openOrgEditCustom(item)} aria-label="Edit">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setOrgDeleteTarget(item)} aria-label="Delete">
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Platform create/edit dialog */}
      <Dialog open={!!platformEdit} onOpenChange={(o) => !o && setPlatformEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{platformEdit?.id ? 'Edit platform item' : 'Add platform item'}</DialogTitle>
            <DialogDescription>{meta.label} — platform default</DialogDescription>
          </DialogHeader>
          {platformEdit && (
            <>
              <DialogBody className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Value {(!!platformEdit.id || meta.isSystem) && <span className="text-gray-400">(locked)</span>}</Label>
                  <Input
                    value={platformEdit.value}
                    disabled={!!platformEdit.id || meta.isSystem}
                    onChange={(e) => setPlatformEdit({ ...platformEdit, value: e.target.value })}
                    placeholder="Stored value, e.g. active"
                    className="font-mono"
                  />
                </div>
                <div className="flex gap-3">
                  <div className="flex-1 space-y-1.5">
                    <Label>Label (English)</Label>
                    <Input
                      value={platformEdit.label}
                      onChange={(e) => setPlatformEdit({ ...platformEdit, label: e.target.value })}
                      placeholder="Display label"
                    />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <Label>Label (Arabic)</Label>
                    <Input
                      value={platformEdit.labelAr}
                      onChange={(e) => setPlatformEdit({ ...platformEdit, labelAr: e.target.value })}
                      placeholder="التسمية"
                      dir="rtl"
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-1 space-y-1.5">
                    <Label>Color (hex, optional)</Label>
                    <Input
                      value={platformEdit.color}
                      onChange={(e) => setPlatformEdit({ ...platformEdit, color: e.target.value })}
                      placeholder="#22c55e"
                      className="font-mono"
                    />
                  </div>
                  <div className="w-24 space-y-1.5">
                    <Label>Order</Label>
                    <Input
                      type="number"
                      value={platformEdit.sortOrder}
                      onChange={(e) => setPlatformEdit({ ...platformEdit, sortOrder: Number(e.target.value) })}
                    />
                  </div>
                </div>
              </DialogBody>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPlatformEdit(null)}>Cancel</Button>
                <Button
                  onClick={savePlatform}
                  disabled={
                    createPlatformMut.isPending ||
                    updatePlatformMut.isPending ||
                    !platformEdit.label.trim() ||
                    (!platformEdit.id && !platformEdit.value.trim())
                  }
                >
                  Save
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Org override/edit dialog */}
      <Dialog open={!!orgEdit} onOpenChange={(o) => !o && setOrgEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{orgEdit?.isExistingOverride ? 'Edit org override' : 'Override for this org'}</DialogTitle>
            <DialogDescription>
              {orgEdit?.isCustom
                ? 'Custom item for this organization only'
                : 'Override the platform default for this organization only'}
            </DialogDescription>
          </DialogHeader>
          {orgEdit && (
            <>
              <DialogBody className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Value <span className="text-gray-400">(locked)</span></Label>
                  <Input value={orgEdit.value} disabled className="font-mono" />
                </div>
                <div className="flex gap-3">
                  <div className="flex-1 space-y-1.5">
                    <Label>Label (English)</Label>
                    <Input
                      value={orgEdit.label}
                      onChange={(e) => setOrgEdit({ ...orgEdit, label: e.target.value })}
                      placeholder="Display label"
                    />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <Label>Label (Arabic)</Label>
                    <Input
                      value={orgEdit.labelAr}
                      onChange={(e) => setOrgEdit({ ...orgEdit, labelAr: e.target.value })}
                      placeholder="التسمية"
                      dir="rtl"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Color (hex, optional)</Label>
                  <Input
                    value={orgEdit.color}
                    onChange={(e) => setOrgEdit({ ...orgEdit, color: e.target.value })}
                    placeholder="#22c55e"
                    className="font-mono"
                  />
                </div>
              </DialogBody>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOrgEdit(null)}>Cancel</Button>
                <Button onClick={saveOrgEdit} disabled={upsertOrgMut.isPending || !orgEdit.label.trim()}>
                  Save
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add custom org item dialog */}
      <Dialog open={addingCustom} onOpenChange={setAddingCustom}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add custom item for this org</DialogTitle>
            <DialogDescription>{meta.label} — org only</DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div className="space-y-1.5">
              <Label>Value <span className="text-xs text-gray-400">(stored key, no spaces)</span></Label>
              <Input
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                placeholder="e.g. vehicles"
                className="font-mono"
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1 space-y-1.5">
                <Label>Label (English)</Label>
                <Input value={customLabel} onChange={(e) => setCustomLabel(e.target.value)} placeholder="e.g. Vehicles" />
              </div>
              <div className="flex-1 space-y-1.5">
                <Label>Label (Arabic)</Label>
                <Input value={customLabelAr} onChange={(e) => setCustomLabelAr(e.target.value)} placeholder="التسمية" dir="rtl" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Color (hex, optional)</Label>
              <Input value={customColor} onChange={(e) => setCustomColor(e.target.value)} placeholder="#22c55e" className="font-mono" />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddingCustom(false)}>Cancel</Button>
            <Button onClick={addCustom} disabled={upsertOrgMut.isPending || !customValue.trim() || !customLabel.trim()}>
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm delete platform item */}
      <ConfirmDialog
        open={!!platformDeleteTarget}
        onOpenChange={(o) => !o && setPlatformDeleteTarget(null)}
        title="Delete platform item"
        description={`Remove "${platformDeleteTarget?.label}" from ${meta.label}? All organizations will lose this default.`}
        confirmLabel="Delete"
        onConfirm={confirmPlatformDelete}
      />

      {/* Confirm delete org custom item */}
      <ConfirmDialog
        open={!!orgDeleteTarget}
        onOpenChange={(o) => !o && setOrgDeleteTarget(null)}
        title="Delete custom item"
        description={`Remove "${orgDeleteTarget?.label ?? orgDeleteTarget?.value}" from this org's ${meta.label}?`}
        confirmLabel="Delete"
        onConfirm={confirmOrgDelete}
      />
    </div>
  );
}

function ListGroup({
  title,
  keys,
  selected,
  onSelect,
  locked,
}: {
  title: string;
  keys: ListKey[];
  selected: ListKey;
  onSelect: (k: ListKey) => void;
  locked?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1.5 flex items-center gap-1">
        {locked && <Lock className="h-3 w-3" />} {title}
      </p>
      <div className="space-y-0.5">
        {keys.map((k) => (
          <button
            key={k}
            onClick={() => onSelect(k)}
            className={cn(
              'w-full text-start text-sm rounded-md px-2.5 py-1.5 transition-colors',
              selected === k ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-600 hover:bg-surface-page',
            )}
          >
            {LIST_REGISTRY[k].label}
          </button>
        ))}
      </div>
    </div>
  );
}
