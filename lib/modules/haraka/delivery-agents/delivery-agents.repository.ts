/**
 * @deprecated Compatibility shim.
 *
 * `haraka_delivery_agents` became `haraka_staff` in migration 0067 and this
 * module moved to `lib/modules/haraka/staff/`. This wrapper preserves the old
 * delivery-agent API — including `list(tenant, onlyActive)`'s boolean second
 * argument — so existing call sites compile and behave unchanged. Every read
 * is scoped to delivery-capable staff, which is exactly what this repository
 * returned before the directory absorbed other capabilities.
 *
 * New code should use `@/lib/modules/haraka/staff/staff.repository`.
 */
import 'server-only'
import type { TenantContext } from '@/lib/platform/tenancy/types'
import type { HarakaStaff } from '@/types'
import { StaffRepository, type CreateStaffInput } from '@/lib/modules/haraka/staff/staff.repository'

export type CreateDeliveryAgentInput = Omit<CreateStaffInput, 'capabilities'>

export class DeliveryAgentsRepository {
  private readonly staff = new StaffRepository()

  list(tenant: TenantContext, onlyActive = false): Promise<HarakaStaff[]> {
    return this.staff.list(tenant, { onlyActive, capability: 'delivery' })
  }

  getById(tenant: TenantContext, id: string): Promise<HarakaStaff | null> {
    return this.staff.getById(tenant, id)
  }

  create(tenant: TenantContext, input: CreateDeliveryAgentInput): Promise<HarakaStaff> {
    return this.staff.create(tenant, { ...input, capabilities: ['delivery'] })
  }

  update(
    tenant: TenantContext,
    id: string,
    patch: Partial<CreateDeliveryAgentInput>,
  ): Promise<HarakaStaff> {
    return this.staff.update(tenant, id, patch)
  }

  delete(tenant: TenantContext, id: string): Promise<void> {
    return this.staff.delete(tenant, id)
  }

  openJobCounts(tenant: TenantContext, agentIds: string[]): Promise<Record<string, number>> {
    return this.staff.openJobCounts(tenant, agentIds)
  }
}
