'use client';
import { useMemo, useState } from 'react';
import { Copy } from 'lucide-react';
import { useT } from '@/hooks/ui';
import { useAccessibleSpaces, useDuplicateResources } from '@/hooks/spaces';
import { useSpace } from '@/hooks/ui';
import {
  Dialog, DialogContent, DialogIconHeader, DialogBody, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/ui';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'asset' | 'inventory' | 'request' | 'customer';
  ids: string[];
  recordLabel: string;
  /** Called after a successful duplicate so callers can refresh / navigate. */
  onDuplicated?: (count: number) => void;
}

/**
 * "Duplicate to space" dialog — mirrors MoveResourceDialog but the
 * source records stay in their original space. The target gets new
 * copies. Cascade rules per type (see service):
 *   - asset:     new asset row; notes/maintenance/warranties NOT copied
 *   - inventory: new item, qty=0, no ledger carried
 *   - request:   referenced asset/item must already exist in target
 *   - customer:  new customer record; past sales stay attached to original
 */
export function DuplicateResourceDialog({
  open, onOpenChange, type, ids, recordLabel, onDuplicated,
}: Props) {
  const { t } = useT();
  const currentSpace = useSpace();
  const { data: spaceList } = useAccessibleSpaces();
  const dupe = useDuplicateResources();
  const [target, setTarget] = useState<string>('');

  const eligible = useMemo(() => {
    const all = spaceList?.items ?? [];
    return all.filter((s) => s.slug !== currentSpace && s.status === 'active');
  }, [spaceList, currentSpace]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!target || ids.length === 0) return;
    dupe.mutate(
      { type, ids, targetSpaceId: target },
      {
        onSuccess: (res) => {
          toast.success(t('duplicate.success').replace('{count}', String(res.duplicated)));
          onDuplicated?.(res.duplicated);
          onOpenChange(false);
          setTarget('');
        },
        onError: (err) => toast.error((err as Error).message),
      },
    );
  }

  const typeLabel =
    type === 'inventory' ? t('move.typeInventory')
    : type === 'request' ? t('move.typeRequest')
    : type === 'customer' ? t('move.typeCustomer')
    : t('move.typeAsset');

  const cascadeHint =
    type === 'asset'    ? t('duplicate.assetCascade')
    : type === 'request'  ? t('duplicate.requestCascade')
    : type === 'customer' ? t('duplicate.customerCascade')
    : t('duplicate.inventoryCascade');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[420px]">
        <DialogIconHeader
          icon={<Copy className="h-4 w-4" strokeWidth={1.75} />}
          title={t('duplicate.title')}
        />
        <form onSubmit={submit}>
          <DialogBody className="space-y-4">
            <p className="text-sm text-gray-700">
              {t('duplicate.subject')
                .replace('{type}', typeLabel)
                .replace('{record}', recordLabel)}
            </p>
            <div>
              <Label htmlFor="duplicate-target">{t('move.target')}</Label>
              <Select value={target} onValueChange={setTarget}>
                <SelectTrigger id="duplicate-target">
                  <SelectValue placeholder={t('move.pickSpace')} />
                </SelectTrigger>
                <SelectContent>
                  {eligible.length === 0 && (
                    <div className="px-2.5 py-2 text-sm text-gray-500">{t('move.noOther')}</div>
                  )}
                  {eligible.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-gray-500">{cascadeHint}</p>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={!target || dupe.isPending || eligible.length === 0}>
              {dupe.isPending ? t('duplicate.duplicating') : t('duplicate.confirm')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
