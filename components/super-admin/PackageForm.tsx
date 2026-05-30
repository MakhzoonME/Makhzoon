'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  FEATURE_KEYS,
  FEATURE_LABELS,
  INCLUSION_KEYS,
  INCLUSION_LABELS,
  type Package,
  type FeatureKey,
  type InclusionKey,
} from '@/types';
import type { PackageFormData } from '@/lib/validations/package.schema';

interface PackageFormProps {
  initial?: Package;
  onSubmit: (data: PackageFormData) => Promise<void> | void;
  onCancel: () => void;
  submitting?: boolean;
}

const LIMIT_KEYS = [
  'maxUsers',
  'maxSpaces',
  'maxAssets',
  'maxInventoryItems',
  'maxWarranties',
  'maxRequests',
] as const;
const LIMIT_LABELS: Record<(typeof LIMIT_KEYS)[number], string> = {
  maxUsers: 'Max Users',
  maxSpaces: 'Max Spaces (branches / locations)',
  maxAssets: 'Max Assets',
  maxInventoryItems: 'Max Inventory Items',
  maxWarranties: 'Max Warranties',
  maxRequests: 'Max Requests',
};

const CURRENCIES = ['USD', 'JOD', 'SAR', 'AED', 'EUR'] as const;

const selectClass =
  'flex h-9 w-full rounded-md border border-border bg-surface-card px-3 text-[14px] text-gray-700 focus:outline-none focus:ring-[3px] focus:ring-primary-500/20 focus:border-primary-600';

