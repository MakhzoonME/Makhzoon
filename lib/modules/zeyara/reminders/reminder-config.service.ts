import 'server-only'

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { TenantContext } from '@/lib/platform/tenancy/types'
import { hasPermission } from '@/lib/platform/permissions'
import { auditLog } from '@/lib/platform/audit'
import {
  parseReminderConfig,
  reminderConfigSchema,
  type ReminderConfig,
  type ReminderConfigPayload,
} from './config'

type Row = Record<string, unknown>

export { reminderConfigSchema }
export type { ReminderConfigPayload }

export class ReminderConfigService {
  async get(tenant: TenantContext): Promise<ReminderConfig> {
    if (!hasPermission(tenant, 'zeyara', 'view')) {
      throw NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const { data } = await supabaseAdmin
      .from('organization_configs')
      .select('appointment_reminder_config')
      .eq('organization_id', tenant.organizationId)
      .maybeSingle()
    return parseReminderConfig((data as Row | null)?.appointment_reminder_config)
  }

  /** Managing what gets messaged to patients is an admin-level change, so it
   *  rides the same gate as the rest of the clinic's configuration. */
  async update(tenant: TenantContext, patch: ReminderConfigPayload): Promise<ReminderConfig> {
    if (!hasPermission(tenant, 'zeyara', 'staffManage')) {
      throw NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const { error } = await supabaseAdmin
      .from('organization_configs')
      .upsert(
        {
          organization_id: tenant.organizationId,
          appointment_reminder_config: patch,
        },
        { onConflict: 'organization_id' },
      )
    if (error) throw error

    auditLog.queue({
      tenant,
      module:   'zeyara',
      action:   'APPOINTMENT_REMINDER_CONFIG_UPDATED',
      recordId: tenant.organizationId,
      newValue: patch as unknown as Record<string, unknown>,
    })
    return parseReminderConfig(patch)
  }
}
