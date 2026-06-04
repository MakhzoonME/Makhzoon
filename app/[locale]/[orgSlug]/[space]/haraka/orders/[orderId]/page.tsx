'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Truck, Users, CreditCard, MapPin, CalendarClock, StickyNote } from 'lucide-react';
import { PageHeader } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { OrderStatusBadge } from '@/components/haraka/OrderStatusBadge';
import { DeliveryAgentPicker } from '@/components/haraka/DeliveryAgentPicker';
import type { DeliveryAgentValue } from '@/components/haraka/DeliveryAgentPicker';
import { ConfigSelect } from '@/components/shared/ConfigSelect';
import { useOrder, useUpdateOrderStatus, useUpdateOrder, useRecordPayment } from '@/hooks/haraka';
import { useList } from '@/hooks/lists/useList';
import { useOrgInfo } from '@/hooks/org';
import { toast } from '@/hooks/ui';
import { formatCurrency } from '@/lib/utils/format';
import { formatDate } from '@/lib/utils/date';
import type { OrderStatus } from '@/types';

const STATUS_SEQUENCE: OrderStatus[] = [
  'new', 'confirmed', 'assigned', 'in_transit', 'delivered',
];
const STATUS_SEQUENCE_PICKUP: OrderStatus[] = [
  'new', 'confirmed', 'assigned', 'ready_for_pickup', 'picked_up',
];

