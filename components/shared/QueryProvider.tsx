'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { auth } from '@/lib/firebase/client';
import { signOut } from 'firebase/auth';

async function handleUnauthorized() {
  try {
    await signOut(auth);
  } catch { /* ignore */ }
  await fetch('/api/auth/session', { method: 'DELETE' }).catch(() => {});
  window.location.href = '/login';
}

function isUnauthorizedError(error: unknown): boolean {
  return (error as { status?: number })?.status === 401 ||
    (error as { response?: { status?: number } })?.response?.status === 401;
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        retry: (failureCount, error) => {
          if (isUnauthorizedError(error)) return false;
          return failureCount < 1;
        },
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
      },
      mutations: {
        onError: (error) => {
          if (isUnauthorizedError(error)) handleUnauthorized();
        },
      },
    },
  }));

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
