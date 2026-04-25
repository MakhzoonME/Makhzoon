'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Package } from '@/types';
import type { PackageFormData } from '@/lib/validations/package.schema';

export function usePackages(opts?: { includeInactive?: boolean }) {
  const params = new URLSearchParams();
  if (opts?.includeInactive) params.set('includeInactive', 'true');
  return useQuery<Package[]>({
    queryKey: ['packages', { includeInactive: !!opts?.includeInactive }],
    queryFn: async () => {
      const res = await fetch(`/api/packages?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch packages');
      return res.json();
    },
  });
}

export function usePackage(packageId: string) {
  return useQuery<Package>({
    queryKey: ['package', packageId],
    queryFn: async () => {
      const res = await fetch(`/api/packages/${packageId}`);
      if (!res.ok) throw new Error('Failed to fetch package');
      return res.json();
    },
    enabled: !!packageId,
  });
}

export function useCreatePackage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: PackageFormData) => {
      const res = await fetch('/api/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to create package');
      return res.json() as Promise<Package>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['packages'] }),
  });
}

export function useUpdatePackage(packageId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<PackageFormData>) => {
      const res = await fetch(`/api/packages/${packageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to update package');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['packages'] });
      qc.invalidateQueries({ queryKey: ['package', packageId] });
    },
  });
}

export function useDeletePackage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (packageId: string) => {
      const res = await fetch(`/api/packages/${packageId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete package');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['packages'] }),
  });
}
