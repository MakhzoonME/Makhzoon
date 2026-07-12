'use client';

import { useEffect, useRef, useState } from 'react';
import { ClipboardList, Banknote } from 'lucide-react';
import { PaymentDialog, type PaymentLine } from '@/components/haraka/PaymentDialog';
import { ServiceJobStatusBadge } from '@/components/haraka/ServiceJobStatusBadge';
import { useReceptionTickets, useCheckoutReceptionTicket } from '@/hooks/haraka';
import { useAuthStore } from '@/store/auth.store';
import { hasPermission } from '@/lib/permissions';
import { toast, useT } from '@/hooks/ui';
import type { HarakaReceptionTicket, PosTransaction } from '@/types';

interface Props {
  sessionId: string | null;
  fawtaraEnabled: boolean;
  /** Called with the POS transaction when the ticket contained products (for receipt printing). */
  onTransaction: (tx: PosTransaction) => void;
}

export function TicketQueue({ sessionId, fawtaraEnabled, onTransaction }: Props) {
  const { t } = useT();
  const { user } = useAuthStore();
  const allowed =
    !!user && user.features?.reception === true && hasPermission(user, 'pos', 'view_reception');

  const { data } = useReceptionTickets({ status: 'open', refetchInterval: 15_000, enabled: allowed });
  const checkoutMut = useCheckoutReceptionTicket();

  const [open, setOpen] = useState(false);
  const [activeTicket, setActiveTicket] = useState<HarakaReceptionTicket | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  const tickets = data?.items ?? [];
  if (!allowed) return null;

  async function handleConfirm(payments: PaymentLine[], skipFawtara: boolean) {
    if (!activeTicket) return;
    if (!sessionId) { toast.error(t('reception.errNoSession')); return; }
    try {
      const result = await checkoutMut.mutateAsync({
        id: activeTicket.id,
        body: {
          sessionId,
          offlineId: crypto.randomUUID(),
          skipFawtara,
          payments: payments.map((p) => ({
            method:    p.method,
            amount:    p.amount,
            reference: p.reference ?? null,
            cardLast4: p.cardLast4 || null,
          })),
        },
      });
      toast.success(`${t('reception.paidToast')} ${activeTicket.ticketNumber}`);
      setActiveTicket(null);
      if (result.transaction) onTransaction(result.transaction);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.somethingWentWrong'));
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold transition-colors"
        style={
          tickets.length > 0
            ? { background: 'rgba(194,24,91,0.10)', color: 'var(--mod-haraka)' }
            : { color: '#9ca3af' }
        }
        onClick={() => setOpen((o) => !o)}
      >
        <ClipboardList size={13} /> {tickets.length} {t('reception.queuePill')}
      </button>

      {open && (
        <div className="absolute end-0 top-full mt-1 z-50 w-80 rounded-xl border border-border bg-surface-card shadow-lg overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border">
            <span className="text-xs font-semibold text-gray-700">{t('reception.queueTitle')}</span>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {tickets.length === 0 && (
              <div className="px-4 py-6 text-center text-xs text-gray-400">
                {t('reception.queueEmpty')}
              </div>
            )}
            {tickets.map((tk) => (
              <div key={tk.id} className="px-4 py-3 border-b border-border last:border-0 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-semibold" style={{ color: 'var(--mod-haraka)' }}>
                      {tk.ticketNumber}
                    </span>
                    {tk.serviceJob && <ServiceJobStatusBadge status={tk.serviceJob.status} />}
                  </div>
                  <div className="text-xs font-semibold text-gray-800 truncate mt-0.5">
                    {tk.customerName}
                    {tk.carPlate && <span className="text-gray-400 font-normal"> · {tk.carPlate}</span>}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5 font-mono">
                    JOD {tk.grandTotal.toFixed(2)}
                    {' · '}
                    {tk.createdAt instanceof Date
                      ? tk.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : new Date(tk.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={!sessionId || checkoutMut.isPending}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-white disabled:opacity-40"
                  style={{ background: 'var(--mod-haraka)' }}
                  onClick={() => { setActiveTicket(tk); setOpen(false); }}
                >
                  <Banknote size={11} /> {t('reception.collect')}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <PaymentDialog
        open={!!activeTicket}
        onOpenChange={(o) => { if (!o) setActiveTicket(null); }}
        total={activeTicket?.grandTotal ?? 0}
        onConfirm={handleConfirm}
        loading={checkoutMut.isPending}
        fawtaraEnabled={fawtaraEnabled}
      />
    </div>
  );
}
