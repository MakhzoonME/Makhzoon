import QRCode from 'qrcode';

export async function generateAssetQRDataUrl(assetId: string, baseUrl: string, fullUrl?: string): Promise<string> {
  const url = fullUrl ?? `${baseUrl.replace(/\/$/, '')}/usool/${assetId}`;
  return QRCode.toDataURL(url, {
    width: 512,
    margin: 1,
    color: { dark: '#111827', light: '#ffffff' },
    errorCorrectionLevel: 'M',
  });
}

export function assetUrl(assetId: string, baseUrl: string): string {
  return `${baseUrl.replace(/\/$/, '')}/usool/${assetId}`;
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
