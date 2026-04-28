import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/firebase/auth-helpers';
import { getInventoryItemById, getInventoryTransactions, applyInventoryTransaction } from '@/lib/firestore/inventory';
import { writeAuditLog } from '@/lib/audit/logger';
import { inventoryTransactionSchema } from '@/lib/validations/inventory.schema';

interface Params { params: { itemId: string } }

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const item = await getInventoryItemById(params.itemId);
    if (!item || item.organizationId !== user.organizationId) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const transactions = await getInventoryTransactions(params.itemId);
    return NextResponse.json({ transactions });
  } catch (err) {
    console.error('[GET /api/inventory/[itemId]/transactions]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'super_admin' && user.role !== 'org_owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const item = await getInventoryItemById(params.itemId);
    if (!item || item.organizationId !== user.organizationId) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = await req.json();
    const parsed = inventoryTransactionSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

    const { type, quantity, reason, note } = parsed.data;
    const { quantityAfter } = await applyInventoryTransaction(
      params.itemId,
      type,
      quantity,
      { uid: user.uid, email: user.email || undefined, displayName: user.displayName || undefined, role: user.role },
      reason,
      note
    );

    await writeAuditLog({
      organizationId: user.organizationId!,
      userId: user.uid,
      role: user.role,
      action: 'INVENTORY_TRANSACTION_CREATED',
      module: 'inventory',
      recordId: params.itemId,
      newValue: { type, quantity, reason, quantityAfter },
    });

    return NextResponse.json({ quantityAfter }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/inventory/[itemId]/transactions]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
