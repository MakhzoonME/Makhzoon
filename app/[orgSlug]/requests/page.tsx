'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useOrgSlug } from '@/hooks/useOrgSlug';
import { useRequests } from '@/hooks/useRequests';
import { useAuthStore } from '@/store/auth.store';
import { PageHeader } from '@/components/shared/PageHeader';
import { FilterBar } from '@/components/shared/FilterBar';
import { DataTable, ColumnDef } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Request } from '@/types';
import { formatDate } from '@/lib/utils/date';
import { truncate } from '@/lib/utils/format';
import { toast } from '@/hooks/useToast';
import { useQueryClient } from '@tanstack/react-query';
import { useT } from '@/hooks/useT';
function CheckSVG() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M3 8l4 4 6-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function XSVG() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
function PlusSVG() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function ClockSVG() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.4" fill="none" />
      <path d="M9 5.5V9l2.5 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function CheckCircleSVG() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.4" fill="none" />
      <path d="M5.5 9l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function XCircleSVG() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.4" fill="none" />
      <path d="M6.5 6.5l5 5M11.5 6.5l-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function AvgSVG() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path d="M3 14l3-5 3 3 3-6 3 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

/* ── Type config ─────────────────────────────────────────────────── */
const typeLabels: Record<string, string> = {
  REFILL: 'Refill',
  RETIRE: 'Retire',
  BUY_NEW: 'Buy New',
  EXTEND_WARRANTY: 'Extend Warranty',
};

const typeTones: Record<string, string> = {
  REFILL:           'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300',
  RETIRE:           'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300',
  BUY_NEW:          'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
  EXTEND_WARRANTY:  'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
};

/* ── Stat card ───────────────────────────────────────────────────── */
type StatCardProps = {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  label: string;
  value: React.ReactNode;
};

