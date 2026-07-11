/* eslint-disable @next/next/no-img-element */
'use client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
function QrCodeSVG() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="1.5" y="1.5" width="5" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.3" fill="none" />
      <rect x="3" y="3" width="2" height="2" fill="currentColor" />
      <rect x="9.5" y="1.5" width="5" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.3" fill="none" />
      <rect x="11" y="3" width="2" height="2" fill="currentColor" />
      <rect x="1.5" y="9.5" width="5" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.3" fill="none" />
      <rect x="3" y="11" width="2" height="2" fill="currentColor" />
      <path d="M9.5 9.5h2M9.5 11.5h1.5M11.5 11.5v1M11.5 13h3M9.5 13v1.5M13 9.5v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
function DownloadSVG() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M7 2v7M4.5 6.5l2.5 2.5 2.5-2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 11h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
function PrinterSVG() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M3.5 4V1.5h7V4M1.5 9.5h11V4h-11v5.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" fill="none" />
      <path d="M3.5 12.5h7v-4h-7v4z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

type QRResponse = { dataUrl: string; url: string };

export function AssetQRCard({ assetId, assetName, orgSlug, locale, space = 'default' }: { assetId: string; assetName: string; orgSlug: string; locale: string; space?: string }) {
  const { data, isLoading } = useQuery<QRResponse>({
    queryKey: ['asset-qr', assetId, orgSlug, locale, space],
    queryFn: async () => {
      const origin = window.location.origin;
      // QR opens a public, read-only guest view — no login required.
      const guestViewUrl = `${origin}/${locale}/asset/${orgSlug}/${space}/${assetId}`;
      const res = await fetch(`/api/assets/${assetId}/qr?url=${encodeURIComponent(guestViewUrl)}`);
      if (!res.ok) throw new Error('Failed to generate QR');
      return res.json();
    },
    staleTime: 10 * 60_000,
  });

  function handleDownload() {
    if (!data?.dataUrl) return;
    const a = document.createElement('a');
    a.href = data.dataUrl;
    a.download = `qr-${assetName.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png`;
    a.click();
  }

  function handlePrint() {
    if (!data?.dataUrl) return;
    const win = window.open('', '_blank', 'width=400,height=500');
    if (!win) return;
    const doc = win.document;
    doc.title = `QR label — ${assetName}`;
    const style = doc.createElement('style');
    style.textContent = `body { font-family: system-ui, -apple-system, sans-serif; display: flex; flex-direction: column; align-items: center; padding: 24px; margin: 0; }
      .label { border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; text-align: center; max-width: 280px; }
      img { width: 240px; height: 240px; display: block; margin: 0 auto 12px; }
      h1 { font-size: 14px; margin: 0 0 4px; color: #111827; }
      p { font-size: 11px; color: #6b7280; margin: 0; word-break: break-all; }
      @media print { body { padding: 0; } .label { border: none; } }`;
    doc.head.appendChild(style);
    const label = doc.createElement('div');
    label.className = 'label';
    const img = doc.createElement('img');
    img.src = data.dataUrl;
    img.alt = 'QR';
    label.appendChild(img);
    const h1 = doc.createElement('h1');
    h1.textContent = assetName;
    label.appendChild(h1);
    const p = doc.createElement('p');
    p.textContent = data.url;
    label.appendChild(p);
    doc.body.appendChild(label);
    const script = doc.createElement('script');
    script.textContent = 'window.onload = () => window.print();';
    doc.body.appendChild(script);
    doc.close();
  }

  return (
    <div className="bg-surface-card rounded-xl border border-border overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center gap-2">
        <QrCodeSVG />
        <h2 className="text-sm font-semibold text-gray-900">QR label</h2>
      </div>
      <div className="px-5 py-4 flex flex-col items-center">
        {isLoading || !data ? (
          <div className="h-40 w-40 bg-surface-page rounded-lg animate-pulse" />
        ) : (
          <>
            <div className="p-3 bg-surface-card border border-border rounded-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={data.dataUrl} alt={`QR code for ${assetName}`} className="h-36 w-36" />
            </div>
            <p className="text-[11px] text-gray-500 mt-2 text-center break-all max-w-full">{data.url}</p>
            <div className="flex gap-2 mt-3">
              <Button size="sm" variant="outline" onClick={handleDownload}>
                <DownloadSVG /> <span className="ms-1">Download</span>
              </Button>
              <Button size="sm" variant="outline" onClick={handlePrint}>
                <PrinterSVG /> <span className="ms-1">Print</span>
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
