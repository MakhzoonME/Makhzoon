import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifySessionCookie } from '@/lib/supabase/auth-helpers';
import { hasSuperAdminPermission } from '@/lib/permissions/superadmin';
import {
  getTableData,
  updateRow,
  deleteRow,
  UnknownTableError,
  NoPrimaryKeyError,
} from '@/lib/db/admin-database';
import { writeBackendLog } from '@/lib/logging/backend-logger';
import type { AuthUser } from '@/types';

const patchSchema = z.object({
  pk: z.record(z.string(), z.unknown()),
  values: z.record(z.string(), z.unknown()),
});
const deleteSchema = z.object({
  pk: z.record(z.string(), z.unknown()),
});

function handleError(err: unknown, path: string): NextResponse {
  if (err instanceof UnknownTableError) return NextResponse.json({ error: 'Unknown table' }, { status: 404 });
  if (err instanceof NoPrimaryKeyError) return NextResponse.json({ error: err.message }, { status: 400 });
  console.error(`[${path}]`, err);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}

/** Audit every admin DB mutation into the backend/system log. */
function auditDbChange(
  user: AuthUser,
  op: 'update' | 'delete',
  table: string,
  pk: unknown,
  ok: boolean,
  errorMessage?: string,
) {
  writeBackendLog({
    timestamp: new Date(),
    method: op === 'update' ? 'PATCH' : 'DELETE',
    path: `/api/superadmin/database/${table}`,
    statusCode: ok ? 200 : 500,
    level: ok ? 'warning' : 'error', // DB admin writes are always noteworthy
    durationMs: 0,
    userId: user.uid,
    userDisplayName: user.displayName,
    role: user.role,
    errorMessage,
    requestSummary: `DB admin ${op} on "${table}" — pk=${JSON.stringify(pk)}`,
  });
}

// ── GET: paginated rows + schema for one table (database:view) ─────────────
export async function GET(req: NextRequest, { params }: { params: Promise<{ table: string }> }) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!hasSuperAdminPermission(user, 'database', 'view'))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { table } = await params;
    const sp = req.nextUrl.searchParams;
    const data = await getTableData(table, {
      page: sp.get('page') ? parseInt(sp.get('page')!, 10) : undefined,
      pageSize: sp.get('pageSize') ? parseInt(sp.get('pageSize')!, 10) : undefined,
      search: sp.get('search') ?? undefined,
      orderBy: sp.get('orderBy') ?? undefined,
      orderDir: (sp.get('orderDir') as 'asc' | 'desc' | null) ?? undefined,
    });
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return handleError(err, 'GET /api/superadmin/database/[table]');
  }
}

// ── PATCH: update one row (database:edit) ──────────────────────────────────
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ table: string }> }) {
  const { table } = await params;
  let user: AuthUser | null = null;
  try {
    user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!hasSuperAdminPermission(user, 'database', 'edit'))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: 'pk and values are required' }, { status: 422 });

    const row = await updateRow(table, parsed.data.pk, parsed.data.values);
    auditDbChange(user, 'update', table, parsed.data.pk, true);
    return NextResponse.json({ row });
  } catch (err) {
    if (user) auditDbChange(user, 'update', table, undefined, false, err instanceof Error ? err.message : 'error');
    return handleError(err, 'PATCH /api/superadmin/database/[table]');
  }
}

// ── DELETE: delete one row (database:delete) ───────────────────────────────
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ table: string }> }) {
  const { table } = await params;
  let user: AuthUser | null = null;
  try {
    user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!hasSuperAdminPermission(user, 'database', 'delete'))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const parsed = deleteSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: 'pk is required' }, { status: 422 });

    await deleteRow(table, parsed.data.pk);
    auditDbChange(user, 'delete', table, parsed.data.pk, true);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (user) auditDbChange(user, 'delete', table, undefined, false, err instanceof Error ? err.message : 'error');
    return handleError(err, 'DELETE /api/superadmin/database/[table]');
  }
}
