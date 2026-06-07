'use client';
import { useModuleGuard } from '@/hooks/ui';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAllowed } = useModuleGuard({ featureKey: 'dashboard', moduleKey: 'dashboard' });
  if (!isAllowed) return null;
  return <>{children}</>;
}
