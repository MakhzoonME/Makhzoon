'use client';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import type { InventoryItem, InventoryTransaction } from '@/types';

interface InventoryResponse { items: InventoryItem[] }
interface TransactionsResponse { transactions: InventoryTransaction[] }

export function useInventoryItems(params?: { category?: string; stockStatus?: string; search?: string }) {
  const query = new URLSearchParams();
  if (params?.category) query.set('category', params.category);
  if (params?.stockStatus) query.set('stockStatus', params.stockStatus);
  if (params?.search) query.set('search', params.search);

  return useQuery<InventoryResponse>({
    queryKey: ['inventory', params],
    queryFn: async () => {
      const res = await fetch(`/api/inventory?${query.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch inventory');
      return res.json();
    },
    staleTime: 0,
    placeholderData: keepPreviousData,
  });
}

export function useInventoryItem(id: string) {
  return useQuery<InventoryItem>({
    queryKey: ['inventory', id],
    queryFn: async () => {
      const res = await fetch(`/api/inventory/${id}`);
      if (!res.ok) throw new Error('Failed to fetch item');
      return res.json();
    },
    enabled: !!id,
    staleTime: 0,
  });
}

export function useInventoryCategories() {
  return useQuery<string[]>({
    queryKey: ['inventory-categories'],
    queryFn: async () => {
      const res = await fetch('/api/inventory?categoriesOnly=true');
      if (!res.ok) return [];
      const data = await res.json();
      return data.categories ?? [];
    },
    staleTime: 5 * 60_000,
  });
}

export function useInventoryTransactions(itemId: string) {
  return useQuery<TransactionsResponse>({
    queryKey: ['inventory-transactions', itemId],
    queryFn: async () => {
      const res = await fetch(`/api/inventory/${itemId}/transactions`);
      if (!res.ok) throw new Error('Failed to fetch transactions');
      return res.json();
    },
    enabled: !!itemId,
    staleTime: 0,
  });
}
