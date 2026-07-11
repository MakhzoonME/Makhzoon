'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { toast, useT } from '@/hooks/ui';
import { ArrowRight, RefreshCw, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

type Source = 'prod' | 'staging';
type Target = 'dev' | 'staging' | 'legacy';

type Run = {
  id: number;
  status: string;
  conclusion: string | null;
  title: string;
  event: string;
  started: string;
  updated: string;
  url: string;
};

const ALL_PAIRS: ReadonlyArray<{ source: Source; target: Target; key: string; description: string }> = [
  { source: 'prod',    target: 'dev',     key: 'prod-dev',     description: 'Mirror live customer data into dev for debugging real bugs. Overwrites dev.' },
  { source: 'prod',    target: 'staging', key: 'prod-staging', description: 'Refresh staging from prod before a release rehearsal. Overwrites staging.' },
  { source: 'prod',    target: 'legacy',  key: 'prod-legacy',  description: 'Push current prod state into the legacy office-asset-system project.' },
  { source: 'staging', target: 'dev',     key: 'staging-dev',  description: 'Pull staging changes into dev — useful when staging has test data dev needs.' },
];

const PROJECT_LABEL: Record<Source | Target, string> = {
  prod:    'makhzoonme-prod',
  staging: 'makhzoonme-stg',
  dev:     'makhzoonme-dev',
  legacy:  'office-asset-system',
};

function statusColor(status: string, conclusion: string | null) {
  if (status === 'completed') {
    if (conclusion === 'success') return 'bg-[var(--green-100)] text-[var(--green-700)] border-[var(--green-100)]';
    if (conclusion === 'failure') return 'bg-[var(--red-100)] text-[var(--red-700)] border-[var(--red-100)]';
    return 'bg-surface-page text-gray-700 border-border';
  }
  if (status === 'in_progress' || status === 'queued' || status === 'waiting') {
    return 'bg-[var(--yellow-100)] text-[var(--yellow-700)] border-[var(--yellow-100)]';
  }
  return 'bg-surface-page text-gray-700 border-border';
}

export default function SyncPage() {
  const { t } = useT();
  const qc = useQueryClient();
  const [pending, setPending] = useState<typeof ALL_PAIRS[number] | null>(null);

  const { data: runsData, isLoading } = useQuery<{ runs: Run[]; note?: string; error?: string }>({
    queryKey: ['superadmin-sync-runs'],
    queryFn: async () => {
      const res = await fetch('/api/superadmin/sync');
      if (!res.ok) throw new Error('Failed to load runs');
      return res.json();
    },
    refetchInterval: 15_000,
  });

  const dispatchMutation = useMutation({
    mutationFn: async (payload: { source: Source; target: Target; dry_run?: boolean; skip_auth?: boolean }) => {
      const res = await fetch('/api/superadmin/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(typeof e.error === 'string' ? e.error : 'Failed to start sync');
      }
      return res.json();
    },
    onSuccess: (_data, vars) => {
      toast.success(t('sync.dispatchSuccess').replace('{source}', vars.source).replace('{target}', vars.target));
      qc.invalidateQueries({ queryKey: ['superadmin-sync-runs'] });
      setPending(null);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const runs = runsData?.runs ?? [];
  const tokenMissing = runsData?.note?.includes('GITHUB_DISPATCH_TOKEN');

  return (
    <div className="space-y-6">
      <PageHeader title={t('nav.sync')} breadcrumb={[{ label: t('nav.sync') }]} />

      {tokenMissing && (
        <div className="bg-[var(--yellow-100)] border border-[var(--yellow-100)] rounded-lg p-4 text-sm text-[var(--yellow-700)]">
          <strong>{t('sync.setupRequired')}</strong> {t('sync.setupBody')}
        </div>
      )}

      <div className="bg-[var(--red-100)] border border-[var(--red-100)] rounded-lg p-4 text-sm text-[var(--red-700)]">
        <strong>{t('sync.headsUp')}</strong> {t('sync.headsUpBody')}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ALL_PAIRS.map((pair) => (
          <div key={pair.key} className="bg-surface-card border border-border rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--primary-100)] text-[var(--primary-700)] rounded">
                {pair.source}
              </span>
              <ArrowRight className="h-4 w-4 text-gray-400" />
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--green-100)] text-[var(--green-700)] rounded">
                {pair.target}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              {PROJECT_LABEL[pair.source]} <ArrowRight size={12} className="inline" aria-hidden /> {PROJECT_LABEL[pair.target]}
            </p>
            <p className="text-sm text-gray-600">{pair.description}</p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPending(pair)}
              disabled={dispatchMutation.isPending}
            >
              <RefreshCw className={cn('h-3.5 w-3.5 me-1', dispatchMutation.isPending && 'animate-spin')} />
              {t('sync.runSync')}
            </Button>
          </div>
        ))}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">{t('sync.recentRuns')}</h3>
        <div className="bg-surface-card border border-border rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="p-4 text-sm text-gray-500">{t('common.loading')}</div>
          ) : runs.length === 0 ? (
            <div className="p-4 text-sm text-gray-500">{t('sync.noRuns')}</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-page">
                  <th className="text-start px-3 py-2 text-xs font-semibold text-gray-500 uppercase">{t('sync.tableTitle')}</th>
                  <th className="text-start px-3 py-2 text-xs font-semibold text-gray-500 uppercase">{t('sync.tableEvent')}</th>
                  <th className="text-start px-3 py-2 text-xs font-semibold text-gray-500 uppercase">{t('sync.tableStatus')}</th>
                  <th className="text-start px-3 py-2 text-xs font-semibold text-gray-500 uppercase">{t('sync.tableStarted')}</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-b-0">
                    <td className="px-3 py-2 text-gray-900">{r.title}</td>
                    <td className="px-3 py-2 text-xs text-gray-500">{r.event}</td>
                    <td className="px-3 py-2">
                      <span className={cn('inline-block px-2 py-0.5 rounded-full text-xs font-semibold border', statusColor(r.status, r.conclusion))}>
                        {r.status === 'completed' ? (r.conclusion ?? 'completed') : r.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500">
                      {new Date(r.started).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-end">
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:text-primary-700 inline-flex items-center text-xs"
                      >
                        {t('sync.logs')} <ExternalLink className="h-3 w-3 ms-1" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!pending}
        onOpenChange={(o) => !o && setPending(null)}
        title={pending ? t('sync.confirmTitle').replace('{source}', pending.source).replace('{target}', pending.target) : ''}
        description={
          pending
            ? t('sync.confirmDesc').replace('{targetProject}', PROJECT_LABEL[pending.target]).replace('{sourceProject}', PROJECT_LABEL[pending.source])
            : ''
        }
        confirmLabel={t('sync.runSync')}
        variant="destructive"
        onConfirm={() => {
          if (!pending) return;
          dispatchMutation.mutate({ source: pending.source, target: pending.target });
        }}
        loading={dispatchMutation.isPending}
      />
    </div>
  );
}
