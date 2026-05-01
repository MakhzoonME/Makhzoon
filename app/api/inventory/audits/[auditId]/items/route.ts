import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/firebase/auth-helpers';
import { getInventoryAuditById, updateAuditItem } from '@/lib/db/inventory-audits';

interface Params { params: { auditId: string } }

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const audit = await getInventoryAuditById(params.auditId);
    if (!audit || audit.organizationId !== user.organizationId) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (audit.status === 'completed') return NextResponse.json({ error: 'Audit already completed' }, { status: 409 });

    const body = await req.json();
    const { auditItemId, status, note } = body as { auditItemId: string; status: 'found' | 'missing'; note?: string };

    if (!auditItemId || !['found', 'missing'].includes(status)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 422 });
    }

    await updateAuditItem(
      auditItemId,
      params.auditId,
      status,
      { uid: user.uid, displayName: user.displayName || undefined },
      note
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[POST /api/inventory/audits/[auditId]/items]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
