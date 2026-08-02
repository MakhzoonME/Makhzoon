import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * Data layer for the superadmin "Database" panel — generic view/edit/delete of
 * any record in any public table. Row I/O goes through PostgREST on the
 * service-role client (bypasses RLS); schema metadata comes from the
 * admin_list_tables / admin_table_columns RPCs (migration 0048).
 *
 * Every table name is validated against the live table list before use, so a
 * caller can never reach an arbitrary / injected relation.
 */

export interface TableInfo {
  name: string;
  rowEstimate: number;
}

export interface ColumnInfo {
  name: string;
  dataType: string;
  udtName: string;
  isNullable: boolean;
  isIdentity: boolean;
  isGenerated: boolean;
  default: string | null;
  ordinal: number;
}

export interface TableSchema {
  columns: ColumnInfo[];
  primaryKey: string[];
}

export interface TableData extends TableSchema {
  rows: Record<string, unknown>[];
  total: number;
  page: number;
  pageSize: number;
}

export interface GetTableDataOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
}

export class UnknownTableError extends Error {}
export class NoPrimaryKeyError extends Error {}

const TABLE_CACHE_TTL = 60_000;
let tableCache: { at: number; names: Set<string> } | null = null;

export async function listTables(): Promise<TableInfo[]> {
  const { data, error } = await supabaseAdmin.rpc('admin_list_tables');
  if (error) throw error;
  return ((data as Array<{ table_name: string; row_estimate: number }>) ?? []).map((r) => ({
    name: r.table_name,
    rowEstimate: Number(r.row_estimate) || 0,
  }));
}

async function tableNames(): Promise<Set<string>> {
  if (tableCache && Date.now() - tableCache.at < TABLE_CACHE_TTL) return tableCache.names;
  const names = new Set((await listTables()).map((t) => t.name));
  tableCache = { at: Date.now(), names };
  return names;
}

async function assertTable(table: string): Promise<void> {
  if (!(await tableNames()).has(table)) {
    throw new UnknownTableError(`Unknown table: ${table}`);
  }
}

export async function getTableSchema(table: string): Promise<TableSchema> {
  await assertTable(table);
  const { data, error } = await supabaseAdmin.rpc('admin_table_columns', { p_table: table });
  if (error) throw error;
  const parsed = data as { columns?: ColumnInfo[]; primaryKey?: string[] };
  return { columns: parsed.columns ?? [], primaryKey: parsed.primaryKey ?? [] };
}

function isTextish(c: ColumnInfo): boolean {
  return /char|text|uuid|citext/.test(c.dataType.toLowerCase()) || /char|text|uuid|citext/.test(c.udtName.toLowerCase());
}

export async function getTableData(table: string, opts: GetTableDataOptions = {}): Promise<TableData> {
  const schema = await getTableSchema(table);
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(200, Math.max(1, opts.pageSize ?? 50));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let q = supabaseAdmin.from(table).select('*', { count: 'exact' }).range(from, to);

  const orderBy =
    opts.orderBy && schema.columns.some((c) => c.name === opts.orderBy)
      ? opts.orderBy
      : schema.primaryKey[0] ?? schema.columns[0]?.name;
  if (orderBy) q = q.order(orderBy, { ascending: opts.orderDir !== 'desc' });

  const term = opts.search?.trim();
  if (term) {
    const textCols = schema.columns.filter(isTextish);
    if (textCols.length) {
      // Escape PostgREST reserved chars in the term for the ilike filter.
      const safe = term.replace(/[,()]/g, ' ');
      q = q.or(textCols.map((c) => `${c.name}.ilike.%${safe}%`).join(','));
    }
  }

  const { data, error, count } = await q;
  if (error) throw error;
  return { ...schema, rows: (data as Record<string, unknown>[]) ?? [], total: count ?? 0, page, pageSize };
}

function buildMatch(schema: TableSchema, pk: Record<string, unknown>): Record<string, unknown> {
  if (schema.primaryKey.length === 0) {
    throw new NoPrimaryKeyError('Table has no primary key; cannot target a single row');
  }
  const match: Record<string, unknown> = {};
  for (const key of schema.primaryKey) {
    if (pk[key] === undefined) throw new Error(`Missing primary-key value: ${key}`);
    match[key] = pk[key];
  }
  return match;
}

/** Coerce a raw JSON value from the client into the column's Postgres type. */
function coerce(col: ColumnInfo, raw: unknown): unknown {
  if (raw === null || raw === undefined) return null;
  const dt = col.dataType.toLowerCase();
  if (typeof raw === 'string' && raw === '' && col.isNullable) return null;
  if (/^(smallint|integer|bigint|serial|bigserial)/.test(dt) || /int\d/.test(col.udtName)) {
    return raw === '' ? null : Number(raw);
  }
  if (/numeric|decimal|real|double/.test(dt)) return raw === '' ? null : Number(raw);
  if (/bool/.test(dt)) return raw === true || raw === 'true' || raw === 't' || raw === '1';
  if (/json/.test(dt)) return typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (/ARRAY/.test(col.dataType) || col.udtName.startsWith('_')) {
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  }
  return raw; // text / uuid / timestamp (ISO string) / enum
}

export async function updateRow(
  table: string,
  pk: Record<string, unknown>,
  values: Record<string, unknown>,
): Promise<Record<string, unknown> | null> {
  const schema = await getTableSchema(table);
  const match = buildMatch(schema, pk);

  const patch: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(values)) {
    const col = schema.columns.find((c) => c.name === k);
    if (!col) continue;                       // ignore unknown columns
    if (schema.primaryKey.includes(k)) continue; // never mutate the PK
    if (col.isGenerated) continue;            // skip generated columns
    patch[k] = coerce(col, v);
  }
  if (Object.keys(patch).length === 0) {
    throw new Error('No editable fields supplied');
  }

  const { data, error } = await supabaseAdmin.from(table).update(patch).match(match).select('*').maybeSingle();
  if (error) throw error;
  return (data as Record<string, unknown>) ?? null;
}

export async function deleteRow(table: string, pk: Record<string, unknown>): Promise<void> {
  const schema = await getTableSchema(table);
  const match = buildMatch(schema, pk);
  const { error } = await supabaseAdmin.from(table).delete().match(match);
  if (error) throw error;
}
