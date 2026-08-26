import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { logServerEvent } from '@/lib/logging/log-server-event'

/**
 * Inbound Meta WhatsApp Cloud API webhook. One number, one Meta App, shared
 * across every org (see lib/platform/notification-config.repository.ts) —
 * there's no per-org phone_number_id to resolve against anymore, so this
 * just logs delivery status against the message ID.
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
        const statuses = Array.isArray(value?.statuses) ? (value!.statuses as Record<string, unknown>[]) : []
        for (const s of statuses) {
          logServerEvent('info', 'whatsapp/webhook', `Message ${s.status}`, {
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
