'use client';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import type { InventoryItem, InventoryTransaction } from '@/types';

interface InventoryResponse {
  items: InventoryItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
interface TransactionsResponse { transactions: InventoryTransaction[] }

export function useInventoryItems(params?: {
  category?: string;
  stockStatus?: string;
  search?: string;
  posEnabled?: boolean;
  itemType?: 'product' | 'service';
  expiringWithin?: number;
  expired?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}) {
  const { space } = useParams<{ space?: string }>();
  const query = new URLSearchParams();
  if (params?.category) query.set('category', params.category);
  if (params?.stockStatus) query.set('stockStatus', params.stockStatus);
  if (params?.search) query.set('search', params.search);
  if (params?.posEnabled) query.set('posEnabled', 'true');
  if (params?.itemType) query.set('itemType', params.itemType);
  if (params?.expiringWithin != null) query.set('expiringWithin', String(params.expiringWithin));
  if (params?.expired) query.set('expired', 'true');
  if (params?.page) query.set('page', String(params.page));
  if (params?.pageSize) query.set('pageSize', String(params.pageSize));
  if (params?.sortBy) query.set('sortBy', params.sortBy);
  if (params?.sortDir) query.set('sortDir', params.sortDir);

  return useQuery<InventoryResponse>({
    queryKey: ['inventory', space, params],
    enabled: !!space,
    queryFn: async () => {
      const headers: HeadersInit = space ? { 'x-space-slug': space } : {};
      const res = await fetch(`/api/inventory?${query.toString()}`, { headers });
      if (!res.ok) throw new Error('Failed to fetch inventory');
      return res.json();
    },
    staleTime: 0,
    gcTime: 5 * 60_000,
  });
}

export function useInventoryItem(id: string) {
  const { space } = useParams<{ space?: string }>();
  return useQuery<InventoryItem>({
    queryKey: ['inventory', space, id],
    enabled: !!id && !!space,
    queryFn: async () => {
      const headers: HeadersInit = space ? { 'x-space-slug': space } : {};
      const res = await fetch(`/api/inventory/${id}`, { headers });
      if (!res.ok) throw new Error('Failed to fetch item');
      return res.json();
    },
    staleTime: 0,
  });
}

export function useInventoryCategories() {
  const { space } = useParams<{ space?: string }>();
  return useQuery<string[]>({
    queryKey: ['inventory-categories', space],
    enabled: !!space,
    queryFn: async () => {
      const headers: HeadersInit = space ? { 'x-space-slug': space } : {};
      const res = await fetch('/api/inventory?categoriesOnly=true', { headers });
      if (!res.ok) return [];
      const data = await res.json();
      return data.categories ?? [];
    },
    staleTime: 0,
  });
}

export function useInventoryTransactions(itemId: string) {
  const { space } = useParams<{ space?: string }>();
  return useQuery<TransactionsResponse>({
    queryKey: ['inventory-transactions', space, itemId],
    enabled: !!itemId && !!space,
    queryFn: async () => {
      const headers: HeadersInit = space ? { 'x-space-slug': space } : {};
      const res = await fetch(`/api/inventory/${itemId}/transactions`, { headers });
      if (!res.ok) throw new Error('Failed to fetch transactions');
      return res.json();
    },
    staleTime: 0,
  });
}
