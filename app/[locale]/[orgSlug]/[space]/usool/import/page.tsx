'use client';
import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';
import { useQueryClient } from '@tanstack/react-query';
import { useOrgSlug, useSpace, useT, toast } from '@/hooks/ui';
import { useOrgInfo } from '@/hooks/org';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/* ── Icons ─────────────────────────────────────────────────────── */
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
function CheckSVG() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden>
      <path d="M2 5.5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── Types ──────────────────────────────────────────────────────── */
type Row = Record<string, string>;
type ImportResult = { imported: number; failed: number; errors: { row: number; errors: string[] }[] };
type Step = 'upload' | 'map' | 'importing' | 'done';

/* ── Constants ──────────────────────────────────────────────────── */
const REQUIRED_COLUMNS = ['name', 'category'];
const TEMPLATE_COLUMNS = ['name', 'category', 'status', 'serialNumber', 'purchaseDate', 'purchaseCost', 'assignedTo', 'location', 'notes'];

const APP_FIELDS = [
  { value: '__skip',       label: '— Skip —' },
  { value: 'name',         label: 'Name *' },
  { value: 'category',     label: 'Category *' },
  { value: 'status',       label: 'Status' },
  { value: 'serialNumber', label: 'Serial Number' },
  { value: 'purchaseDate', label: 'Purchase Date' },
  { value: 'purchaseCost', label: 'Purchase Cost' },
  { value: 'assignedTo',   label: 'Assigned To' },
  { value: 'location',     label: 'Location' },
  { value: 'notes',        label: 'Notes' },
];

function guessMapping(header: string): string {
  const h = header.toLowerCase().replace(/[\s_-]/g, '');
  if (['name', 'assetname', 'title'].includes(h))                    return 'name';
  if (['category', 'cat', 'type', 'assettype'].includes(h))          return 'category';
  if (['status', 'state', 'condition'].includes(h))                   return 'status';
  if (['serial', 'serialnumber', 'sku', 'sn'].includes(h))           return 'serialNumber';
  if (['purchasedate', 'buydate', 'date', 'acquired'].includes(h))   return 'purchaseDate';
  if (['purchasecost', 'cost', 'price', 'amount', 'value'].includes(h)) return 'purchaseCost';
  if (['assignedto', 'owner', 'user', 'assignee'].includes(h))       return 'assignedTo';
  if (['location', 'site', 'place', 'room', 'floor'].includes(h))   return 'location';
  if (['notes', 'note', 'description', 'desc', 'comments'].includes(h)) return 'notes';
  return '__skip';
}

/* ── Step progress bar ──────────────────────────────────────────── */
const STEPS = ['import.step.upload', 'import.step.map', 'import.step.validate', 'import.step.done'] as const;
const STEP_INDEX: Record<Step, number> = { upload: 0, map: 1, importing: 2, done: 3 };