function StatCard({ icon, iconBg, iconColor, label, value }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg flex-shrink-0" style={{ background: iconBg, color: iconColor }}>
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">{label}</p>
            {value}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Reject modal ────────────────────────────────────────────────── */
function RejectModal({
  request,
  onClose,
  onConfirm,
  loading,
}: {
  request: Request;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  loading: boolean;
}) {
  const [reason, setReason] = useState('');

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reject-modal-title"
      >
        {/* Overlay */}
        <motion.div
          key="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 bg-black/40 dark:bg-black/60"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          key="modal"
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl p-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <h2 id="reject-modal-title" className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Reject request
            </h2>
            <button
              onClick={onClose}
              className="h-7 w-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Close"
            >
              <XSVG />
            </button>
          </div>

          {/* Request summary */}
          <div className="rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-3 mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {typeLabels[request.type] ?? request.type} · {request.assetName ?? request.inventoryItemName ?? '—'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                by {request.createdByName ?? request.createdByEmail ?? request.createdBy}
              </p>
            </div>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${typeTones[request.type] ?? 'bg-gray-100 text-gray-700'}`}>
              {typeLabels[request.type] ?? request.type}
            </span>
          </div>

          {/* Reason field */}
          <div className="space-y-2 mb-5">
            <label htmlFor="reject-reason" className="text-xs font-medium text-gray-700 dark:text-gray-300 tracking-wide uppercase">
              Reason for rejection
            </label>
            <textarea
              id="reject-reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this request is being rejected…"
              className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 px-3 py-2.5 resize-none outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 transition-all duration-150"
            />
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Visible to the requester in their notifications.
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100 dark:border-gray-800">
            <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onConfirm(reason)}
              disabled={loading}
            >
              {loading ? (
                <span className="inline-flex items-center gap-1.5">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden className="animate-spin">
                    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2" />
                    <path d="M8 2a6 6 0 0 1 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  Rejecting…
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5"><XSVG /> Reject request</span>
              )}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

/* ── Page ────────────────────────────────────────────────────────── */
export default function RequestsPage() {
  const { t } = useT();
  const router = useRouter();
  const orgSlug = useOrgSlug();
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'org_owner';
  const isStaff = user?.role === 'staff';

  const [search, setSearch]   = useState('');
  const [status, setStatus]   = useState('');
  const [type, setType]       = useState('');
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Request | null>(null);
  const [rejectLoading, setRejectLoading] = useState(false);

  const debouncedSearch = useDebounce(search, 300);
  const { data: requests = [], isLoading } = useRequests() as { data: Request[]; isLoading: boolean };

  // Client-side filter
  const filtered = requests.filter((r: Request) => {
    if (status && r.status !== status) return false;
    if (type && r.type !== type) return false;
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      const haystack = [r.assetName, r.inventoryItemName, r.createdByName, r.createdByEmail, r.description].join(' ').toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  // Derived stats
  const pending       = requests.filter((r: Request) => r.status === 'PENDING').length;
  const approvedMonth = requests.filter((r: Request) => r.status === 'APPROVED').length;
  const rejected      = requests.filter((r: Request) => r.status === 'REJECTED').length;

  async function handleApprove(requestId: string) {
    setProcessing(requestId);
    try {
      const res = await fetch(`/api/requests/${requestId}/approve`, { method: 'POST' });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? 'Failed to approve request');
      }
      toast.success(action === 'approve' ? 'Request approved successfully' : 'Request rejected');
      qc.invalidateQueries({ queryKey: ['requests'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to approve request');
    } finally {
      setProcessing(null);
    }
  }

  async function handleRejectConfirm(reason: string) {
    if (!rejectTarget) return;
    setRejectLoading(true);
    try {
      const res = await fetch(`/api/requests/${rejectTarget.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason || undefined }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? 'Failed to reject request');
      }
      toast.success('Request rejected');
      qc.invalidateQueries({ queryKey: ['requests'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setRejectTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reject request');
    } finally {
      setRejectLoading(false);
    }
  }

  const columns: ColumnDef<Request>[] = [
    { key: 'type', header: 'Type', render: (r) => <span className="font-medium text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">{typeLabels[r.type] ?? r.type}</span> },
    {
      key: 'assetId', header: 'Reference',
      render: (r) => {
        if (r.assetId)
          return (
            <button
              className="font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline text-left text-sm"
              onClick={(e) => { e.stopPropagation(); router.push(`/${orgSlug}/assets/${r.assetId}`); }}
            >
              {r.assetName ?? r.assetId}
            </button>
          );
        if (r.inventoryItemId)
          return (
            <button
              className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline text-left text-sm"
              onClick={(e) => { e.stopPropagation(); router.push(`/${orgSlug}/inventory/${r.inventoryItemId}`); }}
            >
              {r.inventoryItemName ?? r.inventoryItemId}
            </button>
          );
        return <span className="text-gray-400">—</span>;
      },
    },
    { key: 'createdBy', header: 'Submitted By', render: (r) => r.createdByName ?? r.createdByEmail ?? r.createdBy },
    { key: 'createdAt', header: 'Date', render: (r) => formatDate(r.createdAt) },
    { key: 'description', header: 'Description', render: (r) => <span className="text-gray-600">{truncate(r.description, 60)}</span> },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions', header: 'Actions',
      render: (r) => isAdmin && r.status === 'PENDING' ? (
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" className="text-green-600 hover:bg-green-50" disabled={processing === r.id} onClick={(e) => { e.stopPropagation(); handleDecision(r.id, 'approve'); }}>
            <CheckSVG />
          </Button>
          <Button size="sm" variant="ghost" className="text-red-500 hover:bg-red-50" disabled={processing === r.id} onClick={(e) => { e.stopPropagation(); handleDecision(r.id, 'reject'); }}>
            <XSVG />
          </Button>
        </div>
      ) : null
    },
  ];

  return (
    <div>
      <PageHeader title="Requests" />
      <div className="bg-white rounded-lg border border-gray-200">
        <DataTable data={requests} columns={columns} isLoading={isLoading} emptyMessage="No requests found." keyExtractor={(r) => r.id} />
      </div>

      {/* Reject modal */}
      {rejectTarget && (
        <RejectModal
          request={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onConfirm={handleRejectConfirm}
          loading={rejectLoading}
        />
      )}
    </>
  );
}
