import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/ui';
import type { CustomField, CustomFieldWithValue, CustomFieldRecordType, UpsertCustomFieldValueInput } from '@/types/banna.types';

export function useCustomFields(module?: string) {
  return useQuery<{ items: CustomField[] }>({
    queryKey: ['banna-custom-fields', module],
    queryFn: async () => {
      const params = module && module !== 'all' ? `?module=${module}` : '';
      const res = await fetch(`/api/banna/custom-fields${params}`);
      if (!res.ok) throw new Error('Failed to load');
      return res.json();
    },
  });
}

export function useDeleteCustomField() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/banna/custom-fields/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['banna-custom-fields'] });
      toast.success('Field deleted');
    },
    onError: () => toast.error('Failed to delete field'),
  });
}

export function useCreateCustomField() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch('/api/banna/custom-fields', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? 'Failed'); }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['banna-custom-fields'] });
      toast.success('Field created');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateCustomField() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const res = await fetch(`/api/banna/custom-fields/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? 'Failed'); }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['banna-custom-fields'] });
      toast.success('Field updated');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useCustomFieldValues(recordType: CustomFieldRecordType, recordId: string) {
  return useQuery<{ items: CustomFieldWithValue[] }>({
    queryKey: ['banna-field-values', recordType, recordId],
    enabled: !!recordId,
    queryFn: async () => {
      const res = await fetch(`/api/banna/values?recordType=${recordType}&recordId=${recordId}`);
      if (!res.ok) throw new Error('Failed to load field values');
      return res.json();
    },
    staleTime: 30_000,
  });
}

export function useSaveCustomFieldValues(recordType: CustomFieldRecordType, recordId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: UpsertCustomFieldValueInput[]) => {
      const res = await fetch('/api/banna/values', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordType, recordId, values }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? 'Failed to save'); }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['banna-field-values', recordType, recordId] });
      toast.success('Saved');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
