'use client';
import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useOrgSlug, useSpace, useT } from '@/hooks/ui';
import { useOrgInfo } from '@/hooks/org';
import { useAsset } from '@/hooks/assets';
import { PageHeader } from '@/components/shared/PageHeader';
import { AssetForm } from '@/components/assets/AssetForm';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { ErrorState } from '@/components/shared/ErrorState';

export default function EditAssetPage(props: { params: Promise<{ assetId: string }> }) {
  const { assetId } = use(props.params);
  const router = useRouter();
  const orgSlug = useOrgSlug();
  const space = useSpace();
  const { t, locale } = useT();
  const { data: orgInfo } = useOrgInfo();
  const { data: asset, isLoading, error } = useAsset(assetId);

  const listHref   = `/${locale}/${orgSlug}/${space}/usool/list`;
  const detailHref = `/${locale}/${orgSlug}/${space}/usool/${assetId}`;

  if (isLoading) return <LoadingSkeleton rows={6} columns={2} />;
  if (error || !asset) return <ErrorState message={t('assets.notFound')} />;

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader
        title={asset.name}
        breadcrumb={[
          { label: orgInfo?.name ?? orgSlug },
          { label: space },
          { label: t('nav.assets'), href: listHref },
          { label: asset.name, href: detailHref },
          { label: t('common.edit') },
        ]}
      />
      <AssetForm
        asset={asset}
        onSuccess={() => router.push(detailHref)}
        onCancel={() => router.push(detailHref)}
      />
    </div>
  );
}
