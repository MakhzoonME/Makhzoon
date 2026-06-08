'use client';
import { useModuleGuard } from '@/hooks/ui';

export default function RequestsLayout({ children }: { children: React.ReactNode }) {
  const { isAllowed } = useModuleGuard({ featureKey: 'requests', moduleKey: 'requests' });
  if (!isAllowed) return null;
  return <>{children}</>;
}
