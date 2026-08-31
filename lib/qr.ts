import QRCode from 'qrcode';

export async function generateAssetQRDataUrl(assetId: string, baseUrl: string, fullUrl?: string): Promise<string> {
  const url = fullUrl ?? assetUrl(assetId, baseUrl);
  return QRCode.toDataURL(url, {
    width: 512,
    margin: 1,
    color: { dark: '#111827', light: '#ffffff' },
    errorCorrectionLevel: 'M',
  });
}

/** Public guest-view URL — scanning the QR opens a read-only page with no login required. */
export function assetUrl(assetId: string, baseUrl: string, locale = 'en', orgSlug?: string, space?: string): string {
  const base = baseUrl.replace(/\/$/, '');
  if (orgSlug && space) return `${base}/${locale}/asset/${orgSlug}/${space}/${assetId}`;
  return `${base}/${locale}/asset/${assetId}`;
}

// QR encodes the raw acceptance URL — scanners open it directly in a browser.
export async function generateInviteQRDataUrl(acceptUrl: string): Promise<string> {
  return QRCode.toDataURL(acceptUrl, {
    width: 320,
    margin: 1,
    color: { dark: '#111827', light: '#ffffff' },
    errorCorrectionLevel: 'H',
  });
}

// ── Document QR (receipts + invoices) ──────────────────────────────────────
//
// Every printable document can carry a QR code, and the org picks per document
// type WHAT that QR encodes:
//
//   'none'       — no QR at all (the default; nothing changes for existing orgs)
//   'link'       — the public URL of this very document, so a customer scans the
//                  paper and lands on the live receipt/invoice page
//   'compliance' — the payload handed back by a national e-invoicing system
//                  (Jordan's Fawtara/JoFotara and friends)
//
// The 'compliance' payload is produced by a `ComplianceAdapter` in
// `lib/compliance/` — a folder that is deliberately dormant: the registry is
// empty and every flag defaults to false, so `compliancePayload` is null on
// every document today. Rather than print a blank square, 'compliance' falls
// back to the document link; the QR always scans to something real. That
// matches the compliance layer's own "fail soft, never block checkout" rule.
//
// Note the payload is passed IN rather than fetched here. Core POS/invoice code
// must not import `lib/compliance` (see the header of lib/compliance/index.ts);
// when an adapter is finally registered, the document loader that already reads
// the row is the one place that learns to read the stored payload too.

export type DocumentQrSource = 'none' | 'link' | 'compliance';

/**
 * What a 'link' QR actually points at. Only receipts/invoices offer all
 * three in their settings UI — reports and warranty certs are locked to
 * 'self' since they have no "physical original" a custom link/file makes
 * sense for.
 *
 *   'self'          — this document's own public/soft-copy page (default)
 *   'custom-link'    — one fixed URL the org sets for this document type
 *                      (e.g. a menu, a promo page), same for every document
 *                      of that type
 *   'uploaded-file'  — a file the org uploaded (PDF/image), opened directly
 */
export type DocumentQrTarget = 'self' | 'custom-link' | 'uploaded-file';

/** Where the QR prints on an A4-style document (reports, invoices, warranty certs). */
export type QrPositionA4 = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

/** Where the QR prints on a thermal (58mm/80mm) receipt — a linear top-to-bottom layout. */
export type QrPositionThermal = 'top' | 'bottom';

/** QR fields embedded into each document type's own config blob. */
export interface DocumentQrConfig {
  qrSource: DocumentQrSource;
  qrTarget: DocumentQrTarget;
  /** Set when qrTarget === 'custom-link'. */
  qrCustomLink: string | null;
  /** Set when qrTarget === 'uploaded-file' — public storage URL. */
  qrUploadedFileUrl: string | null;
  qrPositionA4: QrPositionA4;
  qrPositionThermal: QrPositionThermal;
  /** Optional line printed under the QR ("Scan for your receipt"). */
  qrCaption: string;
}

export const DEFAULT_DOCUMENT_QR: DocumentQrConfig = {
  qrSource: 'none',
  qrTarget: 'self',
  qrCustomLink: null,
  qrUploadedFileUrl: null,
  qrPositionA4: 'bottom-right',
  qrPositionThermal: 'bottom',
  qrCaption: '',
};

