import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
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
    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .update({ status: 'EXPIRED', updated_by: 'system' })
      .eq('status', 'ACTIVE')
      .lt('end_date', now.toISOString())
      .select('organization_id');
    if (error) throw error;

    const orgIds: string[] = (data ?? []).map(
      (r) => (r as Record<string, unknown>).organization_id as string,
    );

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
      expired: orgIds.length,
      orgs: orgIds.length,
    });
  } catch (err) {
    console.error('[GET /api/cron/subscription-status]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
