'use client';
import { useModuleGuard } from '@/hooks/ui';

export default function WarrantiesLayout({ children }: { children: React.ReactNode }) {
  const { isAllowed } = useModuleGuard({ featureKey: 'warranties', moduleKey: 'usool', permOp: 'warrantiesView' });
  if (!isAllowed) return null;
  return <>{children}</>;
}
