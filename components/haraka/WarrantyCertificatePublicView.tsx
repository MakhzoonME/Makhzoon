'use client';

import { useEffect } from 'react';
import { WarrantyCertificatePreview, type WarrantyCertificateData } from '@/components/haraka/WarrantyCertificatePreview';
import type { ReceiptConfig } from '@/components/settings/receipt/ReceiptPreview';

interface Props {
  data: WarrantyCertificateData;
  orgName: string;
  tagline?: string;
  taxNumber?: string;
  receiptConfig?: ReceiptConfig;
  autoDownload?: boolean;
}

export function WarrantyCertificatePublicView({ data, orgName, tagline, taxNumber, receiptConfig, autoDownload }: Props) {
  useEffect(() => {
    if (autoDownload) {
      const id = setTimeout(() => window.print(), 400);
      return () => clearTimeout(id);
    }
  }, [autoDownload]);

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 16px', gap: 16 }}>
      <div className="print:hidden" style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => window.print()}
          style={{ padding: '8px 18px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 14 }}
        >
          Download / Print PDF
        </button>
      </div>
      <div style={{ boxShadow: '0 4px 24px #0002', borderRadius: 12, overflow: 'hidden' }}>
        <WarrantyCertificatePreview
          data={data}
          orgName={orgName}
          tagline={tagline}
          taxNumber={taxNumber}
          receiptConfig={receiptConfig}
        />
      </div>
    </div>
  );
}
