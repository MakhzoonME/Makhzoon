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
import { toast } from '@/hooks/ui';

export default function NewSessionPage() {
  const router = useRouter();
  const params = useParams<{ locale: string; orgSlug: string; space: string }>();
  const openMut = useOpenSession();

  const form = useForm<OpenSessionFormData>({
    resolver: zodResolver(openSessionSchema),
    defaultValues: { openingFloat: '' as unknown as number },
  });

  async function onSubmit(values: OpenSessionFormData) {
    try {
      const res = await openMut.mutateAsync(values);
      toast.success('Session opened');
      router.push(`/${params.locale}/${params.orgSlug}/${params.space}/haraka/register`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to open session');
    }
  }

  return (
    <div className="p-6 max-w-lg">
      <PageHeader
        title="Open new session"
        description="Count your starting cash and enter the amount below. This becomes the opening float."
        breadcrumb={[
          { label: 'Haraka', href: `/${params.locale}/${params.orgSlug}/${params.space}/haraka` },
          { label: 'Sessions', href: `/${params.locale}/${params.orgSlug}/${params.space}/haraka/sessions` },
          { label: 'New', href: '#' },
        ]}
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="openingFloat"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Opening cash float (JOD) *</FormLabel>
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
              {openMut.isPending ? 'Opening…' : 'Open session'}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
