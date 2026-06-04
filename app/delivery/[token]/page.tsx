'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Check, Truck, Package, CreditCard, ChevronDown, ChevronUp, Plus, MapPin, Phone, Clock, ShoppingBag } from 'lucide-react';

type Lang = 'en' | 'ar';

interface PaymentEntry {
  id: string;
  amount: number;
  payment_method: string | null;
  note: string | null;
  paid_at: string;
}

interface OrderData {
  id: string;
  order_number: string;
  invoice_number: string | null;
  channel: string;
  status: string;
  fulfillment_type: string;
  customer_name: string;
  customer_phone: string | null;
  delivery_address: { street?: string; area?: string; city?: string; notes?: string } | null;
  items: Array<{ inventoryItemName: string; quantity: number; unitPrice: number; lineTotal: number }>;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total: number;
  payment_status: string;
  amount_paid: number;
  notes: string | null;
  scheduled_at: string | null;
}

function fmt(n: number) { return Number(n).toFixed(3) + ' JOD'; }

const STATUS_COLOR: Record<string, string> = {
  new: '#6366f1', confirmed: '#a855f7', assigned: '#f97316',
  in_transit: '#3b82f6', ready_for_pickup: '#eab308',
  delivered: '#22c55e', picked_up: '#16a34a', cancelled: '#ef4444',
};

const PAY_STATUS_COLOR: Record<string, string> = {
  paid: '#22c55e', partial: '#f97316', unpaid: '#ef4444',
};

const NEXT_STATUS: Record<string, string> = {
  confirmed: 'in_transit',
  assigned: 'in_transit',
  in_transit: 'delivered',
  ready_for_pickup: 'picked_up',
};

const T = {
  en: {
    deliveryOrder: (n: string) => `Delivery Order ${n}`,
    status: 'Status',
    customer: 'Customer',
    scheduled: 'Scheduled',
    items: (n: number) => `${n} item${n !== 1 ? 's' : ''}`,
    total: 'Total',
    payment: 'Payment',
    paid: 'Paid',
    remaining: 'Remaining',
    recordPayment: 'Record Payment',
    amount: 'Amount',
    method: 'Method',
    note: 'Note (optional)',
    notePlaceholder: 'e.g. Change given: 5 JOD',
    cancel: 'Cancel',
    confirmPayment: 'Confirm Payment',
    saving: 'Saving…',
    notes: 'Notes',
    updating: 'Updating…',
    completed: 'Completed',
    orderCancelled: 'Order Cancelled',
    notFound: 'Order not found',
    invalidLink: 'This link may be invalid or expired.',
    failedLoad: 'Failed to load order',
    statusLabel: {
      new: 'New', confirmed: 'Confirmed', assigned: 'Assigned',
      in_transit: 'In Transit', ready_for_pickup: 'Ready for Pickup',
      delivered: 'Delivered', picked_up: 'Picked Up', cancelled: 'Cancelled',
    } as Record<string, string>,
    nextStatusLabel: {
      in_transit: 'Mark as In Transit',
      delivered: 'Mark as Delivered ✓',
      picked_up: 'Mark as Picked Up ✓',
    } as Record<string, string>,
    paymentMethod: {
      cash_on_delivery: 'Cash on Delivery',
      bank_transfer: 'Bank Transfer',
      card: 'Card',
      other: 'Other',
    } as Record<string, string>,
  },
  ar: {
    deliveryOrder: (n: string) => `طلب توصيل ${n}`,
    status: 'الحالة',
    customer: 'العميل',
    scheduled: 'موعد مجدول',
    items: (n: number) => `${n} ${n === 1 ? 'منتج' : 'منتجات'}`,
    total: 'الإجمالي',
    payment: 'الدفع',
    paid: 'المدفوع',
    remaining: 'المتبقي',
    recordPayment: 'تسجيل دفعة',
    amount: 'المبلغ',
    method: 'طريقة الدفع',
    note: 'ملاحظة (اختياري)',
    notePlaceholder: 'مثال: الباقي 5 دينار',
    cancel: 'إلغاء',
    confirmPayment: 'تأكيد الدفع',
    saving: 'جارٍ الحفظ…',
    notes: 'ملاحظات',
    updating: 'جارٍ التحديث…',
    completed: 'مكتمل',
    orderCancelled: 'تم إلغاء الطلب',
    notFound: 'الطلب غير موجود',
    invalidLink: 'هذا الرابط غير صالح أو منتهي الصلاحية.',
    failedLoad: 'فشل تحميل الطلب',
    statusLabel: {
      new: 'جديد', confirmed: 'مؤكد', assigned: 'تم التعيين',
      in_transit: 'في الطريق', ready_for_pickup: 'جاهز للاستلام',
      delivered: 'تم التوصيل', picked_up: 'تم الاستلام', cancelled: 'ملغي',
    } as Record<string, string>,
    nextStatusLabel: {
      in_transit: 'تحديد كـ: في الطريق',
      delivered: 'تحديد كـ: تم التوصيل ✓',
      picked_up: 'تحديد كـ: تم الاستلام ✓',
    } as Record<string, string>,
    paymentMethod: {
      cash_on_delivery: 'الدفع عند التسليم',
      bank_transfer: 'تحويل بنكي',
      card: 'بطاقة',
      other: 'أخرى',
    } as Record<string, string>,
  },
};

