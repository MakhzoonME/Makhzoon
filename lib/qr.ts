import QRCode from 'qrcode';

export async function generateAssetQRDataUrl(assetId: string, baseUrl: string): Promise<string> {
  const url = `${baseUrl.replace(/\/$/, '')}/assets/${assetId}`;
  return QRCode.toDataURL(url, {
    width: 512,
    margin: 1,
    color: { dark: '#111827', light: '#ffffff' },
    errorCorrectionLevel: 'M',
  });
}

export function assetUrl(assetId: string, baseUrl: string): string {
  return `${baseUrl.replace(/\/$/, '')}/assets/${assetId}`;
}
