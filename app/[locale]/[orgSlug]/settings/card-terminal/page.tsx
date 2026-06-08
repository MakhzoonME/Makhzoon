'use client';

import { useEffect, useState } from 'react';
import { CreditCard, Info, CheckCircle2, XCircle, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCardTerminalConfig, useUpdateCardTerminalConfig } from '@/hooks/haraka';
import { useAdminGuard, toast } from '@/hooks/ui';
import { getReceiptBaseUrl } from '@/lib/app-env';
import type { CardTerminalMode } from '@/types';

export default function CardTerminalSettingsPage() {
  const { isAllowed } = useAdminGuard('settings.fawtara');
  const { data, isLoading } = useCardTerminalConfig();
  const updateMut = useUpdateCardTerminalConfig();

  const [enabled,         setEnabled]        = useState(false);
  const [mode,            setMode]           = useState<CardTerminalMode>('display');
  const [bridgeUrl,       setBridgeUrl]      = useState('http://localhost:7433');
  const [provider,        setProvider]       = useState('');
  const [apiKey,          setApiKey]         = useState('');
  const [terminalId,      setTerminalId]     = useState('');
  const [webhookSecret,   setWebhookSecret]  = useState('');
  const [timeoutSecs,     setTimeoutSecs]    = useState(60);
  const [testBusy,        setTestBusy]       = useState(false);
  const [testResult,      setTestResult]     = useState<boolean | null>(null);
  const [copied,          setCopied]         = useState(false);

  useEffect(() => {
    if (data?.config) {
      const c = data.config;
      setEnabled(c.enabled);
      setMode(c.mode);
      setBridgeUrl(c.bridgeUrl ?? 'http://localhost:7433');
      setProvider(c.provider ?? '');
      setTerminalId(c.terminalId ?? '');
      setTimeoutSecs(c.timeoutSeconds);
    }
  }, [data]);

  if (!isAllowed) return null;

  const webhookUrl = `${getReceiptBaseUrl()}/api/haraka/card-payment-result`;

  async function handleSave() {
    try {
      await updateMut.mutateAsync({
        enabled,
        mode,
        bridgeUrl:      mode === 'local_bridge' ? bridgeUrl : null,
        provider:       mode === 'cloud'        ? (provider || null) as 'sumup'|'square'|'paymob'|'custom'|null : null,
        apiKey:         mode === 'cloud' && apiKey      ? apiKey      : undefined,
        terminalId:     mode === 'cloud' && terminalId  ? terminalId  : null,
        webhookSecret:  mode === 'webhook' && webhookSecret ? webhookSecret : undefined,
        timeoutSeconds: timeoutSecs,
      });
      setApiKey('');
      setWebhookSecret('');
      toast.success('Card terminal settings saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    }
  }

  async function handleTestBridge() {
    setTestBusy(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/haraka/card-terminal-config/test', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ bridgeUrl }),
      });
      const data = await res.json();
      setTestResult(data.reachable === true);
    } catch {
      setTestResult(false);
    } finally {
      setTestBusy(false);
    }
  }

  function copyWebhookUrl() {
    navigator.clipboard.writeText(webhookUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (isLoading) {
    return <div className="flex justify-center py-12"><div className="h-6 w-6 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" /></div>;
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Card Terminal</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Connect a Visa / Mastercard payment terminal to the POS register.
        </p>
      </div>

      {/* ── Enable + Mode ──────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-surface-page p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label className="font-medium">Enable card terminal</Label>
            <p className="text-xs text-gray-400 mt-0.5">Shows the terminal flow in the payment dialog</p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

        {enabled && (
          <>
            <hr className="border-border" />
            <div className="space-y-1.5">
              <Label>Integration mode</Label>
              <Select value={mode} onValueChange={(v) => { setMode(v as CardTerminalMode); setTestResult(null); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="display">Display-only — cashier enters amount manually</SelectItem>
                  <SelectItem value="local_bridge">Local Bridge — POS Bridge app on this machine</SelectItem>
                  <SelectItem value="cloud">Cloud API — SumUp, Square, Paymob, etc.</SelectItem>
                  <SelectItem value="webhook">Webhook — terminal pushes result to Makhzoon</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}
      </div>

      {/* ── Local Bridge ──────────────────────────────────────────────── */}
      {enabled && mode === 'local_bridge' && (
        <div className="rounded-xl border border-border bg-surface-page p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">Local Bridge</h3>
          <div className="flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-xs text-blue-700">
            <Info className="h-3.5 w-3.5 flex-shrink-0" />
            Install the Makhzoon POS Bridge app on this machine so the browser can communicate with the terminal.
          </div>
          <div className="space-y-1.5">
            <Label>Bridge URL</Label>
            <Input value={bridgeUrl} onChange={(e) => setBridgeUrl(e.target.value)} placeholder="http://localhost:7433" />
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={handleTestBridge} disabled={testBusy}>
              {testBusy ? 'Testing…' : 'Test connection'}
            </Button>
            {testResult === true  && <span className="flex items-center gap-1 text-xs text-green-700"><CheckCircle2 className="h-3.5 w-3.5" /> Reachable</span>}
            {testResult === false && <span className="flex items-center gap-1 text-xs text-red-600"><XCircle className="h-3.5 w-3.5" /> Not reachable</span>}
          </div>
        </div>
      )}

      {/* ── Cloud ─────────────────────────────────────────────────────── */}
      {enabled && mode === 'cloud' && (
        <div className="rounded-xl border border-border bg-surface-page p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">Cloud API</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Provider</Label>
              <Select value={provider} onValueChange={setProvider}>
                <SelectTrigger><SelectValue placeholder="Select provider" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sumup">SumUp</SelectItem>
                  <SelectItem value="square">Square</SelectItem>
                  <SelectItem value="paymob">Paymob</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Terminal device ID</Label>
              <Input value={terminalId} onChange={(e) => setTerminalId(e.target.value)} placeholder="TRM-XXXXX" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>API key {data?.config.apiKeySet && <span className="text-xs font-normal text-gray-400">(currently set — leave blank to keep)</span>}</Label>
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={data?.config.apiKeySet ? '••••••••' : 'Enter API key'}
            />
          </div>
        </div>
      )}

      {/* ── Webhook ────────────────────────────────────────────────────── */}
      {enabled && mode === 'webhook' && (
        <div className="rounded-xl border border-border bg-surface-page p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">Webhook</h3>
          <div className="space-y-1.5">
            <Label>Your webhook URL (copy this into your terminal provider)</Label>
            <div className="flex items-center gap-2">
              <Input value={webhookUrl} readOnly className="font-mono text-xs bg-surface-inset" />
              <Button variant="outline" size="sm" onClick={copyWebhookUrl}>
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Webhook secret {data?.config.webhookSecretSet && <span className="text-xs font-normal text-gray-400">(currently set)</span>}</Label>
            <Input
              type="password"
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
              placeholder={data?.config.webhookSecretSet ? '••••••••' : 'Enter shared secret (min 8 chars)'}
            />
          </div>
        </div>
      )}

      {/* ── Behaviour ─────────────────────────────────────────────────── */}
      {enabled && (
        <div className="rounded-xl border border-border bg-surface-page p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">Behaviour</h3>
          <div className="space-y-1.5 max-w-[160px]">
            <Label>Timeout (seconds)</Label>
            <Input
              type="number"
              min={10}
              max={300}
              value={timeoutSecs}
              onChange={(e) => setTimeoutSecs(Number(e.target.value))}
            />
            <p className="text-xs text-gray-400">After this time the cashier sees a "check terminal manually" message.</p>
          </div>
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
