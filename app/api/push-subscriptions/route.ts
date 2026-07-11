import { NextRequest, NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { z } from 'zod';

const subscribeSchema = z.object({
  endpoint: z.string().url().max(1000),
  keys: z.object({ p256dh: z.string().min(1).max(300), auth: z.string().min(1).max(300) }),
  userAgent: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const tenant = await resolveTenant();
    const parsed = subscribeSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 422 });
    }
    const body = parsed.data;
    const { endpoint, keys } = body;

    await supabaseAdmin
      .from('web_push_subscriptions')
      .upsert(
        {
          user_id:    tenant.userId,
          endpoint,
          p256dh:     keys.p256dh,
          auth:       keys.auth,
          user_agent: body.userAgent ?? null,
        },
        { onConflict: 'user_id,endpoint' },
      );

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[POST /api/push-subscriptions]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const tenant = await resolveTenant();
    const { endpoint } = await req.json() as { endpoint?: string };

    if (!endpoint) {
      return NextResponse.json({ error: 'Missing endpoint' }, { status: 422 });
    }

    await supabaseAdmin
      .from('web_push_subscriptions')
      .delete()
      .eq('user_id', tenant.userId)
      .eq('endpoint', endpoint);

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error('[DELETE /api/push-subscriptions]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
