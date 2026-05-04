'use client';
import { useAdminGuard } from '@/hooks/ui';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const { isAllowed } = useAdminGuard('settings.orgInfo');

  if (!isAllowed) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="h-7 w-7 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
