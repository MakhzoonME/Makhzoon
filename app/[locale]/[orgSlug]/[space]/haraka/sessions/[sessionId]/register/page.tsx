'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Printer, Lock, Receipt, ShoppingCart, PauseCircle, RotateCcw, Trash2, Banknote, CreditCard } from 'lucide-react';
import { BarcodeInput, SubscriptionGate } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { ProductGrid } from '@/components/haraka/ProductGrid';
import { Cart } from '@/components/haraka/Cart';
import { CustomerPicker } from '@/components/haraka/CustomerPicker';
import { PaymentDialog, type PaymentLine } from '@/components/haraka/PaymentDialog';
import { DiscountApprovalPinDialog } from '@/components/haraka/DiscountApprovalPinDialog';
import { PrinterSettingsDialog } from '@/components/haraka/PrinterSettingsDialog';
import { ReceiptShareDialog } from '@/components/haraka/ReceiptShareDialog';
import { usePosCart, setActivePosCartSession, type PosPickableItem } from '@/store/pos-cart.store';
import { useBarcodeLookup } from '@/hooks/inventory';
import { useTaxRates, useCurrentSession, useSessionForRegister, useCompleteSale, useFawtaraConfig, CompleteSaleError } from '@/hooks/haraka';
import { useAuthStore } from '@/store/auth.store';
import { hasPermission } from '@/lib/permissions';
import { priceCart } from '@/lib/modules/haraka/pricing/calc';
import { toast, useT } from '@/hooks/ui';
import { useOrgInfo } from '@/hooks/org';
import { openCashDrawer } from '@/lib/modules/haraka/printing/webusb-transport';
import { CashDrawerButton } from '@/components/haraka/CashDrawerButton';
import { useCashDrawerConfig } from '@/hooks/haraka';
import type { ReceiptConfig } from '@/components/settings/receipt/ReceiptPreview';
import { DEFAULT_RECEIPT_CONFIG } from '@/lib/receipts/receipt-config';
import { getReceiptBaseUrl } from '@/lib/app-env';
import { useQuery } from '@tanstack/react-query';
import type { InventoryItem, PosTransaction } from '@/types';

