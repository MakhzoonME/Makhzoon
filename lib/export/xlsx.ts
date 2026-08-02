import 'server-only';
import ExcelJS from 'exceljs';
import { NextResponse } from 'next/server';

export interface ExportColumn {
  header: string;
  key: string;
  width?: number;
}

/**
 * Build an .xlsx workbook buffer from column definitions + row objects.
 * Reusable by any export endpoint.
 */
export async function buildXlsx(
  sheetName: string,
  columns: ExportColumn[],
  rows: Record<string, unknown>[],
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Makhzoon';
  wb.created = new Date();
  const ws = wb.addWorksheet(sheetName.slice(0, 31) || 'Sheet1');

  ws.columns = columns.map((c) => ({
    header: c.header,
    key: c.key,
    width: c.width ?? Math.min(50, Math.max(12, c.header.length + 4)),
  }));

  for (const row of rows) {
    // Normalise: exceljs writes objects/arrays poorly — stringify them.
    const clean: Record<string, unknown> = {};
    for (const c of columns) {
      const v = row[c.key];
      clean[c.key] = v !== null && typeof v === 'object' ? JSON.stringify(v) : v ?? '';
    }
    ws.addRow(clean);
  }

  const header = ws.getRow(1);
  header.font = { bold: true };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/** Return an .xlsx file as a downloadable response. */
export function xlsxResponse(buffer: Buffer, filename: string): NextResponse {
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
