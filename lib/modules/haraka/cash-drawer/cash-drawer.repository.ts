import 'server-only';
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { TenantContext } from '@/lib/platform/tenancy/types'

export interface CashDrawerConfig {
  organizationId: string
  enabled: boolean
  autoOpenOnCash: boolean
  requirePin: boolean
  drawerPort: 0 | 1
  onTimeMs: number
  offTimeMs: number
}

const DEFAULTS: Omit<CashDrawerConfig, 'organizationId'> = {
  enabled:       false,
  autoOpenOnCash: true,
  requirePin:    false,
  drawerPort:    0,
  onTimeMs:      100,
  offTimeMs:     100,
}

type Row = Record<string, unknown>

function toConfig(r: Row): CashDrawerConfig {
  return {
    organizationId: r.organization_id as string,
    enabled:        (r.enabled as boolean) ?? false,
    autoOpenOnCash: (r.auto_open_on_cash as boolean) ?? true,
    requirePin:     (r.require_pin as boolean) ?? false,
    drawerPort:     ((r.drawer_port as number) ?? 0) as 0 | 1,
    onTimeMs:       Number(r.on_time_ms ?? 100),
    offTimeMs:      Number(r.off_time_ms ?? 100),
  }
}

export class CashDrawerRepository {
  async getConfig(tenant: TenantContext): Promise<CashDrawerConfig> {
    const { data } = await supabaseAdmin
      .from('haraka_cash_drawer_config')
      .select('*')
      .eq('organization_id', tenant.organizationId)
      .maybeSingle()
    if (!data) return { organizationId: tenant.organizationId, ...DEFAULTS }
    return toConfig(data)
  }

  async upsertConfig(
    tenant: TenantContext,
    patch: Partial<Omit<CashDrawerConfig, 'organizationId'>>,
    pin?: string | null,
  ): Promise<CashDrawerConfig> {
    const update: Record<string, unknown> = {
      organization_id:  tenant.organizationId,
      updated_by:       tenant.userId,
    }
    if (patch.enabled        !== undefined) update.enabled          = patch.enabled
    if (patch.autoOpenOnCash !== undefined) update.auto_open_on_cash = patch.autoOpenOnCash
    if (patch.requirePin     !== undefined) update.require_pin      = patch.requirePin
    if (patch.drawerPort     !== undefined) update.drawer_port      = patch.drawerPort
    if (patch.onTimeMs       !== undefined) update.on_time_ms       = patch.onTimeMs
    if (patch.offTimeMs      !== undefined) update.off_time_ms      = patch.offTimeMs
    if (pin !== undefined) {
      update.pin_hash = pin ? bcrypt.hashSync(pin, 10) : null  // null clears
    }

    const { data, error } = await supabaseAdmin
      .from('haraka_cash_drawer_config')
      .upsert(update, { onConflict: 'organization_id' })
      .select('*')
      .single()
    if (error) throw error
    return toConfig(data)
  }

  /** Returns true when the supplied PIN matches the stored bcrypt hash. */
  async verifyPin(tenant: TenantContext, pin: string): Promise<boolean> {
    const { data } = await supabaseAdmin
      .from('haraka_cash_drawer_config')
      .select('pin_hash')
      .eq('organization_id', tenant.organizationId)
      .maybeSingle()
    if (!data || !data.pin_hash) return false
    return bcrypt.compareSync(pin, data.pin_hash as string)
  }
}
