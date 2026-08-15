'use client';

import { useEffect, useState } from 'react';
import { Info, Copy, Check, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useNotificationConfig, useUpdateNotificationConfig, useCheckOcrUsage } from '@/hooks/superadmin';
import { toast } from '@/hooks/ui';
import { formatDate } from '@/lib/utils/date';

export default function SuperadminNotificationsPage() {
  const { data, isLoading } = useNotificationConfig();
  const updateMut = useUpdateNotificationConfig();
  const usageMut = useCheckOcrUsage();

  const [whatsappEnabled,  setWhatsappEnabled]  = useState(false);
  const [phoneNumberId,    setPhoneNumberId]    = useState('');
  const [token,            setToken]            = useState('');
  const [webhookSecret,    setWebhookSecret]    = useState('');
  const [ocrApiKey,        setOcrApiKey]        = useState('');
  const [copied,           setCopied]           = useState(false);
  const [webhookUrl,       setWebhookUrl]       = useState('');

  const config = data?.config;

  useEffect(() => {
    if (config) {
      setWhatsappEnabled(config.whatsappEnabled);
      setPhoneNumberId(config.whatsappPhoneNumberId ?? '');
    }
  }, [config]);

  // /api/whatsapp/webhook lives in this same app, not the rcpt-* receipt app
  // — the URL to give Meta is always this app's own origin.
  useEffect(() => {
    setWebhookUrl(`${window.location.origin}/api/whatsapp/webhook`);
  }, []);

  async function handleSave() {
    try {
      await updateMut.mutateAsync({
        whatsappEnabled,
        whatsappPhoneNumberId: phoneNumberId || null,
        whatsappToken:         token || undefined,
        whatsappWebhookSecret: webhookSecret || undefined,
        ocrApiKey:             ocrApiKey || undefined,
      });
      setToken('');
      setWebhookSecret('');
      setOcrApiKey('');
      toast.success('Notification settings saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
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
    <div>
      <PageHeader
        title="Notifications"
        description="Makhzoon's own WhatsApp Business number and Plate Recognizer account — shared across every organization, not configured per-org."
        breadcrumb={[{ label: 'Notifications' }]}
      />

      <div className="max-w-xl space-y-6">
        <div className="rounded-xl border border-border bg-surface-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">Enable WhatsApp updates</Label>
              <p className="text-xs text-gray-400 mt-0.5">Sends status updates and the rating request to customers, for every org with the vehicle-intake add-on active</p>
            </div>
            <Switch checked={whatsappEnabled} onCheckedChange={setWhatsappEnabled} />
          </div>

          {whatsappEnabled && (
            <>
              <hr className="border-border" />
              <div className="flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-xs text-blue-700">
                <Info className="h-3.5 w-3.5 flex-shrink-0" />
                Get these from Meta Business Manager → WhatsApp → API Setup, after completing business verification for Makhzoon&apos;s own WhatsApp Business account.
              </div>
              <div className="space-y-1.5">
                <Label>Phone number ID</Label>
                <Input value={phoneNumberId} onChange={(e) => setPhoneNumberId(e.target.value)} placeholder="1234567890" />
              </div>
              <div className="space-y-1.5">
                <Label>Permanent access token {config?.whatsappTokenSet && <span className="text-xs font-normal text-gray-400">(currently set — leave blank to keep)</span>}</Label>
                <Input
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder={config?.whatsappTokenSet ? '••••••••' : 'Paste the System User permanent token'}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Webhook URL (paste into Meta App → Webhooks)</Label>
                <div className="flex items-center gap-2">
                  <Input value={webhookUrl} readOnly className="font-mono text-xs bg-surface-inset" />
                  <Button variant="outline" size="sm" onClick={copyWebhookUrl}>
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Webhook verify token {config?.whatsappWebhookSecretSet && <span className="text-xs font-normal text-gray-400">(currently set)</span>}</Label>
                <Input
                  type="password"
                  value={webhookSecret}
                  onChange={(e) => setWebhookSecret(e.target.value)}
                  placeholder={config?.whatsappWebhookSecretSet ? '••••••••' : 'Same value as hub.verify_token in Meta'}
                />
              </div>
            </>
          )}
        </div>

        <div className="rounded-xl border border-border bg-surface-card p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">Plate recognition (Plate Recognizer)</h3>
          <p className="text-xs text-gray-400">
            Purpose-built plate-recognition API, not generic OCR — free tier covers ~2,500 scans/month.
            Get your token from{' '}
            <a href="https://app.platerecognizer.com" target="_blank" rel="noreferrer" className="text-primary-600 hover:underline">
              app.platerecognizer.com
            </a>{' '}
            → API Token.
          </p>
          <div className="space-y-1.5">
            <Label>API token {config?.ocrApiKeySet && <span className="text-xs font-normal text-gray-400">(currently set — leave blank to keep)</span>}</Label>
            <Input
              type="password"
              value={ocrApiKey}
              onChange={(e) => setOcrApiKey(e.target.value)}
              placeholder={config?.ocrApiKeySet ? '••••••••' : "From Plate Recognizer's dashboard"}
            />
          </div>

          {config?.ocrApiKeySet && (
            <>
              <hr className="border-border" />
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">Usage this month, and per-organization breakdown</p>
                <Button
                  type="button" variant="outline" size="sm"
                  onClick={() => usageMut.mutate(undefined, {
                    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to fetch usage'),
                  })}
                  disabled={usageMut.isPending}
                >
                  <RefreshCw className={`h-3.5 w-3.5 me-1.5 ${usageMut.isPending ? 'animate-spin' : ''}`} />
                  {usageMut.isPending ? 'Checking…' : 'Check usage'}
                </Button>
              </div>

              {usageMut.data && (
                <div className="space-y-3">
                  <div className="rounded-lg bg-surface-page border border-border p-3 text-xs">
                    <p className="font-medium text-gray-800">
                      {usageMut.data.account.callsThisMonth}
                      {usageMut.data.account.totalCallsAllowed != null && ` / ${usageMut.data.account.totalCallsAllowed}`}
                      {' '}calls used this month (account-wide, all orgs combined)
                    </p>
                    {usageMut.data.account.resetsOn && (
                      <p className="text-gray-400 mt-0.5">Resets on {formatDate(usageMut.data.account.resetsOn)}</p>
                    )}
                  </div>

                  {usageMut.data.byOrg.length > 0 && (
                    <div className="rounded-lg border border-border overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-surface-page">
                          <tr>
                            <th className="text-start px-3 py-2 font-medium text-gray-500">Organization</th>
                            <th className="text-end px-3 py-2 font-medium text-gray-500">This month</th>
                            <th className="text-end px-3 py-2 font-medium text-gray-500">All-time</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {usageMut.data.byOrg.map((row) => (
                            <tr key={row.organizationId}>
                              <td className="px-3 py-2 text-gray-700">{row.organizationName}</td>
                              <td className="px-3 py-2 text-end font-mono">{row.callsThisMonth}</td>
                              <td className="px-3 py-2 text-end font-mono text-gray-400">{row.callsTotal}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={updateMut.isPending}>
            {updateMut.isPending ? 'Saving…' : 'Save settings'}
          </Button>
        </div>
      </div>
    </div>
  );
}
