'use client';
import { useModuleGuard } from '@/hooks/ui';

export default function UsoolLayout({ children }: { children: React.ReactNode }) {
  const { isAllowed } = useModuleGuard({ featureKey: 'assets', moduleKey: 'assets' });
  if (!isAllowed) return null;
  return <>{children}</>;
}
