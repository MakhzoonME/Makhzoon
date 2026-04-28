import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/firebase/auth-helpers';
import { getRequestById, updateRequest } from '@/lib/firestore/requests';
import { writeAuditLog } from '@/lib/audit/logger';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ requestId: string }> }) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'super_admin' && user.role !== 'org_owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

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

    await writeAuditLog({
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
