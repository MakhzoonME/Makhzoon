'use client';
import { useMemo, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useT } from '@/hooks/ui';
import { useAccessibleSpaces, useMoveResources } from '@/hooks/spaces';
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
  /** What kind of records are being moved. */
  type: 'asset' | 'inventory';
  /** Ids of the records to move. */
  ids: string[];
  /** Human label shown in the dialog (e.g. asset name or "3 items"). */
  recordLabel: string;
  /** Called after a successful move so callers can navigate away if needed. */
  onMoved?: (movedCount: number) => void;
}

/**
 * Generic "Move to space" dialog used by every space-scoped resource.
 *
 * Lists every space the user can access except the current one. Submitting
 * calls POST /api/spaces/move; the server validates permissions and
 * cascades dependents (e.g. an asset's notes/maintenance/checkouts/warranties).
 */
export function MoveResourceDialog({ open, onOpenChange, type, ids, recordLabel, onMoved }: Props) {
  const { t } = useT();
  const currentSpace = useSpace();
  const { data: spaceList } = useAccessibleSpaces();
  const move = useMoveResources();
  const [target, setTarget] = useState<string>('');

  const eligible = useMemo(() => {
    const all = spaceList?.items ?? [];
    return all.filter((s) => s.slug !== currentSpace && s.status === 'active');
  }, [spaceList, currentSpace]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!target || ids.length === 0) return;
    move.mutate(
      { type, ids, targetSpaceId: target },
      {
        onSuccess: (res) => {
          toast.success(t('move.success').replace('{count}', String(res.moved)));
          onMoved?.(res.moved);
          onOpenChange(false);
          setTarget('');
        },
        onError: (err) => toast.error((err as Error).message),
      },
    );
  }

  const typeLabel = type === 'asset' ? t('move.typeAsset') : t('move.typeInventory');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[420px]">
        <DialogIconHeader
          icon={<ArrowRight className="h-4 w-4" strokeWidth={1.75} />}
          title={t('move.title')}
        />
        <form onSubmit={submit}>
          <DialogBody className="space-y-4">
            <p className="text-sm text-gray-700">
              {t('move.subject')
                .replace('{type}', typeLabel)
                .replace('{record}', recordLabel)}
            </p>
            <div>
              <Label htmlFor="move-target">{t('move.target')}</Label>
              <Select value={target} onValueChange={setTarget}>
                <SelectTrigger id="move-target">
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
            {type === 'asset' && (
              <p className="text-xs text-gray-500">{t('move.assetCascade')}</p>
            )}
            {type === 'inventory' && (
              <p className="text-xs text-gray-500">{t('move.inventoryCascade')}</p>
            )}
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={!target || move.isPending || eligible.length === 0}>
              {move.isPending ? t('move.moving') : t('move.confirm')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
