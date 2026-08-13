import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifySessionCookie } from '@/lib/supabase/auth-helpers';
import { PlatformNotificationConfigRepository } from '@/lib/platform/notification-config.repository';

const SUPERADMIN_ROLES = new Set(['super_admin', 'makhzoon_admin']);
const repo = new PlatformNotificationConfigRepository();

const patchSchema = z.object({
  whatsappEnabled:         z.boolean().optional(),
  whatsappPhoneNumberId:   z.string().trim().max(60).nullable().optional(),
  whatsappToken:           z.string().trim().min(1).optional(), // omit to keep existing
  whatsappWebhookSecret:   z.string().trim().min(8).optional(),
});

export async function GET() {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!SUPERADMIN_ROLES.has(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const config = await repo.get();
    return NextResponse.json({ config });
  } catch (err) {
    console.error('[GET /api/superadmin/notification-config]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!SUPERADMIN_ROLES.has(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    }
    const config = await repo.upsert(user.uid, parsed.data);
    return NextResponse.json({ config });
  } catch (err) {
    console.error('[PATCH /api/superadmin/notification-config]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
