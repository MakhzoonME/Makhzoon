import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/firebase/auth-helpers';
import { getRequestById, updateRequest } from '@/lib/db/requests';
import { queueAuditLog } from '@/lib/audit/logger';
import { hasPermission } from '@/lib/permissions';
import { requireActiveSubscription } from '@/lib/services/base.service';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ requestId: string }> }) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!hasPermission(user, 'requests', 'approve')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    if (!user.organizationId) return NextResponse.json({ error: 'No organization' }, { status: 400 });
    await requireActiveSubscription(user.organizationId, user);

    const { requestId } = await params;
    const request = await getRequestById(requestId);
    if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (request.status !== 'PENDING') return NextResponse.json({ error: 'Already decided' }, { status: 400 });

    await updateRequest(requestId, {
      status: 'REJECTED',
      decisionBy: user.uid,
      decisionAt: new Date(),
      updatedBy: user.uid,
    });

    queueAuditLog({
      organizationId: request.organizationId,
      userId: user.uid,
      role: user.role,
      action: 'REQUEST_REJECTED',
      module: 'requests',
      recordId: requestId,
      oldValue: { status: 'PENDING' },
      newValue: { status: 'REJECTED' },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[POST /api/requests/[requestId]/reject]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
