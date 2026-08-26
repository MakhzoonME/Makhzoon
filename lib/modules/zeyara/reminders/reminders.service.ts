import 'server-only'

import { supabaseAdmin } from '@/lib/supabase/admin'
import { PlatformNotificationConfigRepository } from '@/lib/platform/notification-config.repository'
import { sendWhatsAppTemplate } from '@/lib/notifications/channels/whatsapp'
import {
  REMINDER_TEMPLATES,
  parseReminderConfig,
  type ReminderConfig,
  type ReminderKind,
} from './config'

export { REMINDER_TEMPLATES, parseReminderConfig }
export type { ReminderConfig, ReminderKind }

type Row = Record<string, unknown>

const configRepo = new PlatformNotificationConfigRepository()


export interface SweepResult {
  orgsConsidered: number
  sent: number
  failed: number
  skipped: number
}

/**
 * One reminder sweep across every org that has reminders switched on.
 *
 * Idempotency is the unique index on (appointment_id, reminder_kind), not the
 * time window: the row is written for EVERY outcome, including failure, so an
 * unreachable number is attempted once rather than on every hourly run.
 */
export async function runReminderSweep(now = new Date()): Promise<SweepResult> {
  const result: SweepResult = { orgsConsidered: 0, sent: 0, failed: 0, skipped: 0 }

  // Only orgs that hold the Zeyara feature AND switched reminders on.
  const { data: configRows } = await supabaseAdmin
    .from('organization_configs')
    .select('organization_id, appointment_reminder_config')
    .not('appointment_reminder_config', 'is', null)

  const orgs = (configRows ?? []) as Row[]
  if (orgs.length === 0) return result

  const waCfg = await configRepo.getWithSecrets()
  const canSend = !!waCfg?.whatsappEnabled && !!waCfg.whatsappPhoneNumberId && !!waCfg.whatsappToken

  for (const row of orgs) {
    const cfg = parseReminderConfig(row.appointment_reminder_config)
    if (!cfg.enabled) continue
    const orgId = row.organization_id as string

    const { data: subRow } = await supabaseAdmin
      .from('subscriptions')
      .select('features')
      .eq('organization_id', orgId)
      .maybeSingle()
    const features = ((subRow as Row | null)?.features ?? {}) as Record<string, boolean>
    if (!features.zeyara) continue

    result.orgsConsidered += 1

    const { data: orgRow } = await supabaseAdmin
      .from('organizations')
      .select('name')
      .eq('id', orgId)
      .maybeSingle()
    const orgName = ((orgRow as Row | null)?.name as string) ?? 'your clinic'

    await sweepUpcoming(orgId, cfg, now, canSend, waCfg, result)
    if (cfg.followUpEnabled) {
      await sweepFollowUps(orgId, now, canSend, waCfg, orgName, result)
    }
  }

  return result
}

/** Appointments starting inside the configured lead-time window. */
async function sweepUpcoming(
  orgId: string,
  cfg: ReminderConfig,
  now: Date,
  canSend: boolean,
  waCfg: Awaited<ReturnType<PlatformNotificationConfigRepository['getWithSecrets']>>,
  result: SweepResult,
): Promise<void> {
  // The window opens at `now` and closes at the lead time. Because a sent row
  // is written once per appointment, a wider-than-necessary window only costs
  // a query — it can never double-send.
  const windowEnd = new Date(now.getTime() + cfg.hoursBefore * 3_600_000)

  const { data } = await supabaseAdmin
    .from('haraka_appointments')
    .select('id, customer_name, customer_phone, scheduled_at, status, service_id')
    .eq('organization_id', orgId)
    .gte('scheduled_at', now.toISOString())
    .lte('scheduled_at', windowEnd.toISOString())
    .in('status', ['scheduled', 'confirmed'])

  const candidates = (data ?? []) as Row[]
  // Drop anything already attempted BEFORE sending. The unique index protects
  // the log, but only this check protects the patient from an hourly repeat.
  const pending = await withoutAlreadyReminded(candidates.map((r) => r.id as string), 'upcoming')

  for (const raw of candidates) {
    const appointmentId = raw.id as string
    if (!pending.has(appointmentId)) continue
    const phone = (raw.customer_phone as string) ?? null

    if (!phone) {
      await logAttempt(orgId, appointmentId, 'upcoming', 'skipped', 'no phone number', null)
      result.skipped += 1
      continue
    }
    if (!canSend || !waCfg) {
      await logAttempt(orgId, appointmentId, 'upcoming', 'skipped', 'WhatsApp not configured', phone)
      result.skipped += 1
      continue
    }

    let serviceName = ''
    if (raw.service_id) {
      const { data: svc } = await supabaseAdmin
        .from('haraka_services')
        .select('name')
        .eq('id', raw.service_id as string)
        .maybeSingle()
      serviceName = ((svc as Row | null)?.name as string) ?? ''
    }

    const when = new Date(raw.scheduled_at as string)
    const send = await sendWhatsAppTemplate({
      phoneNumberId: waCfg.whatsappPhoneNumberId as string,
      accessToken:   waCfg.whatsappToken as string,
      to:            phone,
      templateName:  REMINDER_TEMPLATES.upcoming,
      bodyParams:    [
        (raw.customer_name as string) ?? '',
        when.toISOString().replace('T', ' ').slice(0, 16),
        serviceName,
      ],
    })

    if (send.ok) {
      await logAttempt(orgId, appointmentId, 'upcoming', 'sent', null, phone)
      result.sent += 1
    } else {
      await logAttempt(orgId, appointmentId, 'upcoming', 'failed', send.error ?? 'send failed', phone)
      result.failed += 1
    }
  }
}

