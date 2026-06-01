'use client';
import { useParams, useRouter } from 'next/navigation';
import { useOrgSlug, useSpace, useT } from '@/hooks/ui';
import { useOrgInfo } from '@/hooks/org';
import { useInventoryItem } from '@/hooks/inventory';
import { PageHeader } from '@/components/shared/PageHeader';
import { InventoryItemForm } from '@/components/inventory/InventoryItemForm';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { ErrorState } from '@/components/shared/ErrorState';

export default function EditInventoryItemPage() {
  const { itemId } = useParams<{ itemId: string }>();
  const router = useRouter();
  const orgSlug = useOrgSlug();
  const space = useSpace();
  const { t, locale } = useT();
  const { data: orgInfo } = useOrgInfo();
  const { data: item, isLoading, error } = useInventoryItem(itemId);

  const listHref   = `/${locale}/${orgSlug}/${space}/raseed/list`;
  const detailHref = `/${locale}/${orgSlug}/${space}/raseed/${itemId}`;

  if (isLoading) return <LoadingSkeleton rows={6} columns={2} />;
  if (error || !item) return <ErrorState message={t('assets.notFound')} />;

  return (
    <div className="max-w-2xl">
      <PageHeader
        title={item.name}
        breadcrumb={[
          { label: orgInfo?.name ?? orgSlug },
          { label: space },
          { label: t('nav.inventory'), href: listHref },
          { label: item.name, href: detailHref },
          { label: t('common.edit') },
        ]}
      />
      <InventoryItemForm
        item={item}
        onSuccess={() => router.push(detailHref)}
        onCancel={() => router.push(detailHref)}
      />
    </div>
  );
}
