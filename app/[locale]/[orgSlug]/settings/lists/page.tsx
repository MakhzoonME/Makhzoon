'use client';
import { useState } from 'react';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { useList, useUpsertOrgListItem, useDeleteOrgListItem } from '@/hooks/lists';
import { toast, useAdminGuard, useT, useOrgSlug } from '@/hooks/ui';
import { useOrgInfo } from '@/hooks/org';
import { LIST_REGISTRY, LIST_KEYS, type ListKey } from '@/types';
import { cn } from '@/lib/utils/cn';
import type { ResolvedListItem } from '@/types';

// Org-admins customize their org's FREE, org-scoped lists. Platform-scoped
// (org_industry) and system lists are not editable per-org.
const ORG_KEYS = LIST_KEYS.filter(
  (k) => LIST_REGISTRY[k].scope === 'org' && !LIST_REGISTRY[k].isSystem,
);

export default function OrgListsPage() {
  const { isAllowed } = useAdminGuard('settings.orgInfo');
  const { t, locale } = useT();
  useOrgSlug();
  useOrgInfo();
  const isAr = locale === 'ar';
  const [selected, setSelected] = useState<ListKey>(ORG_KEYS[0] ?? 'asset_category');
  const meta = LIST_REGISTRY[selected];

  const { data: items = [], isLoading } = useList(selected);
  const upsertMut = useUpsertOrgListItem();
  const deleteMut = useDeleteOrgListItem();

  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [addColor, setAddColor] = useState('');

  const [editingItem, setEditingItem] = useState<ResolvedListItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editNameAr, setEditNameAr] = useState('');
  const [editColor, setEditColor] = useState('');

  if (!isAllowed) return null;

  async function add() {
    const value = name.trim();
    if (!value) return;
    try {
      await upsertMut.mutateAsync({
        listKey: selected,
        value,
        label: value,
        labelAr: nameAr.trim() || null,
        color: addColor || null,
        isCustom: true,
      } as never);
      toast.success(t('common.added'));
      setAdding(false);
      setName('');
      setNameAr('');
      setAddColor('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.addFailed'));
    }
  }

  async function remove(value: string, isCustom: boolean) {
    try {
      if (isCustom) {
        await deleteMut.mutateAsync({ listKey: selected, value });
      } else {
        await upsertMut.mutateAsync({
          listKey: selected,
          value,
          enabled: false,
        } as never);
      }
      toast.success(t('common.removed'));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.removeFailed'));
    }
  }

  function startEdit(item: ResolvedListItem) {
    setEditingItem(item);
    setEditName(item.label);
    setEditNameAr(item.labelAr ?? '');
    setEditColor(item.color ?? '');
  }

  async function saveEdit() {
    if (!editingItem || !editName.trim()) return;
    try {
      await upsertMut.mutateAsync({
        listKey: selected,
        value: editingItem.value,
        label: editName.trim(),
        labelAr: editNameAr.trim() || null,
        color: editColor || null,
        isCustom: editingItem.isCustom,
      } as never);
      toast.success(t('common.updated'));
      setEditingItem(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.updateFailed'));
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[17px] font-semibold text-gray-900">{t('nav.lists')}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{t('lists.subtitle')}</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <aside className="md:w-52 flex-shrink-0 space-y-0.5">
          {ORG_KEYS.map((k) => (
            <button
              key={k}
              onClick={() => setSelected(k)}
              className={cn(
                'w-full text-start text-sm rounded-md px-2.5 py-1.5 transition-colors',
                selected === k ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-600 hover:bg-surface-page',
              )}
            >
              {t(LIST_REGISTRY[k].labelKey)}
            </button>
          ))}
        </aside>

        <section className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="t-h2 text-gray-900">{t(meta.labelKey)}</h2>
            <Button size="sm" onClick={() => setAdding(true)}>
              <Plus className="h-4 w-4 me-1" /> {t('lists.addItem')}
            </Button>
          </div>

          <div className="rounded-lg border border-border divide-y divide-border">
            {isLoading && <div className="p-4 text-sm text-gray-500">{t('common.loading')}</div>}
            {!isLoading && items.length === 0 && (
              <div className="p-4 text-sm text-gray-500">{t('lists.noItems')}</div>
            )}
            {items.map((item) => (
              <div key={item.value} className="flex items-center gap-3 px-3 py-2.5">
                <span
                  className="h-4 w-4 rounded-full border border-border flex-shrink-0"
                  style={{ background: item.color ?? 'transparent' }}
                />
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-gray-900">{isAr ? item.labelAr || item.label : item.label}</span>
                  <span className="ms-2 text-xs text-gray-400 font-mono">{item.value}</span>
                </div>
                <Badge variant={item.isCustom ? 'blue' : 'default'}>
                  {item.isCustom ? t('lists.custom') : t('lists.default')}
                </Badge>
                <Button variant="ghost" size="icon" onClick={() => startEdit(item)} aria-label={t('common.edit')}>
                  <Pencil className="h-4 w-4 text-gray-500" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => remove(item.value, item.isCustom)} aria-label={item.isCustom ? t('common.remove') : t('common.hide')}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            ))}
          </div>
        </section>
      </div>

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('lists.addTo').replace('{name}', t(meta.labelKey))}</DialogTitle>
            <DialogDescription>{t('lists.addToDesc')}</DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t('lists.name')}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Vehicles" />
            </div>
            <div className="space-y-1.5">
              <Label>{t('lists.nameAr')}</Label>
              <Input value={nameAr} onChange={(e) => setNameAr(e.target.value)} placeholder="التسمية" dir="rtl" />
            </div>
            <div className="space-y-1.5">
              <Label>{t('lists.colorOptional')}</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={addColor || '#000000'}
                  onChange={(e) => setAddColor(e.target.value)}
                  className="h-9 w-9 rounded cursor-pointer border border-border"
                />
                {addColor && (
                  <Button variant="ghost" size="sm" onClick={() => setAddColor('')}>{t('common.clear')}</Button>
                )}
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdding(false)}>{t('common.cancel')}</Button>
            <Button onClick={add} disabled={upsertMut.isPending || !name.trim()}>{t('common.add')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingItem} onOpenChange={(o) => !o && setEditingItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('lists.editItem').replace('{name}', t(meta.labelKey))}</DialogTitle>
            <DialogDescription>{t('lists.editDesc')}</DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t('lists.name')}</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="e.g. Vehicles" />
            </div>
            <div className="space-y-1.5">
              <Label>{t('lists.nameAr')}</Label>
              <Input value={editNameAr} onChange={(e) => setEditNameAr(e.target.value)} placeholder="التسمية" dir="rtl" />
            </div>
            <div className="space-y-1.5">
              <Label>{t('lists.color')}</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={editColor || '#000000'}
                  onChange={(e) => setEditColor(e.target.value)}
                  className="h-9 w-9 rounded cursor-pointer border border-border"
                />
                {editColor && (
                  <Button variant="ghost" size="sm" onClick={() => setEditColor('')}>{t('common.clear')}</Button>
                )}
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingItem(null)}>{t('common.cancel')}</Button>
            <Button onClick={saveEdit} disabled={upsertMut.isPending || !editName.trim()}>{t('common.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
