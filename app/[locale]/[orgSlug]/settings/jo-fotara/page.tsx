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
import { toast, useAdminGuard, useT } from '@/hooks/ui';
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
  const { t } = useT();
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
      toast.success(t('common.updated'));
      form.setValue('clientId', '');
      form.setValue('clientSecret', '');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.updateFailed'));
    }
  }

  if (!isAllowed) return null;
  if (isLoading) return <div className="p-6">{t('common.loading')}</div>;

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <PageHeader
        title={t('fawtara.title')}
        description={t('fawtara.subtitle')}
        breadcrumb={[{ label: t('nav.settings') }]}
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
              <strong>{t('fawtara.enabledLead')}</strong> {t('fawtara.enabledDesc')}{' '}
              <strong>({config.mode})</strong>.{' '}
              {!config.hasClientCredentials && (
                <>
                  <strong>{t('fawtara.warning')}</strong> {t('fawtara.noCredsWarning')}
                </>
              )}
            </>
          ) : (
            <>
              <strong>{t('fawtara.disabledLead')}</strong> {t('fawtara.disabledDesc')}
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
                  <FormLabel className="!mt-0">{t('fawtara.enableLabel')}</FormLabel>
                  <p className="text-xs text-gray-500">
                    {t('fawtara.enableHelp')}
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
                  <FormLabel>{t('fawtara.mode')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="sandbox">{t('fawtara.sandbox')}</SelectItem>
                      <SelectItem value="production">{t('fawtara.production')}</SelectItem>
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
                  <FormLabel>{t('fawtara.invoiceType')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="general">{t('fawtara.general')}</SelectItem>
                      <SelectItem value="income">{t('fawtara.income')}</SelectItem>
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
                  <FormLabel>{t('fawtara.taxpayerNumber')}</FormLabel>
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
                  <FormLabel>{t('fawtara.activityNumber')}</FormLabel>
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
                  <FormLabel className="!mt-0">{t('fawtara.vatRegistered')}</FormLabel>
                  <p className="text-xs text-gray-500">{t('fawtara.vatRegHelp')}</p>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="rounded-lg border border-border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-medium">
                <KeyRound size={16} /> {t('fawtara.clientCreds')}
              </div>
              <span className="text-xs text-gray-500">
                {config?.hasClientCredentials ? t('fawtara.credsSet') : t('fawtara.credsNotSet')}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              {t('fawtara.credsHelp')}
            </p>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('fawtara.clientId')}</FormLabel>
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
                    <FormLabel>{t('fawtara.clientSecret')}</FormLabel>
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
              {t('fawtara.showSecrets')}
            </label>
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={updateMut.isPending}>
              {updateMut.isPending ? t('common.saving') : t('fawtara.saveSettings')}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
