'use client';

import { useQuery } from '@tanstack/react-query';
import type { ReceiptConfig } from '@/components/settings/receipt/ReceiptPreview';
import { DEFAULT_RECEIPT_CONFIG } from '@/lib/receipts/receipt-config';
import {
  DEFAULT_ORDER_DOCUMENT_CONFIG, type OrderDocumentConfig,
} from '@/lib/modules/haraka/orders/order-document-config';
import {
  DEFAULT_SERVICE_JOB_DOCUMENT_CONFIG, type ServiceJobDocumentConfig,
} from '@/lib/modules/haraka/service-jobs/service-job-document-config';
import {
  DEFAULT_APPOINTMENT_DOCUMENT_CONFIG, type AppointmentDocumentConfig,
} from '@/lib/modules/haraka/appointments/appointment-document-config';
import {
  DEFAULT_REPORT_DOCUMENT_CONFIG, type ReportDocumentConfig,
} from '@/lib/modules/document-reports/report-document-config';

/**
 * The saved org config behind each printable document.
 *
 * The in-app invoice dialogs used to render their preview from the DEFAULT_*
 * constants, so an org that had customized its invoice title, or turned on the
 * document QR, saw none of that until the document was opened on its public
 * page. These hooks close that gap: dialog, public page, and printed paper all
 * read the same saved config.
 *
 * Every one of them fails soft to the defaults — a preview is never worth
 * blocking on, and the public page is the authority either way.
 */

const STALE = 60_000;

async function fetchConfig<T>(url: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(url);
    if (!res.ok) return fallback;
    const data = await res.json();
    return data && typeof data === 'object' ? { ...fallback, ...data } : fallback;
  } catch {
    return fallback;
  }
}

/** Org receipt branding + config. Shares the ['receipt-config'] cache key. */
export function useReceiptConfig() {
  const query = useQuery<{ tagline?: string; taglineAr?: string; taxNumber?: string; config?: ReceiptConfig }>({
    queryKey: ['receipt-config'],
    queryFn: async () => {
      const res = await fetch('/api/organizations/receipt-config');
      return res.ok ? res.json() : {};
    },
    staleTime: STALE,
  });

  return {
    receiptConfig: query.data?.config
      ? { ...DEFAULT_RECEIPT_CONFIG, ...query.data.config }
      : DEFAULT_RECEIPT_CONFIG,
    tagline: query.data?.tagline ?? '',
    taglineAr: query.data?.taglineAr ?? '',
    taxNumber: query.data?.taxNumber ?? '',
  };
}

export function useOrderDocumentConfig(): OrderDocumentConfig {
  const { data } = useQuery({
    queryKey: ['order-document-config'],
    queryFn: () => fetchConfig('/api/organizations/order-document-config', DEFAULT_ORDER_DOCUMENT_CONFIG),
    staleTime: STALE,
  });
  return data ?? DEFAULT_ORDER_DOCUMENT_CONFIG;
}

export function useServiceJobDocumentConfig(): ServiceJobDocumentConfig {
  const { data } = useQuery({
    queryKey: ['service-job-document-config'],
    queryFn: () => fetchConfig('/api/organizations/service-job-document-config', DEFAULT_SERVICE_JOB_DOCUMENT_CONFIG),
    staleTime: STALE,
  });
  return data ?? DEFAULT_SERVICE_JOB_DOCUMENT_CONFIG;
}

export function useAppointmentDocumentConfig(): AppointmentDocumentConfig {
  const { data } = useQuery({
    queryKey: ['appointment-document-config'],
    queryFn: () => fetchConfig('/api/organizations/appointment-document-config', DEFAULT_APPOINTMENT_DOCUMENT_CONFIG),
    staleTime: STALE,
  });
  return data ?? DEFAULT_APPOINTMENT_DOCUMENT_CONFIG;
}

/** Generated-report QR/logo appearance. Cross-vertical, same as the module itself. */
export function useReportDocumentConfig(): ReportDocumentConfig {
  const { data } = useQuery({
    queryKey: ['report-document-config'],
    queryFn: () => fetchConfig('/api/organizations/report-document-config', DEFAULT_REPORT_DOCUMENT_CONFIG),
    staleTime: STALE,
  });
  return data ?? DEFAULT_REPORT_DOCUMENT_CONFIG;
}