export function PackageForm({ initial, onSubmit, onCancel, submitting }: PackageFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);

  // Pricing
  const [monthlyPrice, setMonthlyPrice] = useState<string>(
    initial?.pricing.monthlyPrice != null ? String(initial.pricing.monthlyPrice) : '',
  );
  const [annualPrice, setAnnualPrice] = useState<string>(
    initial?.pricing.annualPrice != null ? String(initial.pricing.annualPrice) : '',
  );
  const [currency, setCurrency] = useState(initial?.pricing.currency ?? 'USD');
  const [isCustom, setIsCustom] = useState(initial?.pricing.isCustom ?? false);

  const [trialDays, setTrialDays] = useState<number>(initial?.trialDays ?? 90);
  const [sortOrder, setSortOrder] = useState<number>(initial?.sortOrder ?? 0);

  const [limits, setLimits] = useState({
    maxUsers: initial?.limits.maxUsers ?? 10,
    maxSpaces: initial?.limits.maxSpaces ?? 1,
    maxAssets: initial?.limits.maxAssets ?? 100,
    maxInventoryItems: initial?.limits.maxInventoryItems ?? 100,
    maxWarranties: initial?.limits.maxWarranties ?? 100,
    maxRequests: initial?.limits.maxRequests ?? 50,
  });
  const [unlimited, setUnlimited] = useState({
    maxUsers: (initial?.limits.maxUsers ?? 10) === -1,
    maxSpaces: (initial?.limits.maxSpaces ?? 1) === -1,
    maxAssets: (initial?.limits.maxAssets ?? 100) === -1,
    maxInventoryItems: (initial?.limits.maxInventoryItems ?? 100) === -1,
    maxWarranties: (initial?.limits.maxWarranties ?? 100) === -1,
    maxRequests: (initial?.limits.maxRequests ?? 50) === -1,
  });

  const [features, setFeatures] = useState<Record<FeatureKey, boolean>>(() =>
    FEATURE_KEYS.reduce(
      (acc, k) => ({ ...acc, [k]: initial?.features?.[k] ?? true }),
      {} as Record<FeatureKey, boolean>,
    ),
  );
  const [inclusions, setInclusions] = useState<Record<InclusionKey, boolean>>(() =>
    INCLUSION_KEYS.reduce(
      (acc, k) => ({ ...acc, [k]: initial?.inclusions?.[k] ?? false }),
      {} as Record<InclusionKey, boolean>,
    ),
  );

  function onChangeLimit(key: (typeof LIMIT_KEYS)[number], value: number) {
    setLimits((prev) => ({ ...prev, [key]: value }));
  }

  function toggleUnlimited(key: (typeof LIMIT_KEYS)[number]) {
    setUnlimited((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const finalLimits = LIMIT_KEYS.reduce(
      (acc, k) => ({ ...acc, [k]: unlimited[k] ? -1 : limits[k] }),
      {} as PackageFormData['limits'],
    );
    await onSubmit({
      name: name.trim(),
      description: description.trim(),
      isActive,
      pricing: {
        monthlyPrice: monthlyPrice === '' ? null : Number(monthlyPrice),
        annualPrice: annualPrice === '' ? null : Number(annualPrice),
        currency,
        isCustom,
      },
      trialDays,
      sortOrder,
      limits: finalLimits,
      features,
      inclusions,
    });
  }

  const annualSaving =
    monthlyPrice !== '' && annualPrice !== ''
      ? Number(monthlyPrice) * 12 - Number(annualPrice)
      : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-5 px-6 pt-4 pb-2">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="pkg-name">Name</Label>
          <Input id="pkg-name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={100} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pkg-order">Display order</Label>
          <Input
            id="pkg-order"
            type="number"
            min={0}
            value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="pkg-desc">Description</Label>
        <Textarea
          id="pkg-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
          rows={2}
        />
      </div>

      <fieldset className="space-y-3 border border-border rounded-lg p-4">
        <legend className="px-2 text-sm font-medium text-gray-700">Pricing</legend>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="pkg-monthly">Monthly price</Label>
            <Input
              id="pkg-monthly"
              type="number"
              min={0}
              step="0.01"
              placeholder="—"
              value={monthlyPrice}
              onChange={(e) => setMonthlyPrice(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pkg-annual">Annual price</Label>
            <Input
              id="pkg-annual"
              type="number"
              min={0}
              step="0.01"
              placeholder="—"
              value={annualPrice}
              onChange={(e) => setAnnualPrice(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pkg-currency">Currency</Label>
            <select id="pkg-currency" className={selectClass} value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
        {annualSaving != null && annualSaving > 0 && (
          <p className="text-xs text-green-600">
            Annual saving: {annualSaving.toFixed(2)} {currency}/yr
          </p>
        )}
        <div className="flex items-center gap-3 pt-1">
          <Switch checked={isCustom} onCheckedChange={setIsCustom} />
          <Label className="font-normal text-sm">Custom / contact-sales pricing (shows monthly as a “from” price)</Label>
        </div>
      </fieldset>

      <div className="space-y-1.5">
        <Label htmlFor="pkg-trial">Free trial (days)</Label>
        <Input
          id="pkg-trial"
          type="number"
          min={0}
          max={365}
          value={trialDays}
          onChange={(e) => setTrialDays(Number(e.target.value) || 0)}
          className="max-w-[160px]"
        />
        <p className="text-xs text-gray-500">90 = 3-month trial · 0 = no trial</p>
      </div>

      <fieldset className="space-y-3 border border-border rounded-lg p-4">
        <legend className="px-2 text-sm font-medium text-gray-700">Usage Limits</legend>
        {LIMIT_KEYS.map((key) => (
          <div key={key} className="flex items-center gap-3">
            <Label className="w-52 shrink-0 text-sm font-normal">{LIMIT_LABELS[key]}</Label>
            <Input
              type="number"
              min={0}
              value={unlimited[key] ? '' : limits[key]}
              onChange={(e) => onChangeLimit(key, Number(e.target.value) || 0)}
              disabled={unlimited[key]}
              className="max-w-[120px]"
            />
            <label className="inline-flex items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" checked={unlimited[key]} onChange={() => toggleUnlimited(key)} />
              Unlimited
            </label>
          </div>
        ))}
      </fieldset>

      <fieldset className="space-y-2 border border-border rounded-lg p-4">
        <legend className="px-2 text-sm font-medium text-gray-700">Plan Inclusions</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {INCLUSION_KEYS.map((key) => (
            <label key={key} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-surface-page cursor-pointer">
              <input
                type="checkbox"
                checked={inclusions[key]}
                onChange={(e) => setInclusions((prev) => ({ ...prev, [key]: e.target.checked }))}
              />
              <span className="text-sm text-gray-700">{INCLUSION_LABELS[key]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-2 border border-border rounded-lg p-4">
        <legend className="px-2 text-sm font-medium text-gray-700">Module Access</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {FEATURE_KEYS.map((key) => (
            <label key={key} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-surface-page cursor-pointer">
              <input
                type="checkbox"
                checked={features[key]}
                onChange={(e) => setFeatures((prev) => ({ ...prev, [key]: e.target.checked }))}
              />
              <span className="text-sm text-gray-700">{FEATURE_LABELS[key]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex items-center gap-3">
        <Switch checked={isActive} onCheckedChange={setIsActive} />
        <Label className="font-normal text-sm">Active (available for assignment)</Label>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting || name.trim().length < 2}>
          {submitting ? 'Saving…' : initial ? 'Save Changes' : 'Create Package'}
        </Button>
      </div>
    </form>
  );
}
