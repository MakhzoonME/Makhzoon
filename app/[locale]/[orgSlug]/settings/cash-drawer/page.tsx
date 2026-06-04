'use client';

import { useEffect, useState } from 'react';
import { Vault, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCashDrawerConfig, useUpdateCashDrawerConfig } from '@/hooks/haraka';
import { useAdminGuard, toast } from '@/hooks/ui';
import { isWebUsbSupported, openCashDrawer } from '@/lib/modules/haraka/printing/webusb-transport';

export default function CashDrawerSettingsPage() {
  const { isAllowed } = useAdminGuard('settings.fawtara');
  const { data, isLoading } = useCashDrawerConfig();
  const updateMut = useUpdateCashDrawerConfig();

  const [enabled,          setEnabled]         = useState(false);
  const [autoOpen,         setAutoOpen]        = useState(true);
  const [requirePin,       setRequirePin]      = useState(false);
  const [newPin,           setNewPin]          = useState('');
  const [drawerPort,       setDrawerPort]      = useState<0 | 1>(0);
  const [onTimeMs,         setOnTimeMs]        = useState(100);
  const [offTimeMs,        setOffTimeMs]       = useState(100);
  const [testBusy,         setTestBusy]        = useState(false);

  useEffect(() => {
    if (data?.config) {
      const c = data.config;
      setEnabled(c.enabled);
      setAutoOpen(c.autoOpenOnCash);
      setRequirePin(c.requirePin);
      setDrawerPort(c.drawerPort);
      setOnTimeMs(c.onTimeMs);
      setOffTimeMs(c.offTimeMs);
    }
  }, [data]);

  if (!isAllowed) return null;

  async function handleSave() {
    try {
      await updateMut.mutateAsync({
        enabled,
        autoOpenOnCash: autoOpen,
        requirePin,
        drawerPort,
        onTimeMs,
        offTimeMs,
        pin: newPin.length >= 4 ? newPin : undefined,
      });
      setNewPin('');
      toast.success('Cash drawer settings saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    }
  }

  async function handleTest() {
    if (!isWebUsbSupported()) {
      toast.error('WebUSB not supported in this browser');
      return;
    }
    setTestBusy(true);
    try {
      const ok = await openCashDrawer({ port: drawerPort, onTimeMs, offTimeMs });
      if (ok) toast.success('Cash drawer kick sent');
      else toast.error('No printer paired — pair a printer first in Printer Settings');
    } catch {
      toast.error('Could not send kick command');
    } finally {
      setTestBusy(false);
    }
  }

  if (isLoading) {
    return <div className="flex justify-center py-12"><div className="h-6 w-6 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" /></div>;
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Cash Drawer</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Configure the cash drawer connected to your receipt printer's RJ11 port.
        </p>
      </div>

      {/* ── Enable ─────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-surface-page p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label className="font-medium">Enable cash drawer</Label>
            <p className="text-xs text-gray-400 mt-0.5">Shows the open-drawer button in the POS register</p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

        {enabled && (
          <>
            <hr className="border-border" />
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">Auto-open on cash sale</Label>
                <p className="text-xs text-gray-400 mt-0.5">Kick drawer automatically after any cash payment</p>
              </div>
              <Switch checked={autoOpen} onCheckedChange={setAutoOpen} />
            </div>
          </>
        )}
      </div>

      {/* ── PIN protection ─────────────────────────────────────────── */}
      {enabled && (
        <div className="rounded-xl border border-border bg-surface-page p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">Require PIN for manual open</Label>
              <p className="text-xs text-gray-400 mt-0.5">Cashier must enter a PIN to use the open-drawer button</p>
            </div>
            <Switch checked={requirePin} onCheckedChange={setRequirePin} />
          </div>
          {requirePin && (
            <div className="space-y-1.5">
              <Label>Set PIN (4–6 digits)</Label>
              <Input
                type="password"
                inputMode="numeric"
                pattern="\d*"
                maxLength={6}
                placeholder="Leave blank to keep existing PIN"
                className="max-w-[180px] tracking-widest text-center"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
              />
              <p className="text-xs text-gray-400">Leave blank to keep the existing PIN unchanged.</p>
            </div>
          )}
        </div>
      )}

      {/* ── Hardware ──────────────────────────────────────────────── */}
      {enabled && (
        <div className="rounded-xl border border-border bg-surface-page p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">Hardware settings</h3>

          <div className="flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-xs text-blue-700">
            <Info className="h-3.5 w-3.5 flex-shrink-0" />
            The drawer must be connected to your printer's RJ11/RJ12 port. It is opened via the same USB connection as receipts.
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Drawer port</Label>
              <Select
                value={String(drawerPort)}
                onValueChange={(v) => setDrawerPort(Number(v) as 0 | 1)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Port 0 (pin 2)</SelectItem>
                  <SelectItem value="1">Port 1 (pin 5)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>On-time (ms)</Label>
              <Input
                type="number"
                min={10}
                max={510}
                step={10}
                value={onTimeMs}
                onChange={(e) => setOnTimeMs(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Off-time (ms)</Label>
              <Input
                type="number"
                min={10}
                max={510}
                step={10}
                value={offTimeMs}
                onChange={(e) => setOffTimeMs(Number(e.target.value))}
              />
            </div>
          </div>

          <Button variant="outline" size="sm" onClick={handleTest} disabled={testBusy}>
            <Vault className="h-3.5 w-3.5 me-1.5" />
            {testBusy ? 'Testing…' : 'Test kick'}
          </Button>
        </div>
      )}

      <div className="flex gap-2">
        <Button
          onClick={handleSave}
          disabled={updateMut.isPending}
          style={{ background: 'var(--mod-haraka)' }}
        >
          {updateMut.isPending ? 'Saving…' : 'Save settings'}
        </Button>
      </div>
    </div>
  );
}
