/**
 * notificationQueue — fire-and-forget notification dispatch.
 * Same pattern as auditLog.queue(): call .enqueue() synchronously from a
 * service, never await it, errors are caught internally and never thrown.
 *
 * Architecture note: This uses direct service-layer fanout, NOT the event bus.
 * Next.js serverless functions are stateless — event-bus subscribers don't
 * persist between requests, making them unreliable for notifications.
 */

import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email/resend'
import { getCatalogEntry } from './catalog'
import type { NotificationEnqueueInput, NotificationRow } from './types'

type Row = Record<string, unknown>

function toRow(r: Row): NotificationRow {
  return {
    id:             r.id as string,
    organizationId: r.organization_id as string,
    spaceId:        (r.space_id as string) ?? null,
    recipientId:    r.recipient_id as string,
    eventType:      r.event_type as NotificationRow['eventType'],
    title:          r.title as string,
    body:           (r.body as string) ?? null,
    data:           (r.data as Record<string, unknown>) ?? {},
    link:           (r.link as string) ?? null,
    isRead:         (r.is_read as boolean) ?? false,
    readAt:         r.read_at ? new Date(r.read_at as string) : null,
    createdAt:      r.created_at ? new Date(r.created_at as string) : new Date(),
  }
}

/**
 * Resolve which org user IDs should receive a notification for this event type.
 * Checks notification_org_defaults first; falls back to catalog defaults.
 */
async function resolveRecipientIds(
  orgId: string,
  eventType: string,
  recipientIds?: string[],
): Promise<string[]> {
  if (recipientIds && recipientIds.length > 0) return recipientIds

  // Get org-level default for this event type
  const { data: orgDefault } = await supabaseAdmin
    .from('notification_org_defaults')
    .select('notify_roles, in_app_enabled')
    .eq('organization_id', orgId)
    .eq('event_type', eventType)
    .maybeSingle()

  const catalog = getCatalogEntry(eventType as NotificationRow['eventType'])
  const roles: string[] = orgDefault?.notify_roles ?? catalog?.defaultRoles ?? ['admin']
  const inAppEnabled = orgDefault != null ? orgDefault.in_app_enabled : (catalog?.defaultInApp ?? true)

  if (!inAppEnabled) return []

  // Fetch org members with matching roles
  const { data: users } = await supabaseAdmin
    .from('users')
    .select('id, role')
    .eq('organization_id', orgId)
    .eq('status', 'active')
    .in('role', roles)
  return (users ?? []).map((u) => u.id as string)
}

/**
 * Check per-user preference for a given event type.
 * Missing row = use org default = catalog default.
 */
async function shouldSendToUser(
  orgId: string,
  userId: string,
  eventType: string,
  channel: 'in_app' | 'email',
): Promise<boolean> {
  const { data: pref } = await supabaseAdmin
    .from('notification_preferences')
    .select('in_app, email')
    .eq('organization_id', orgId)
    .eq('user_id', userId)
    .eq('event_type', eventType)
    .maybeSingle()

  if (pref) return channel === 'in_app' ? pref.in_app : pref.email

  // Fall back to org default, then catalog default
  const { data: orgDefault } = await supabaseAdmin
    .from('notification_org_defaults')
    .select('in_app_enabled, email_enabled')
    .eq('organization_id', orgId)
    .eq('event_type', eventType)
    .maybeSingle()

  if (orgDefault) return channel === 'in_app' ? orgDefault.in_app_enabled : orgDefault.email_enabled

  const catalog = getCatalogEntry(eventType as NotificationRow['eventType'])
  return channel === 'in_app' ? (catalog?.defaultInApp ?? true) : (catalog?.defaultEmail ?? false)
}

async function _send(input: NotificationEnqueueInput): Promise<void> {
  const { tenant, eventType, data, link, titleOverride, recipientIds } = input
  const catalog = getCatalogEntry(eventType)
  const title   = titleOverride ?? catalog?.label ?? eventType

  const allRecipients = await resolveRecipientIds(tenant.organizationId, eventType, recipientIds)
  if (allRecipients.length === 0) return

  // Determine which recipients want in-app vs email
  const inAppRecipients: string[] = []
  const emailRecipients: string[] = []

  await Promise.all(
    allRecipients.map(async (uid) => {
      const [wantsInApp, wantsEmail] = await Promise.all([
        shouldSendToUser(tenant.organizationId, uid, eventType, 'in_app'),
        shouldSendToUser(tenant.organizationId, uid, eventType, 'email'),
      ])
      if (wantsInApp) inAppRecipients.push(uid)
      if (wantsEmail) emailRecipients.push(uid)
    }),
  )

  // Bulk-insert in-app notifications
  if (inAppRecipients.length > 0) {
    const rows = inAppRecipients.map((uid) => ({
      organization_id: tenant.organizationId,
      space_id:        tenant.spaceId ?? null,
      recipient_id:    uid,
      event_type:      eventType,
      title,
      data,
      link:            link ?? null,
    }))
    const { error } = await supabaseAdmin.from('notifications').insert(rows)
    if (error) console.error('[notificationQueue] insert error', error)
  }

  // Send email for recipients who opted in — fire-and-forget per recipient
  if (emailRecipients.length > 0) {
    const { data: users } = await supabaseAdmin
      .from('users')
      .select('id, email, display_name')
      .in('id', emailRecipients)
    for (const user of (users ?? [])) {
      const email = user.email as string
      if (!email) continue
      sendEmail({
        to:      email,
        subject: `${title} — Makhzoon`,
        html:    buildSimpleEmailHtml(title, data, link),
        text:    `${title}\n\n${link ?? ''}`,
      }).catch((err) => console.error('[notificationQueue] email error', err))
    }
  }
}

function buildSimpleEmailHtml(title: string, data: Record<string, unknown>, link?: string): string {
  const detail = Object.entries(data)
    .map(([k, v]) => `<tr><td style="color:#666;padding:2px 8px">${k}</td><td>${v}</td></tr>`)
    .join('')
  return `
<!DOCTYPE html>
<html>
<body style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:32px 16px;color:#111">
  <h2 style="margin:0 0 16px;font-size:20px">${title}</h2>
  ${detail ? `<table style="border-collapse:collapse;font-size:13px;margin-bottom:16px">${detail}</table>` : ''}
  ${link ? `<a href="${link}" style="display:inline-block;padding:10px 20px;background:#C2185B;color:#fff;border-radius:6px;text-decoration:none;font-weight:600">View in Makhzoon</a>` : ''}
  <p style="margin-top:32px;font-size:11px;color:#aaa">You received this because you have notifications enabled in your Makhzoon workspace.</p>
</body>
</html>`
}

export const notificationQueue = {
  enqueue(input: NotificationEnqueueInput): void {
    _send(input).catch((err) => console.error('[notificationQueue] _send error', err))
  },
}
