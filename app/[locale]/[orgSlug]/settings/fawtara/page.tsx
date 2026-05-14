'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { CheckCircle2, AlertTriangle, KeyRound } from 'lucide-react';
import { PageHeader } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { useFawtaraConfig, useUpdateFawtaraConfig } from '@/hooks/haraka';
import { toast, useAdminGuard } from '@/hooks/ui';
import type { FawtaraConfig } from '@/types';

interface FormShape {
  enabled: boolean;
  mode: 'sandbox' | 'production';
  taxpayerNumber: string;
  activityNumber: string;
  invoiceTypeDefault: 'income' | 'general';
  vatRegistered: boolean;
  clientId: string;
  clientSecret: string;
}

export default function FawtaraSettingsPage() {
  const { isAllowed } = useAdminGuard('settings.fawtara');
  const { data, isLoading } = useFawtaraConfig();
  const updateMut = useUpdateFawtaraConfig();
  const config: FawtaraConfig | undefined = data?.config;
  const [showSecrets, setShowSecrets] = useState(false);

  const form = useForm<FormShape>({
    defaultValues: {
      enabled: false,
      mode: 'sandbox',
      taxpayerNumber: '',
      activityNumber: '',
      invoiceTypeDefault: 'general',
      vatRegistered: false,
      clientId: '',
      clientSecret: '',
    },
  });

  useEffect(() => {
    if (config) {
      form.reset({
        enabled: config.enabled,
        mode: config.mode,
        taxpayerNumber: config.taxpayerNumber ?? '',
        activityNumber: config.activityNumber ?? '',
        invoiceTypeDefault: config.invoiceTypeDefault,
        vatRegistered: config.vatRegistered,
        clientId: '',
        clientSecret: '',
      });
    }
  }, [config, form]);

  async function onSubmit(values: FormShape) {
    try {
      await updateMut.mutateAsync({
        enabled: values.enabled,
        mode: values.mode,
        taxpayerNumber: values.taxpayerNumber || null,
        activityNumber: values.activityNumber || null,
        invoiceTypeDefault: values.invoiceTypeDefault,
        vatRegistered: values.vatRegistered,
        // Only send secret fields if non-empty — empty means "leave existing".
        clientId: values.clientId ? values.clientId : undefined,
        clientSecret: values.clientSecret ? values.clientSecret : undefined,
      });
      toast.success('Fawtara settings updated');
      form.setValue('clientId', '');
      form.setValue('clientSecret', '');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
    }
  }

  if (!isAllowed) return null;
  if (isLoading) return <div className="p-6">Loading…</div>;

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <PageHeader
        title="Fawtara (Jordan e-invoicing)"
        description="Configure Jordan's ISTD e-invoicing integration. Disabled by default; turn on once credentials are saved."
      />

      <div
        className={`rounded-lg border px-4 py-3 text-sm flex items-start gap-2 ${
          config?.enabled ? 'border-green-300 bg-green-50 text-green-900' : 'border-amber-300 bg-amber-50 text-amber-900'
        }`}
      >
        {config?.enabled ? <CheckCircle2 size={16} className="mt-0.5" /> : <AlertTriangle size={16} className="mt-0.5" />}
        <div>
          {config?.enabled ? (
            <>
              <strong>Enabled.</strong> Every completed POS sale will be submitted to Fawtara{' '}
              <strong>({config.mode})</strong>.{' '}
              {!config.hasClientCredentials && (
                <>
                  <strong>Warning:</strong> no client credentials are stored — submissions will fail until you save them below.
                </>
              )}
            </>
          ) : (
            <>
              <strong>Disabled.</strong> Sales complete normally without e-invoicing. Toggle below to enable.
            </>
          )}
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <FormField
            control={form.control}
            name="enabled"
            render={({ field }) => (
              <FormItem className="flex items-center gap-3">
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <div>
                  <FormLabel className="!mt-0">Enable Fawtara submission</FormLabel>
                  <p className="text-xs text-gray-500">
                    Master switch. When off, every sale records <code>status: skipped</code> and prints without QR.
                  </p>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="mode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mode</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="sandbox">Sandbox</SelectItem>
                      <SelectItem value="production">Production</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="invoiceTypeDefault"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default invoice type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="income">Income</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="taxpayerNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Taxpayer number (الرقم الضريبي)</FormLabel>
                  <FormControl><Input {...field} placeholder="e.g. 12345678" className="font-mono" /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="activityNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Activity number</FormLabel>
                  <FormControl><Input {...field} placeholder="e.g. 9876" className="font-mono" /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="vatRegistered"
            render={({ field }) => (
              <FormItem className="flex items-center gap-3">
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <div>
                  <FormLabel className="!mt-0">VAT-registered</FormLabel>
                  <p className="text-xs text-gray-500">Required by Fawtara if the organization charges VAT.</p>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="rounded-lg border border-border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-medium">
                <KeyRound size={16} /> Client credentials
              </div>
              <span className="text-xs text-gray-500">
                {config?.hasClientCredentials ? 'Set ✓ — leave blank to keep' : 'Not yet set'}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              Provided by ISTD when your organization is onboarded. Stored server-side and never returned to the browser.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client ID</FormLabel>
                    <FormControl>
                      <Input {...field} type={showSecrets ? 'text' : 'password'} placeholder="••••••••" autoComplete="off" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="clientSecret"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client Secret</FormLabel>
                    <FormControl>
                      <Input {...field} type={showSecrets ? 'text' : 'password'} placeholder="••••••••" autoComplete="off" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <label className="flex items-center gap-2 text-xs text-gray-500">
              <input type="checkbox" checked={showSecrets} onChange={(e) => setShowSecrets(e.target.checked)} />
              Show secrets while typing
            </label>
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={updateMut.isPending}>
              {updateMut.isPending ? 'Saving…' : 'Save settings'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
