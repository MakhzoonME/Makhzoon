import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { logServerEvent } from '@/lib/logging/log-server-event'

/**
 * Inbound Meta WhatsApp Cloud API webhook. Unlike the card-terminal webhook,
 * this is a single URL registered once per Meta App (not per-org) — the org
 * is resolved from `metadata.phone_number_id` in the payload against
 * haraka_service_notification_config.whatsapp_phone_number_id.
 *
 * GET handles Meta's one-time subscription verification handshake.
 * POST receives message status updates (sent/delivered/read/failed).
 */

function verifySignature(rawBody: string, signatureHeader: string | null): boolean {
  const appSecret = process.env.WHATSAPP_APP_SECRET
  if (!appSecret || !signatureHeader) return false
  const expected = 'sha256=' + createHmac('sha256', appSecret).update(rawBody).digest('hex')
  const a = Buffer.from(expected)
  const b = Buffer.from(signatureHeader)
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode      = searchParams.get('hub.mode')
  const token     = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, { status: 200 })
  }
  return NextResponse.json({ error: 'Verification failed' }, { status: 403 })
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-hub-signature-256')

  if (!verifySignature(rawBody, signature)) {
    logServerEvent('warning', 'whatsapp/webhook', 'Rejected webhook: invalid signature')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = JSON.parse(rawBody)
    const entries: unknown[] = Array.isArray(body?.entry) ? body.entry : []

    for (const entry of entries) {
      const changes: unknown[] = Array.isArray((entry as { changes?: unknown[] })?.changes)
        ? (entry as { changes: unknown[] }).changes
        : []
      for (const change of changes) {
        const value = (change as { value?: Record<string, unknown> })?.value
        const phoneNumberId = (value?.metadata as Record<string, unknown> | undefined)?.phone_number_id as
          | string
          | undefined
        const statuses = Array.isArray(value?.statuses) ? (value!.statuses as Record<string, unknown>[]) : []
        if (!phoneNumberId || statuses.length === 0) continue

        const { data: config } = await supabaseAdmin
          .from('haraka_service_notification_config')
          .select('organization_id')
          .eq('whatsapp_phone_number_id', phoneNumberId)
          .maybeSingle()
        if (!config) continue

        for (const s of statuses) {
          logServerEvent('info', 'whatsapp/webhook', `Message ${s.status}`, {
            organizationId: config.organization_id as string,
            detail: { messageId: s.id, status: s.status },
          })
        }
      }
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[POST /api/whatsapp/webhook]', err)
    logServerEvent('error', 'whatsapp/webhook', err instanceof Error ? err.message : 'Webhook processing failed')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
