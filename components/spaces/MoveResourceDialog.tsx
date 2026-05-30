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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/ui';
import { cn } from '@/lib/utils/cn';

type Mode = 'move' | 'transfer-qty';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'asset' | 'inventory' | 'request' | 'customer';
  ids: string[];
  recordLabel: string;
  /** For inventory: the source item's current on-hand quantity, used as
   *  the max for "Transfer quantity" mode. Ignored for non-inventory types. */
  availableQty?: number;
  /** For inventory: the source item's unit, displayed next to the qty input. */
  unit?: string;
  onMoved?: (movedCount: number) => void;
}

/**
 * "Move to space" dialog. For inventory it also offers "Transfer
 * quantity" mode — splits stock between source and target via paired
 * ledger rows, auto-creating a target item with the same SKU when
 * needed. Whole-record move is the default.
 */
export function MoveResourceDialog({
  open, onOpenChange, type, ids, recordLabel, availableQty, unit, onMoved,
}: Props) {
  const { t } = useT();
  const currentSpace = useSpace();
  const { data: spaceList } = useAccessibleSpaces();
  const move = useMoveResources();
  const [target, setTarget] = useState<string>('');
  const [mode, setMode] = useState<Mode>('move');
  const [qty, setQty] = useState<string>('');

  const eligible = useMemo(() => {
    const all = spaceList?.items ?? [];
    return all.filter((s) => s.slug !== currentSpace && s.status === 'active');
  }, [spaceList, currentSpace]);

  const isInventory = type === 'inventory';
  // transfer-qty is only available for a single inventory item.
  const canTransferQty = isInventory && ids.length === 1;
  const numericQty = Number(qty);
  const qtyValid = mode !== 'transfer-qty'
    || (qty !== '' && Number.isFinite(numericQty) && numericQty > 0
        && (availableQty === undefined || numericQty <= availableQty));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!target || ids.length === 0) return;
    if (mode === 'transfer-qty' && !qtyValid) return;
    move.mutate(
      {
        type,
        ids,
        targetSpaceId: target,
        mode: mode === 'transfer-qty' ? 'transfer-qty' : 'move',
        qty: mode === 'transfer-qty' ? numericQty : undefined,
      },
      {
        onSuccess: (res) => {
          const msg = res.mode === 'transfer-qty'
            ? t('move.transferSuccess').replace('{qty}', String(res.qty ?? numericQty))
            : t('move.success').replace('{count}', String(res.moved));
          toast.success(msg);
          onMoved?.(res.moved);
          onOpenChange(false);
          setTarget('');
          setQty('');
          setMode('move');
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[440px]">
        <DialogIconHeader
          icon={<ArrowRight className="h-4 w-4" strokeWidth={1.75} />}
          title={mode === 'transfer-qty' ? t('move.titleTransfer') : t('move.title')}
        />
        <form onSubmit={submit}>
          <DialogBody className="space-y-4">
            {/* Mode picker (inventory + single-item only) */}
            {canTransferQty && (
              <div className="grid grid-cols-2 gap-2 p-1 bg-surface-page rounded-md">
                <ModeButton active={mode === 'move'} onClick={() => setMode('move')}>
                  {t('move.modeWhole')}
                </ModeButton>
                <ModeButton active={mode === 'transfer-qty'} onClick={() => setMode('transfer-qty')}>
                  {t('move.modeTransferQty')}
                </ModeButton>
              </div>
            )}

            <p className="text-sm text-gray-700">
              {mode === 'transfer-qty'
                ? t('move.subjectTransfer').replace('{record}', recordLabel)
                : t('move.subject').replace('{type}', typeLabel).replace('{record}', recordLabel)}
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

            {mode === 'transfer-qty' && (
              <div>
                <Label htmlFor="move-qty">{t('move.qty')}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="move-qty"
                    type="number"
                    min={1}
                    step={1}
                    max={availableQty}
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    className="max-w-[160px]"
                  />
                  {unit && <span className="text-sm text-gray-500">{unit}</span>}
                </div>
                {typeof availableQty === 'number' && (
                  <p className="text-xs text-gray-500 mt-1">
                    {t('move.qtyHelp').replace('{available}', String(availableQty)).replace('{unit}', unit ?? '')}
                  </p>
                )}
              </div>
            )}

            <p className="text-xs text-gray-500">
              {mode === 'transfer-qty'
                ? t('move.transferCascade')
                : type === 'asset'    ? t('move.assetCascade')
                : type === 'request'  ? t('move.requestCascade')
                : type === 'customer' ? t('move.customerCascade')
                : t('move.inventoryCascade')}
            </p>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={!target || move.isPending || eligible.length === 0 || !qtyValid}
            >
              {move.isPending
                ? t('move.moving')
                : mode === 'transfer-qty' ? t('move.confirmTransfer') : t('move.confirm')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ModeButton({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'text-xs font-medium rounded-md py-1.5 transition-colors',
        active
          ? 'bg-surface-card text-gray-900 shadow-sm border border-border'
          : 'text-gray-600 hover:text-gray-900',
      )}
    >
      {children}
    </button>
  );
}