/** Documents that can carry a QR, and where their public copy lives. */
export type DocumentKind =
  | 'pos-receipt'
  | 'order'
  | 'service-job'
  | 'appointment'
  | 'report'
  | 'warranty-cert';

const DOCUMENT_PATH: Record<DocumentKind, (orgSlug: string, id: string) => string> = {
  'pos-receipt':   (org, id) => `/r/${org}/${id}`,
  'order':         (org, id) => `/inv/${org}/${id}`,
  'service-job':   (org, id) => `/service-job-invoice/${org}/${id}`,
  'appointment':   (org, id) => `/appointment-invoice/${org}/${id}`,
  'report':        (org, id) => `/r/${org}/reports/${id}`,
  'warranty-cert': (org, id) => `/w/${org}/cert/${id}`,
};

/** Document kinds whose settings UI only offers qrTarget 'self' (no physical original to redirect elsewhere). */
export const QR_TARGET_LOCKED_KINDS: ReadonlySet<DocumentKind> = new Set(['report', 'warranty-cert']);

/**
 * Public, unauthenticated URL of a document — the same link the share dialogs
 * copy. `baseUrl` is the receipt host for the current environment
 * (`getDocBaseUrl()` in the browser, `publicDocumentBaseUrl()` on the
 * server), so a QR printed on dev never points customers at production.
 *
 * `search` carries the variant a route needs to render the right document —
 * `?type=receipt` on /inv, which otherwise defaults to the invoice.
 */
export function documentPublicUrl(
  kind: DocumentKind,
  orgSlug: string,
  id: string,
  baseUrl: string,
  search = '',
): string {
  return `${baseUrl.replace(/\/$/, '')}${DOCUMENT_PATH[kind](orgSlug, id)}${search}`;
}

export interface ResolvedDocumentQr {
  payload: string;
  /** What the payload actually is — 'compliance' only when one was supplied. */
  source: Exclude<DocumentQrSource, 'none'>;
  caption: string;
}

/**
 * Decide what this document's QR should encode, or null to print none.
 * Pure — safe to call during render.
 *
 * `opts.documentUrl` is this specific document's own soft-copy link (what
 * qrTarget 'self' encodes). 'custom-link' and 'uploaded-file' ignore it and
 * read their static value straight off the config instead, since both are
 * the same for every document of that type rather than per-document.
 */
export function resolveDocumentQr(
  config: Partial<DocumentQrConfig> | undefined,
  opts: { documentUrl?: string | null; compliancePayload?: string | null },
): ResolvedDocumentQr | null {
  const source = config?.qrSource ?? DEFAULT_DOCUMENT_QR.qrSource;
  if (source === 'none') return null;

  const caption = (config?.qrCaption ?? '').trim();
  const gov = opts.compliancePayload?.trim() || null;

  if (source === 'compliance' && gov) return { payload: gov, source: 'compliance', caption };

  // 'link', or 'compliance' with no adapter registered yet — both fall back to a link target.
  const target = config?.qrTarget ?? DEFAULT_DOCUMENT_QR.qrTarget;
  const link =
    target === 'custom-link' ? config?.qrCustomLink?.trim() || null :
    target === 'uploaded-file' ? config?.qrUploadedFileUrl?.trim() || null :
    opts.documentUrl?.trim() || null;

  return link ? { payload: link, source: 'link', caption } : null;
}

/**
 * Synchronous QR matrix — `true` = dark module. Sync matters: the A4 documents
 * render it as inline SVG during a plain React render (so html-to-image and
 * window.print() never race an async data URL), and the thermal renderer paints
 * the same modules straight onto its 1-bit canvas.
 */
export function qrMatrix(
  payload: string,
  errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H' = 'M',
): boolean[][] {
  const { modules } = QRCode.create(payload, { errorCorrectionLevel });
  const { size, data } = modules;
  const out: boolean[][] = [];
  for (let y = 0; y < size; y++) {
    const row: boolean[] = new Array(size);
    for (let x = 0; x < size; x++) row[x] = data[y * size + x] === 1;
    out.push(row);
  }
  return out;
}
