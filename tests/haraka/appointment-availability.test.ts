import { describe, it, expect } from 'vitest';
import {
  fitsWorkingWindows,
  findConflict,
  intervalsOverlap,
  minutesToTime,
  resolveWorkingWindows,
  timeToMinutes,
  toZonedInstant,
} from '@/lib/modules/haraka/appointments/availability';
import type { HarakaStaffAvailability, HarakaStaffAvailabilityException } from '@/types';

function weekly(
  dayOfWeek: number,
  startTime: string,
  endTime: string,
): HarakaStaffAvailability {
  return {
    id: `${dayOfWeek}-${startTime}`,
    organizationId: 'org-1',
    staffId: 'staff-1',
    dayOfWeek,
    startTime,
    endTime,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function exception(
  exceptionDate: string,
  startTime: string | null,
  endTime: string | null,
): HarakaStaffAvailabilityException {
  return {
    id: exceptionDate,
    organizationId: 'org-1',
    staffId: 'staff-1',
    exceptionDate,
    startTime,
    endTime,
    reason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('time helpers', () => {
  it('round-trips HH:mm through minutes', () => {
    expect(timeToMinutes('09:30')).toBe(570);
    expect(minutesToTime(570)).toBe('09:30');
    expect(timeToMinutes('00:00')).toBe(0);
    expect(minutesToTime(0)).toBe('00:00');
  });

  it('accepts the HH:mm:ss form Postgres returns', () => {
    expect(timeToMinutes('17:00:00')).toBe(1020);
  });
});

describe('toZonedInstant', () => {
  it('reads the instant in the org timezone, not the server one', () => {
    // 06:30 UTC is 09:30 in Amman (UTC+3).
    const zoned = toZonedInstant(new Date('2026-08-24T06:30:00.000Z'), 'Asia/Amman');
    expect(zoned.isoDate).toBe('2026-08-24');
    expect(zoned.minutesOfDay).toBe(9 * 60 + 30);
    expect(zoned.dayOfWeek).toBe(1); // Monday
  });

  it('rolls the local date over when the offset crosses midnight', () => {
    // 22:00 UTC on the 24th is 01:00 on the 25th in Amman.
    const zoned = toZonedInstant(new Date('2026-08-24T22:00:00.000Z'), 'Asia/Amman');
    expect(zoned.isoDate).toBe('2026-08-25');
    expect(zoned.minutesOfDay).toBe(60);
    expect(zoned.dayOfWeek).toBe(2); // Tuesday
  });

  it('gives a different answer for a different zone', () => {
    const utc = toZonedInstant(new Date('2026-08-24T06:30:00.000Z'), 'UTC');
    expect(utc.minutesOfDay).toBe(6 * 60 + 30);
  });
});

describe('resolveWorkingWindows', () => {
  it('maps the weekly pattern, sorted by start time', () => {
    const windows = resolveWorkingWindows({
      weekly: [weekly(1, '14:00', '18:00'), weekly(1, '09:00', '12:00')],
      exception: null,
    });
    expect(windows).toEqual([
      { startMinutes: 540, endMinutes: 720 },
      { startMinutes: 840, endMinutes: 1080 },
    ]);
  });

  it('treats a time-less exception as a full day off', () => {
    const windows = resolveWorkingWindows({
      weekly: [weekly(1, '09:00', '17:00')],
      exception: exception('2026-08-24', null, null),
    });
    expect(windows).toEqual([]);
  });

  it('lets an exception with times replace the weekly hours entirely', () => {
    const windows = resolveWorkingWindows({
      weekly: [weekly(1, '09:00', '17:00')],
      exception: exception('2026-08-24', '12:00', '15:00'),
    });
    expect(windows).toEqual([{ startMinutes: 720, endMinutes: 900 }]);
  });
});

describe('fitsWorkingWindows', () => {
  const split = [
    { startMinutes: 540, endMinutes: 720 },  // 09:00–12:00
    { startMinutes: 840, endMinutes: 1080 }, // 14:00–18:00
  ];

  it('accepts a block inside one window', () => {
    expect(fitsWorkingWindows(600, 660, split)).toBe(true);
  });

  it('accepts a block that exactly fills a window', () => {
    expect(fitsWorkingWindows(540, 720, split)).toBe(true);
  });

  it('rejects a block that runs past the window end', () => {
    expect(fitsWorkingWindows(690, 750, split)).toBe(false);
  });

  it('rejects a block that straddles the gap between split shifts', () => {
    expect(fitsWorkingWindows(700, 860, split)).toBe(false);
  });

  it('rejects everything when there are no windows', () => {
    expect(fitsWorkingWindows(600, 660, [])).toBe(false);
  });
});

describe('intervalsOverlap', () => {
  it('does not treat back-to-back intervals as overlapping', () => {
    expect(intervalsOverlap(0, 60, 60, 120)).toBe(false);
    expect(intervalsOverlap(60, 120, 0, 60)).toBe(false);
  });

  it('detects partial and full containment', () => {
    expect(intervalsOverlap(0, 60, 30, 90)).toBe(true);
    expect(intervalsOverlap(0, 120, 30, 60)).toBe(true);
  });
});

describe('findConflict', () => {
  const nineAm = new Date('2026-08-24T09:00:00.000Z');
  const tenAm = new Date('2026-08-24T10:00:00.000Z');

  it('returns null when the slot is free', () => {
    const conflict = findConflict(
      { scheduledAt: tenAm, durationMinutes: 30 },
      [{ id: 'a', scheduledAt: nineAm, durationMinutes: 30 }],
    );
    expect(conflict).toBeNull();
  });

  it('allows an appointment starting exactly when another ends', () => {
    const conflict = findConflict(
      { scheduledAt: tenAm, durationMinutes: 30 },
      [{ id: 'a', scheduledAt: nineAm, durationMinutes: 60 }],
    );
    expect(conflict).toBeNull();
  });

  it('flags an overlapping appointment', () => {
    const conflict = findConflict(
      { scheduledAt: new Date('2026-08-24T09:30:00.000Z'), durationMinutes: 30 },
      [{ id: 'a', scheduledAt: nineAm, durationMinutes: 60 }],
    );
    expect(conflict?.id).toBe('a');
  });

  it('ignores the appointment being rescheduled', () => {
    const conflict = findConflict(
      { scheduledAt: nineAm, durationMinutes: 60 },
      [{ id: 'a', scheduledAt: nineAm, durationMinutes: 60 }],
      'a',
    );
    expect(conflict).toBeNull();
  });
});