export default function RegisterPage() {
  const router = useRouter();
  const params = useParams<{ locale: string; orgSlug: string; space: string; sessionId: string }>();
  const { t } = useT();
  const { data: orgInfo } = useOrgInfo();
  const { user } = useAuthStore();
  const { data: sessionData, isLoading: sessionLoading, isFetched: sessionFetched } = useCurrentSession();
  const ownSession = sessionData?.session ?? null;
  const isOwnSessionUrl = !!ownSession && ownSession.id === params.sessionId;
  // The URL's sessionId may be someone ELSE's open session (a supervisor
  // entering it via sessionsEnterOthers) — only fetched when it isn't our
  // own current session, since useCurrentSession already covers that case.
  const {
    data: otherSessionData,
    isFetched: otherSessionFetched,
    isError: otherSessionError,
  } = useSessionForRegister(isOwnSessionUrl ? undefined : params.sessionId);
  const { data: taxData } = useTaxRates();
  const { data: fawtaraCfg } = useFawtaraConfig();
  const fawtaraEnabled = fawtaraCfg?.config?.enabled === true;
  const { data: cashDrawerData } = useCashDrawerConfig();
  const { lookup } = useBarcodeLookup({ posLookup: true });

  // Scope the persisted cart (active lines, customer, held receipts) to this
  // register session before first paint, so switching between sessions never
  // shows a stale cart carried over from a different one.
  useLayoutEffect(() => {
    setActivePosCartSession(params.sessionId);
  }, [params.sessionId]);

  const lines = usePosCart((s) => s.lines);
  const customer = usePosCart((s) => s.customer);
  const held = usePosCart((s) => s.held);
  const addItem = usePosCart((s) => s.addItem);
  const clearCart = usePosCart((s) => s.clear);
  const holdCart = usePosCart((s) => s.holdCart);
  const recallCart = usePosCart((s) => s.recallCart);
  const discardHeld = usePosCart((s) => s.discardHeld);
  const [heldOpen, setHeldOpen] = useState(false);
  const heldRef = useRef<HTMLDivElement>(null);

  const canAddItems = !!user && hasPermission(user, 'haraka', 'registerOpen');
  const canRemoveItems = !!user && hasPermission(user, 'haraka', 'removeReceiptItems');
  const canApplyDiscount = !!user && hasPermission(user, 'haraka', 'applyDiscount');
  const canHoldReceipts = !!user && hasPermission(user, 'haraka', 'holdReceipts');
  // A front-desk user who can build/hold a cart but not charge it (no
  // registerOpen) doesn't need — and shouldn't be forced to open — a POS
  // session just to land on this page. Only checkout-capable users are
  // redirected away when they have no open session of their own.
  const canCheckout = !!user && hasPermission(user, 'haraka', 'registerOpen');

  // Close held-carts dropdown on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (heldRef.current && !heldRef.current.contains(e.target as Node)) {
        setHeldOpen(false);
      }
    }
    if (heldOpen) document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [heldOpen]);

  const completeMut = useCompleteSale();

  const [payOpen, setPayOpen] = useState(false);
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);
  const [pendingSale, setPendingSale] = useState<{ payments: PaymentLine[]; skipFawtara: boolean } | null>(null);
  const [payTab, setPayTab] = useState<'cash' | 'card' | 'cliq' | 'other'>('cash');
  const [printerOpen, setPrinterOpen] = useState(false);
  const [lastTx, setLastTx] = useState<PosTransaction | null>(null);
  const [pendingDrawerPayments, setPendingDrawerPayments] = useState<PaymentLine[] | null>(null);
  const [receiptTx, setReceiptTx] = useState<PosTransaction | null>(null);
  const [receiptBase] = useState(() => getReceiptBaseUrl());

  const { data: receiptCfg } = useQuery<{ tagline?: string; taglineAr?: string; taxNumber?: string; config?: ReceiptConfig }>({
    queryKey: ['receipt-config'],
    queryFn: async () => {
      const res = await fetch('/api/organizations/receipt-config');
      return res.ok ? res.json() : {};
    },
    staleTime: 60_000,
  });

  const base = `/${params.locale}/${params.orgSlug}/${params.space}/haraka`;
  const currentSession = isOwnSessionUrl ? ownSession : (otherSessionData?.session ?? null);

  // Keep the URL honest about which session this register is operating.
  //   • viewing my own session at the right URL → nothing to do
  //   • URL points at another session I can't access (wrong org, no
  //     sessionsEnterOthers, etc.) → fall back to my own open session, or
  //     the sessions list if I don't have one
  //   • no own session and no access to the URL's session, but I'm
  //     checkout-capable → back to the sessions list
  useEffect(() => {
    if (!sessionFetched || sessionLoading) return;
    if (isOwnSessionUrl) return;
    if (!otherSessionFetched) return;
    if (otherSessionError) {
      router.replace(ownSession ? `${base}/sessions/${ownSession.id}/register` : `${base}/sessions`);
      return;
    }
    if (canCheckout && !ownSession && !otherSessionData?.session) {
      router.replace(`${base}/sessions`);
    }
  }, [sessionFetched, sessionLoading, isOwnSessionUrl, otherSessionFetched, otherSessionError, otherSessionData, ownSession, canCheckout, router, base]);

  const taxRateById = useCallback(
    (id: string | null | undefined): number => {
      if (!id) return 0;
      const tr = taxData?.taxRates.find((r) => r.id === id);
      return tr?.rate ?? 0;
    },
    [taxData],
  );

  function pickItem(item: PosPickableItem) {
    if (!canAddItems) { toast.error("You don't have permission to add items to a receipt"); return; }
    addItem(item, taxRateById(item.taxRateId));
  }

  function inventoryItemToPickable(item: InventoryItem): PosPickableItem {
    return {
      id: item.id,
      name: item.name,
      sku: item.sku ?? null,
      barcode: item.barcode ?? null,
      unitPrice: typeof item.posPrice === 'number' && item.posPrice > 0 ? item.posPrice : item.unitCost ?? 0,
      taxRateId: item.taxRateId ?? null,
    };
  }

  const handleScan = useCallback(async (code: string) => {
    if (!canAddItems) { toast.error("You don't have permission to add items to a receipt"); return; }
    const result = await lookup(code);
    if (result.found) {
      if (!result.item.posEnabled) { toast.error(`${result.item.name} isn't enabled for POS`); return; }
      if (result.item.quantityOnHand <= 0) { toast.error(`${result.item.name} is out of stock`); return; }
      pickItem(inventoryItemToPickable(result.item));
    } else {
      toast.error('Item not found');
    }
  }, [lookup, taxRateById, canAddItems]);

  function resolvePendingDrawer() {
    if (!pendingDrawerPayments) return;
    maybeOpenCashDrawer(pendingDrawerPayments);
    setPendingDrawerPayments(null);
  }

  function maybeOpenCashDrawer(payments: PaymentLine[]) {
    const drawerCfg = cashDrawerData?.config;
    if (!drawerCfg?.enabled || !drawerCfg.autoOpenOnCash) return;
    const hasCash = payments.some((p) => p.method === 'cash' && p.amount > 0);
    if (!hasCash) return;
    openCashDrawer({
      port: drawerCfg.drawerPort,
      onTimeMs: drawerCfg.onTimeMs,
      offTimeMs: drawerCfg.offTimeMs,
    }).catch(() => undefined); // silent — never block the sale flow
  }

  async function handleConfirmSale(payments: PaymentLine[], skipFawtara: boolean, approverPin?: string) {
    if (!currentSession) { toast.error('No open session'); return; }
    const offlineId = crypto.randomUUID();
    try {
      const result = await completeMut.mutateAsync({
        sessionId: currentSession.id,
        offlineId,
        customerId: customer?.id ?? null,
        customerName: customer?.name ?? null,
        lines: lines.map((l) => ({
          itemId: l.itemId, itemName: l.itemName, sku: l.sku, barcode: l.barcode,
          quantity: l.quantity, unitPrice: l.unitPrice, taxRateId: l.taxRateId,
          taxRate: l.taxRate, discount: l.discount,
        })),
        payments: payments.map((p) => ({
          method: p.method, amount: p.amount,
          reference: p.reference ?? null, cardLast4: p.cardLast4 || null,
        })),
        skipFawtara,
        approverPin,
      });
      setLastTx(result.transaction);
      setPayOpen(false);
      setApprovalOpen(false);
      setPendingSale(null);
      clearCart();
      toast.success(`Sale complete — receipt ${result.transaction.receiptNumber}`);
      setReceiptTx(result.transaction);
      // The drawer opens once printing actually happens — ReceiptShareDialog
      // auto-prints immediately (see its onPrinted callback below).
      setPendingDrawerPayments(payments);
    } catch (err) {
      if (err instanceof CompleteSaleError && err.code === 'DISCOUNT_APPROVAL_REQUIRED') {
        setPendingSale({ payments, skipFawtara });
        setApprovalError(approverPin ? 'Incorrect PIN' : null);
        setApprovalOpen(true);
        return;
      }
      toast.error(err instanceof Error ? err.message : 'Sale failed');
    }
  }

  function handleApprovalPinSubmit(pin: string) {
    if (!pendingSale) return;
    handleConfirmSale(pendingSale.payments, pendingSale.skipFawtara, pin);
  }

  const totals = priceCart(lines).totals;

  return (
    /* Full-bleed: escape the layout's px-6 py-6 container */
    <div
      className="-mx-6 -mt-6 flex flex-col bg-surface-page"
      style={{ height: 'calc(100vh - 3.5rem)' }}
    >
      {/* ── Slim header bar ─────────────────────────────────────────────── */}
      <div className="h-11 flex items-center gap-3 px-5 border-b border-border bg-surface-card flex-shrink-0">
        <span className="text-xs text-gray-400">
          {orgInfo?.name ?? params.orgSlug} / {params.space} /
        </span>
        <span className="text-sm font-semibold text-gray-900">
          {currentSession?.tillName || t('register.title')}
        </span>

        {currentSession && (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-100">
            <span className="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse" />
            {t('haraka.activeSession')}
          </span>
        )}

        <div className="ms-auto flex items-center gap-2">
          <CashDrawerButton sessionActive={!!currentSession} />
          <Button variant="ghost" size="sm" className="h-7 px-2 text-gray-500" onClick={() => setPrinterOpen(true)}>
            <Printer size={14} className="me-1" /> {t('register.printer')}
          </Button>
          {lastTx && (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-gray-500" onClick={() => setReceiptTx(lastTx)}>
              <Receipt size={14} className="me-1" /> {t('register.reprintLast')}
            </Button>
          )}
          {currentSession && (
            <Button
              variant="outline"
              size="sm"
              className="h-7"
              onClick={() => router.push(`${base}/sessions`)}
            >
              <Lock size={13} className="me-1" /> {t('register.closeSession')}
            </Button>
          )}
        </div>
      </div>

      {/* ── Two-pane body ────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* LEFT — product catalog */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden p-4 gap-3">
          <BarcodeInput onResolve={handleScan} placeholder={t('register.scanPlaceholder')} autoFocus enableCamera disabled={!canAddItems} />
          <ProductGrid onPick={pickItem} />
        </div>

        {/* RIGHT — cart panel */}
        <div
          className="w-[360px] flex-shrink-0 flex flex-col border-s border-border bg-surface-card overflow-hidden"
        >
          {/* Cart header */}
          <div className="px-4 py-2.5 border-b border-border flex items-center gap-2 flex-shrink-0">
            <span className="text-sm font-semibold">{t('register.cart')} ({lines.length})</span>
            {!customer && (
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <ShoppingCart size={11} /> Walk-in
              </span>
            )}
            <div className="ms-auto flex items-center gap-1">
              {/* Hold current cart — always holds, disabled when cart empty */}
              {canHoldReceipts && (
                <button
                  type="button"
                  title="Hold this sale"
                  disabled={lines.length === 0}
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-gray-500 hover:bg-surface-inset disabled:opacity-30 transition-colors"
                  onClick={() => { holdCart(); }}
                >
                  <PauseCircle size={14} /> Hold
                </button>
              )}

              {/* Held-carts pill — only shown when there are held sales */}
              {canHoldReceipts && held.length > 0 && (
                <div className="relative" ref={heldRef}>
                  <button
                    type="button"
                    className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold transition-colors"
                    style={{ background: 'rgba(194,24,91,0.10)', color: 'var(--mod-haraka)' }}
                    onClick={() => setHeldOpen((o) => !o)}
                  >
                    <RotateCcw size={13} /> {held.length} held
                  </button>

                  {/* Recall dropdown */}
                  {heldOpen && (
                    <div className="absolute end-0 top-full mt-1 z-50 w-72 rounded-xl border border-border bg-surface-card shadow-lg overflow-hidden">
                      <div className="px-4 py-2.5 border-b border-border">
                        <span className="text-xs font-semibold text-gray-700">Held sales</span>
                      </div>
                      {held.map((h) => (
                        <div key={h.id} className="px-4 py-3 border-b border-border last:border-0 flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-gray-800 truncate">
                              {h.customer?.name ?? 'Walk-in'}
                            </div>
                            <div className="text-xs text-gray-400 mt-0.5">
                              {h.lines.length} item{h.lines.length !== 1 ? 's' : ''}
                              {' · '}{h.heldAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-white"
                            style={{ background: 'var(--mod-haraka)' }}
                            onClick={() => { recallCart(h.id); setHeldOpen(false); }}
                          >
                            <RotateCcw size={11} /> Recall
                          </button>
                          <button
                            type="button"
                            className="p-1 rounded-md text-gray-300 hover:text-red-500 transition-colors"
                            onClick={() => discardHeld(h.id)}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Customer picker */}
          <div className="px-4 pt-3 pb-1 flex-shrink-0">
            <CustomerPicker />
          </div>

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto px-4 min-h-0">
            <Cart canRemoveItems={canRemoveItems} canApplyDiscount={canApplyDiscount} />
          </div>

          {/* Cart footer — totals + charge button */}
          <div className="px-4 py-4 border-t border-border flex-shrink-0 space-y-1 bg-surface-card">
            {lines.length > 0 && (
              <>
                <div className="flex justify-between text-xs text-gray-500 font-mono">
                  <span>{t('reports.subtotal')}</span>
                  <span>{totals.subtotal.toFixed(2)}</span>
                </div>
                {totals.taxTotal > 0 && (
                  <div className="flex justify-between text-xs text-gray-500 font-mono">
                    <span>{t('reports.tax')}</span>
                    <span>{totals.taxTotal.toFixed(2)}</span>
                  </div>
                )}
                {totals.discountTotal > 0 && (
                  <div className="flex justify-between text-xs text-amber-600 font-mono">
                    <span>{t('cart.discount')}</span>
                    <span>-{totals.discountTotal.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex items-baseline justify-between pt-2 border-t border-border mt-1">
                  <span className="text-sm font-semibold">{t('col.total')}</span>
                  <span className="text-xl font-bold font-mono" style={{ color: 'var(--mod-haraka)' }}>
                    JOD {totals.total.toFixed(2)}
                  </span>
                </div>
              </>
            )}

            {canCheckout ? (
              <SubscriptionGate className="block space-y-2 pt-2">
                {/* Quick-pay shortcuts */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={lines.length === 0 || completeMut.isPending}
                    className="flex items-center justify-center gap-1.5 h-9 rounded-lg text-xs font-semibold border border-border bg-surface-card text-gray-600 hover:border-gray-400 transition-colors disabled:opacity-30"
                    onClick={() => { setPayTab('cash'); setPayOpen(true); }}
                  >
                    <Banknote size={14} /> Cash
                  </button>
                  <button
                    type="button"
                    disabled={lines.length === 0 || completeMut.isPending}
                    className="flex items-center justify-center gap-1.5 h-9 rounded-lg text-xs font-semibold border border-border bg-surface-card text-gray-600 hover:border-gray-400 transition-colors disabled:opacity-30"
                    onClick={() => { setPayTab('card'); setPayOpen(true); }}
                  >
                    <CreditCard size={14} /> Card
                  </button>
                </div>
                <button
                  className="w-full h-11 rounded-lg text-sm font-bold text-white transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: 'var(--mod-haraka)' }}
                  disabled={lines.length === 0 || completeMut.isPending}
                  onClick={() => { setPayTab('cash'); setPayOpen(true); }}
                >
                  {completeMut.isPending
                    ? 'Processing…'
                    : lines.length === 0
                    ? t('register.charge') + ' JOD 0.00'
                    : `${t('register.charge')} JOD ${totals.total.toFixed(2)}`}
                </button>
              </SubscriptionGate>
            ) : (
              canHoldReceipts && lines.length > 0 && (
                <div className="pt-2 text-center text-xs text-gray-400">
                  Hold this cart for a cashier to charge — you don&apos;t have permission to take payment.
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* ── Dialogs ─────────────────────────────────────────────────────── */}
      <PaymentDialog
        open={payOpen}
        onOpenChange={setPayOpen}
        total={totals.total}
        onConfirm={handleConfirmSale}
        loading={completeMut.isPending}
        initialTab={payTab}
        fawtaraEnabled={fawtaraEnabled}
      />
      <DiscountApprovalPinDialog
        open={approvalOpen}
        onOpenChange={(o) => { setApprovalOpen(o); if (!o) { setPendingSale(null); setApprovalError(null); } }}
        onSubmit={handleApprovalPinSubmit}
        loading={completeMut.isPending}
        error={approvalError}
      />
      <PrinterSettingsDialog
        open={printerOpen}
        onOpenChange={setPrinterOpen}
        config={receiptCfg?.config ?? DEFAULT_RECEIPT_CONFIG}
      />

      {/* Always shown right after checkout and auto-prints immediately
          (bilingual orgs print in the default language shown, then can
          reprint in the other via the toggle). Printing rasterizes this
          exact preview (logo included) so what's on screen is what comes
          out of the printer. */}
      <ReceiptShareDialog
        open={!!receiptTx}
        onOpenChange={(o) => { if (!o) setReceiptTx(null); }}
        transaction={receiptTx}
        orgSlug={params.orgSlug}
        orgName={orgInfo?.name ?? ''}
        receiptBase={receiptBase}
        config={receiptCfg?.config ?? DEFAULT_RECEIPT_CONFIG}
        tagline={receiptCfg?.tagline ?? ''}
        taglineAr={receiptCfg?.taglineAr ?? ''}
        taxNumber={receiptCfg?.taxNumber ?? ''}
        autoPrint
        onPrinted={resolvePendingDrawer}
      />
    </div>
  );
}
