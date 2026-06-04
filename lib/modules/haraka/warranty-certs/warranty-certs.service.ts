import { NextResponse } from 'next/server'
import type { TenantContext } from '@/lib/platform/tenancy/types'
import { hasPermission } from '@/lib/platform/permissions'
import { auditLog } from '@/lib/platform/audit'
import {
  WarrantyCertsRepository,
  type ListCertsOpts,
  type CreateCertInput,
} from './warranty-certs.repository'

const repo = new WarrantyCertsRepository()

function requireView(tenant: TenantContext) {
  if (!hasPermission(tenant, 'pos', 'view_warranty_certs')) {
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
}

function requireManage(tenant: TenantContext) {
  if (!hasPermission(tenant, 'pos', 'manage_warranty_certs')) {
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
}

export class WarrantyCertsService {
  /** Config is also needed for the public cert view — no auth gate here */
  async getConfig(orgId: string) {
    return repo.getConfig(orgId)
  }

  async updateConfig(tenant: TenantContext, patch: Parameters<typeof repo.upsertConfig>[1]) {
    if (!hasPermission(tenant, 'settings', 'orgInfo')) {
      throw NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const config = await repo.upsertConfig(tenant, patch)
    auditLog.queue({ tenant, module: 'pos', action: 'WARRANTY_CONFIG_UPDATED', recordId: tenant.organizationId })
    return config
  }

  async list(tenant: TenantContext, opts?: ListCertsOpts) {
    requireView(tenant)
    return repo.list(tenant, opts)
  }

  /** getById has no auth gate — used by the public cert page */
  async getById(orgId: string, id: string) {
    const cert = await repo.getById(orgId, id)
    if (!cert) throw NextResponse.json({ error: 'Not found' }, { status: 404 })
    return cert
  }

  async findByOrderId(tenant: TenantContext, orderId: string) {
    requireView(tenant)
    return repo.findByOrderId(tenant, orderId)
  }

  async create(tenant: TenantContext, input: CreateCertInput) {
    requireManage(tenant)
    const cert = await repo.create(tenant, input)
    auditLog.queue({
      tenant,
      module: 'pos',
      action: 'WARRANTY_CERT_CREATED',
      recordId: cert.id,
      newValue: { warrantyNumber: cert.warrantyNumber, orderId: cert.orderId },
    })
    return cert
  }

  async delete(tenant: TenantContext, id: string) {
    requireManage(tenant)
    await this.getById(tenant.organizationId, id)
    await repo.delete(tenant, id)
    auditLog.queue({ tenant, module: 'pos', action: 'WARRANTY_CERT_DELETED', recordId: id })
  }
}
