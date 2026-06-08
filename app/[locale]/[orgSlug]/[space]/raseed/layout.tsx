'use client';
import { useModuleGuard } from '@/hooks/ui';

export default function RaseedLayout({ children }: { children: React.ReactNode }) {
  const { isAllowed } = useModuleGuard({ featureKey: 'inventory', moduleKey: 'inventory' });
  if (!isAllowed) return null;
  return <>{children}</>;
}
