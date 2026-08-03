'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Check, Package, ChevronDown, ChevronUp, MapPin, Phone, Clock, ShoppingBag, Store } from 'lucide-react';

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

const T = {
  en: {
    trackOrder: (n: string) => `Order ${n}`,
    status: 'Status',
    customer: 'Customer',
    scheduled: 'Scheduled',
    items: (n: number) => `${n} item${n !== 1 ? 's' : ''}`,
    total: 'Total',
    payment: 'Payment',
    paid: 'Paid',
    remaining: 'Remaining',
    notes: 'Notes',
    completed: 'Completed',
    orderCancelled: 'Order Cancelled',
    notFound: 'Order not found',
    invalidLink: 'This link may be invalid or expired.',
    readOnlyNote: 'This is a view-only link to track your order.',
    statusLabel: {
      new: 'New', confirmed: 'Confirmed', assigned: 'Assigned',
      in_transit: 'In Transit', ready_for_pickup: 'Ready for Pickup',
      delivered: 'Delivered', picked_up: 'Picked Up', cancelled: 'Cancelled',
    } as Record<string, string>,
    payStatusLabel: {
      paid: 'Paid', partial: 'Partial', unpaid: 'Unpaid',
    } as Record<string, string>,
    paymentMethod: {
      cash_on_delivery: 'Cash on Delivery',
      bank_transfer: 'Bank Transfer',
      card: 'Card',
      other: 'Other',
    } as Record<string, string>,
  },
  ar: {
    trackOrder: (n: string) => `طلب ${n}`,
    status: 'الحالة',
    customer: 'العميل',
    scheduled: 'موعد مجدول',
    items: (n: number) => `${n} ${n === 1 ? 'منتج' : 'منتجات'}`,
    total: 'الإجمالي',
    payment: 'الدفع',
    paid: 'المدفوع',
    remaining: 'المتبقي',
    notes: 'ملاحظات',
    completed: 'مكتمل',
    orderCancelled: 'تم إلغاء الطلب',
    notFound: 'الطلب غير موجود',
    invalidLink: 'هذا الرابط غير صالح أو منتهي الصلاحية.',
    readOnlyNote: 'هذا رابط للعرض فقط لمتابعة طلبك.',
    statusLabel: {
      new: 'جديد', confirmed: 'مؤكد', assigned: 'تم التعيين',
      in_transit: 'في الطريق', ready_for_pickup: 'جاهز للاستلام',
      delivered: 'تم التوصيل', picked_up: 'تم الاستلام', cancelled: 'ملغي',
    } as Record<string, string>,
    payStatusLabel: {
      paid: 'مدفوع', partial: 'جزئي', unpaid: 'غير مدفوع',
    } as Record<string, string>,
    paymentMethod: {
      cash_on_delivery: 'الدفع عند التسليم',
      bank_transfer: 'تحويل بنكي',
      card: 'بطاقة',
      other: 'أخرى',
    } as Record<string, string>,
  },
};

export default function TrackPage() {
  const { token } = useParams<{ token: string }>();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [orgName, setOrgName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showItems, setShowItems] = useState(false);
  const [lang, setLang] = useState<Lang>('en');

  const t = T[lang];
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/track/${token}`);
      if (!res.ok) {
        const msg = res.status === 410
          ? ((await res.json().catch(() => ({}))).error ?? 'This tracking link is no longer valid')
          : 'Order not found';
        setError(msg);
        return;
      }
      const data = await res.json();
      setOrder(data.order);
      setPayments(data.payments ?? []);
      setOrgName(data.orgName ?? '');
    } catch { setError('Failed to load order'); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

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
  const statusColor = STATUS_COLOR[order.status] ?? '#6b7280';
  const payStatusColor = PAY_STATUS_COLOR[order.payment_status] ?? '#6b7280';
  const address = order.delivery_address;
  const isDone = ['delivered', 'picked_up', 'cancelled'].includes(order.status);

  return (
    <div dir={dir} style={{ minHeight: '100vh', background: '#f3f4f6', fontFamily: lang === 'ar' ? "'Segoe UI', Tahoma, Arial, sans-serif" : "'Segoe UI', system-ui, sans-serif", color: '#111' }}>
      {/* Top bar */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Store size={20} style={{ color: '#6366f1', flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{orgName}</div>
            <div style={{ fontSize: 12, color: '#9ca3af' }}>{t.trackOrder(order.order_number)}</div>
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

      <div style={{ padding: '12px 12px 40px', display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 480, margin: '0 auto' }}>

        {/* Status card (read-only) */}
        <div style={{ background: '#fff', borderRadius: 16, padding: 16, boxShadow: '0 1px 4px #0001' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5 }}>{t.status}</span>
            <span style={{ background: statusColor + '20', color: statusColor, fontWeight: 700, fontSize: 13, padding: '3px 10px', borderRadius: 99 }}>
              {t.statusLabel[order.status] ?? order.status}
            </span>
          </div>

          {isDone && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: order.status === 'cancelled' ? '#ef4444' : '#22c55e', fontWeight: 600, fontSize: 15, justifyContent: 'center', paddingTop: 12 }}>
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

        {/* Payment (read-only breakdown) */}
        <div style={{ background: '#fff', borderRadius: 16, padding: 16, boxShadow: '0 1px 4px #0001' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5 }}>{t.payment}</div>
            <span style={{ background: payStatusColor + '20', color: payStatusColor, fontWeight: 700, fontSize: 12, padding: '2px 8px', borderRadius: 99 }}>
              {t.payStatusLabel[order.payment_status] ?? order.payment_status}
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
        </div>

        {/* Notes */}
        {order.notes && (
          <div style={{ background: '#fff', borderRadius: 16, padding: 16, boxShadow: '0 1px 4px #0001', fontSize: 14, color: '#555', whiteSpace: 'pre-wrap' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{t.notes}</div>
            {order.notes}
          </div>
        )}

        <div style={{ textAlign: 'center', fontSize: 12, color: '#9ca3af', padding: '4px 8px' }}>
          {t.readOnlyNote}
        </div>
      </div>
    </div>
  );
}