function StepBar({ step, t }: { step: Step; t: (k: string) => string }) {
  const current = STEP_INDEX[step];
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((key, i) => {
        const done   = i < current;
        const active = i === current;
        return (
          <div key={key} className="flex items-center flex-1 last:flex-none">
            <div className="flex items-center gap-2 flex-shrink-0">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 transition-colors duration-200"
                style={{
                  background: done || active ? 'var(--primary-600)' : 'var(--surface-inset)',
                  color:      done || active ? '#fff' : 'var(--text-secondary)',
                  border:     done || active ? 'none' : '1px solid var(--border-default)',
                }}
              >
                {done ? <CheckSVG /> : <span>{i + 1}</span>}
              </div>
              <span className="text-xs font-medium whitespace-nowrap"
                style={{ color: active ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                {t(key)}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="flex-1 h-px mx-3 transition-colors duration-200"
                style={{ background: i < current ? 'var(--primary-600)' : 'var(--border-default)' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────────────── */
export default function ImportAssetsPage() {
  const router    = useRouter();
  const orgSlug   = useOrgSlug();
  const space     = useSpace();
  const { t, locale } = useT();
  const { data: orgInfo } = useOrgInfo();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const listHref = `/${locale}/${orgSlug}/${space}/usool/list`;

  const [step, setStep]               = useState<Step>('upload');
  const [rows, setRows]               = useState<Row[]>([]);
  const [fileName, setFileName]       = useState('');
  const [columnCount, setColumnCount] = useState(0);
  const [parseError, setParseError]   = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const [result, setResult]           = useState<ImportResult | null>(null);
  const [dragging, setDragging]       = useState(false);
  const [mapping, setMapping]         = useState<Record<string, string>>({});

  function reset() {
    setStep('upload');
    setRows([]);
    setFileName('');
    setColumnCount(0);
    setParseError('');
    setResult(null);
    setMapping({});
    if (fileInputRef.current) fileInputRef.current.value = '';
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
        if (data.length === 0) { setParseError(t('import.noDataRows')); setRows([]); return; }
        if (data.length > 1000) { setParseError('Maximum 1,000 rows per import.'); setRows([]); return; }
        const headers = Object.keys(data[0]);
        setColumnCount(headers.length);
        const initialMapping: Record<string, string> = {};
        headers.forEach((h) => { initialMapping[h] = guessMapping(h); });
        setMapping(initialMapping);
        setRows(data);
        setStep('map');
      },
      error: (err) => setParseError(err.message),
    });
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith('.csv') || file.type === 'text/csv')) parseFile(file);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function downloadTemplate() {
    const csv = TEMPLATE_COLUMNS.join(',') + '\n' +
      'MacBook Pro 14,Laptops,Active,SN12345,2024-05-01,2499,Jane Doe,HQ - Floor 3,Assigned to design team';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'assets-template.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  function validateMapping(): string | null {
    const mapped = Object.values(mapping);
    const missingRequired = REQUIRED_COLUMNS.filter((r) => !mapped.includes(r));
    if (missingRequired.length) return `Please map required fields: ${missingRequired.join(', ')}`;
    const nonSkip = mapped.filter((v) => v !== '__skip');
    if (new Set(nonSkip).size !== nonSkip.length) return 'Each app field can only be mapped once.';
    return null;
  }

  async function handleImport() {
    const err = validateMapping();
    if (err) { setParseError(err); return; }
    if (rows.length === 0) return;

    const transformed = rows.map((row) => {
      const out: Record<string, string> = {};
      Object.entries(mapping).forEach(([csvCol, appField]) => {
        if (appField !== '__skip') out[appField] = row[csvCol] ?? '';
      });
      return out;
    });

    setParseError('');
    setSubmitting(true);
    setStep('importing');
    try {
      const res = await fetch('/api/assets/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: transformed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t('import.importFailed'));
      setResult(data);
      setStep('done');
      qc.invalidateQueries({ queryKey: ['assets'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      if (data.imported > 0) toast.success(`${t('import.importedCount')} ${data.imported} ${data.imported === 1 ? t('import.asset') : t('import.assets')}`);
      if (data.failed > 0)   toast.error(`${data.failed} ${data.failed === 1 ? t('import.rowFailed') : t('import.rowsFailed')}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('import.importFailed'));
      setStep('map');
    } finally {
      setSubmitting(false);
    }
  }

  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  const preview = rows.slice(0, 3);

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={t('import.title')}
        breadcrumb={[
          { label: orgInfo?.name ?? orgSlug },
          { label: space },
          { label: t('nav.assets'), href: listHref },
          { label: t('import.title') },
        ]}
      />

      <div className="bg-surface-card rounded-xl border border-border p-6 space-y-5">
        <StepBar step={step} t={t as (k: string) => string} />

        {/* ── Upload ──────────────────────────────────────────────── */}
        {step === 'upload' && (
          <>
            <div className="flex items-start gap-3 p-4 bg-primary-50 border border-primary-100 rounded-xl">
              <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0 mt-0.5 text-primary-600">
                <FileTextSVG />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-primary-900 mb-0.5">{t('import.csvFormat')}</p>
                <p className="text-xs text-primary-700 leading-relaxed">
                  {t('import.required')}: <span className="font-mono bg-primary-100 px-1 rounded">name</span>,{' '}
                  <span className="font-mono bg-primary-100 px-1 rounded">category</span>. {t('import.optional')}: status, serialNumber, purchaseDate (YYYY-MM-DD), purchaseCost, assignedTo, location, notes.
                </p>
                <button onClick={downloadTemplate}
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-800 mt-2 transition-colors duration-150 cursor-pointer">
                  <DownloadSVG /> {t('import.downloadTemplate')}
                </button>
              </div>
            </div>

            <label
              className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl p-12 cursor-pointer transition-colors duration-150
                ${dragging ? 'border-primary-400 bg-primary-50' : 'border-border bg-surface-page hover:border-primary-300 hover:bg-primary-50/40'}`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
            >
              <div className={`rounded-full p-3 transition-colors duration-150 ${dragging ? 'bg-primary-100 text-primary-600' : 'bg-surface-card text-gray-400'}`}>
                <UploadCloudSVG />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-800">
                  {t('import.dropHere')} <span className="text-primary-600">{t('import.browse')}</span>
                </p>
                <p className="text-xs text-gray-400 mt-1">{t('import.maxRows')}</p>
              </div>
              <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) parseFile(f); }} />
            </label>

            {parseError && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-100 text-red-700 rounded-xl px-4 py-3 text-sm">
                <AlertCircleSVG /><span>{parseError}</span>
              </div>
            )}

            <div className="flex justify-end">
              <Button variant="outline" onClick={() => router.push(listHref)}>{t('common.cancel')}</Button>
            </div>
          </>
        )}

        {/* ── Map columns ─────────────────────────────────────────── */}
        {step === 'map' && (
          <>
            <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
              <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 text-blue-600">
                <FileTextSVG />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-blue-900 truncate">{fileName}</p>
                <p className="text-xs text-blue-600">
                  {rows.length} {t('import.rowsDetected')} · {columnCount} {t('import.columnsDetected')}
                </p>
              </div>
              <button aria-label={t('import.clearFile')} onClick={reset}
                className="p-1.5 rounded-lg text-blue-400 hover:text-blue-600 hover:bg-blue-100 transition-colors duration-150 cursor-pointer flex-shrink-0">
                <XSVG />
              </button>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('import.mapColumns')}</h3>
              <div className="border border-border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-surface-page border-b border-border">
                    <tr>
                      <th className="text-start px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('import.csvColumn')}</th>
                      <th className="text-start px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('import.mapsTo')}</th>
                      <th className="text-start px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">{t('import.sample')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {headers.map((header) => (
                      <tr key={header} className="hover:bg-surface-page transition-colors duration-100">
                        <td className="px-4 py-2.5">
                          <span className="font-mono text-xs bg-surface-inset px-2 py-1 rounded text-gray-700">{header}</span>
                        </td>
                        <td className="px-4 py-2.5">
                          <Select value={mapping[header] ?? '__skip'}
                            onValueChange={(v) => setMapping((prev) => ({ ...prev, [header]: v }))}>
                            <SelectTrigger className="h-8 text-xs w-full max-w-[200px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {APP_FIELDS.map((f) => (
                                <SelectItem key={f.value} value={f.value} className="text-xs">{f.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-4 py-2.5 hidden sm:table-cell">
                          <span className="font-mono text-xs text-gray-400 truncate max-w-[120px] block">
                            {preview[0]?.[header] || <span className="text-gray-300">—</span>}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {parseError && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-100 text-red-700 rounded-xl px-4 py-3 text-sm">
                <AlertCircleSVG /><span>{parseError}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <Button variant="outline" onClick={reset}>← {t('import.back')}</Button>
              <Button onClick={handleImport} disabled={submitting}>
                {t('import.validate')} {rows.length} {rows.length === 1 ? t('import.asset') : t('import.assets')} →
              </Button>
            </div>
          </>
        )}

        {/* ── Importing ───────────────────────────────────────────── */}
        {step === 'importing' && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="w-10 h-10 rounded-full border-2 border-primary-600 border-t-transparent animate-spin" />
            <p className="text-sm font-medium text-gray-700">{t('import.importing')}</p>
            <p className="text-xs text-gray-400">{t('import.importingDesc')}</p>
          </div>
        )}

        {/* ── Done ────────────────────────────────────────────────── */}
        {step === 'done' && result && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-100 rounded-xl">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 text-green-600">
                <CheckCircleSVG />
              </div>
              <div>
                <p className="text-sm font-semibold text-green-900">{t('import.complete')}</p>
                <p className="text-xs text-green-700">
                  {result.imported} {result.imported === 1 ? t('import.asset') : t('import.assets')} {t('import.importedSuccessfully')}
                </p>
              </div>
            </div>

            {result.failed > 0 && (
              <div className="border border-border rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-red-50 text-sm text-red-700">
                  <AlertCircleSVG />
                  <span>{result.failed} {result.failed === 1 ? t('import.rowFailed') : t('import.rowsFailed')}</span>
                </div>
                <div className="max-h-48 overflow-y-auto p-3">
                  <ul className="space-y-1 text-xs text-red-700">
                    {result.errors.map((e, i) => (
                      <li key={i}><span className="font-medium">Row {e.row}:</span> {e.errors.join(', ')}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button variant="outline" onClick={reset}>{t('import.importAnother')}</Button>
              <Button onClick={() => router.push(listHref)}>{t('import.done')}</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
