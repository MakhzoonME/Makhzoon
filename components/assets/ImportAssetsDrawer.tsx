'use client';
import { useState, useRef, useCallback } from 'react';
import Papa from 'papaparse';
import { useQueryClient } from '@tanstack/react-query';
import { FormDrawer } from '@/components/shared/FormDrawer';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/ui';

function UploadCloudSVG() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden>
      <path d="M12 24a6 6 0 0 1-1-11.9A8 8 0 0 1 26.9 14H28a5 5 0 0 1 1 9.9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M18 20v8M15 23l3-3 3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function FileTextSVG() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M4 2h6l4 4v8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="1.3" fill="none" />
      <path d="M10 2v4h4M5.5 9h5M5.5 11.5h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
function XSVG() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function CheckCircleSVG() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden>
      <circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.3" fill="none" />
      <path d="M4.5 7.5l2.5 2.5 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function AlertCircleSVG() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden>
      <circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.3" fill="none" />
      <path d="M7.5 5v3.5M7.5 10v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
function DownloadSVG() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden>
      <path d="M6.5 2v7M4 6.5l2.5 2.5 2.5-2.5M2 11h9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type Row = Record<string, string>;
type ImportResult = { imported: number; failed: number; errors: { row: number; errors: string[] }[] };

const REQUIRED_COLUMNS = ['name', 'category'];
const TEMPLATE_COLUMNS = ['name', 'category', 'status', 'serialNumber', 'purchaseDate', 'purchaseCost', 'assignedTo', 'location', 'notes'];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportAssetsDrawer({ open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [fileName, setFileName] = useState('');
  const [parseError, setParseError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragging, setDragging] = useState(false);

  function reset() {
    setRows([]);
    setFileName('');
    setParseError('');
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleClose(o: boolean) {
    if (!o) reset();
    onOpenChange(o);
  }

  function parseFile(file: File) {
    setParseError('');
    setResult(null);
    setFileName(file.name);
    Papa.parse<Row>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: (res) => {
        const data = res.data.filter((r) => Object.values(r).some((v) => v && String(v).trim()));
        if (data.length === 0) { setParseError('CSV contains no data rows.'); setRows([]); return; }
        const firstHeaders = Object.keys(data[0]);
        const missing = REQUIRED_COLUMNS.filter((c) => !firstHeaders.includes(c));
        if (missing.length) { setParseError(`Missing required columns: ${missing.join(', ')}`); setRows([]); return; }
        if (data.length > 1000) { setParseError('Maximum 1,000 rows per import.'); setRows([]); return; }
        setRows(data);
      },
      error: (err) => setParseError(err.message),
    });
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith('.csv') || file.type === 'text/csv')) parseFile(file);
  }, []);

  function downloadTemplate() {
    const csv = TEMPLATE_COLUMNS.join(',') + '\n' +
      'MacBook Pro 14,Laptops,Active,SN12345,2024-05-01,2499,Jane Doe,HQ - Floor 3,Assigned to design team';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'assets-template.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport() {
    if (rows.length === 0) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/assets/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Import failed');
      setResult(data);
      qc.invalidateQueries({ queryKey: ['assets'] });
      if (data.imported > 0) toast.success(`Imported ${data.imported} asset${data.imported === 1 ? '' : 's'}`);
      if (data.failed > 0) toast.error(`${data.failed} row${data.failed === 1 ? '' : 's'} failed`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setSubmitting(false);
    }
  }

  const preview = rows.slice(0, 8);
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <FormDrawer open={open} onOpenChange={handleClose} title="Import Assets from CSV" width="xl">
      <div className="space-y-5">
        {/* Format info */}
        <div className="flex items-start gap-3 p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <FileTextSVG />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-indigo-900 mb-0.5">CSV format</p>
            <p className="text-xs text-indigo-700 leading-relaxed">
              Required: <span className="font-mono bg-indigo-100 px-1 rounded">name</span>,{' '}
              <span className="font-mono bg-indigo-100 px-1 rounded">category</span>. Optional: status, serialNumber, purchaseDate (YYYY-MM-DD), purchaseCost, assignedTo, location, notes.
            </p>
            <button onClick={downloadTemplate} className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 mt-2 transition-colors">
              <DownloadSVG /> Download template
            </button>
          </div>
        </div>

        {/* Drop zone / file selected */}
        {!fileName ? (
          <label
            className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl p-10 cursor-pointer transition-colors
              ${dragging ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 bg-gray-50 hover:border-indigo-300 hover:bg-indigo-50/40'}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
          >
            <div className={`rounded-full p-3 transition-colors ${dragging ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'}`}>
              <UploadCloudSVG />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-800">Drop your CSV here, or <span className="text-indigo-600">browse</span></p>
              <p className="text-xs text-gray-400 mt-1">Up to 1,000 rows</p>
            </div>
            <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) parseFile(f); }} />
          </label>
        ) : (
          <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
            <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
              <FileTextSVG />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{fileName}</p>
              {rows.length > 0 && <p className="text-xs text-gray-500">{rows.length} row{rows.length !== 1 ? 's' : ''} ready to import</p>}
            </div>
            <button onClick={reset} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors flex-shrink-0">
              <XSVG />
            </button>
          </div>
        )}

        {/* Parse error */}
        {parseError && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-100 text-red-700 rounded-xl px-4 py-3 text-sm">
            <AlertCircleSVG />
            <span>{parseError}</span>
          </div>
        )}

        {/* Preview table */}
        {rows.length > 0 && !result && (
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Preview</span>
              <span className="text-xs text-gray-400">Showing {preview.length} of {rows.length}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>{headers.map((h) => <th key={h} className="text-left px-3 py-2 font-medium text-gray-500 whitespace-nowrap">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {preview.map((r, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      {headers.map((h) => <td key={h} className="px-3 py-2 text-gray-700 whitespace-nowrap max-w-[180px] truncate">{r[h] || <span className="text-gray-300">—</span>}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={reset}>Clear</Button>
              <Button size="sm" onClick={handleImport} disabled={submitting}>
                {submitting ? 'Importing…' : `Import ${rows.length} asset${rows.length === 1 ? '' : 's'}`}
              </Button>
            </div>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <span className="text-sm font-semibold text-gray-900">Import complete</span>
            </div>
            <div className="px-4 py-4 space-y-3">
              <div className="flex items-center gap-2 text-sm text-emerald-700">
                <CheckCircleSVG />
                <span>{result.imported} asset{result.imported === 1 ? '' : 's'} imported successfully</span>
              </div>
              {result.failed > 0 && (
                <>
                  <div className="flex items-center gap-2 text-sm text-red-700">
                    <AlertCircleSVG />
                    <span>{result.failed} row{result.failed === 1 ? '' : 's'} failed</span>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3 max-h-48 overflow-y-auto border border-red-100">
                    <ul className="space-y-1 text-xs text-red-700">
                      {result.errors.map((e, i) => (
                        <li key={i}><span className="font-medium">Row {e.row}:</span> {e.errors.join(', ')}</li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </div>
            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={reset}>Import another file</Button>
              <Button size="sm" onClick={() => handleClose(false)}>Done</Button>
            </div>
          </div>
        )}
      </div>
    </FormDrawer>
  );
}
