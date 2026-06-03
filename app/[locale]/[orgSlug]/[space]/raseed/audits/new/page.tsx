'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOrgSlug, useSpace, useT } from '@/hooks/ui';
import { useCreateStockAudit } from '@/hooks/inventory';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/ui';
import { ClipboardCheck } from 'lucide-react';
import { StockItemMultiPicker } from '@/components/inventory/stock-audits/StockItemMultiPicker';
import { useOrgInfo } from '@/hooks/org';

function defaultTitle() {
  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  return `Stock Audit ${today}`;
}

export default function NewStockAuditPage() {
  const router = useRouter();
  const orgSlug = useOrgSlug();
  const space = useSpace();
  const { t, locale } = useT();
  const { data: orgInfo } = useOrgInfo();
  const create = useCreateStockAudit();

  const [title, setTitle] = useState(defaultTitle());
  const [notes, setNotes] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  async function handleStart(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    if (selectedIds.length === 0) {
      toast.error(t('stockAudits.requireItems'));
      return;
    }
    try {
      const { id } = await create.mutateAsync({
        title: title.trim(),
        notes: notes.trim() || undefined,
        itemIds: selectedIds,
      });
      toast.success(t('stockAudits.startedToast'));
      router.push(`/${locale}/${orgSlug}/${space}/raseed/audits/${id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('stockAudits.startFailed'));
    }
  }

  const _base = `/${locale}/${orgSlug}/${space}/raseed`;

  return (
    <div>
      <PageHeader
        title={t('stockAudits.newTitle')}
        breadcrumb={[
          { label: orgInfo?.name ?? orgSlug },
          { label: space },
          { label: t('nav.inventory'), href: `/${locale}/${orgSlug}/${space}/raseed/list` },
          { label: t('stockAudits.breadcrumb'), href: `/${locale}/${orgSlug}/${space}/raseed/audits` },
          { label: t('stockAudits.newTitle') },
        ]}
      />

      <div className="max-w-2xl mx-auto">
        <div className="bg-[var(--primary-50)] border border-[var(--primary-100)] rounded-lg p-4 mb-6 flex items-start gap-3">
          <ClipboardCheck className="h-4 w-4 mt-0.5 text-[var(--primary-700)]" strokeWidth={1.75} />
          <p className="text-sm text-[var(--primary-700)]">{t('stockAudits.intro')}</p>
        </div>

        <form
          onSubmit={handleStart}
          className="bg-surface-card rounded-lg border border-border p-6 space-y-5"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('stockAudits.titleField')} *
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={100}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('stockAudits.notesField')}
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder={t('stockAudits.notesPlaceholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('stockAudits.pickItems')} *
            </label>
            <StockItemMultiPicker selectedIds={selectedIds} onChange={setSelectedIds} />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={create.isPending || selectedIds.length === 0}>
              {create.isPending ? t('stockAudits.startingAudit') : t('stockAudits.startAudit')}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={create.isPending}
            >
              {t('common.cancel')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
