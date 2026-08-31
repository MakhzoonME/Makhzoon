import { describe, it, expect } from 'vitest';
import {
  resolveDocumentQr,
  documentPublicUrl,
  qrMatrix,
  DEFAULT_DOCUMENT_QR,
} from '@/lib/qr';

const BASE = 'https://doc-dev.makhzoon.me';
const ID = '00000000-0000-0000-0000-000000000000';

describe('documentPublicUrl', () => {
  it('maps each document kind to its public route', () => {
    expect(documentPublicUrl('pos-receipt', 'acme', ID, BASE)).toBe(`${BASE}/r/acme/${ID}`);
    expect(documentPublicUrl('order', 'acme', ID, BASE)).toBe(`${BASE}/inv/acme/${ID}`);
    expect(documentPublicUrl('service-job', 'acme', ID, BASE)).toBe(`${BASE}/service-job-invoice/acme/${ID}`);
    expect(documentPublicUrl('appointment', 'acme', ID, BASE)).toBe(`${BASE}/appointment-invoice/acme/${ID}`);
  });

  it('keeps the variant query, so a scanned receipt reopens as a receipt', () => {
    expect(documentPublicUrl('order', 'acme', ID, BASE, '?type=receipt'))
      .toBe(`${BASE}/inv/acme/${ID}?type=receipt`);
  });

  it('tolerates a base url with a trailing slash', () => {
    expect(documentPublicUrl('pos-receipt', 'acme', ID, `${BASE}/`)).toBe(`${BASE}/r/acme/${ID}`);
  });
});

describe('resolveDocumentQr', () => {
  const url = `${BASE}/r/acme/${ID}`;

  it('prints nothing by default', () => {
    expect(DEFAULT_DOCUMENT_QR.qrSource).toBe('none');
    expect(resolveDocumentQr(undefined, { documentUrl: url })).toBeNull();
    expect(resolveDocumentQr({ qrSource: 'none' }, { documentUrl: url })).toBeNull();
  });

  it('encodes the document link in link mode', () => {
    expect(resolveDocumentQr({ qrSource: 'link' }, { documentUrl: url }))
      .toEqual({ payload: url, source: 'link', caption: '' });
  });

  it('prefers the compliance payload when one exists', () => {
    const gov = '01020304';
    expect(resolveDocumentQr({ qrSource: 'compliance' }, { documentUrl: url, compliancePayload: gov }))
      .toEqual({ payload: gov, source: 'compliance', caption: '' });
  });

  it('falls back to the document link when no adapter produced a payload', () => {
    // The state of the world today: the compliance registry is empty, so every
    // document in 'compliance' mode still gets a QR that scans to something.
    expect(resolveDocumentQr({ qrSource: 'compliance' }, { documentUrl: url }))
      .toEqual({ payload: url, source: 'link', caption: '' });
    expect(resolveDocumentQr({ qrSource: 'compliance' }, { documentUrl: url, compliancePayload: '  ' }))
      .toEqual({ payload: url, source: 'link', caption: '' });
  });

  it('prints nothing rather than an empty QR when there is no url to encode', () => {
    expect(resolveDocumentQr({ qrSource: 'link' }, { documentUrl: null })).toBeNull();
    expect(resolveDocumentQr({ qrSource: 'link' }, { documentUrl: '   ' })).toBeNull();
    expect(resolveDocumentQr({ qrSource: 'compliance' }, {})).toBeNull();
  });

  it('carries the caption through, trimmed', () => {
    expect(resolveDocumentQr({ qrSource: 'link', qrCaption: '  Scan me  ' }, { documentUrl: url })?.caption)
      .toBe('Scan me');
  });
});

describe('qrMatrix', () => {
  it('returns a square matrix with the three finder patterns', () => {
    const m = qrMatrix(`${BASE}/r/acme/${ID}`);
    expect(m.length).toBeGreaterThan(0);
    expect(m.every((row) => row.length === m.length)).toBe(true);

    // A finder pattern is a 7x7 ring: solid border, light gap, 3x3 solid core.
    const finderAt = (oy: number, ox: number) => {
      for (let y = 0; y < 7; y++) {
        for (let x = 0; x < 7; x++) {
          const ring = y === 0 || y === 6 || x === 0 || x === 6;
          const core = y >= 2 && y <= 4 && x >= 2 && x <= 4;
          if (m[oy + y][ox + x] !== (ring || core)) return false;
        }
      }
      return true;
    };
    const n = m.length;
    expect(finderAt(0, 0)).toBe(true);
    expect(finderAt(0, n - 7)).toBe(true);
    expect(finderAt(n - 7, 0)).toBe(true);
  });

  it('stays coarse enough to print on a 58mm roll', () => {
    // 384 printable dots at 203dpi. The thermal renderer floors the module size
    // to whole dots; below ~3 dots (~0.37mm) a phone camera stops resolving it.
    const m = qrMatrix(`${BASE}/r/acme/${ID}`);
    const span = m.length + 4; // two-module cushion each side
    const module = Math.floor(Math.min(384 * 0.55, 190) / span);
    expect(module).toBeGreaterThanOrEqual(3);
  });
});
