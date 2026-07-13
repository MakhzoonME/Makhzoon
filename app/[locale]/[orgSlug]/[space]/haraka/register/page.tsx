'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Printer, Lock, Receipt, ShoppingCart, PauseCircle, RotateCcw, Trash2, Banknote, CreditCard } from 'lucide-react';
import { BarcodeInput, SubscriptionGate } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { ProductGrid } from '@/components/haraka/ProductGrid';
import { Cart } from '@/components/haraka/Cart';
import { CustomerPicker } from '@/components/haraka/CustomerPicker';
import { PaymentDialog, type PaymentLine } from '@/components/haraka/PaymentDialog';
import { PrinterSettingsDialog } from '@/components/haraka/PrinterSettingsDialog';
import { ReceiptShareDialog } from '@/components/haraka/ReceiptShareDialog';
import { usePosCart, type PosPickableItem } from '@/store/pos-cart.store';
import { useBarcodeLookup } from '@/hooks/inventory';
import { useTaxRates, useCurrentSession, useCompleteSale, useFawtaraConfig } from '@/hooks/haraka';
import { useAuthStore } from '@/store/auth.store';
import { hasPermission } from '@/lib/permissions';
import { priceCart } from '@/lib/modules/haraka/pricing/calc';
import { toast, useT } from '@/hooks/ui';
import { useOrgInfo } from '@/hooks/org';
import { printRaw, openCashDrawer } from '@/lib/modules/haraka/printing/webusb-transport';
import { buildReceipt } from '@/lib/modules/haraka/printing/receipt-template';
import { CashDrawerButton } from '@/components/haraka/CashDrawerButton';
import { useCashDrawerConfig } from '@/hooks/haraka';
import type { ReceiptPrintText } from '@/lib/modules/haraka/printing/receipt-canvas';
import type { ReceiptConfig } from '@/components/settings/receipt/ReceiptPreview';
import { DEFAULT_RECEIPT_CONFIG } from '@/lib/receipts/receipt-config';
import type { ReceiptLang } from '@/lib/receipts/labels';
import { getReceiptBaseUrl } from '@/lib/app-env';
import { useQuery } from '@tanstack/react-query';
import type { InventoryItem, PosTransaction } from '@/types';

