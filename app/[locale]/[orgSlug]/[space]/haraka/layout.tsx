'use client';
import { useModuleGuard } from '@/hooks/ui';

export default function HarakaLayout({ children }: { children: React.ReactNode }) {
  const { isAllowed } = useModuleGuard({ featureKey: 'pos' });
  if (!isAllowed) return null;
  return <>{children}</>;
}
