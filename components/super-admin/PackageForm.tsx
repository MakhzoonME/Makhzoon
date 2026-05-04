'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { FEATURE_KEYS, FEATURE_LABELS, type Package, type FeatureKey } from '@/types';
import type { PackageFormData } from '@/lib/validations/package.schema';

interface PackageFormProps {
  initial?: Package;
  onSubmit: (data: PackageFormData) => Promise<void> | void;
  onCancel: () => void;
  submitting?: boolean;
}

const LIMIT_KEYS = ['maxAssets', 'maxUsers', 'maxWarranties', 'maxRequests'] as const;
const LIMIT_LABELS: Record<(typeof LIMIT_KEYS)[number], string> = {
  maxAssets: 'Max Assets',
  maxUsers: 'Max Users',
  maxWarranties: 'Max Warranties',
  maxRequests: 'Max Requests',
};

export function PackageForm({ initial, onSubmit, onCancel, submitting }: PackageFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [limits, setLimits] = useState({
    maxAssets: initial?.limits.maxAssets ?? 100,
    maxUsers: initial?.limits.maxUsers ?? 10,
    maxWarranties: initial?.limits.maxWarranties ?? 100,
    maxRequests: initial?.limits.maxRequests ?? 50,
  });
  const [unlimited, setUnlimited] = useState({
    maxAssets: (initial?.limits.maxAssets ?? 100) === -1,
    maxUsers: (initial?.limits.maxUsers ?? 10) === -1,
    maxWarranties: (initial?.limits.maxWarranties ?? 100) === -1,
    maxRequests: (initial?.limits.maxRequests ?? 50) === -1,
  });
  const [features, setFeatures] = useState<Record<FeatureKey, boolean>>(() => {
    const base = FEATURE_KEYS.reduce(
      (acc, k) => ({ ...acc, [k]: initial?.features?.[k] ?? true }),
      {} as Record<FeatureKey, boolean>,
    );
    return base;
  });

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
      limits: finalLimits,
      features,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 px-6 pt-4 pb-2">
      <div className="space-y-1.5">
        <Label htmlFor="pkg-name">Name</Label>
        <Input id="pkg-name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={100} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="pkg-desc">Description</Label>
        <Textarea
          id="pkg-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
          rows={3}
        />
      </div>

      <fieldset className="space-y-3 border border-gray-200 rounded-lg p-4">
        <legend className="px-2 text-sm font-medium text-gray-700">Usage Limits</legend>
        {LIMIT_KEYS.map((key) => (
          <div key={key} className="flex items-center gap-3">
            <Label className="w-32 shrink-0 text-sm font-normal">{LIMIT_LABELS[key]}</Label>
            <Input
              type="number"
              min={0}
              value={unlimited[key] ? '' : limits[key]}
              onChange={(e) => onChangeLimit(key, Number(e.target.value) || 0)}
              disabled={unlimited[key]}
              className="max-w-[140px]"
            />
            <label className="inline-flex items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" checked={unlimited[key]} onChange={() => toggleUnlimited(key)} />
              Unlimited
            </label>
          </div>
        ))}
      </fieldset>

      <fieldset className="space-y-2 border border-gray-200 rounded-lg p-4">
        <legend className="px-2 text-sm font-medium text-gray-700">Features</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {FEATURE_KEYS.map((key) => (
            <label key={key} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer">
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
