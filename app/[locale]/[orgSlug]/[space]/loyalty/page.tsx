'use client';

import { useEffect, useState } from 'react';
import { Info } from 'lucide-react';
import { PageHeader } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useLoyaltyProgram, useUpdateLoyaltyProgram } from '@/hooks/loyalty/useLoyalty';
import { useModuleGuard, toast } from '@/hooks/ui';
import type { LoyaltyTierThreshold } from '@/types';

export default function LoyaltyProgramPage() {
  const { isAllowed } = useModuleGuard({ featureKey: 'loyalty' });
  const { data, isLoading } = useLoyaltyProgram();
  const updateMut = useUpdateLoyaltyProgram();

  const [enabled,           setEnabled]           = useState(false);
  const [pointsPerCurrency, setPointsPerCurrency] = useState(1);
  const [tiers,             setTiers]             = useState<LoyaltyTierThreshold[]>([{ tier: 'bronze', minPoints: 0 }]);

  useEffect(() => {
    if (data?.program) {
      setEnabled(data.program.enabled);
      setPointsPerCurrency(data.program.pointsPerCurrency);
      setTiers(data.program.tiers);
    }
  }, [data]);

  if (!isAllowed) return null;

  async function handleSave() {
    try {
      await updateMut.mutateAsync({ enabled, pointsPerCurrency, tiers });
      toast.success('Loyalty program settings saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    }
  }

  function updateTier(i: number, patch: Partial<LoyaltyTierThreshold>) {
    setTiers((prev) => prev.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));
  }

  function addTier() {
    setTiers((prev) => [...prev, { tier: '', minPoints: 0 }]);
  }

  function removeTier(i: number) {
    setTiers((prev) => prev.filter((_, idx) => idx !== i));
  }

  if (isLoading) {
    return <div className="flex justify-center py-12"><div className="h-6 w-6 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" /></div>;
  }

  return (
    <div className="max-w-xl space-y-6">
      <PageHeader
        title="Loyalty Program"
        description="Points, tiers, and membership cards — available to any org, not tied to a specific module."
      />

      <div className="rounded-xl border border-border bg-surface-page p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label className="font-medium">Enable loyalty program</Label>
            <p className="text-xs text-gray-400 mt-0.5">Customers earn points automatically on completed, paid sales</p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

        {enabled && (
          <>
            <hr className="border-border" />
            <div className="space-y-1.5 max-w-[220px]">
              <Label>Points per currency unit spent</Label>
              <Input
                type="number"
                min={0}
                step={0.1}
                value={pointsPerCurrency}
                onChange={(e) => setPointsPerCurrency(Number(e.target.value))}
              />
            </div>
          </>
        )}
      </div>

      {enabled && (
        <div className="rounded-xl border border-border bg-surface-page p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">Tiers</h3>
          <p className="text-xs text-gray-400">Ordered by minimum points required. A customer's tier is recalculated after every award.</p>
          <div className="space-y-2">
            {tiers.map((tier, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={tier.tier}
                  onChange={(e) => updateTier(i, { tier: e.target.value })}
                  placeholder="Tier name (e.g. gold)"
                  className="flex-1"
                />
                <Input
                  type="number"
                  min={0}
                  value={tier.minPoints}
                  onChange={(e) => updateTier(i, { minPoints: Number(e.target.value) })}
                  placeholder="Min points"
                  className="w-32"
                />
                {tiers.length > 1 && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeTier(i)}>×</Button>
                )}
              </div>
            ))}
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addTier}>Add tier</Button>
        </div>
      )}

      <div className="flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-xs text-blue-700">
        <Info className="h-3.5 w-3.5 flex-shrink-0" />
        Barcode membership cards and Apple/Google Wallet passes are next up — this page currently covers points and tier configuration.
      </div>

      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={updateMut.isPending}>
          {updateMut.isPending ? 'Saving…' : 'Save settings'}
        </Button>
      </div>
    </div>
  );
}
