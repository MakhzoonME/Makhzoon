'use client';
import { useRouter } from 'next/navigation';
import { useOrgSlug, useSpace, useT } from '@/hooks/ui';
import { useOrgInfo } from '@/hooks/org';
import { PageHeader } from '@/components/shared/PageHeader';
import { AssetForm } from '@/components/assets/AssetForm';

export default function NewAssetPage() {
  const router = useRouter();
  const orgSlug = useOrgSlug();
  const space = useSpace();
  const { t, locale } = useT();
  const { data: orgInfo } = useOrgInfo();

  const listHref = `/${locale}/${orgSlug}/${space}/usool/list`;

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader
        title={t('assets.addAsset')}
        breadcrumb={[
          { label: orgInfo?.name ?? orgSlug },
          { label: space },
          { label: t('nav.assets'), href: listHref },
          { label: t('assets.addAsset') },
        ]}
      />
      <AssetForm
        onSuccess={() => router.push(listHref)}
        onCancel={() => router.push(listHref)}
      />
    </div>
  );
}
