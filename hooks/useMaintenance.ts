'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MaintenanceRecord } from '@/types';
import { MaintenanceFormData } from '@/lib/validations/maintenance-record.schema';

export function useMaintenance(assetId: string) {
  return useQuery<MaintenanceRecord[]>({
    queryKey: ['maintenance', assetId],
    queryFn: async () => {
      const res = await fetch(`/api/assets/${assetId}/maintenance`);
      if (!res.ok) throw new Error('Failed to fetch maintenance records');
      return res.json();
    },
    enabled: !!assetId,
    staleTime: 30_000,
  });
}

export function useCreateMaintenance(assetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: MaintenanceFormData) => {
      const res = await fetch(`/api/assets/${assetId}/maintenance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to add maintenance record');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['maintenance', assetId] });
      qc.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

export function useDeleteMaintenance(assetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (recordId: string) => {
      const res = await fetch(`/api/assets/${assetId}/maintenance/${recordId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete maintenance record');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['maintenance', assetId] });
      qc.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}
