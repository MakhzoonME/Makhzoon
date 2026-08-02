'use client';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, Pencil, Trash2, RefreshCw, ArrowUp, ArrowDown, X, Search, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils/cn';
import { toast } from '@/hooks/ui/useToast';
import { useAuth } from '@/hooks/ui';
import type { SuperAdminPermissions } from '@/types/superadmin-permissions.types';

interface ColumnInfo {
  name: string; dataType: string; udtName: string;
  isNullable: boolean; isIdentity: boolean; isGenerated: boolean; default: string | null; ordinal: number;
}
interface TableData {
  columns: ColumnInfo[]; primaryKey: string[];
  rows: Record<string, unknown>[]; total: number; page: number; pageSize: number;
}
type Row = Record<string, unknown>;
type Modal = { mode: 'view' | 'edit' | 'delete'; row: Row } | null;

const PAGE_SIZES = [25, 50, 100, 200];

function displayValue(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function isBool(c: ColumnInfo) { return /bool/.test(c.dataType.toLowerCase()); }
function isJson(c: ColumnInfo) { return /json/.test(c.dataType.toLowerCase()) || c.udtName.startsWith('_'); }
function isNumeric(c: ColumnInfo) { return /int|numeric|decimal|real|double/.test(c.dataType.toLowerCase()); }

export function DatabaseTableView({ table }: { table: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const perms = (user?.saPermissions as SuperAdminPermissions | undefined)?.database;
  const canEdit = user?.role === 'super_admin' ? true : !!perms?.edit;
  const canDelete = user?.role === 'super_admin' ? true : !!perms?.delete;

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [orderBy, setOrderBy] = useState<string | null>(null);
  const [orderDir, setOrderDir] = useState<'asc' | 'desc'>('asc');
  const [modal, setModal] = useState<Modal>(null);

  const { data, isLoading, isFetching, refetch } = useQuery<TableData>({
    queryKey: ['superadmin-db-table', table, page, pageSize, search, orderBy, orderDir],
    queryFn: async () => {
      const p = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (search) p.set('search', search);
      if (orderBy) { p.set('orderBy', orderBy); p.set('orderDir', orderDir); }
      const res = await fetch(`/api/superadmin/database/${encodeURIComponent(table)}?${p}`);
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Failed to load');
      return res.json();
    },
    placeholderData: (prev) => prev,
  });

  const columns = data?.columns ?? [];
  const primaryKey = data?.primaryKey ?? [];
  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasPk = primaryKey.length > 0;

  const pkOf = (row: Row): Record<string, unknown> =>
    Object.fromEntries(primaryKey.map((k) => [k, row[k]]));

  function toggleSort(col: string) {
    if (orderBy === col) setOrderDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setOrderBy(col); setOrderDir('asc'); }
    setPage(1);
  }

  function invalidate() {
    qc.invalidateQueries({ queryKey: ['superadmin-db-table', table] });
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={table}
        description={`${total} record${total === 1 ? '' : 's'}`}
        breadcrumb={[{ label: 'Database' }, { label: table }]}
        actions={
          <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={cn('h-4 w-4 me-1.5', isFetching && 'animate-spin')} />
            Refresh
          </Button>
        }
      />

      {!hasPk && (
        <div className="flex items-center gap-2 rounded-lg border border-[var(--yellow-100)] bg-[var(--yellow-50)] px-3 py-2 text-xs text-[var(--yellow-700)]">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          This table has no primary key — records can be viewed but not edited or deleted individually.
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-2">
        <form
          className="relative flex-1 max-w-sm"
          onSubmit={(e) => { e.preventDefault(); setSearch(searchInput.trim()); setPage(1); }}
        >
          <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search text columns…"
            className="w-full h-9 ps-9 pe-8 text-sm rounded-md border border-border bg-surface-card focus:outline-none focus:ring-1 focus:ring-primary-400"
          />
          {searchInput && (
            <button type="button" onClick={() => { setSearchInput(''); setSearch(''); setPage(1); }} className="absolute end-2 top-1/2 -translate-y-1/2">
              <X className="h-3.5 w-3.5 text-gray-400" />
            </button>
          )}
        </form>
        <select
          value={pageSize}
          onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
          className="h-9 px-2 text-sm rounded-md border border-border bg-surface-card"
        >
          {PAGE_SIZES.map((n) => <option key={n} value={n}>{n} / page</option>)}
        </select>
      </div>

      {/* Grid */}
      <div className="bg-surface-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-surface-page border-b border-border text-gray-500 uppercase tracking-wide">
                <th className="px-2 py-2.5 text-start font-medium w-px whitespace-nowrap">Actions</th>
                {columns.map((c) => (
                  <th
                    key={c.name}
                    onClick={() => toggleSort(c.name)}
                    className="px-3 py-2.5 text-start font-medium whitespace-nowrap cursor-pointer hover:text-gray-700 select-none"
                    title={`${c.dataType}${primaryKey.includes(c.name) ? ' · PK' : ''}`}
                  >
                    <span className="inline-flex items-center gap-1">
                      {primaryKey.includes(c.name) && <span className="text-primary-500">🔑</span>}
                      <span className="font-mono normal-case">{c.name}</span>
                      {orderBy === c.name && (orderDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.length === 0 && (
                <tr><td colSpan={columns.length + 1} className="px-4 py-10 text-center text-gray-400">
                  {isLoading ? 'Loading…' : 'No records.'}
                </td></tr>
              )}
              {rows.map((row, i) => (
                <tr key={i} className="hover:bg-surface-page transition-colors align-top">
                  <td className="px-2 py-1.5 whitespace-nowrap">
                    <div className="flex items-center gap-0.5">
                      <button onClick={() => setModal({ mode: 'view', row })} title="View" className="p-1 rounded hover:bg-primary-100 text-gray-500 hover:text-primary-700"><Eye className="h-3.5 w-3.5" /></button>
                      {canEdit && hasPk && <button onClick={() => setModal({ mode: 'edit', row })} title="Edit" className="p-1 rounded hover:bg-[var(--yellow-100)] text-gray-500 hover:text-[var(--yellow-700)]"><Pencil className="h-3.5 w-3.5" /></button>}
                      {canDelete && hasPk && <button onClick={() => setModal({ mode: 'delete', row })} title="Delete" className="p-1 rounded hover:bg-[var(--red-100)] text-gray-500 hover:text-[var(--red-600)]"><Trash2 className="h-3.5 w-3.5" /></button>}
                    </div>
                  </td>
                  {columns.map((c) => {
                    const v = row[c.name];
                    return (
                      <td key={c.name} className="px-3 py-1.5 max-w-[280px]">
                        {v === null || v === undefined
                          ? <span className="text-gray-300 italic">null</span>
                          : isBool(c)
                            ? <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', v ? 'bg-[var(--green-100)] text-[var(--green-700)]' : 'bg-gray-200 text-gray-600')}>{String(v)}</span>
                            : <span className="block truncate font-mono text-gray-700" title={displayValue(v)}>{displayValue(v)}</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>Page {page} of {totalPages}{isFetching && ' · updating…'}</span>
        <div className="flex items-center gap-1">
          <button className="px-2 py-1 border border-border rounded disabled:opacity-40 hover:bg-surface-page" disabled={page <= 1} onClick={() => setPage(1)}>First</button>
          <button className="px-2 py-1 border border-border rounded disabled:opacity-40 hover:bg-surface-page" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
          <button className="px-2 py-1 border border-border rounded disabled:opacity-40 hover:bg-surface-page" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
          <button className="px-2 py-1 border border-border rounded disabled:opacity-40 hover:bg-surface-page" disabled={page >= totalPages} onClick={() => setPage(totalPages)}>Last</button>
        </div>
      </div>

      {modal?.mode === 'view' && (
        <ViewDialog table={table} columns={columns} primaryKey={primaryKey} row={modal.row} onClose={() => setModal(null)} />
      )}
      {modal?.mode === 'edit' && (
        <EditDialog table={table} columns={columns} primaryKey={primaryKey} row={modal.row} pk={pkOf(modal.row)} onClose={() => setModal(null)} onSaved={() => { setModal(null); invalidate(); }} />
      )}
      {modal?.mode === 'delete' && (
        <DeleteDialog table={table} pk={pkOf(modal.row)} onClose={() => setModal(null)} onDeleted={() => { setModal(null); invalidate(); }} />
      )}
    </div>
  );
}

/* ── View ─────────────────────────────────────────────────────────── */
function ViewDialog({ table, columns, primaryKey, row, onClose }: {
  table: string; columns: ColumnInfo[]; primaryKey: string[]; row: Row; onClose: () => void;
}) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-mono text-base">{table}</DialogTitle>
          <DialogDescription>Full record</DialogDescription>
        </DialogHeader>
        <dl className="divide-y divide-border text-xs">
          {columns.map((c) => (
            <div key={c.name} className="grid grid-cols-3 gap-3 py-1.5">
              <dt className="text-gray-500 font-mono col-span-1 break-all">
                {primaryKey.includes(c.name) && <span className="me-1">🔑</span>}{c.name}
                <span className="block text-[10px] text-gray-400 normal-case">{c.dataType}</span>
              </dt>
              <dd className="col-span-2 font-mono text-gray-800 break-all whitespace-pre-wrap">
                {row[c.name] === null || row[c.name] === undefined
                  ? <span className="text-gray-300 italic">null</span>
                  : typeof row[c.name] === 'object'
                    ? JSON.stringify(row[c.name], null, 2)
                    : String(row[c.name])}
              </dd>
            </div>
          ))}
        </dl>
      </DialogContent>
    </Dialog>
  );
}

/* ── Edit ─────────────────────────────────────────────────────────── */
function initialForm(columns: ColumnInfo[], row: Row): Record<string, string | boolean> {
  const f: Record<string, string | boolean> = {};
  for (const c of columns) {
    const v = row[c.name];
    if (isBool(c)) f[c.name] = v === true;
    else if (v === null || v === undefined) f[c.name] = '';
    else if (typeof v === 'object') f[c.name] = JSON.stringify(v, null, 2);
    else f[c.name] = String(v);
  }
  return f;
}

function EditDialog({ table, columns, primaryKey, row, pk, onClose, onSaved }: {
  table: string; columns: ColumnInfo[]; primaryKey: string[]; row: Row;
  pk: Record<string, unknown>; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState<Record<string, string | boolean>>(() => initialForm(columns, row));
  const [saving, setSaving] = useState(false);
  const editable = columns.filter((c) => !primaryKey.includes(c.name) && !c.isGenerated);

  async function save() {
    setSaving(true);
    try {
      const values: Record<string, unknown> = {};
      for (const c of editable) values[c.name] = form[c.name];
      const res = await fetch(`/api/superadmin/database/${encodeURIComponent(table)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pk, values }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Update failed');
      toast('Record updated', 'success');
      onSaved();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Update failed', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-mono text-base">Edit · {table}</DialogTitle>
          <DialogDescription>Primary key columns are locked. Changes are audited.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {columns.map((c) => {
            const locked = primaryKey.includes(c.name) || c.isGenerated;
            return (
              <div key={c.name} className="grid grid-cols-3 gap-3 items-start">
                <label className="text-xs font-mono text-gray-600 pt-2 break-all col-span-1">
                  {primaryKey.includes(c.name) && <span className="me-1">🔑</span>}{c.name}
                  <span className="block text-[10px] text-gray-400">{c.dataType}{c.isNullable ? '' : ' · required'}</span>
                </label>
                <div className="col-span-2">
                  {locked ? (
                    <input disabled value={displayValue(row[c.name])} className="w-full h-9 px-2 text-xs rounded-md border border-border bg-surface-page text-gray-400 font-mono" />
                  ) : isBool(c) ? (
                    <Switch checked={form[c.name] === true} onCheckedChange={(v) => setForm((f) => ({ ...f, [c.name]: v }))} />
                  ) : isJson(c) ? (
                    <Textarea rows={3} value={String(form[c.name] ?? '')} onChange={(e) => setForm((f) => ({ ...f, [c.name]: e.target.value }))} className="font-mono text-xs" />
                  ) : (
                    <input
                      type={isNumeric(c) ? 'number' : 'text'}
                      value={String(form[c.name] ?? '')}
                      onChange={(e) => setForm((f) => ({ ...f, [c.name]: e.target.value }))}
                      placeholder={c.isNullable ? 'null' : ''}
                      className="w-full h-9 px-2 text-xs rounded-md border border-border bg-surface-card font-mono focus:outline-none focus:ring-1 focus:ring-primary-400"
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button size="sm" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Delete ───────────────────────────────────────────────────────── */
function DeleteDialog({ table, pk, onClose, onDeleted }: {
  table: string; pk: Record<string, unknown>; onClose: () => void; onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  async function del() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/superadmin/database/${encodeURIComponent(table)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pk }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Delete failed');
      toast('Record deleted', 'success');
      onDeleted();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Delete failed', 'error');
    } finally {
      setDeleting(false);
    }
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[var(--red-600)]"><AlertTriangle className="h-5 w-5" /> Delete record</DialogTitle>
          <DialogDescription>
            This permanently deletes the row from <span className="font-mono">{table}</span>. This cannot be undone and is audited.
          </DialogDescription>
        </DialogHeader>
        <pre className="bg-surface-page border border-border rounded p-2 text-xs font-mono overflow-x-auto">{JSON.stringify(pk, null, 2)}</pre>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} disabled={deleting}>Cancel</Button>
          <Button size="sm" onClick={del} disabled={deleting} className="bg-[var(--red-600)] hover:bg-[var(--red-700)] text-white">
            {deleting ? 'Deleting…' : 'Delete permanently'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
