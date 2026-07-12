'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CustomFieldForm, type CustomFieldFormData } from '@/components/banna/CustomFieldForm';
import { FieldInput } from '@/components/banna/CustomFieldValuesSection';
import { useCustomFields, useCustomFieldValues, useCreateCustomField } from '@/hooks/banna';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { hasPermission } from '@/lib/permissions';
import type { CustomFieldWithValue } from '@/types/banna.types';
import { customerSchema, type CustomerFormData } from '@/lib/modules/haraka/customers/schemas';

export interface CustomerFormProps {
  initial?: Partial<CustomerFormData>;
  /** Existing customer id — present when editing, absent when creating a new one. */
  recordId?: string;
  submitLabel: string;
  loading?: boolean;
  /** Return the customer's id (new id on create, same id on update) so custom
   *  field values entered in this form can be saved right after. */
  onSubmit: (values: CustomerFormData) => { id: string } | void | Promise<{ id: string } | void>;
  onCancel?: () => void;
}

/** Inline custom fields for the customer, plus an "add field" affordance for
 *  users who can define new Banna fields — new fields become available for
 *  every future customer in this org immediately (module: 'customers'). */
function CustomerCustomFields({
  recordId,
  onDraftChange,
}: {
  recordId?: string;
  onDraftChange: (draft: Record<string, unknown>) => void;
}) {
  const { user } = useAuthStore();
  // Rides on 'pos', not 'banna' — Banna itself isn't released yet (no org
  // has that feature flag), but customer custom fields ship ahead of it.
  const posEnabled = user?.features?.pos === true;
  const canCreateField = !!user && hasPermission(user, 'banna', 'create');
  const qc = useQueryClient();

  // With an existing record, fetch fields + current values; for a brand-new
  // customer there's no record yet, so fetch just the field definitions.
  const valuesQuery = useCustomFieldValues('customers', recordId ?? '');
  const defsQuery = useCustomFields('customers');
  const fields: CustomFieldWithValue[] = recordId
    ? (valuesQuery.data?.items ?? [])
    : (defsQuery.data?.items ?? []).map((f) => ({ ...f, value: null }));
  const loading = recordId ? valuesQuery.isLoading : defsQuery.isLoading;

  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [addFieldOpen, setAddFieldOpen] = useState(false);
  const createField = useCreateCustomField();

  useEffect(() => {
    if (!fields.length) return;
    const initial: Record<string, unknown> = {};
    for (const f of fields) initial[f.id] = f.value ?? null;
    setDraft(initial);
    onDraftChange(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields.length, recordId]);

  if (!posEnabled) return null;
  if (loading) return null;

  function handleChange(fieldId: string, value: unknown) {
    setDraft((prev) => {
      const next = { ...prev, [fieldId]: value };
      onDraftChange(next);
      return next;
    });
  }

  async function handleCreateField(data: CustomFieldFormData) {
    await createField.mutateAsync({ ...data, module: 'customers' });
    if (recordId) qc.invalidateQueries({ queryKey: ['banna-field-values', 'customers', recordId] });
    setAddFieldOpen(false);
  }

  return (
    <div className="pt-2 border-t border-border space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Custom fields</p>
        {canCreateField && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-6 text-xs px-2"
            onClick={() => setAddFieldOpen(true)}
          >
            <Plus className="h-3 w-3 me-1" /> Add field
          </Button>
        )}
      </div>

      {fields.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {fields.map((field) => (
            <FieldInput
              key={field.id}
              field={field}
              value={draft[field.id] ?? null}
              onChange={(v) => handleChange(field.id, v)}
            />
          ))}
        </div>
      )}

      <Dialog open={addFieldOpen} onOpenChange={setAddFieldOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add custom field</DialogTitle>
          </DialogHeader>
          <CustomFieldForm
            fixedModule="customers"
            onSubmit={handleCreateField}
            onCancel={() => setAddFieldOpen(false)}
            submitting={createField.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

const EMPTY: CustomerFormData = {
  name: '',
  phone: null,
  email: null,
  taxNumber: null,
  notes: null,
};

export function CustomerForm({
  initial,
  recordId,
  submitLabel,
  loading,
  onSubmit,
  onCancel,
}: CustomerFormProps) {
  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: { ...EMPTY, ...initial },
  });

  const [fieldsDraft, setFieldsDraft] = useState<Record<string, unknown>>({});
  const [savingFields, setSavingFields] = useState(false);

  async function handleFormSubmit(values: CustomerFormData) {
    const result = await onSubmit(values);
    const id = recordId ?? result?.id;
    const entries = Object.entries(fieldsDraft);
    if (id && entries.length > 0) {
      setSavingFields(true);
      try {
        await fetch('/api/banna/values', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recordType: 'customers',
            recordId: id,
            values: entries.map(([fieldId, value]) => ({ fieldId, value })),
          }),
        });
      } finally {
        setSavingFields(false);
      }
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name *</FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ''} placeholder="Customer name" autoFocus />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value || null)}
                    placeholder="+962 7…"
                    inputMode="tel"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value || null)}
                    placeholder="customer@example.com"
                    type="email"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="taxNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tax number</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.value || null)}
                  placeholder="Required by Fawtara for B2B invoices"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.value || null)}
                  rows={3}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <CustomerCustomFields recordId={recordId} onDraftChange={setFieldsDraft} />

        <div className="flex gap-2 pt-2">
          <Button type="submit" disabled={loading || savingFields}>
            {loading || savingFields
              ? <span className="inline-flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" />Saving…</span>
              : submitLabel}
          </Button>
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={loading || savingFields}>
              Cancel
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}
