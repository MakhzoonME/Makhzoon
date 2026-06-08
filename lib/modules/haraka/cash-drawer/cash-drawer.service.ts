import { NextResponse } from 'next/server'
import type { TenantContext } from '@/lib/platform/tenancy/types'
import { hasPermission } from '@/lib/platform/permissions'
import { auditLog } from '@/lib/platform/audit'
import { CashDrawerRepository } from './cash-drawer.repository'
import type { CashDrawerConfig } from './cash-drawer.repository'

const repo = new CashDrawerRepository()

export class CashDrawerService {
  /** Any cashier who can run a session may read the config (needed to show/hide the button). */
  async getConfig(tenant: TenantContext): Promise<CashDrawerConfig> {
    if (!hasPermission(tenant, 'pos', 'open_session')) {
      throw NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return repo.getConfig(tenant)
  }

  async updateConfig(
    tenant: TenantContext,
    patch: Partial<Omit<CashDrawerConfig, 'organizationId'>>,
    pin?: string | null,
  ): Promise<CashDrawerConfig> {
    if (!hasPermission(tenant, 'settings', 'fawtara')) {
      throw NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const config = await repo.upsertConfig(tenant, patch, pin)
    auditLog.queue({
      tenant,
      module: 'pos',
      action: 'CASH_DRAWER_CONFIG_UPDATED',
      recordId: tenant.organizationId,
      newValue: { ...patch, pinChanged: pin !== undefined },
    })
    return config
  }

  async verifyPin(tenant: TenantContext, pin: string): Promise<boolean> {
    if (!hasPermission(tenant, 'pos', 'open_session')) {
      throw NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return repo.verifyPin(tenant, pin)
  }
}