export default function DeliveryPage() {
  const { token } = useParams<{ token: string }>();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [orgName, setOrgName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showPayForm, setShowPayForm] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('cash_on_delivery');
  const [payNote, setPayNote] = useState('');
  const [addingPay, setAddingPay] = useState(false);
  const [showItems, setShowItems] = useState(false);
  const [lang, setLang] = useState<Lang>('en');

  const t = T[lang];
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/delivery/${token}`);
      if (!res.ok) { setError('Order not found'); return; }
      const data = await res.json();
      setOrder(data.order);
      setPayments(data.payments ?? []);
      setOrgName(data.orgName ?? '');
    } catch { setError('Failed to load order'); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  async function updateStatus() {
    if (!order) return;
    const nextStatus = NEXT_STATUS[order.status];
    if (!nextStatus) return;
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/delivery/${token}/status`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setOrder((o) => o ? { ...o, status: nextStatus } : o);
    } catch (err) { alert(err instanceof Error ? err.message : 'Failed'); }
    finally { setUpdatingStatus(false); }
  }

  async function recordPayment() {
    const amount = parseFloat(payAmount);
    if (isNaN(amount) || amount <= 0) { alert('Enter a valid amount'); return; }
    setAddingPay(true);
    try {
      const res = await fetch(`/api/delivery/${token}/payment`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, paymentMethod: payMethod || null, note: payNote || null }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const data = await res.json();
      setOrder((o) => o ? { ...o, amount_paid: data.amountPaid, payment_status: data.paymentStatus } : o);
      setPayAmount(''); setPayNote(''); setShowPayForm(false);
      await load();
    } catch (err) { alert(err instanceof Error ? err.message : 'Failed'); }
    finally { setAddingPay(false); }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #e5e7eb', borderTopColor: '#6366f1', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb', padding: 24 }}>
        <div style={{ textAlign: 'center', color: '#6b7280' }}>
          <Package size={48} style={{ marginBottom: 12, opacity: 0.4 }} />
          <div style={{ fontSize: 18, fontWeight: 600 }}>{t.notFound}</div>
          <div style={{ fontSize: 14, marginTop: 6 }}>{t.invalidLink}</div>
        </div>
      </div>
    );
  }

  const remaining = order.total - order.amount_paid;
  const nextStatus = NEXT_STATUS[order.status];
  const statusColor = STATUS_COLOR[order.status] ?? '#6b7280';
  const payStatusColor = PAY_STATUS_COLOR[order.payment_status] ?? '#6b7280';
  const address = order.delivery_address;
  const isDone = ['delivered', 'picked_up', 'cancelled'].includes(order.status);

  return (
    <div dir={dir} style={{ minHeight: '100vh', background: '#f3f4f6', fontFamily: lang === 'ar' ? "'Segoe UI', Tahoma, Arial, sans-serif" : "'Segoe UI', system-ui, sans-serif", color: '#111' }}>
      {/* Top bar */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Truck size={20} style={{ color: '#6366f1', flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{orgName}</div>
            <div style={{ fontSize: 12, color: '#9ca3af' }}>{t.deliveryOrder(order.order_number)}</div>
          </div>
        </div>

        {/* Language toggle */}
        <div style={{ display: 'flex', borderRadius: 8, border: '1.5px solid #e5e7eb', overflow: 'hidden', flexShrink: 0 }}>
          {(['en', 'ar'] as Lang[]).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              style={{
                padding: '5px 12px',
                border: 'none',
                background: lang === l ? '#6366f1' : '#fff',
                color: lang === l ? '#fff' : '#6b7280',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              {l === 'en' ? 'EN' : 'ع'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '12px 12px 80px', display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 480, margin: '0 auto' }}>

        {/* Status card */}
        <div style={{ background: '#fff', borderRadius: 16, padding: 16, boxShadow: '0 1px 4px #0001' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5 }}>{t.status}</span>
            <span style={{ background: statusColor + '20', color: statusColor, fontWeight: 700, fontSize: 13, padding: '3px 10px', borderRadius: 99 }}>
              {t.statusLabel[order.status] ?? order.status}
            </span>
          </div>

          {nextStatus && !isDone && (
            <button
              onClick={updateStatus}
              disabled={updatingStatus}
              style={{
                width: '100%', padding: '14px', borderRadius: 12, border: 'none',
                background: '#6366f1', color: '#fff', fontWeight: 700, fontSize: 16,
                cursor: updatingStatus ? 'not-allowed' : 'pointer',
                opacity: updatingStatus ? 0.7 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {updatingStatus ? t.updating : (t.nextStatusLabel[nextStatus] ?? `Mark as ${nextStatus}`)}
            </button>
          )}

          {isDone && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#22c55e', fontWeight: 600, fontSize: 15, justifyContent: 'center', paddingTop: 4 }}>
              <Check size={20} /> {order.status === 'cancelled' ? t.orderCancelled : t.completed}
            </div>
          )}
        </div>

        {/* Customer + address */}
        <div style={{ background: '#fff', borderRadius: 16, padding: 16, boxShadow: '0 1px 4px #0001' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>{t.customer}</div>
          <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 4 }}>{order.customer_name}</div>
          {order.customer_phone && (
            <a href={`tel:${order.customer_phone}`} style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#6366f1', textDecoration: 'none', fontSize: 15, marginBottom: 8 }}>
              <Phone size={15} /> {order.customer_phone}
            </a>
          )}
          {address && (
            <div style={{ display: 'flex', gap: 6, color: '#555', fontSize: 14 }}>
              <MapPin size={15} style={{ flexShrink: 0, marginTop: 2, color: '#9ca3af' }} />
              <div>
                {[address.street, address.area, address.city].filter(Boolean).join(', ')}
                {address.notes && <div style={{ color: '#9ca3af', fontSize: 13, marginTop: 2 }}>{address.notes}</div>}
              </div>
            </div>
          )}
          {order.scheduled_at && (
            <div style={{ display: 'flex', gap: 6, color: '#555', fontSize: 13, marginTop: 8 }}>
              <Clock size={14} style={{ flexShrink: 0, marginTop: 1, color: '#9ca3af' }} />
              {t.scheduled}: {new Date(order.scheduled_at).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
        </div>

        {/* Items (collapsible) */}
        <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 4px #0001', overflow: 'hidden' }}>
          <button
            onClick={() => setShowItems(v => !v)}
            style={{ width: '100%', padding: '14px 16px', background: 'none', border: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 600, fontSize: 14 }}>
              <ShoppingBag size={16} style={{ color: '#9ca3af' }} />
              {t.items(order.items.length)}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#9ca3af' }}>
              <span style={{ fontWeight: 700, color: '#111', fontSize: 15 }}>{fmt(order.total)}</span>
              {showItems ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </button>
          {showItems && (
            <div style={{ borderTop: '1px solid #f3f4f6', padding: '8px 16px 14px' }}>
              {order.items.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: idx < order.items.length - 1 ? '1px solid #f9fafb' : 'none', fontSize: 14 }}>
                  <span style={{ color: '#374151' }}>{item.inventoryItemName} <span style={{ color: '#9ca3af' }}>×{item.quantity}</span></span>
                  <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>{fmt(item.lineTotal)}</span>
                </div>
              ))}
              <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 15 }}>
                <span>{t.total}</span><span style={{ fontFamily: 'monospace' }}>{fmt(order.total)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Payment */}
        <div style={{ background: '#fff', borderRadius: 16, padding: 16, boxShadow: '0 1px 4px #0001' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5 }}>{t.payment}</div>
            <span style={{ background: payStatusColor + '20', color: payStatusColor, fontWeight: 700, fontSize: 12, padding: '2px 8px', borderRadius: 99 }}>
              {t.statusLabel[order.payment_status] ?? order.payment_status}
            </span>
          </div>

          {payments.map((p) => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, paddingBottom: 4, color: '#555' }}>
              <span>{p.payment_method ? (t.paymentMethod[p.payment_method] ?? p.payment_method) : t.payment}{p.note ? ` — ${p.note}` : ''}</span>
              <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>{fmt(p.amount)}</span>
            </div>
          ))}

          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 15, paddingTop: 6, borderTop: payments.length ? '1px solid #f3f4f6' : 'none', marginTop: 4 }}>
            <span>{t.paid}</span><span style={{ fontFamily: 'monospace', color: '#22c55e' }}>{fmt(order.amount_paid)}</span>
          </div>
          {remaining > 0.001 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 15, paddingTop: 4, color: '#b45309' }}>
              <span>{t.remaining}</span><span style={{ fontFamily: 'monospace' }}>{fmt(remaining)}</span>
            </div>
          )}

          {!isDone && remaining > 0.001 && (
            <div style={{ marginTop: 12 }}>
              {!showPayForm ? (
                <button
                  onClick={() => { setShowPayForm(true); setPayAmount(remaining.toFixed(3)); }}
                  style={{ width: '100%', padding: '12px', borderRadius: 12, border: '2px dashed #e5e7eb', background: 'none', color: '#6366f1', fontWeight: 600, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  <Plus size={16} /> {t.recordPayment}
                </button>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>{t.amount}</label>
                    <input
                      type="number" step="0.001" value={payAmount} onChange={e => setPayAmount(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 16, fontFamily: 'monospace', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>{t.method}</label>
                    <select
                      value={payMethod} onChange={e => setPayMethod(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 15, background: '#fff', boxSizing: 'border-box' }}
                    >
                      <option value="cash_on_delivery">{t.paymentMethod.cash_on_delivery}</option>
                      <option value="bank_transfer">{t.paymentMethod.bank_transfer}</option>
                      <option value="card">{t.paymentMethod.card}</option>
                      <option value="other">{t.paymentMethod.other}</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>{t.note}</label>
                    <input
                      type="text" value={payNote} onChange={e => setPayNote(e.target.value)} placeholder={t.notePlaceholder}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 15, boxSizing: 'border-box' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setShowPayForm(false)} style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1.5px solid #e5e7eb', background: '#fff', fontSize: 15, cursor: 'pointer', fontWeight: 600 }}>{t.cancel}</button>
                    <button onClick={recordPayment} disabled={addingPay} style={{ flex: 2, padding: '12px', borderRadius: 12, border: 'none', background: '#22c55e', color: '#fff', fontSize: 15, fontWeight: 700, cursor: addingPay ? 'not-allowed' : 'pointer', opacity: addingPay ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <CreditCard size={16} /> {addingPay ? t.saving : t.confirmPayment}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Notes */}
        {order.notes && (
          <div style={{ background: '#fff', borderRadius: 16, padding: 16, boxShadow: '0 1px 4px #0001', fontSize: 14, color: '#555', whiteSpace: 'pre-wrap' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{t.notes}</div>
            {order.notes}
          </div>
        )}
      </div>
    </div>
  );
}
