import { describe, it, expect } from 'vitest';
import {
  parseReminderConfig,
  REMINDER_TEMPLATES,
  reminderConfigSchema,
} from '@/lib/modules/zeyara/reminders/config';

import {
  createVisitSchema,
  updateVisitSchema,
  addVisitNoteSchema,
} from '@/lib/modules/zeyara/visits/schemas';
import { createCustomFieldSchema } from '@/lib/modules/banna/validators/schemas';
import {
  DEFAULT_ADMIN_PERMISSIONS,
  DEFAULT_STAFF_PERMISSIONS,
  MODULE_PERMISSIONS_CONFIG,
} from '@/types';
import { hasPermission } from '@/lib/permissions';
import type { AuthUser } from '@/types/auth.types';

function staffWith(permissions: Record<string, Record<string, boolean>>): AuthUser {
  return { role: 'staff', permissions } as unknown as AuthUser;
}

const UUID = '00000000-0000-4000-8000-000000000000';

describe('clinical record schemas', () => {
  it('requires an appointment to open a record', () => {
    // A visit exists to describe one booking. Without that link the clinical
    // history and the billing history can drift apart.
    expect(createVisitSchema.safeParse({}).success).toBe(false);
    expect(createVisitSchema.safeParse({ appointmentId: UUID }).success).toBe(true);
  });

  it('refuses to re-point a record at a different appointment', () => {
    // appointmentId must not be updatable — zod strips unknown keys, so assert
    // on the OUTPUT rather than on whether parsing succeeded.
    const parsed = updateVisitSchema.safeParse({ appointmentId: UUID, diagnosis: 'x' });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect('appointmentId' in parsed.data).toBe(false);
  });

  it('accepts an ISO follow-up date and rejects anything else', () => {
    expect(createVisitSchema.safeParse({ appointmentId: UUID, followUpDue: '2026-09-01' }).success).toBe(true);
    expect(createVisitSchema.safeParse({ appointmentId: UUID, followUpDue: '01/09/2026' }).success).toBe(false);
  });

  it('rejects an empty clinical note', () => {
    expect(addVisitNoteSchema.safeParse({ body: '   ' }).success).toBe(false);
    expect(addVisitNoteSchema.safeParse({ body: 'Patient reports improvement.' }).success).toBe(true);
  });
});

describe('custom fields reach bookings and clinical records', () => {
  // Phase 3 is worthless if the field-definition validator still rejects the
  // new scopes — the DB constraint alone would let a row in that the API
  // refuses to create.
  it('accepts the Zeyara scopes', () => {
    for (const module of ['appointments', 'visits']) {
      const parsed = createCustomFieldSchema.safeParse({
        module,
        fieldKey: 'referral_source',
        type: 'text',
        label: 'Referral source',
      });
      expect(parsed.success, `'${module}' was rejected`).toBe(true);
    }
  });

  it('still rejects an unknown scope', () => {
    const parsed = createCustomFieldSchema.safeParse({
      module: 'not_a_module',
      fieldKey: 'x',
      type: 'text',
      label: 'X',
    });
    expect(parsed.success).toBe(false);
  });
});

describe('reminder configuration', () => {
  it('defaults to OFF when an org has never configured it', () => {
    // A migration must never start messaging patients.
    for (const raw of [null, undefined, {}, 'nonsense']) {
      expect(parseReminderConfig(raw).enabled, `${JSON.stringify(raw)} enabled reminders`).toBe(false);
    }
  });

  it('clamps the lead time into a sane window', () => {
    // A nonsense value must not turn the sweep into a month-wide broadcast.
    expect(parseReminderConfig({ enabled: true, hoursBefore: 100000 }).hoursBefore).toBe(168);
    expect(parseReminderConfig({ enabled: true, hoursBefore: 0 }).hoursBefore).toBe(1);
    expect(parseReminderConfig({ enabled: true, hoursBefore: -5 }).hoursBefore).toBe(1);
    expect(parseReminderConfig({ enabled: true, hoursBefore: 'x' }).hoursBefore).toBe(24);
    expect(parseReminderConfig({ enabled: true, hoursBefore: 48 }).hoursBefore).toBe(48);
  });

  it('treats only an explicit true as enabled', () => {
    expect(parseReminderConfig({ enabled: 'yes' }).enabled).toBe(false);
    expect(parseReminderConfig({ enabled: 1 }).enabled).toBe(false);
    expect(parseReminderConfig({ enabled: true }).enabled).toBe(true);
  });

  it('rejects an out-of-range lead time at the API boundary too', () => {
    expect(reminderConfigSchema.safeParse({ enabled: true, hoursBefore: 200, followUpEnabled: false }).success).toBe(false);
    expect(reminderConfigSchema.safeParse({ enabled: true, hoursBefore: 24, followUpEnabled: false }).success).toBe(true);
  });

  it('names both pre-approved WhatsApp templates', () => {
    // Meta requires these to exist and be approved; a rename here silently
    // breaks delivery, so pin the names.
    expect(REMINDER_TEMPLATES.upcoming).toBe('appointment_reminder');
    expect(REMINDER_TEMPLATES.follow_up).toBe('follow_up_due');
  });
});

describe('clinical permissions are Zeyara-only', () => {
  const CLINICAL_OPS = [
    'visitsView', 'visitsCreate', 'visitsUpdate', 'visitsDelete',
    'visitNotesCreate', 'visitAttachmentsUpload', 'visitAttachmentsDelete',
    'followUpsView',
  ];

  it('declares every clinical op in the Zeyara namespace', () => {
    const block = DEFAULT_ADMIN_PERMISSIONS.zeyara as unknown as Record<string, boolean>;
    for (const op of CLINICAL_OPS) {
      expect(block[op], `'zeyara.${op}' is missing`).toBe(true);
    }
  });

  it('gives Haraka no clinical operations at all', () => {
    // Clinical data has no Haraka counterpart — a commerce org must not be
    // able to hold, or be granted, a permission that reads patient records.
    const haraka = DEFAULT_ADMIN_PERMISSIONS.haraka as unknown as Record<string, boolean>;
    for (const op of CLINICAL_OPS) {
      expect(op in haraka, `'haraka.${op}' should not exist`).toBe(false);
    }
  });

  it('refuses a clinical op to a user holding only Haraka grants', () => {
    const commerceUser = staffWith({
      haraka: DEFAULT_ADMIN_PERMISSIONS.haraka as unknown as Record<string, boolean>,
    });
    for (const op of CLINICAL_OPS) {
      expect(
        hasPermission(commerceUser, 'zeyara', op),
        `'${op}' leaked to a Haraka-only user`,
      ).toBe(false);
    }
  });

  it('keeps clinical ops closed for staff by default', () => {
    const staff = DEFAULT_STAFF_PERMISSIONS.zeyara as unknown as Record<string, boolean>;
    for (const op of CLINICAL_OPS) {
      expect(staff[op], `'${op}' is open to staff by default`).toBe(false);
    }
  });

  it('exposes every clinical op in the permissions editor', () => {
    const mod = MODULE_PERMISSIONS_CONFIG.find((m) => m.key === 'zeyara');
    const listed = new Set((mod?.operations ?? []).map((o) => o.key));
    for (const op of CLINICAL_OPS) {
      expect(listed.has(op), `'${op}' is not configurable in the editor`).toBe(true);
    }
  });
});
