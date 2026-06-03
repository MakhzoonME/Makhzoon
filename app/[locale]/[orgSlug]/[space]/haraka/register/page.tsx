'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Printer, Lock, Receipt } from 'lucide-react';
import { PageHeader, BarcodeInput, SubscriptionGate } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { ProductGrid } from '@/components/haraka/ProductGrid';
import { Cart } from '@/components/haraka/Cart';
import { CustomerPicker } from '@/components/haraka/CustomerPicker';
import { PaymentDialog, type PaymentLine } from '@/components/haraka/PaymentDialog';
import { PrinterSettingsDialog } from '@/components/haraka/PrinterSettingsDialog';
import { ReceiptShareDialog } from '@/components/haraka/ReceiptShareDialog';
import { usePosCart } from '@/store/pos-cart.store';
import { useBarcodeLookup } from '@/hooks/inventory';
import { useTaxRates, useCurrentSession, useCompleteSale } from '@/hooks/haraka';
import { useAuthStore } from '@/store/auth.store';
import { priceCart } from '@/lib/modules/haraka/pricing/calc';
import { toast, useT } from '@/hooks/ui';
import { useOrgInfo } from '@/hooks/org';
import { printRaw } from '@/lib/modules/haraka/printing/webusb-transport';
import { buildReceipt } from '@/lib/modules/haraka/printing/receipt-template';
import type { ReceiptPrintText } from '@/lib/modules/haraka/printing/receipt-canvas';
import type { ReceiptConfig } from '@/components/settings/receipt/ReceiptPreview';
import { DEFAULT_RECEIPT_CONFIG } from '@/lib/receipts/receipt-config';
import type { ReceiptLang } from '@/lib/receipts/labels';
import { getReceiptBaseUrl } from '@/lib/app-env';
import { useQuery } from '@tanstack/react-query';
import type { InventoryItem, PosTransaction } from '@/types';

/**
 * Register — the cashier's main workspace.
 *
 *   ┌────────────────────────┬───────────────────┐
 *   │ Barcode scan input     │  Cart             │
 *   │ Product grid           │  Totals           │
 *   │                        │  [Charge button]  │
 *   └────────────────────────┴───────────────────┘
 *
 * Barcode scanning auto-adds to the cart. Charge opens the PaymentDialog
 * (split payments). On success, the cart clears, the receipt prints via
 * ESC/POS (if a printer is paired), and Fawtara submission fires async.
 */
