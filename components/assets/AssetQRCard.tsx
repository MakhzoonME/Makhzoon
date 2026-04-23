'use client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { QrCode, Download, Printer } from 'lucide-react';

type QRResponse = { dataUrl: string; url: string };

export function AssetQRCard({ assetId, assetName }: { assetId: string; assetName: string }) {
  const { data, isLoading } = useQuery<QRResponse>({
    queryKey: ['asset-qr', assetId],
    queryFn: async () => {
      const res = await fetch(`/api/assets/${assetId}/qr`);
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
    win.document.write(`
      <html>
        <head>
          <title>QR label — ${assetName}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; display: flex; flex-direction: column; align-items: center; padding: 24px; margin: 0; }
            .label { border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; text-align: center; max-width: 280px; }
            img { width: 240px; height: 240px; display: block; margin: 0 auto 12px; }
            h1 { font-size: 14px; margin: 0 0 4px; color: #111827; }
            p { font-size: 11px; color: #6b7280; margin: 0; word-break: break-all; }
            @media print { body { padding: 0; } .label { border: none; } }
          </style>
        </head>
        <body>
          <div class="label">
            <img src="${data.dataUrl}" alt="QR" />
            <h1>${assetName}</h1>
            <p>${data.url}</p>
          </div>
          <script>window.onload = () => window.print();</script>
        </body>
      </html>
    `);
    win.document.close();
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-200 flex items-center gap-2">
        <QrCode className="h-4 w-4 text-gray-400" />
        <h2 className="text-sm font-semibold text-gray-900">QR label</h2>
      </div>
      <div className="px-5 py-4 flex flex-col items-center">
        {isLoading || !data ? (
          <div className="h-40 w-40 bg-gray-100 rounded-lg animate-pulse" />
        ) : (
          <>
            <div className="p-3 bg-white border border-gray-200 rounded-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={data.dataUrl} alt={`QR code for ${assetName}`} className="h-36 w-36" />
            </div>
            <p className="text-[11px] text-gray-500 mt-2 text-center break-all max-w-full">{data.url}</p>
            <div className="flex gap-2 mt-3">
              <Button size="sm" variant="outline" onClick={handleDownload}>
                <Download className="h-3.5 w-3.5 mr-1" /> Download
              </Button>
              <Button size="sm" variant="outline" onClick={handlePrint}>
                <Printer className="h-3.5 w-3.5 mr-1" /> Print
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
