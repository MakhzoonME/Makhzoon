'use client';
import { useModuleGuard } from '@/hooks/ui';

export default function BannaLayout({ children }: { children: React.ReactNode }) {
  const { isAllowed } = useModuleGuard({ featureKey: 'banna', moduleKey: 'banna' });
  if (!isAllowed) return null;
  return <>{children}</>;
}
