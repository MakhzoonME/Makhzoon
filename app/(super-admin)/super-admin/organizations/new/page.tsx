'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { organizationSchema, OrganizationFormData } from '@/lib/validations/organization.schema';
import { PageHeader } from '@/components/shared/PageHeader';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/useToast';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

export default function NewOrganizationPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);

  const form = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationSchema),
    defaultValues: { name: '', subdomain: '', contactEmail: '', packageDetails: '', subscriptionStartDate: '', subscriptionEndDate: '' },
  });

  async function onSubmit(data: OrganizationFormData) {
    setLoading(true);
    try {
      const res = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? 'Failed'); }
      await res.json();
      toast.success('Organization created');
      qc.invalidateQueries({ queryKey: ['organizations'] });
      router.push('/super-admin');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally { setLoading(false); }
  }

  return (
    <div>
      <PageHeader
        title="Create Organization"
        breadcrumb={[{ label: 'Organizations', href: '/super-admin' }, { label: 'New', href: '' }]}
      />
      <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-lg">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Organization Name *</FormLabel>
                <FormControl><Input {...field} placeholder="ACME Corp" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="subdomain" render={({ field }) => (
              <FormItem>
                <FormLabel>Subdomain *</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="acme-corp"
                    onChange={(e) => field.onChange(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="contactEmail" render={({ field }) => (
              <FormItem>
                <FormLabel>Contact Email *</FormLabel>
                <FormControl><Input type="email" {...field} placeholder="admin@acme.com" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="packageDetails" render={({ field }) => (
              <FormItem>
                <FormLabel>Package Details</FormLabel>
                <FormControl><Textarea {...field} rows={3} placeholder="Custom plan notes..." /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="subscriptionStartDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Subscription Start *</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="subscriptionEndDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Subscription End *</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create Organization'}</Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
