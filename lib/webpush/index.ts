import 'server-only';
import webpush from 'web-push';
import { supabaseAdmin } from '@/lib/supabase/admin';

const VAPID_PUBLIC_KEY  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? '';
const VAPID_EMAIL       = process.env.VAPID_EMAIL ?? 'mailto:support@makhzoon.com';

let configured = false;

function configure() {
  if (configured || !VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return;
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  configured = true;
}

export interface PushPayload {
  title: string;
  body?: string;
  url?: string;
  icon?: string;
}

/**
 * Send a web push notification to all subscribed devices for a list of user IDs.
 * Silently removes expired/invalid subscriptions from the DB.
 */
export async function sendWebPush(userIds: string[], payload: PushPayload): Promise<void> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return;
  configure();

  const { data: subs } = await supabaseAdmin
    .from('web_push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .in('user_id', userIds);

  if (!subs || subs.length === 0) return;

  const staleIds: string[] = [];

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint as string,
            keys: { p256dh: sub.p256dh as string, auth: sub.auth as string },
          },
          JSON.stringify(payload),
        );
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          staleIds.push(sub.id as string);
        } else {
          console.error('[webpush] send error', err);
        }
      }
    }),
  );

  if (staleIds.length > 0) {
    await supabaseAdmin
      .from('web_push_subscriptions')
      .delete()
      .in('id', staleIds);
  }
}
