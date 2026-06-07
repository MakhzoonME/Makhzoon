'use client';

import { useT, useModuleGuard } from '@/hooks/ui';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';

function PaintbrushSVG() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M2 17l10 5 10-5" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

export default function BannaOverviewPage() {
  const { isAllowed } = useModuleGuard({ featureKey: 'banna', moduleKey: 'banna' });
  const { t } = useT();
  if (!isAllowed) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('banna.title')}
        description={t('banna.description')}
        breadcrumb={[{ label: t('banna.title') }]}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="p-5 space-y-3">
            <div className="h-10 w-10 rounded-lg bg-[#1565C0]/10 text-[#1565C0] flex items-center justify-center">
              <PaintbrushSVG />
            </div>
            <h3 className="text-sm font-semibold text-gray-900">{t('banna.customFields')}</h3>
            <p className="text-sm text-gray-500">{t('banna.customFieldsDesc')}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
