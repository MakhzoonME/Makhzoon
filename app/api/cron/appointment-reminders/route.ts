import { NextRequest, NextResponse } from 'next/server';
import { checkCronSecret } from '@/lib/cron-auth';
import { logServerEvent } from '@/lib/logging/log-server-event';
import { runReminderSweep } from '@/lib/modules/zeyara/reminders/reminders.service';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Zeyara appointment + follow-up reminder sweep (Phase 4).
 *
 * Safe to run often: every send is guarded by a per-(appointment, kind) row,
 * so a patient is messaged once regardless of how many times this fires.
 * Scheduled hourly in workers/cron so a clinic can pick any lead time without
 * the sweep cadence becoming the limiting factor.
 */
export async function GET(req: NextRequest) {
  try {
    const secret = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!checkCronSecret(secret)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await runReminderSweep();

    logServerEvent(
      'info',
      'cron/appointment-reminders',
      `Zeyara reminder sweep: ${result.sent} sent, ${result.failed} failed, ${result.skipped} skipped across ${result.orgsConsidered} org(s)`,
      { detail: result },
    );

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error('[GET /api/cron/appointment-reminders]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
