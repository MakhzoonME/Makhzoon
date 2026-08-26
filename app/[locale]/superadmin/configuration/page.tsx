'use client';
import { PageHeader } from '@/components/shared/PageHeader';
import {
  FEATURE_KEYS,
  FEATURE_LABELS,
  FEATURE_DESCRIPTIONS,
  INCLUSION_KEYS,
  INCLUSION_LABELS,
} from '@/types';
import { useT } from '@/hooks/ui';

export default function ConfigurationPage() {
  const { t } = useT();

  return (
    <div>
      <PageHeader title={t('nav.configuration')} description={t('config.description')} breadcrumb={[{ label: t('nav.configuration') }]} />

      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">{t('config.featuresRef')}</h3>
          <div className="bg-surface-card rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-page border-b border-border">
                  <tr>
                    <th className="px-4 py-2 text-start text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                      {t('config.featureKey')}
                    </th>
                    <th className="px-4 py-2 text-start text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                      {t('config.featureLabel')}
                    </th>
                    <th className="px-4 py-2 text-start text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                      {t('config.featureDesc')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {FEATURE_KEYS.map((k) => (
                    <tr key={k} className="border-b border-border">
                      <td className="px-4 py-3 font-mono text-xs text-primary-700">{k}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{FEATURE_LABELS[k]}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{FEATURE_DESCRIPTIONS[k]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">{t('config.inclusionsRef')}</h3>
          <div className="bg-surface-card rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-page border-b border-border">
                  <tr>
                    <th className="px-4 py-2 text-start text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                      {t('config.featureKey')}
                    </th>
                    <th className="px-4 py-2 text-start text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                      {t('config.featureLabel')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {INCLUSION_KEYS.map((k) => (
                    <tr key={k} className="border-b border-border">
                      <td className="px-4 py-3 font-mono text-xs text-primary-700">{k}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{INCLUSION_LABELS[k]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
