'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,           // 1 min — don't refetch unless data is >1min old
        gcTime: 5 * 60_000,          // 5 min — keep in memory
        retry: 1,
        refetchOnWindowFocus: false,  // don't refetch every time user switches tabs
        refetchOnReconnect: true,     // do refetch on network reconnect
      },
    },
  }));

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
