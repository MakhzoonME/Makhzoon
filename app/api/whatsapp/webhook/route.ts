import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { z } from 'zod'
import { logServerEvent } from '@/lib/logging/log-server-event'
import { PlatformNotificationConfigRepository } from '@/lib/platform/notification-config.repository'

// Loose on purpose — field names follow Infobip's documented DLR shape but
// aren't verified against a live payload yet (see note below).
const webhookBodySchema = z.object({
  results: z.array(z.object({
    messageId: z.union([z.string(), z.number()]).optional(),
    status: z.object({
      name: z.string().optional(),
      groupName: z.string().optional(),
    }).partial().optional(),
  }).passthrough()).optional(),
}).passthrough()

/**
 * Inbound Infobip WhatsApp delivery-report webhook. One sender, shared
 * across every org (see lib/platform/notification-config.repository.ts) —
 * there's no per-org identifier to resolve against, so this just logs
 * delivery status against the message ID.
 *
 * Infobip does not sign webhook payloads the way Meta did (no
 * x-hub-signature-256 equivalent), so auth is a shared secret configured
 * as a query param on the webhook URL registered in Infobip's dashboard:
 * https://<this-app>/api/whatsapp/webhook?secret=<infobip_webhook_secret>
 *
 * NOTE: the exact field names below (`results[].status.name` etc.) follow
 * Infobip's documented delivery-report shape used across their messaging
 * APIs, but haven't been verified against a live Infobip webhook payload
 * yet — worth double-checking once the sender is registered and a real
 * webhook fires.
 */

const configRepo = new PlatformNotificationConfigRepository()

async function verifySecret(req: NextRequest): Promise<boolean> {
  const provided = req.nextUrl.searchParams.get('secret')
  if (!provided) return false
  const cfg = await configRepo.getWithSecrets()
  if (!cfg?.infobipWebhookSecret) return false
  const a = Buffer.from(provided)
  const b = Buffer.from(cfg.infobipWebhookSecret)
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function POST(req: NextRequest) {
  if (!(await verifySecret(req))) {
    logServerEvent('warning', 'whatsapp/webhook', 'Rejected webhook: invalid or missing secret')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const parsed = webhookBodySchema.safeParse(await req.json())
    if (!parsed.success) {
      logServerEvent('warning', 'whatsapp/webhook', 'Unrecognized webhook payload shape', {
        detail: { issues: parsed.error.issues },
      })
      return NextResponse.json({ ok: true }) // ack anyway — don't make Infobip retry a shape we can't parse
    }

    for (const row of parsed.data.results ?? []) {
      logServerEvent('info', 'whatsapp/webhook', `Message ${row.status?.name ?? row.status?.groupName ?? 'unknown'}`, {
        detail: { messageId: row.messageId, status: row.status?.name, groupName: row.status?.groupName },
      })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[POST /api/whatsapp/webhook]', err)
    logServerEvent('error', 'whatsapp/webhook', err instanceof Error ? err.message : 'Webhook processing failed')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
