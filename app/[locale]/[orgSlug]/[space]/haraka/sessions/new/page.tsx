'use client';

import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PageHeader } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { openSessionSchema, type OpenSessionFormData } from '@/lib/modules/haraka/sessions/schemas';
import { useOpenSession } from '@/hooks/haraka';
import { toast, useT } from '@/hooks/ui';
import { useOrgInfo } from '@/hooks/org';

export default function NewSessionPage() {
  const router = useRouter();
  const params = useParams<{ locale: string; orgSlug: string; space: string }>();
  const { t } = useT();
  const { data: orgInfo } = useOrgInfo();
  const openMut = useOpenSession();
  const base = `/${params.locale}/${params.orgSlug}/${params.space}/haraka`;

  const form = useForm<OpenSessionFormData>({
    resolver: zodResolver(openSessionSchema),
    defaultValues: { openingFloat: '' as unknown as number },
  });

  async function onSubmit(values: OpenSessionFormData) {
    try {
      const session = await openMut.mutateAsync(values);
      toast.success(t('haraka.openNewSession'));
      router.push(`${base}/sessions/${session.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to open session');
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <PageHeader
        title={t('haraka.openNewSession')}
        description={t('haraka.openSessionDesc')}
        breadcrumb={[
          { label: orgInfo?.name ?? params.orgSlug },
          { label: params.space },
          { label: t('nav.pos'), href: base },
          { label: t('haraka.sessions'), href: `${base}/sessions` },
          { label: t('haraka.openNewSession') },
        ]}
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="openingFloat"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('haraka.float')} (JOD) *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0"
                    autoFocus
                    {...field}
                    value={field.value === 0 && field.value !== undefined ? '' : field.value}
                    onChange={(e) => field.onChange(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex gap-2">
            <Button type="submit" disabled={openMut.isPending}>
              {openMut.isPending ? t('common.saving') : t('haraka.openNewSession')}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>{t('common.cancel')}</Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
