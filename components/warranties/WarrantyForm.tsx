'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { warrantySchema, WarrantyFormData } from '@/lib/validations/warranty.schema';
import { Warranty } from '@/types';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/useToast';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useAssets } from '@/hooks/useAssets';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Asset } from '@/types';

interface WarrantyFormProps { warranty?: Warranty; }

export function WarrantyForm({ warranty }: WarrantyFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const { data: assets = [] } = useAssets({ status: 'Active' });

  const form = useForm<WarrantyFormData>({
    resolver: zodResolver(warrantySchema),
    defaultValues: {
      assetId: warranty?.assetId ?? searchParams.get('assetId') ?? '',
      vendor: warranty?.vendor ?? '',
      startDate: warranty?.startDate ? new Date(warranty.startDate).toISOString().slice(0, 10) : '',
      endDate: warranty?.endDate ? new Date(warranty.endDate).toISOString().slice(0, 10) : '',
      reminder: warranty?.reminder ?? true,
      notes: warranty?.notes ?? '',
    },
  });

  async function onSubmit(data: WarrantyFormData) {
    setLoading(true);
    try {
      const url = warranty ? `/api/warranties/${warranty.id}` : '/api/warranties';
      const method = warranty ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message ?? 'Failed'); }
      toast.success(warranty ? 'Warranty updated' : 'Warranty added');
      qc.invalidateQueries({ queryKey: ['warranties'] });
      router.back();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally { setLoading(false); }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 max-w-lg">
        <FormField control={form.control} name="assetId" render={({ field }) => (
          <FormItem>
            <FormLabel>Asset *</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!!warranty}>
              <FormControl><SelectTrigger><SelectValue placeholder="Select asset" /></SelectTrigger></FormControl>
              <SelectContent>
                {(assets as Asset[]).map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="vendor" render={({ field }) => (
          <FormItem>
            <FormLabel>Vendor *</FormLabel>
            <FormControl><Input {...field} placeholder="e.g. Dell, Apple..." /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="startDate" render={({ field }) => (
            <FormItem>
              <FormLabel>Start Date *</FormLabel>
              <FormControl><Input type="date" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="endDate" render={({ field }) => (
            <FormItem>
              <FormLabel>End Date *</FormLabel>
              <FormControl><Input type="date" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <FormField control={form.control} name="reminder" render={({ field }) => (
          <FormItem>
            <div className="flex items-center gap-2">
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <Label>Enable Reminder</Label>
            </div>
          </FormItem>
        )} />

        <FormField control={form.control} name="notes" render={({ field }) => (
          <FormItem>
            <FormLabel>Notes</FormLabel>
            <FormControl><Textarea {...field} rows={3} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <div className="flex gap-2">
          <Button type="submit" disabled={loading}>{loading ? 'Saving...' : (warranty ? 'Save Changes' : 'Add Warranty')}</Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        </div>
      </form>
    </Form>
  );
}
