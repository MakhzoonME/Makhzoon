'use client';
import { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Lock } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import {
  usePlatformLists,
  useCreatePlatformListItem,
  useUpdatePlatformListItem,
  useDeletePlatformListItem,
} from '@/hooks/superadmin';
import { toast } from '@/hooks/ui';
import { LIST_REGISTRY, LIST_KEYS, type ListKey, type PlatformListItem } from '@/types';
import { cn } from '@/lib/utils/cn';

const FREE_KEYS = LIST_KEYS.filter((k) => !LIST_REGISTRY[k].isSystem);
const SYSTEM_KEYS = LIST_KEYS.filter((k) => LIST_REGISTRY[k].isSystem);

interface EditState {
  id?: string;
  value: string;
  label: string;
  labelAr: string;
  color: string;
  sortOrder: number;
}

export default function ListsPage() {
  const [selected, setSelected] = useState<ListKey>('asset_status');
  const meta = LIST_REGISTRY[selected];
  const { data: all = [], isLoading } = usePlatformLists();
  const createMut = useCreatePlatformListItem();
  const updateMut = useUpdatePlatformListItem();
  const deleteMut = useDeletePlatformListItem();

  const [editing, setEditing] = useState<EditState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PlatformListItem | null>(null);

  const items = useMemo(
    () => all.filter((i) => i.listKey === selected).sort((a, b) => a.sortOrder - b.sortOrder),
    [all, selected],
  );

  function openAdd() {
    setEditing({ value: '', label: '', labelAr: '', color: '', sortOrder: (items.at(-1)?.sortOrder ?? 0) + 1 });
  }
  function openEdit(item: PlatformListItem) {
    setEditing({ id: item.id, value: item.value, label: item.label, labelAr: item.labelAr ?? '', color: item.color ?? '', sortOrder: item.sortOrder });
  }

  async function save() {
    if (!editing) return;
    const color = editing.color.trim() || null;
    const labelAr = editing.labelAr.trim() || null;
    try {
      if (editing.id) {
        await updateMut.mutateAsync({
          id: editing.id,
          patch: { label: editing.label.trim(), labelAr, color, sortOrder: editing.sortOrder },
        });
      } else {
        await createMut.mutateAsync({
          listKey: selected,
          value: editing.value.trim(),
          label: editing.label.trim(),
          labelAr,
          color,
          sortOrder: editing.sortOrder,
        });
      }
      toast.success('Saved');
      setEditing(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    }
  }

  async function toggleEnabled(item: PlatformListItem) {
    try {
      await updateMut.mutateAsync({ id: item.id, patch: { enabled: !item.enabled } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Update failed');
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteMut.mutateAsync(deleteTarget.id);
      toast.success('Deleted');
      setDeleteTarget(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Delete failed');
    }
  }

  return (
    <div>
      <PageHeader
        title="Lists"
        description="Default dropdown options every organization inherits. Free lists are fully editable; system lists allow label/color/visibility only."
      />

      <div className="flex flex-col md:flex-row gap-6 mt-4">
        {/* List selector */}
        <aside className="md:w-56 flex-shrink-0 space-y-4">
          <ListGroup title="Business lists" keys={FREE_KEYS} selected={selected} onSelect={setSelected} />
          <ListGroup title="System lists" keys={SYSTEM_KEYS} selected={selected} onSelect={setSelected} locked />
        </aside>

        {/* Items */}
        <section className="flex-1 min-w-0">
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
              {meta.description && <p className="text-sm text-gray-500">{meta.description}</p>}
            </div>
            {!meta.isSystem && (
              <Button size="sm" onClick={openAdd}>
                <Plus className="h-4 w-4 me-1" /> Add item
              </Button>
            )}
          </div>

          <div className="rounded-lg border border-border divide-y divide-border">
            {isLoading && <div className="p-4 text-sm text-gray-500">Loading…</div>}
            {!isLoading && items.length === 0 && (
              <div className="p-4 text-sm text-gray-500">No items yet.</div>
            )}
            {items.map((item) => (
              <div key={item.id} className={cn('flex items-center gap-3 px-3 py-2.5', !item.enabled && 'opacity-50')}>
                <span
                  className="h-4 w-4 rounded-full border border-border flex-shrink-0"
                  style={{ background: item.color ?? 'transparent' }}
                />
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-gray-900">{item.label}</span>
                  <span className="ms-2 text-xs text-gray-400 font-mono">{item.value}</span>
                </div>
                <Switch checked={item.enabled} onCheckedChange={() => toggleEnabled(item)} aria-label="Enabled" />
                <Button variant="ghost" size="icon" onClick={() => openEdit(item)} aria-label="Edit">
                  <Pencil className="h-4 w-4" />
                </Button>
                {!item.isSystem && (
                  <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(item)} aria-label="Delete">
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Create / edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'Edit item' : 'Add item'}</DialogTitle>
            <DialogDescription>{meta.label}</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div>
                <Label>Value {(!!editing.id || meta.isSystem) && <span className="text-gray-400">(locked)</span>}</Label>
                <Input
                  value={editing.value}
                  disabled={!!editing.id || meta.isSystem}
                  onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                  placeholder="Stored value, e.g. Active"
                  className="font-mono"
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <Label>Label (English)</Label>
                  <Input
                    value={editing.label}
                    onChange={(e) => setEditing({ ...editing, label: e.target.value })}
                    placeholder="Display label"
                  />
                </div>
                <div className="flex-1">
                  <Label>Label (Arabic)</Label>
                  <Input
                    value={editing.labelAr}
                    onChange={(e) => setEditing({ ...editing, labelAr: e.target.value })}
                    placeholder="التسمية"
                    dir="rtl"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <Label>Color (hex, optional)</Label>
                  <Input
                    value={editing.color}
                    onChange={(e) => setEditing({ ...editing, color: e.target.value })}
                    placeholder="#22c55e"
                    className="font-mono"
                  />
                </div>
                <div className="w-24">
                  <Label>Order</Label>
                  <Input
                    type="number"
                    value={editing.sortOrder}
                    onChange={(e) => setEditing({ ...editing, sortOrder: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
                <Button onClick={save} disabled={createMut.isPending || updateMut.isPending || !editing.label.trim() || (!editing.id && !editing.value.trim())}>
                  Save
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete item"
        description={`Remove "${deleteTarget?.label}" from ${meta.label}? Organizations will no longer see it.`}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
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
