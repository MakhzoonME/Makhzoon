'use client';
import { Database } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { useT } from '@/hooks/ui';

export default function DatabaseAdminHome() {
  const { t } = useT();
  return (
    <div className="space-y-5">
      <PageHeader
        title={t('nav.database')}
        description={t('database.description')}
        breadcrumb={[{ label: t('nav.database') }]}
      />
      <div className="flex flex-col items-center justify-center py-24 text-center text-gray-400">
        <Database className="h-10 w-10 mb-3 opacity-40" />
        <p className="text-sm">{t('database.selectTable')}</p>
      </div>
    </div>
  );
}
