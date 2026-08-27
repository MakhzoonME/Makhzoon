'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Combobox } from '@/components/ui/combobox';
import {
  INCLUSION_KEYS,
  INCLUSION_LABELS,
  HARAKA_MODULES,
  HARAKA_MODULE_LABELS,
  type Package,
  type InclusionKey,
  type HarakaModule,
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
] as const;
const LIMIT_LABELS: Record<(typeof LIMIT_KEYS)[number], string> = {
  maxUsers: 'Max Users',
  maxSpaces: 'Max Spaces (branches / locations)',
  maxAssets: 'Max Assets',
  maxInventoryItems: 'Max Inventory Items',
  maxWarranties: 'Max Warranties',
};

const CURRENCIES = ['USD', 'JOD', 'SAR', 'AED', 'EUR'] as const;

// Sub-features gated under the Usool umbrella (module color/grouping mirrors
// lib/nav/index.ts so package config matches what an org actually sees in
// the sidebar, instead of one flat unordered checkbox list).
const USOOL_SUB_FEATURES = ['warranties', 'maintenance', 'assetCheckouts', 'assetNotes'] as const;
const USOOL_SUB_LABELS: Record<(typeof USOOL_SUB_FEATURES)[number], string> = {
  warranties: 'Warranties',
  maintenance: 'Maintenance Records',
  assetCheckouts: 'Asset Checkouts',
  assetNotes: 'Asset Notes',
};

const PLATFORM_FEATURES = ['dashboard', 'support', 'auditLogs'] as const;
const PLATFORM_LABELS: Record<(typeof PLATFORM_FEATURES)[number], string> = {
  dashboard: 'Dashboard',
  support: 'Support',
  auditLogs: 'Audit Logs',
};

// Haraka modules sold beyond the plan's free slot count (pos is the base
// module the 'pos' feature flag already gates, so it's not priced here).
const EXTRA_HARAKA_MODULES = HARAKA_MODULES.filter(
  (m): m is Exclude<HarakaModule, 'pos'> => m !== 'pos',
);

type AddOnKey = 'deliveryAgents' | 'warrantyCerts' | 'customization' | 'purchasesRequests' | 'vehicleIntake' | 'documentReports';
interface AddOnState { included: boolean; price: string }

const ADDON_META: Record<AddOnKey, { label: string; group: 'haraka' | 'raseed' | 'crossModule' }> = {
  deliveryAgents:     { label: 'Workers',              group: 'haraka' },
  warrantyCerts:      { label: 'Warranty certificates', group: 'haraka' },
  customization:      { label: 'Customization',         group: 'haraka' },
  vehicleIntake:      { label: 'Vehicle intake (plate capture)', group: 'haraka' },
  // Cross-vertical: sold to Haraka retailers and Zeyara clinics alike, so it
  // is no longer owned by the Haraka fieldset.
  documentReports:    { label: 'Document reports',      group: 'crossModule' },
  purchasesRequests:  { label: 'Purchases & Requests',   group: 'raseed' },
};

function moduleAllowanceKey(key: AddOnKey): string {
  return `${key}Included`;
}

