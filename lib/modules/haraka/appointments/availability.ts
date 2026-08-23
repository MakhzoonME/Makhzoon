/**
 * Availability + conflict math for appointments. Pure functions, no I/O — the
 * repository fetches the rules, this file decides whether a slot is bookable,
 * so the rules are unit-testable without a database.
 *
 * Timezone (design-doc open question §10): `haraka_staff_availability` stores
 * timezone-naive `time` values while an appointment's `scheduled_at` is a
 * timestamptz. `organizations.timezone` (migration 0070) is the zone that
 * reconciles them — every comparison below converts the instant into that
 * zone first, so "09:00–17:00" means 09:00–17:00 where the business is, not
 * wherever the server happens to run.
 */

import type { HarakaStaffAvailability, HarakaStaffAvailabilityException } from '@/types'

export const DEFAULT_ORG_TIMEZONE = 'Asia/Amman'

/** A bookable block within one calendar day, as minutes from midnight. */
export interface WorkingWindow {
  startMinutes: number
  endMinutes: number
}

/** Where an instant falls in the org's timezone. */
export interface ZonedInstant {
  /** 'YYYY-MM-DD' in the org's timezone. */
  isoDate: string
  /** 0 = Sunday … 6 = Saturday. */
  dayOfWeek: number
  /** Minutes since local midnight. */
  minutesOfDay: number
}

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
}

/** 'HH:mm' (or 'HH:mm:ss') → minutes since midnight. */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':')
  return Number(h) * 60 + Number(m)
}

/** Minutes since midnight → 'HH:mm'. Values past 24:00 wrap for display only. */
export function minutesToTime(minutes: number): string {
  const m = ((minutes % 1440) + 1440) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

/**
 * Project an absolute instant into the org's timezone. Uses Intl rather than
 * Date's local getters so the answer doesn't depend on the server's TZ (which
 * is UTC on Cloudflare Workers).
 */
export function toZonedInstant(date: Date, timeZone: string): ZonedInstant {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    weekday: 'short',
  }).formatToParts(date)

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''

  return {
    isoDate: `${get('year')}-${get('month')}-${get('day')}`,
    dayOfWeek: WEEKDAY_INDEX[get('weekday')] ?? 0,
    minutesOfDay: Number(get('hour')) * 60 + Number(get('minute')),
  }
}

/**
 * The blocks this provider actually works on one specific date.
 *
 * An exception fully replaces the weekly pattern for its date: with no times
 * it's a day off (no windows at all), with times it's replacement hours.
 * Otherwise the weekly rows for that weekday apply — several are allowed, so
 * split shifts work.
 */
export function resolveWorkingWindows(rules: {
  weekly: HarakaStaffAvailability[]
  exception: HarakaStaffAvailabilityException | null
}): WorkingWindow[] {
  const { weekly, exception } = rules

  if (exception) {
    if (!exception.startTime || !exception.endTime) return [] // day off
    return [
      {
        startMinutes: timeToMinutes(exception.startTime),
        endMinutes: timeToMinutes(exception.endTime),
      },
    ]
  }

  return weekly
    .map((w) => ({
      startMinutes: timeToMinutes(w.startTime),
      endMinutes: timeToMinutes(w.endTime),
    }))
    .sort((a, b) => a.startMinutes - b.startMinutes)
}

/**
 * True when the whole requested block fits inside a single working window.
 * A booking is not allowed to straddle two windows (the gap between split
 * shifts is genuinely unavailable), nor to run past midnight.
 */
export function fitsWorkingWindows(
  startMinutes: number,
  endMinutes: number,
  windows: WorkingWindow[],
): boolean {
  return windows.some((w) => startMinutes >= w.startMinutes && endMinutes <= w.endMinutes)
}

/**
 * Half-open interval overlap: [aStart, aEnd) vs [bStart, bEnd). Back-to-back
 * bookings (one ends exactly where the next begins) do NOT overlap.
 */
export function intervalsOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): boolean {
  return aStart < bEnd && bStart < aEnd
}

export interface ExistingBooking {
  id: string
  scheduledAt: Date
  durationMinutes: number
}

/**
 * The first already-booked appointment that collides with the requested block,
 * or null when the slot is free. `excludeId` skips the appointment being
 * rescheduled so it never conflicts with itself.
 *
 * Caller is responsible for passing only status-blocking appointments —
 * cancelled and no-show rows free their slot for rebooking.
 */
export function findConflict(
  requested: { scheduledAt: Date; durationMinutes: number },
  existing: ExistingBooking[],
  excludeId?: string,
): ExistingBooking | null {
  const start = requested.scheduledAt.getTime()
  const end = start + requested.durationMinutes * 60_000

  for (const booking of existing) {
    if (excludeId && booking.id === excludeId) continue
    const bStart = booking.scheduledAt.getTime()
    const bEnd = bStart + booking.durationMinutes * 60_000
    if (intervalsOverlap(start, end, bStart, bEnd)) return booking
  }
  return null
}
