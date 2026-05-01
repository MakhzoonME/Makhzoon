import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import { queueAuditLog } from '@/lib/audit/logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  try {
    const secret = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const snap = await adminDb.collection('subscriptions')
      .where('status', '==', 'ACTIVE')
      .where('endDate', '<', Timestamp.fromDate(now))
      .get();

    const batch = adminDb.batch();
    const orgIds: string[] = [];

    snap.docs.forEach((doc) => {
      batch.update(doc.ref, {
        status: 'EXPIRED',
        updatedAt: Timestamp.now(),
        updatedBy: 'system',
      });
      const orgId = doc.data().organizationId as string;
      orgIds.push(orgId);
    });

    await batch.commit();

    for (const orgId of orgIds) {
      queueAuditLog({
        organizationId: orgId,
        userId: 'system',
        role: 'super_admin',
        action: 'SUBSCRIPTION_AUTO_EXPIRED' as const,
        module: 'subscriptions',
      });
    }

    return NextResponse.json({
      ok: true,
      expired: snap.docs.length,
      orgs: orgIds.length,
    });
  } catch (err) {
    console.error('[GET /api/cron/subscription-status]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
