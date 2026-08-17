import { NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/supabase/auth-helpers';
import { PlatformNotificationConfigRepository } from '@/lib/platform/notification-config.repository';
import { getAccountUsage } from '@/lib/modules/haraka/service-vehicles/plate-recognizer';
import { getOcrUsageByOrg } from '@/lib/modules/haraka/service-vehicles/ocr-usage.repository';

const SUPERADMIN_ROLES = new Set(['super_admin', 'makhzoon_admin']);
const configRepo = new PlatformNotificationConfigRepository();

export async function GET() {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!SUPERADMIN_ROLES.has(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const cfg = await configRepo.getWithSecrets();
    if (!cfg?.ocrApiKey) {
      return NextResponse.json({ error: 'Plate OCR is not configured yet' }, { status: 409 });
    }

    const [account, byOrg] = await Promise.all([
      getAccountUsage(cfg.ocrApiKey),
      getOcrUsageByOrg(),
    ]);
    return NextResponse.json({ account, byOrg });
  } catch (err) {
    console.error('[GET /api/superadmin/notification-config/ocr-usage]', err);
    const message = err instanceof Error ? err.message : 'Failed to fetch usage';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