export default function RegisterPage() {
  const router = useRouter();
  const params = useParams<{ locale: string; orgSlug: string; space: string }>();
  const { t } = useT();
  const { data: orgInfo } = useOrgInfo();
  const { user } = useAuthStore();
  const { data: sessionData, isLoading: sessionLoading, isFetched: sessionFetched } = useCurrentSession();
  const { data: taxData } = useTaxRates();
  const { data: fawtaraCfg } = useFawtaraConfig();
  const fawtaraEnabled = fawtaraCfg?.config?.enabled === true;
  const { data: cashDrawerData } = useCashDrawerConfig();
  const { lookup } = useBarcodeLookup({ posLookup: true });

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

  const canAddItems = !!user && hasPermission(user, 'pos', 'add_receipt_items');
  const canRemoveItems = !!user && hasPermission(user, 'pos', 'remove_receipt_items');
  const canApplyDiscount = !!user && hasPermission(user, 'pos', 'apply_discount');
  const canHoldReceipts = !!user && hasPermission(user, 'pos', 'hold_receipts');
  // A front-desk user who can build/hold a cart but not charge it (no
  // process_sale) doesn't need — and shouldn't be forced to open — a POS
  // session just to land on this page. Only checkout-capable users are
  // redirected away when they have no open session of their own.
  const canCheckout = !!user && hasPermission(user, 'pos', 'process_sale');

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
  const [payTab, setPayTab] = useState<'cash' | 'card' | 'other'>('cash');
  const [printerOpen, setPrinterOpen] = useState(false);
  const [lastTx, setLastTx] = useState<PosTransaction | null>(null);
  const [langPickTx, setLangPickTx] = useState<PosTransaction | null>(null);
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

  useEffect(() => {
    if (canCheckout && sessionFetched && !sessionLoading && !sessionData?.session) {
      router.replace(`/${params.locale}/${params.orgSlug}/${params.space}/haraka/sessions`);
    }
  }, [canCheckout, sessionFetched, sessionLoading, sessionData?.session, router, params.locale, params.orgSlug, params.space]);

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

  async function handleConfirmSale(payments: PaymentLine[], skipFawtara: boolean) {
    if (!sessionData?.session) { toast.error('No open session'); return; }
    const offlineId = crypto.randomUUID();
    try {
      const result = await completeMut.mutateAsync({
        sessionId: sessionData.session.id,
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
      });
      setLastTx(result.transaction);
      setPayOpen(false);
      clearCart();
      toast.success(`Sale complete — receipt ${result.transaction.receiptNumber}`);
      setReceiptTx(result.transaction);
      requestPrint(result.transaction);
      // Auto-open cash drawer on cash payment if configured
      const drawerCfg = cashDrawerData?.config;
      if (drawerCfg?.enabled && drawerCfg.autoOpenOnCash) {
        const hasCash = payments.some((p) => p.method === 'cash' && p.amount > 0);
        if (hasCash) {
          openCashDrawer({
            port: drawerCfg.drawerPort,
            onTimeMs: drawerCfg.onTimeMs,
            offTimeMs: drawerCfg.offTimeMs,
          }).catch(() => undefined); // silent — never block the sale flow
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sale failed');
    }
  }

  function requestPrint(transaction: PosTransaction) {
    if ((receiptCfg?.config?.language ?? 'en') === 'both') {
      setLangPickTx(transaction);
    } else {
      const lang: ReceiptLang = receiptCfg?.config?.language === 'ar' ? 'ar' : 'en';
      printReceipt(transaction, lang).catch(() => undefined);
    }
  }

  function buildPrintText(): ReceiptPrintText {
    const cfg = receiptCfg?.config;
    return {
      orgName: cfg?.orgName?.trim() || orgInfo?.name || '',
      orgNameAr: cfg?.orgNameAr ?? '',
      tagline: receiptCfg?.tagline ?? '',
      taglineAr: receiptCfg?.taglineAr ?? '',
      address: cfg?.address ?? '',
      addressAr: cfg?.addressAr ?? '',
      phone: cfg?.phone ?? '',
      taxNumber: receiptCfg?.taxNumber ?? '',
      footerText: cfg?.footerText ?? '',
      footerTextAr: cfg?.footerTextAr ?? '',
      showCashier: cfg?.showCashier ?? true,
      showTaxNumber: cfg?.showTaxNumber ?? true,
      showFawtaraQr: cfg?.showFawtaraQr ?? true,
    };
  }

  async function printReceipt(transaction: PosTransaction, lang: ReceiptLang) {
    try {
      const { usePrinterStore } = await import('@/store/printer.store');
      const printer = usePrinterStore.getState();
      const bytes = await buildReceipt(transaction, {
        paperWidth: printer.paperWidth,
        organization: { id: user?.organizationId ?? '', name: orgInfo?.name ?? '', contactEmail: user?.email ?? '' },
        text: buildPrintText(),
        lang,
      });
      const ok = await printRaw(bytes);
      if (!ok) toast.info('No printer paired — receipt not printed');
    } catch (err) {
      console.error('[print receipt]', err);
    }
  }

  const totals = priceCart(lines).totals;
  const base = `/${params.locale}/${params.orgSlug}/${params.space}/haraka`;

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
        <span className="text-sm font-semibold text-gray-900">{t('register.title')}</span>

        {sessionData?.session && (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-100">
            <span className="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse" />
            {t('haraka.activeSession')}
          </span>
        )}

        <div className="ms-auto flex items-center gap-2">
          <CashDrawerButton sessionActive={!!sessionData?.session} />
          <Button variant="ghost" size="sm" className="h-7 px-2 text-gray-500" onClick={() => setPrinterOpen(true)}>
            <Printer size={14} className="me-1" /> {t('register.printer')}
          </Button>
          {lastTx && (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-gray-500" onClick={() => requestPrint(lastTx)}>
              <Receipt size={14} className="me-1" /> {t('register.reprintLast')}
            </Button>
          )}
          {sessionData?.session && (
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
      <PrinterSettingsDialog open={printerOpen} onOpenChange={setPrinterOpen} />

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
        onPrint={(tx) => requestPrint(tx)}
      />

      {/* Language pick for bilingual orgs */}
      {langPickTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xs rounded-xl bg-white p-6 shadow-xl space-y-4">
            <div className="text-sm font-semibold">Print language</div>
            <p className="text-xs text-gray-500">Choose the language for this receipt.</p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => { const tx = langPickTx; setLangPickTx(null); printReceipt(tx, 'en').catch(() => undefined); }}>
                English
              </Button>
              <Button variant="outline" onClick={() => { const tx = langPickTx; setLangPickTx(null); printReceipt(tx, 'ar').catch(() => undefined); }}>
                العربية
              </Button>
            </div>
            <button onClick={() => setLangPickTx(null)} className="w-full text-center text-xs text-gray-400 hover:text-gray-600">
              Skip printing
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
