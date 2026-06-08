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
