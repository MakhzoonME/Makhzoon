import { NextResponse } from 'next/server'
import type { TenantContext } from '@/lib/platform/tenancy/types'
import { hasPermission } from '@/lib/platform/permissions'
import { auditLog } from '@/lib/platform/audit'
import {
  DeliveryAgentsRepository,
  type CreateDeliveryAgentInput,
} from './delivery-agents.repository'

const repo = new DeliveryAgentsRepository()

function requireManage(tenant: TenantContext) {
  if (!hasPermission(tenant, 'pos', 'manage_delivery_agents')) {
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
}

function requireView(tenant: TenantContext) {
  if (!hasPermission(tenant, 'pos', 'view_orders')) {
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
}

export class DeliveryAgentsService {
  async list(tenant: TenantContext, onlyActive = false) {
    requireView(tenant)
    return repo.list(tenant, onlyActive)
  }

  async getById(tenant: TenantContext, id: string) {
    requireView(tenant)
    const agent = await repo.getById(tenant, id)
    if (!agent) throw NextResponse.json({ error: 'Not found' }, { status: 404 })
    return agent
  }

  async create(tenant: TenantContext, input: CreateDeliveryAgentInput) {
    requireManage(tenant)
    const agent = await repo.create(tenant, input)
    auditLog.queue({
      tenant,
      module: 'pos',
      action: 'DELIVERY_AGENT_CREATED',
      recordId: agent.id,
      newValue: { name: agent.name },
    })
    return agent
  }

  async update(tenant: TenantContext, id: string, patch: Partial<CreateDeliveryAgentInput>) {
    requireManage(tenant)
    await this.getById(tenant, id)
    const agent = await repo.update(tenant, id, patch)
    auditLog.queue({
      tenant,
      module: 'pos',
      action: 'DELIVERY_AGENT_UPDATED',
      recordId: id,
      newValue: patch,
    })
    return agent
  }

  async delete(tenant: TenantContext, id: string) {
    requireManage(tenant)
    await this.getById(tenant, id)
    await repo.delete(tenant, id)
    auditLog.queue({ tenant, module: 'pos', action: 'DELIVERY_AGENT_DELETED', recordId: id })
  }
}