export default function OrderDetailPage() {
  const params = useParams<{ locale: string; orgSlug: string; space: string; orderId: string }>();
  const router = useRouter();
  const { data: orgInfo } = useOrgInfo();
  const { data, isLoading, refetch } = useOrder(params.orderId);
  const updateStatusMut = useUpdateOrderStatus();
  const updateOrderMut  = useUpdateOrder();
  const recordPayMut    = useRecordPayment();
  const { data: statusItems } = useList('order_status');

  const [showPayForm,     setShowPayForm]     = useState(false);
  const [payAmount,       setPayAmount]       = useState('');
  const [payMethod,       setPayMethod]       = useState('');
  const [reassignAgent,   setReassignAgent]   = useState(false);
  const [newAgent,        setNewAgent]        = useState<DeliveryAgentValue | null>(null);

  const base = `/${params.locale}/${params.orgSlug}/${params.space}/haraka`;
  const order = data?.order;
  const currency = orgInfo?.currency ?? 'USD';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="h-7 w-7 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" />
      </div>
    );
  }
  if (!order) return <div className="text-center py-12 text-muted-foreground">Order not found.</div>;

  const sequence = order.fulfillmentType === 'pickup' ? STATUS_SEQUENCE_PICKUP : STATUS_SEQUENCE;
  const currentIdx = sequence.indexOf(order.status as OrderStatus);
  const nextStatus = currentIdx >= 0 && currentIdx < sequence.length - 1
    ? sequence[currentIdx + 1]
    : null;

  async function advanceStatus() {
    if (!nextStatus) return;
    try {
      await updateStatusMut.mutateAsync({ id: order!.id, status: nextStatus });
      toast.success(`Order moved to "${nextStatus.replace('_', ' ')}".`);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status');
    }
  }

  async function cancelOrder() {
    try {
      await updateStatusMut.mutateAsync({ id: order!.id, status: 'cancelled' });
      toast.success('Order cancelled.');
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel');
    }
  }

  async function submitPayment() {
    const amount = parseFloat(payAmount);
    if (isNaN(amount) || amount < 0) { toast.error('Enter a valid amount.'); return; }
    try {
      await recordPayMut.mutateAsync({ id: order!.id, body: { amountPaid: amount, paymentMethod: payMethod || null } });
      toast.success('Payment recorded.');
      setShowPayForm(false);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to record payment');
    }
  }

  async function submitAgentReassign() {
    try {
      await updateOrderMut.mutateAsync({
        id: order!.id,
        body: {
          deliveryAgentId:       newAgent?.type === 'external' ? newAgent.id : null,
          deliveryAgentMemberId: newAgent?.type === 'member'   ? newAgent.id : null,
          deliveryAgentName:     newAgent?.name ?? null,
        },
      });
      toast.success('Delivery agent updated.');
      setReassignAgent(false);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update agent');
    }
  }

  const payColor =
    order.paymentStatus === 'paid'    ? '#22c55e'
    : order.paymentStatus === 'partial' ? '#f97316'
    : '#9ca3af';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title={`Order ${order.orderNumber}`}
        breadcrumb={[
          { label: orgInfo?.name ?? params.orgSlug },
          { label: 'Haraka', href: base },
          { label: 'Orders', href: `${base}/orders` },
          { label: order.orderNumber },
        ]}
        actions={
          <div className="flex gap-2">
            {nextStatus && (
              <Button
                onClick={advanceStatus}
                disabled={updateStatusMut.isPending}
                style={{ background: 'var(--mod-haraka)' }}
              >
                Mark as {nextStatus.replace('_', ' ')}
              </Button>
            )}
            {order.status !== 'cancelled' && order.status !== 'delivered' && order.status !== 'picked_up' && (
              <Button variant="outline" className="text-red-500 border-red-200 hover:bg-red-50" onClick={cancelOrder}>
                Cancel order
              </Button>
            )}
          </div>
        }
      />

      {/* ── Status stepper ──────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-surface-page p-5">
        <div className="flex items-center gap-1 overflow-x-auto">
          {sequence.map((s, idx) => {
            const listItem = statusItems?.find((i) => i.value === s);
            const label = listItem?.label ?? s.replace('_', ' ');
            const color = listItem?.color ?? '#9ca3af';
            const isDone = idx < currentIdx || (order.status === s && ['delivered', 'picked_up'].includes(s));
            const isCurrent = order.status === s;
            return (
              <div key={s} className="flex items-center gap-1 flex-shrink-0">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className="h-2.5 w-2.5 rounded-full border-2 flex-shrink-0 transition-colors"
                    style={{
                      borderColor: isCurrent || isDone ? color : '#d1d5db',
                      background:  isDone ? color : isCurrent ? `${color}40` : 'white',
                    }}
                  />
                  <span
                    className="text-[10px] whitespace-nowrap"
                    style={{ color: isCurrent ? color : '#9ca3af', fontWeight: isCurrent ? 600 : 400 }}
                  >
                    {label}
                  </span>
                </div>
                {idx < sequence.length - 1 && (
                  <div
                    className="h-px w-6 mb-3 flex-shrink-0 rounded"
                    style={{ background: idx < currentIdx ? '#22c55e' : '#e5e7eb' }}
                  />
                )}
              </div>
            );
          })}
          {order.status === 'cancelled' && (
            <div className="ml-4">
              <OrderStatusBadge status="cancelled" />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* ── Customer + Delivery address ───────────────────────── */}
        <div className="rounded-xl border border-border bg-surface-page p-5 space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">Customer</div>
          <div>
            <div className="font-medium text-gray-800">{order.customerName}</div>
            {order.customerPhone && <div className="text-sm text-gray-400">{order.customerPhone}</div>}
          </div>
          {order.fulfillmentType === 'delivery' && order.deliveryAddress && (
            <div className="pt-1 space-y-0.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                <MapPin className="h-3 w-3" /> Delivery address
              </div>
              <div className="text-sm text-gray-600 space-y-0.5">
                {order.deliveryAddress.street && <div>{order.deliveryAddress.street}</div>}
                {order.deliveryAddress.area   && <div>{order.deliveryAddress.area}</div>}
                {order.deliveryAddress.city   && <div>{order.deliveryAddress.city}</div>}
                {order.deliveryAddress.notes  && <div className="text-gray-400">{order.deliveryAddress.notes}</div>}
              </div>
            </div>
          )}
          {order.scheduledAt && (
            <div className="flex items-center gap-1.5 text-sm text-gray-500 pt-1">
              <CalendarClock className="h-3.5 w-3.5" />
              {formatDate(order.scheduledAt)}
            </div>
          )}
        </div>

        {/* ── Agents ───────────────────────────────────────────── */}
        <div className="rounded-xl border border-border bg-surface-page p-5 space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">Agents</div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-300" />
            <div>
              <div className="text-xs text-gray-400">Sales agent</div>
              <div className="text-sm font-medium">{order.salesAgentName}</div>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Truck className="h-4 w-4 text-gray-300 mt-0.5" />
            <div className="flex-1">
              <div className="text-xs text-gray-400">Delivery agent</div>
              {reassignAgent ? (
                <div className="space-y-2 mt-1">
                  <DeliveryAgentPicker value={newAgent} onChange={setNewAgent} />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={submitAgentReassign} disabled={updateOrderMut.isPending}
                      style={{ background: 'var(--mod-haraka)' }}>Save</Button>
                    <Button size="sm" variant="outline" onClick={() => setReassignAgent(false)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{order.deliveryAgentName ?? '—'}</span>
                  <button
                    type="button"
                    className="text-xs text-primary-600 hover:underline"
                    onClick={() => { setReassignAgent(true); setNewAgent(null); }}
                  >
                    {order.deliveryAgentName ? 'Reassign' : 'Assign'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Items ───────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-surface-page p-5 space-y-3">
        <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">Items</div>
        <div className="space-y-1.5">
          {order.items.map((line, i) => (
            <div key={i} className="flex items-center justify-between text-sm py-1 border-b border-border last:border-0">
              <div>
                <span className="font-medium">{line.inventoryItemName}</span>
                {line.sku && <span className="text-gray-400 text-xs ml-1.5">#{line.sku}</span>}
              </div>
              <div className="flex items-center gap-4 text-gray-500 font-mono tabular-nums">
                <span>{line.quantity} × {formatCurrency(line.unitPrice, currency)}</span>
                <span className="font-medium text-gray-800">{formatCurrency(line.lineTotal, currency)}</span>
              </div>
            </div>
          ))}
          <div className="flex justify-end pt-2 gap-4 text-sm font-mono">
            {order.discountAmount > 0 && (
              <span className="text-gray-400">Discount: -{formatCurrency(order.discountAmount, currency)}</span>
            )}
            {order.taxAmount > 0 && (
              <span className="text-gray-400">Tax: +{formatCurrency(order.taxAmount, currency)}</span>
            )}
            <span className="font-bold text-gray-800">Total: {formatCurrency(order.total, currency)}</span>
          </div>
        </div>
      </div>

      {/* ── Payment ─────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-surface-page p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">Payment</div>
          {order.status !== 'cancelled' && (
            <button
              type="button"
              className="text-xs text-primary-600 hover:underline"
              onClick={() => { setShowPayForm((s) => !s); setPayAmount(String(order.total - order.amountPaid)); }}
            >
              {showPayForm ? 'Cancel' : 'Record payment'}
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <CreditCard className="h-4 w-4 text-gray-300" />
          <div>
            <span className="text-sm font-medium capitalize" style={{ color: payColor }}>
              {order.paymentStatus}
            </span>
            {order.amountPaid > 0 && (
              <span className="text-sm text-gray-400 ml-2">
                {formatCurrency(order.amountPaid, currency)} paid
                {order.paymentMethod && ` · ${order.paymentMethod.replace('_', ' ')}`}
              </span>
            )}
          </div>
        </div>
        {showPayForm && (
          <div className="flex items-end gap-3 pt-1">
            <div className="space-y-1.5 flex-1">
              <div className="text-xs text-gray-500">Amount paid</div>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                className="font-mono"
              />
            </div>
            <div className="space-y-1.5 flex-1">
              <div className="text-xs text-gray-500">Method</div>
              <ConfigSelect
                listKey="order_payment_method"
                value={payMethod}
                onValueChange={setPayMethod}
                placeholder="Select…"
              />
            </div>
            <Button onClick={submitPayment} disabled={recordPayMut.isPending} style={{ background: 'var(--mod-haraka)' }}>
              {recordPayMut.isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        )}
      </div>

      {/* ── Notes ───────────────────────────────────────────────── */}
      {order.notes && (
        <div className="rounded-xl border border-border bg-surface-page p-5 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
            <StickyNote className="h-3 w-3" /> Notes
          </div>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{order.notes}</p>
        </div>
      )}

      <div className="text-xs text-gray-400 pb-4">
        Created {formatDate(order.createdAt)} ·
        Channel: <span className="capitalize">{order.channel}</span> ·
        {order.fulfillmentType === 'delivery' ? ' Delivery' : ' Pickup'}
      </div>
    </div>
  );
}