function AddOnRow({
  addonKey,
  state,
  onChange,
}: {
  addonKey: AddOnKey;
  state: AddOnState;
  onChange: (patch: Partial<AddOnState>) => void;
}) {
  const meta = ADDON_META[addonKey];
  return (
    <div className="flex items-center gap-3">
      <input
        type="checkbox"
        id={`pkg-addon-${addonKey}`}
        checked={state.included}
        onChange={(e) => onChange({ included: e.target.checked })}
      />
      <Label htmlFor={`pkg-addon-${addonKey}`} className="font-normal text-sm flex-1">
        {meta.label} — included in plan
      </Label>
      <Input
        type="number"
        min={0}
        step="0.01"
        placeholder="Standalone price"
        value={state.price}
        onChange={(e) => onChange({ price: e.target.value })}
        className="max-w-[180px]"
      />
    </div>
  );
}

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
  });
  const [unlimited, setUnlimited] = useState({
    maxUsers: (initial?.limits.maxUsers ?? 10) === -1,
    maxSpaces: (initial?.limits.maxSpaces ?? 1) === -1,
    maxAssets: (initial?.limits.maxAssets ?? 100) === -1,
    maxInventoryItems: (initial?.limits.maxInventoryItems ?? 100) === -1,
    maxWarranties: (initial?.limits.maxWarranties ?? 100) === -1,
  });

  // Module-level feature flags (whole umbrella on/off). Sub-features and
  // add-ons within each module have their own state below, grouped in the
  // JSX by the same module they belong to in lib/nav/index.ts.
  const [dashboard,  setDashboard]  = useState(initial?.features?.dashboard  ?? true);
  const [support,    setSupport]    = useState(initial?.features?.support    ?? true);
  const [auditLogs,  setAuditLogs]  = useState(initial?.features?.auditLogs  ?? true);
  const [assets,     setAssets]     = useState(initial?.features?.assets     ?? true);
  const [inventory,  setInventory]  = useState(initial?.features?.inventory  ?? true);
  const [pos,        setPos]        = useState(initial?.features?.pos       ?? true);
  // Zeyara defaults OFF: it is a separate vertical a clinic buys deliberately,
  // not something every package should carry.
  const [zeyara,     setZeyara]     = useState(initial?.features?.zeyara    ?? false);
  const [banna,      setBanna]      = useState(initial?.features?.banna     ?? true);
  const [vehicleIntakeFeature, setVehicleIntakeFeature] = useState(initial?.features?.vehicleIntake ?? false);

  const [usoolSub, setUsoolSub] = useState<Record<(typeof USOOL_SUB_FEATURES)[number], boolean>>(() =>
    USOOL_SUB_FEATURES.reduce(
      (acc, k) => ({ ...acc, [k]: initial?.features?.[k] ?? true }),
      {} as Record<(typeof USOOL_SUB_FEATURES)[number], boolean>,
    ),
  );

  const [inclusions, setInclusions] = useState<Record<InclusionKey, boolean>>(() =>
    INCLUSION_KEYS.reduce(
      (acc, k) => ({ ...acc, [k]: initial?.inclusions?.[k] ?? false }),
      {} as Record<InclusionKey, boolean>,
    ),
  );

  // Haraka: free module slots + per-module price beyond that count.
  const [harakaIncludedModuleSlots, setHarakaIncludedModuleSlots] = useState<number>(
    initial?.allowances?.harakaIncludedModuleSlots ?? 1,
  );
  const [harakaModulePrices, setHarakaModulePrices] = useState<Record<Exclude<HarakaModule, 'pos'>, string>>({
    services: initial?.addOnPrices?.harakaModules?.services != null ? String(initial.addOnPrices.harakaModules.services) : '',
    orders: initial?.addOnPrices?.harakaModules?.orders != null ? String(initial.addOnPrices.harakaModules.orders) : '',
    retainers: initial?.addOnPrices?.harakaModules?.retainers != null ? String(initial.addOnPrices.harakaModules.retainers) : '',
    appointments: initial?.addOnPrices?.harakaModules?.appointments != null ? String(initial.addOnPrices.harakaModules.appointments) : '',
  });

  // Add-ons — included-in-plan toggle + standalone price, one row per
  // key, grouped under whichever module owns it (see ADDON_META).
  const [addOns, setAddOns] = useState<Record<AddOnKey, AddOnState>>(() => {
    const keys: AddOnKey[] = ['deliveryAgents', 'warrantyCerts', 'customization', 'purchasesRequests', 'vehicleIntake', 'documentReports'];
    return keys.reduce((acc, key) => {
      const allowanceKey = moduleAllowanceKey(key) as keyof NonNullable<Package['allowances']>;
      acc[key] = {
        included: (initial?.allowances?.[allowanceKey] as boolean | undefined) ?? false,
        price: initial?.addOnPrices?.[key] != null ? String(initial.addOnPrices[key]) : '',
      };
      return acc;
    }, {} as Record<AddOnKey, AddOnState>);
  });

  function updateAddOn(key: AddOnKey, patch: Partial<AddOnState>) {
    setAddOns((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  }

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

    const addOnAllowances = (Object.keys(addOns) as AddOnKey[]).reduce(
      (acc, key) => ({ ...acc, [moduleAllowanceKey(key)]: addOns[key].included }),
      {} as Record<string, boolean>,
    );
    const addOnPriceValues = (Object.keys(addOns) as AddOnKey[]).reduce(
      (acc, key) => ({ ...acc, [key]: addOns[key].price === '' ? undefined : Number(addOns[key].price) }),
      {} as Record<AddOnKey, number | undefined>,
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
      features: {
        dashboard, support, auditLogs,
        assets, inventory, pos, zeyara, banna,
        vehicleIntake: vehicleIntakeFeature,
        ...usoolSub,
      },
      inclusions,
      allowances: {
        harakaIncludedModuleSlots,
        ...addOnAllowances,
      },
      addOnPrices: {
        ...addOnPriceValues,
        harakaModules: {
          services: harakaModulePrices.services === '' ? undefined : Number(harakaModulePrices.services),
          orders: harakaModulePrices.orders === '' ? undefined : Number(harakaModulePrices.orders),
          retainers: harakaModulePrices.retainers === '' ? undefined : Number(harakaModulePrices.retainers),
          appointments: harakaModulePrices.appointments === '' ? undefined : Number(harakaModulePrices.appointments),
        },
      },
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
            <Combobox
              id="pkg-currency"
              value={currency}
              onChange={(v) => setCurrency(v ?? currency)}
              options={CURRENCIES.map((c) => ({ value: c, label: c }))}
              searchable={false}
              clearable={false}
            />
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

      {/* ── Module Access — grouped to match lib/nav/index.ts's sidebar structure ── */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-800 px-1">Module Access</h3>

        {/* Platform — global org-level pages, not tied to a named module */}
        <fieldset className="space-y-2 border border-border rounded-lg p-4">
          <legend className="px-2 text-sm font-medium text-gray-700">Platform</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PLATFORM_FEATURES.map((key) => {
              const value = { dashboard, support, auditLogs }[key];
              const setter = { dashboard: setDashboard, support: setSupport, auditLogs: setAuditLogs }[key];
              return (
                <label key={key} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-surface-page cursor-pointer">
                  <input type="checkbox" checked={value} onChange={(e) => setter(e.target.checked)} />
                  <span className="text-sm text-gray-700">{PLATFORM_LABELS[key]}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {/* Usool (Assets) */}
        <fieldset className="space-y-2 border-s-4 border border-border rounded-lg p-4" style={{ borderInlineStartColor: '#00695C' }}>
          <legend className="px-2 text-sm font-medium text-gray-700">Usool — Assets</legend>
          <label className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-surface-page cursor-pointer font-medium">
            <input type="checkbox" checked={assets} onChange={(e) => setAssets(e.target.checked)} />
            <span className="text-sm text-gray-800">Assets (base module)</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 ps-6">
            {USOOL_SUB_FEATURES.map((key) => (
              <label key={key} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-surface-page cursor-pointer">
                <input
                  type="checkbox"
                  checked={usoolSub[key]}
                  disabled={!assets}
                  onChange={(e) => setUsoolSub((prev) => ({ ...prev, [key]: e.target.checked }))}
                />
                <span className="text-sm text-gray-700">{USOOL_SUB_LABELS[key]}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* Raseed (Inventory) */}
        <fieldset className="space-y-2 border-s-4 border border-border rounded-lg p-4" style={{ borderInlineStartColor: '#E65100' }}>
          <legend className="px-2 text-sm font-medium text-gray-700">Raseed — Inventory</legend>
          <label className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-surface-page cursor-pointer font-medium">
            <input type="checkbox" checked={inventory} onChange={(e) => setInventory(e.target.checked)} />
            <span className="text-sm text-gray-800">Inventory (base module)</span>
          </label>
          <div className="ps-6">
            <AddOnRow addonKey="purchasesRequests" state={addOns.purchasesRequests} onChange={(patch) => updateAddOn("purchasesRequests", patch)} />
          </div>
        </fieldset>

        {/* Haraka (POS umbrella) */}
        <fieldset className="space-y-3 border-s-4 border border-border rounded-lg p-4" style={{ borderInlineStartColor: '#C2185B' }}>
          <legend className="px-2 text-sm font-medium text-gray-700">Haraka — Point of Sale</legend>
          <label className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-surface-page cursor-pointer font-medium">
            <input type="checkbox" checked={pos} onChange={(e) => setPos(e.target.checked)} />
            <span className="text-sm text-gray-800">Point of Sale (base module)</span>
          </label>

          <div className="ps-6 space-y-3">
            <div className="flex items-center gap-3">
              <Label className="w-56 shrink-0 text-sm font-normal">Free Haraka module slots</Label>
              <Input
                type="number"
                min={0}
                max={EXTRA_HARAKA_MODULES.length}
                value={harakaIncludedModuleSlots}
                onChange={(e) => setHarakaIncludedModuleSlots(Number(e.target.value) || 0)}
                className="max-w-[120px]"
              />
              <p className="text-xs text-gray-500">Choose N of Services/Orders/Retainers free; extras are priced below.</p>
            </div>
            {EXTRA_HARAKA_MODULES.map((mod) => (
              <div key={mod} className="flex items-center gap-3">
                <Label className="w-56 shrink-0 text-sm font-normal">{HARAKA_MODULE_LABELS[mod]} (beyond free slots)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="Price/mo"
                  value={harakaModulePrices[mod]}
                  onChange={(e) => setHarakaModulePrices((prev) => ({ ...prev, [mod]: e.target.value }))}
                  className="max-w-[180px]"
                />
              </div>
            ))}

            <AddOnRow addonKey="deliveryAgents" state={addOns.deliveryAgents} onChange={(patch) => updateAddOn("deliveryAgents", patch)} />
            <AddOnRow addonKey="warrantyCerts" state={addOns.warrantyCerts} onChange={(patch) => updateAddOn("warrantyCerts", patch)} />
            <AddOnRow addonKey="customization" state={addOns.customization} onChange={(patch) => updateAddOn("customization", patch)} />
            <label className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-surface-page cursor-pointer">
              <input type="checkbox" checked={vehicleIntakeFeature} onChange={(e) => setVehicleIntakeFeature(e.target.checked)} />
              <span className="text-sm text-gray-700">Show plate-capture in the intake UI (car-care)</span>
            </label>
            <AddOnRow addonKey="vehicleIntake" state={addOns.vehicleIntake} onChange={(patch) => updateAddOn("vehicleIntake", patch)} />
          </div>
        </fieldset>

        {/* Zeyara — clinic vertical over the same appointment engine as Haraka.
            Sold as its own base module, not as a Haraka slot: a clinic package
            typically ships Zeyara ON and Point of Sale OFF. */}
        <fieldset className="space-y-2 border-s-4 border border-border rounded-lg p-4" style={{ borderInlineStartColor: '#0F766E' }}>
          <legend className="px-2 text-sm font-medium text-gray-700">Zeyara — Clinics</legend>
          <label className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-surface-page cursor-pointer font-medium">
            <input type="checkbox" checked={zeyara} onChange={(e) => setZeyara(e.target.checked)} />
            <span className="text-sm text-gray-800">Zeyara (base module)</span>
          </label>
          <p className="ps-6 text-xs text-gray-500">
            Appointments, patients, clinical records, providers, follow-ups, reminders, and
            appointment invoicing. Includes the provider directory — no separate Workers add-on
            needed. Add Document Reports below for printable patient reports and referrals.
          </p>
        </fieldset>

        {/* Document Reports — cross-vertical, so it sits outside both the
            Haraka and Zeyara fieldsets: a retailer's inspection report and a
            clinic's patient report are the same templates + instances engine,
            reached from whichever vertical the package sells. */}
        <fieldset className="space-y-2 border-s-4 border border-border rounded-lg p-4" style={{ borderInlineStartColor: '#6B7280' }}>
          <legend className="px-2 text-sm font-medium text-gray-700">Document Reports</legend>
          <div className="ps-2">
            <AddOnRow addonKey="documentReports" state={addOns.documentReports} onChange={(patch) => updateAddOn("documentReports", patch)} />
          </div>
          <p className="ps-2 text-xs text-gray-500">
            Org-defined report templates filled per customer encounter, printable and shareable by
            no-login link. Works on Haraka and Zeyara alike; requires at least one of them.
          </p>
        </fieldset>

        {/* Banna */}
        <fieldset className="space-y-2 border-s-4 border border-border rounded-lg p-4" style={{ borderInlineStartColor: '#1565C0' }}>
          <legend className="px-2 text-sm font-medium text-gray-700">Banna — Custom Fields</legend>
          <label className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-surface-page cursor-pointer">
            <input type="checkbox" checked={banna} onChange={(e) => setBanna(e.target.checked)} />
            <span className="text-sm text-gray-700">Custom fields for assets, inventory, and customers</span>
          </label>
        </fieldset>
      </div>

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
