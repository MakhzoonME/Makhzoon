'use client';
import { useOrgInfo } from '@/hooks/org';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { useT } from '@/hooks/ui';

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  const { t } = useT();
  return (
    <div className="flex justify-between py-2.5 border-b border-border last:border-0">
      <dt className="text-sm text-gray-500">{label}</dt>
      <dd className="text-sm font-medium text-gray-900 text-right max-w-[60%] break-words">
        {value || t('settings.notSet')}
      </dd>
    </div>
  );
}

export default function OrganizationInfoPage() {
  const { t } = useT();
  const { data: org, isLoading } = useOrgInfo();

  if (isLoading) return <LoadingSkeleton rows={5} columns={1} />;

  return (
    <div className="space-y-6">
      <PageHeader title={t('nav.orgInfo')} />

      <Card className="max-w-2xl">
        <CardContent className="p-6">
          <dl className="space-y-0">
            <InfoRow label={t('settings.orgName')}        value={org?.name} />
            <InfoRow label={t('settings.workspaceId')}    value={org?.subdomain} />
            <InfoRow label={t('settings.contactEmail')}   value={org?.contactEmail} />
            <InfoRow label={t('settings.description')}    value={org?.description} />
            <InfoRow label={t('settings.category')}       value={org?.category} />
            <InfoRow
              label={t('settings.accountManager')}
              value={
                org?.accountManager
                  ? org.accountManager.name
                    ? `${org.accountManager.name} (${org.accountManager.email})`
                    : org.accountManager.email
                  : null
              }
            />
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
