'use client';

import { useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { Copy, Check, Download, FileImage, Loader2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/ui';
import { formatCurrency } from '@/lib/utils/format';
import type { HarakaOrder } from '@/types';

function WhatsAppIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.51 5.26l-.999 3.648 3.978-1.207zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
    </svg>
  );
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  order: HarakaOrder;
  orgSlug: string;
  currency?: string;
}

function buildShareText(order: HarakaOrder, link: string, currency: string): string {
  const lines: string[] = [
    `📦 *Order ${order.orderNumber}*`,
    `Status: ${order.status.replace(/_/g, ' ')}`,
    `Customer: ${order.customerName}`,
  ];
  if (order.customerPhone) lines.push(`Phone: ${order.customerPhone}`);
  if (order.deliveryAddress) {
    const a = order.deliveryAddress;
    const addr = [a.street, a.area, a.city].filter(Boolean).join(', ');
    if (addr) lines.push(`Address: ${addr}`);
    if (a.notes) lines.push(`📍 ${a.notes}`);
  }
  lines.push('');
  lines.push('*Items:*');
  for (const item of order.items) {
    lines.push(`  • ${item.inventoryItemName} × ${item.quantity} — ${formatCurrency(item.lineTotal, currency)}`);
  }
  lines.push('');
  lines.push(`*Total: ${formatCurrency(order.total, currency)}*`);
  if (order.paymentMethod) lines.push(`Payment: ${order.paymentMethod.replace(/_/g, ' ')}`);
  if (order.notes) lines.push(`\nNotes: ${order.notes}`);
  lines.push('');
  lines.push(`🔗 View & Update Order:\n${link}`);
  return lines.join('\n');
}

export function OrderShareDialog({ open, onOpenChange, order, orgSlug, currency = 'JOD' }: Props) {
  const [token, setToken] = useState<string | null>(order.deliveryToken ?? null);
  const [fetching, setFetching] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const deliveryLink = token
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/delivery/${token}`
    : null;

  async function ensureToken() {
    if (token) return token;
    setFetching(true);
    try {
      const res = await fetch(`/api/haraka/orders/${order.id}/delivery-token`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setToken(data.token);
      return data.token as string;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate link');
      return null;
    } finally { setFetching(false); }
  }

  async function handleCopyLink() {
    const t = await ensureToken();
    if (!t) return;
    const link = `${window.location.origin}/delivery/${t}`;
    await navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }

  async function handleCopyText() {
    const t = await ensureToken();
    if (!t) return;
    const link = `${window.location.origin}/delivery/${t}`;
    await navigator.clipboard.writeText(buildShareText(order, link, currency));
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  }

  async function handleWhatsApp() {
    const t = await ensureToken();
    if (!t) return;
    const link = `${window.location.origin}/delivery/${t}`;
    const text = encodeURIComponent(buildShareText(order, link, currency));
    window.open(`https://wa.me/?text=${text}`, '_blank');
  }

  async function handleScreenshot() {
    if (!cardRef.current) return;
    setCapturing(true);
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2 });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `order-${order.orderNumber}.png`;
      a.click();
    } catch { toast.error('Screenshot failed'); }
    finally { setCapturing(false); }
  }

  const address = order.deliveryAddress;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share Order</DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {/* Preview card for screenshot */}
          <div
            ref={cardRef}
            className="rounded-xl border border-border bg-surface-card p-4 space-y-3 text-sm"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="font-bold text-base text-gray-900">Order {order.orderNumber}</div>
                <div className="text-gray-500 text-xs">{new Date(order.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-primary-700">{formatCurrency(order.total, currency)}</div>
                <div className="text-xs text-gray-400 capitalize">{order.status.replace(/_/g, ' ')}</div>
                <div className="text-xs text-gray-400 capitalize">{order.paymentStatus}</div>
              </div>
            </div>

            <div className="border-t border-border pt-2 space-y-1">
              <div className="font-semibold text-gray-900">{order.customerName}</div>
              {order.customerPhone && <div className="text-gray-500">{order.customerPhone}</div>}
              {address && (
                <div className="text-gray-500">
                  {[address.street, address.area, address.city].filter(Boolean).join(', ')}
                </div>
              )}
            </div>

            <div className="border-t border-border pt-2 space-y-1">
              {order.items.map((item, i) => (
                <div key={i} className="flex justify-between text-xs text-gray-600">
                  <span>{item.inventoryItemName} ×{item.quantity}</span>
                  <span className="font-mono">{formatCurrency(item.lineTotal, currency)}</span>
                </div>
              ))}
            </div>

            {order.notes && (
              <div className="border-t border-border pt-2 text-xs text-gray-500 italic">{order.notes}</div>
            )}

            {deliveryLink && (
              <div className="border-t border-border pt-2 text-xs text-gray-400 break-all">
                🔗 {deliveryLink}
              </div>
            )}
          </div>

          {/* Share actions */}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={handleWhatsApp} disabled={fetching} className="gap-2 justify-start">
              {fetching ? <Loader2 size={14} className="animate-spin" /> : <WhatsAppIcon size={14} />}
              WhatsApp
            </Button>
            <Button variant="outline" onClick={handleCopyLink} disabled={fetching} className="gap-2 justify-start">
              {copiedLink ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
              {copiedLink ? 'Copied!' : 'Copy Link'}
            </Button>
            <Button variant="outline" onClick={handleCopyText} disabled={fetching} className="gap-2 justify-start">
              {copiedText ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
              {copiedText ? 'Copied!' : 'Copy Text'}
            </Button>
            <Button variant="outline" onClick={handleScreenshot} disabled={capturing} className="gap-2 justify-start">
              {capturing ? <Loader2 size={14} className="animate-spin" /> : <FileImage size={14} />}
              Screenshot
            </Button>
          </div>

          {fetching && (
            <p className="text-xs text-center text-gray-400">Generating share link…</p>
          )}
        </DialogBody>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
