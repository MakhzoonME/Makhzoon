'use client';
import { useModuleGuard } from '@/hooks/ui';

export default function ZeyaraLayout({ children }: { children: React.ReactNode }) {
  const { isAllowed } = useModuleGuard({ featureKey: 'zeyara' });
  if (!isAllowed) return null;
  return <>{children}</>;
}