export default function RegisterPage() {
  const router = useRouter();
  const params = useParams<{ locale: string; orgSlug: string; space: string }>();
  const { t } = useT();
  const { data: orgInfo } = useOrgInfo();
  const { user } = useAuthStore();
  const { data: sessionData, isLoading: sessionLoading, isFetched: sessionFetched } = useCurrentSession();
  const { data: taxData } = useTaxRates();
  const { lookup } = useBarcodeLookup();

  const lines = usePosCart((s) => s.lines);
  const customer = usePosCart((s) => s.customer);
  const addItem = usePosCart((s) => s.addItem);
  const clearCart = usePosCart((s) => s.clear);

  const completeMut = useCompleteSale();

  const [payOpen, setPayOpen] = useState(false);
  const [printerOpen, setPrinterOpen] = useState(false);
  const [lastTx, setLastTx] = useState<PosTransaction | null>(null);
  // When the org issues in both languages, the cashier picks per print.
  const [langPickTx, setLangPickTx] = useState<PosTransaction | null>(null);
  // Post-sale receipt: cashier sees it and can share / download / reprint.
  const [receiptTx, setReceiptTx] = useState<PosTransaction | null>(null);
  // Resolved after mount so the share link uses the current env's receipt host.
  const [receiptBase] = useState(() => getReceiptBaseUrl());

  // Org receipt branding/config — drives the printed receipt's content + language.
  const { data: receiptCfg } = useQuery<{ tagline?: string; taglineAr?: string; taxNumber?: string; config?: ReceiptConfig }>({
    queryKey: ['receipt-config'],
    queryFn: async () => {
      const res = await fetch('/api/organizations/receipt-config');
      return res.ok ? res.json() : {};
    },
    staleTime: 60_000,
  });

  // No session → bounce back to the landing page so the cashier opens one.
  // Only redirect once the query has completed at least one fetch to avoid
  // bouncing while the freshly-created session is still being refetched.
  useEffect(() => {
    if (sessionFetched && !sessionLoading && !sessionData?.session) {
      router.replace(`/${params.locale}/${params.orgSlug}/${params.space}/haraka`);
    }
  }, [sessionFetched, sessionLoading, sessionData?.session, router, params.locale, params.orgSlug]);

  const taxRateById = useCallback(
    (id: string | null | undefined): number => {
      if (!id) return 0;
      const tr = taxData?.taxRates.find((r) => r.id === id);
      return tr?.rate ?? 0;
    },
    [taxData],
  );

  function pickItem(item: InventoryItem) {
    const rate = taxRateById(item.taxRateId);
    addItem(item, rate);
  }

  const handleScan = useCallback(
    async (code: string) => {
      const result = await lookup(code);
      if (result.found) {
        if (!result.item.posEnabled) {
          toast.error(`${result.item.name} isn't enabled for POS`);
          return;
        }
        if (result.item.quantityOnHand <= 0) {
          toast.error(`${result.item.name} is out of stock`);
          return;
        }
        pickItem(result.item);
      } else {
        toast.error('Item not found');
      }
    },
    [lookup, taxRateById], // pickItem depends on these via taxRateById/addItem
  );

  async function handleConfirmSale(payments: PaymentLine[]) {
    if (!sessionData?.session) {
      toast.error('No open session');
      return;
    }
    const offlineId = crypto.randomUUID();
    try {
      const result = await completeMut.mutateAsync({
        sessionId: sessionData.session.id,
        offlineId,
        customerId: customer?.id ?? null,
        customerName: customer?.name ?? null,
        lines: lines.map((l) => ({
          itemId: l.itemId,
          itemName: l.itemName,
          sku: l.sku,
          barcode: l.barcode,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          taxRateId: l.taxRateId,
          taxRate: l.taxRate,
          discount: l.discount,
        })),
        payments: payments.map((p) => ({
          method: p.method,
          amount: p.amount,
          reference: null,
          cardLast4: p.cardLast4 || null,
        })),
      });
      setLastTx(result.transaction);
      setPayOpen(false);
      clearCart();
      toast.success(`Sale complete — receipt ${result.transaction.receiptNumber}`);

      // Show the receipt so the cashier can share / download / reprint it.
      setReceiptTx(result.transaction);

      // Print receipt async; failures don't roll back the sale.
      requestPrint(result.transaction);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sale failed');
    }
  }

  /** Decide how to print: "both" asks the cashier for a language, else prints directly. */
  function requestPrint(transaction: PosTransaction) {
    if ((receiptCfg?.config?.language ?? 'en') === 'both') {
      setLangPickTx(transaction);
    } else {
      const lang: ReceiptLang = receiptCfg?.config?.language === 'ar' ? 'ar' : 'en';
      printReceipt(transaction, lang).catch(() => undefined);
    }
  }

  /** Build the localized, bilingual content the printer needs from the org config. */
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
        organization: {
          id: user?.organizationId ?? '',
          name: orgInfo?.name ?? '',
          contactEmail: user?.email ?? '',
        },
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

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col">
      <PageHeader
        title={t('register.title')}
        description={sessionData?.session ? t('register.sessionLabel').replace('{id}', sessionData.session.id.slice(0, 8)) : ''}
        breadcrumb={[
          { label: orgInfo?.name ?? params.orgSlug },
          { label: params.space },
          { label: t('nav.pos'), href: `/${params.locale}/${params.orgSlug}/${params.space}/haraka` },
          { label: t('register.title') },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPrinterOpen(true)}>
              <Printer size={14} className="me-1" /> {t('register.printer')}
            </Button>
            {lastTx && (
              <Button variant="outline" size="sm" onClick={() => requestPrint(lastTx)}>
                <Receipt size={14} className="me-1" /> {t('register.reprintLast')}
              </Button>
            )}
            {sessionData?.session && (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  router.push(
                    `/${params.locale}/${params.orgSlug}/${params.space}/haraka/sessions/${sessionData.session!.id}`,
                  )
                }
              >
                <Lock size={14} className="me-1" /> {t('register.closeSession')}
              </Button>
            )}
          </div>
        }
      />

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4 px-6 pb-6 min-h-0">
        {/* Left: scanner + product grid */}
        <div className="flex flex-col gap-3 min-h-0">
          <BarcodeInput
            onResolve={handleScan}
            placeholder={t('register.scanPlaceholder')}
            autoFocus
          />
          <ProductGrid onPick={pickItem} />
        </div>

        {/* Right: cart */}
        <aside className="border border-border rounded-xl bg-surface-page p-4 flex flex-col min-h-0">
          <CustomerPicker />
          <div className="flex items-center justify-between mt-3 mb-2">
            <span className="text-sm font-medium">{t('register.cart')} ({lines.length})</span>
            {!customer && lines.length === 0 && (
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <span>👤</span> Walk-in
              </span>
            )}
          </div>
          <Cart />

          <SubscriptionGate className="mt-3 block">
            <Button
              size="lg"
              className="w-full"
              style={lines.length > 0 ? { background: 'var(--mod-haraka)' } : undefined}
              disabled={lines.length === 0 || completeMut.isPending}
              onClick={() => setPayOpen(true)}
            >
              {t('register.charge')} JOD {totals.total.toFixed(2)}
            </Button>
          </SubscriptionGate>
        </aside>
      </div>

      <PaymentDialog
        open={payOpen}
        onOpenChange={setPayOpen}
        total={totals.total}
        onConfirm={handleConfirmSale}
        loading={completeMut.isPending}
      />
      <PrinterSettingsDialog open={printerOpen} onOpenChange={setPrinterOpen} />

      {/* Post-sale receipt — share, download, or reprint */}
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

      {/* Cashier language pick — only when the org issues receipts in both languages */}
      {langPickTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xs rounded-xl bg-white p-5 shadow-xl">
            <div className="text-sm font-semibold text-gray-900">Print language</div>
            <p className="mt-1 text-xs text-gray-500">Choose the language for this receipt.</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={() => { const tx = langPickTx; setLangPickTx(null); printReceipt(tx, 'en').catch(() => undefined); }}
              >
                English
              </Button>
              <Button
                variant="outline"
                onClick={() => { const tx = langPickTx; setLangPickTx(null); printReceipt(tx, 'ar').catch(() => undefined); }}
              >
                العربية
              </Button>
            </div>
            <button
              onClick={() => setLangPickTx(null)}
              className="mt-3 w-full text-center text-xs text-gray-400 hover:text-gray-600"
            >
              Skip printing
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
