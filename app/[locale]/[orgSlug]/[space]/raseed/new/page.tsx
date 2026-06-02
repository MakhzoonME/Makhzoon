'use client';
import { useRouter } from 'next/navigation';
import { useOrgSlug, useSpace, useT } from '@/hooks/ui';
import { useOrgInfo } from '@/hooks/org';
import { PageHeader } from '@/components/shared/PageHeader';
import { InventoryItemForm } from '@/components/inventory/InventoryItemForm';

export default function NewInventoryItemPage() {
  const router = useRouter();
  const orgSlug = useOrgSlug();
  const space = useSpace();
  const { t, locale } = useT();
  const { data: orgInfo } = useOrgInfo();

  const listHref = `/${locale}/${orgSlug}/${space}/raseed/list`;

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader
        title={t('inventory.addInventoryItem')}
        breadcrumb={[
          { label: orgInfo?.name ?? orgSlug },
          { label: space },
          { label: t('nav.inventory'), href: listHref },
          { label: t('inventory.addInventoryItem') },
        ]}
      />
      <InventoryItemForm
        onSuccess={() => router.push(listHref)}
        onCancel={() => router.push(listHref)}
      />
    </div>
  );
}
