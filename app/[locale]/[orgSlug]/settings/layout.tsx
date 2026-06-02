'use client';

import { useEffect } from 'react';
import { useAdminGuard, useT } from '@/hooks/ui';
import { useUiStore } from '@/store/ui.store';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const { isAllowed } = useAdminGuard([
    'settings.orgInfo',
    'settings.subscription',
    'settings.users',
    'settings.taxRates',
    'settings.fawtara',
  ]);

  const { t } = useT();
  const { setPageHeader, clearPageHeader } = useUiStore();

  useEffect(() => {
    setPageHeader(t('nav.settings'), []);
    return () => clearPageHeader();
  // t is intentionally excluded — it's unstable and the translation is static per locale
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isAllowed) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="h-7 w-7 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
