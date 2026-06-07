'use client';
import { useModuleGuard } from '@/hooks/ui';

export default function AuditLogsLayout({ children }: { children: React.ReactNode }) {
  const { isAllowed } = useModuleGuard({ featureKey: 'auditLogs', moduleKey: 'auditLogs', adminOnly: true });
  if (!isAllowed) return null;
  return <>{children}</>;
}
