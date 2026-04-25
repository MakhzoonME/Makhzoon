'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useOrgSlug } from '@/hooks/useOrgSlug';
import Papa from 'papaparse';
import { useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/useToast';
import { Upload, FileText, AlertCircle, CheckCircle2, X } from 'lucide-react';

type Row = Record<string, string>;
type ImportResult = { imported: number; failed: number; errors: { row: number; errors: string[] }[] };

const REQUIRED_COLUMNS = ['name', 'category'];
const TEMPLATE_COLUMNS = ['name', 'category', 'status', 'serialNumber', 'purchaseDate', 'purchaseCost', 'assignedTo', 'location', 'notes'];

export default function ImportAssetsPage() {
  const router = useRouter();
  const orgSlug = useOrgSlug();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [fileName, setFileName] = useState('');
  const [parseError, setParseError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  function reset() {
    setRows([]);
    setFileName('');
    setParseError('');
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleFile(file: File) {
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
        if (data.length > 1000) { setParseError('Maximum 1000 rows per import.'); setRows([]); return; }
        setRows(data);
      },
      error: (err) => setParseError(err.message),
    });
  }

  function downloadTemplate() {
    const csv = TEMPLATE_COLUMNS.join(',') + '\n' +
      'MacBook Pro 14,Laptops,Active,SN12345,2024-05-01,2499,Jane Doe,HQ - Floor 3,Assigned to design team';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'assets-template.csv';
    a.click();
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
      qc.invalidateQueries({ queryKey: ['reports'] });
      if (data.imported > 0) toast.success(`Imported ${data.imported} asset${data.imported === 1 ? '' : 's'}`);
      if (data.failed > 0) toast.error(`${data.failed} row${data.failed === 1 ? '' : 's'} failed`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setSubmitting(false);
    }
  }

  const preview = rows.slice(0, 10);
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <div>
      <PageHeader title="Import Assets" />

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <FileText className="h-5 w-5 text-indigo-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-gray-900">CSV format</h2>
            <p className="text-xs text-gray-600 mt-0.5">
              Required columns: <span className="font-mono">name</span>, <span className="font-mono">category</span>. Optional: status, serialNumber, purchaseDate (YYYY-MM-DD), purchaseCost, assignedTo, location, notes.
            </p>
            <button onClick={downloadTemplate} className="text-xs font-medium text-indigo-600 hover:text-indigo-700 mt-2">
              Download template
            </button>
          </div>
        </div>

        {!fileName ? (
          <label className="block border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-colors">
            <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">Choose a CSV file</p>
            <p className="text-xs text-gray-500 mt-1">Up to 1000 rows</p>
            <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          </label>
        ) : (
          <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <span className="text-sm text-gray-900 truncate">{fileName}</span>
              {rows.length > 0 && <span className="text-xs text-gray-500 flex-shrink-0">· {rows.length} rows</span>}
            </div>
            <button onClick={reset} className="text-gray-400 hover:text-gray-600 flex-shrink-0 ml-2"><X className="h-4 w-4" /></button>
          </div>
        )}

        {parseError && (
          <div className="mt-3 flex items-start gap-2 bg-red-50 text-red-700 rounded-lg px-3 py-2 text-xs">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>{parseError}</span>
          </div>
        )}
      </div>

      {rows.length > 0 && !result && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4">
          <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Preview</h2>
            <p className="text-xs text-gray-500">Showing {preview.length} of {rows.length}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>{headers.map((h) => <th key={h} className="text-left px-3 py-2 font-medium text-gray-600 whitespace-nowrap">{h}</th>)}</tr>
              </thead>
              <tbody>
                {preview.map((r, i) => (
                  <tr key={i} className="border-b border-gray-100 last:border-0">
                    {headers.map((h) => <td key={h} className="px-3 py-2 text-gray-700 whitespace-nowrap max-w-[200px] truncate">{r[h] || '—'}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-gray-200 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={reset}>Cancel</Button>
            <Button size="sm" onClick={handleImport} disabled={submitting}>
              {submitting ? 'Importing…' : `Import ${rows.length} asset${rows.length === 1 ? '' : 's'}`}
            </Button>
          </div>
        </div>
      )}

      {result && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-900">Import complete</h2>
          </div>
          <div className="px-5 py-4 space-y-3">
            <div className="flex items-center gap-2 text-sm text-green-700">
              <CheckCircle2 className="h-4 w-4" />
              <span>{result.imported} asset{result.imported === 1 ? '' : 's'} imported successfully</span>
            </div>
            {result.failed > 0 && (
              <>
                <div className="flex items-center gap-2 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4" />
                  <span>{result.failed} row{result.failed === 1 ? '' : 's'} failed</span>
                </div>
                <div className="bg-red-50 rounded-lg p-3 max-h-64 overflow-y-auto">
                  <ul className="space-y-1 text-xs text-red-700">
                    {result.errors.map((e, i) => <li key={i}><span className="font-medium">Row {e.row}:</span> {e.errors.join(', ')}</li>)}
                  </ul>
                </div>
              </>
            )}
          </div>
          <div className="px-5 py-3 border-t border-gray-200 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={reset}>Import another file</Button>
            <Button size="sm" onClick={() => router.push(`/${orgSlug}/assets`)}>View assets</Button>
          </div>
        </div>
      )}
    </div>
  );
}