/** Visits whose follow_up_due date has arrived. */
async function sweepFollowUps(
  orgId: string,
  now: Date,
  canSend: boolean,
  waCfg: Awaited<ReturnType<PlatformNotificationConfigRepository['getWithSecrets']>>,
  orgName: string,
  result: SweepResult,
): Promise<void> {
  const today = now.toISOString().slice(0, 10)

  const { data } = await supabaseAdmin
    .from('zeyara_visits')
    .select('id, appointment_id, patient_name, customer_id, follow_up_due')
    .eq('organization_id', orgId)
    .lte('follow_up_due', today)
    .not('follow_up_due', 'is', null)

  const candidates = (data ?? []) as Row[]
  const pending = await withoutAlreadyReminded(
    candidates.map((r) => r.appointment_id as string),
    'follow_up',
  )

  for (const raw of candidates) {
    // Keyed on the originating appointment so the unique index applies — a
    // patient is nudged once per visit's follow-up, not once per sweep.
    const appointmentId = raw.appointment_id as string
    if (!pending.has(appointmentId)) continue

    let phone: string | null = null
    if (raw.customer_id) {
      const { data: cust } = await supabaseAdmin
        .from('pos_customers')
        .select('phone')
        .eq('id', raw.customer_id as string)
        .maybeSingle()
      phone = ((cust as Row | null)?.phone as string) ?? null
    }

    if (!phone) {
      await logAttempt(orgId, appointmentId, 'follow_up', 'skipped', 'no phone number', null)
      result.skipped += 1
      continue
    }
    if (!canSend || !waCfg) {
      await logAttempt(orgId, appointmentId, 'follow_up', 'skipped', 'WhatsApp not configured', phone)
      result.skipped += 1
      continue
    }

    const send = await sendWhatsAppTemplate({
      phoneNumberId: waCfg.whatsappPhoneNumberId as string,
      accessToken:   waCfg.whatsappToken as string,
      to:            phone,
      templateName:  REMINDER_TEMPLATES.follow_up,
      bodyParams:    [(raw.patient_name as string) ?? '', orgName],
    })

    if (send.ok) {
      await logAttempt(orgId, appointmentId, 'follow_up', 'sent', null, phone)
      result.sent += 1
    } else {
      await logAttempt(orgId, appointmentId, 'follow_up', 'failed', send.error ?? 'send failed', phone)
      result.failed += 1
    }
  }
}

/**
 * Records the attempt. Relies on the unique index to swallow a duplicate —
 * an already-reminded appointment simply conflicts and is left alone, which
 * is why the sweep can run as often as it likes.
 */
async function logAttempt(
  organizationId: string,
  appointmentId: string,
  kind: ReminderKind,
  status: 'sent' | 'failed' | 'skipped',
  error: string | null,
  recipient: string | null,
): Promise<void> {
  await supabaseAdmin
    .from('zeyara_appointment_reminders')
    .upsert(
      {
        organization_id: organizationId,
        appointment_id:  appointmentId,
        reminder_kind:   kind,
        channel:         'whatsapp',
        status,
        error,
        recipient,
        sent_at:         new Date().toISOString(),
      },
      { onConflict: 'appointment_id,reminder_kind', ignoreDuplicates: true },
    )
}

/**
 * Of these appointment ids, which have NOT yet been attempted for this kind?
 *
 * One query for the whole page rather than one per appointment — a busy clinic
 * sweep would otherwise issue hundreds of round trips per run.
 */
async function withoutAlreadyReminded(
  appointmentIds: string[],
  kind: ReminderKind,
): Promise<Set<string>> {
  const pending = new Set(appointmentIds)
  if (pending.size === 0) return pending

  const { data } = await supabaseAdmin
    .from('zeyara_appointment_reminders')
    .select('appointment_id')
    .eq('reminder_kind', kind)
    .in('appointment_id', [...pending])

  for (const r of (data ?? []) as Row[]) {
    pending.delete(r.appointment_id as string)
  }
  return pending
}
