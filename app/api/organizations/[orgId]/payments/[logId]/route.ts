import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/firebase/auth-helpers';
import { getPaymentLogById, deletePaymentLog } from '@/lib/db/payment-logs';
import { writeAuditLog } from '@/lib/audit/logger';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ orgId: string; logId: string }> },
) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { orgId, logId } = await params;
    const existing = await getPaymentLogById(logId);
    if (!existing || existing.organizationId !== orgId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await deletePaymentLog(logId);

    await writeAuditLog({
      organizationId: orgId,
      userId: user.uid,
      role: user.role,
      action: 'PAYMENT_DELETED',
      module: 'payments',
      recordId: logId,
      oldValue: { amount: existing.amount, currency: existing.currency },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/organizations/[orgId]/payments/[logId]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
