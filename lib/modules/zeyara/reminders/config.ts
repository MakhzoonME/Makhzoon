// Pure reminder configuration — parsing, clamping, and the template names.
//
// Deliberately free of 'server-only' and of any DB access, mirroring
// lib/platform/entitlements.ts: the settings page, the API schema, and the
// cron sweep all need this, and only the sweep runs on the server.
import { z } from 'zod'

/**
 * Meta requires every WhatsApp template to be pre-approved in the org's
 * WhatsApp Business account, as Utility category. These two must exist there
 * before anything sends; until they do, sends fail and are logged with
 * status='failed' (visible, and never retried — see the unique index in 0081).
 *
 * Positional body params, in order:
 *   appointment_reminder → {{1}} patient, {{2}} date/time, {{3}} service
 *   follow_up_due        → {{1}} patient, {{2}} clinic/org name
 */
export const REMINDER_TEMPLATES = {
  upcoming:  'appointment_reminder',
  follow_up: 'follow_up_due',
} as const

export type ReminderKind = keyof typeof REMINDER_TEMPLATES

export interface ReminderConfig {
  enabled: boolean
  /** How far ahead of the appointment to nudge. */
  hoursBefore: number
  followUpEnabled: boolean
}

/** Opt-in: a migration must never start messaging an org's patients. */
const DEFAULT_CONFIG: ReminderConfig = {
  enabled: false,
  hoursBefore: 24,
  followUpEnabled: false,
}

/** Longest lead time we'll honour. Beyond a week a "reminder" stops being one,
 *  and a wide window is the easy way to accidentally message a whole list. */
export const MAX_HOURS_BEFORE = 168

export function parseReminderConfig(raw: unknown): ReminderConfig {
  if (!raw || typeof raw !== 'object') return DEFAULT_CONFIG
  const r = raw as Record<string, unknown>
  const hours = Number(r.hoursBefore ?? DEFAULT_CONFIG.hoursBefore)
  return {
    // Only an explicit boolean true counts — a truthy string in stored JSON
    // must not switch messaging on.
    enabled: r.enabled === true,
    hoursBefore: Number.isFinite(hours)
      ? Math.min(Math.max(Math.round(hours), 1), MAX_HOURS_BEFORE)
      : DEFAULT_CONFIG.hoursBefore,
    followUpEnabled: r.followUpEnabled === true,
  }
}

export const reminderConfigSchema = z.object({
  enabled: z.boolean(),
  hoursBefore: z.number().int().min(1).max(MAX_HOURS_BEFORE),
  followUpEnabled: z.boolean(),
})

export type ReminderConfigPayload = z.infer<typeof reminderConfigSchema>
