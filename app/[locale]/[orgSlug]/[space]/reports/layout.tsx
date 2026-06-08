'use client';
import { useModuleGuard } from '@/hooks/ui';

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  const { isAllowed } = useModuleGuard({ featureKey: 'reports', moduleKey: 'reports', adminOnly: true });
  if (!isAllowed) return null;
  return <>{children}</>;
}
