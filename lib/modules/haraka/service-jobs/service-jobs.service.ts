import { NextResponse } from 'next/server'
import type { TenantContext } from '@/lib/platform/tenancy/types'
import { hasPermission } from '@/lib/platform/permissions'
import { auditLog } from '@/lib/platform/audit'
import { notificationQueue } from '@/lib/notifications/notification-queue'
import type { ServiceJobStatus } from '@/types'
import { isValidTransition } from './schemas'
import {
  ServiceJobsRepository,
  type CreateServiceJobInput,
  type ListServiceJobsOpts,
} from './service-jobs.repository'

const repo = new ServiceJobsRepository()

function requireView(tenant: TenantContext) {
  if (!hasPermission(tenant, 'pos', 'view_service_jobs')) {
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
}

function requireManage(tenant: TenantContext) {
  if (!hasPermission(tenant, 'pos', 'manage_service_jobs')) {
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
}

export class ServiceJobsService {
  async list(tenant: TenantContext, opts?: ListServiceJobsOpts) {
    requireView(tenant)
    return repo.list(tenant, opts)
  }

  async getById(tenant: TenantContext, id: string) {
    requireView(tenant)
    const job = await repo.getById(tenant, id)
    if (!job) throw NextResponse.json({ error: 'Not found' }, { status: 404 })
    return job
  }

  async create(tenant: TenantContext, input: CreateServiceJobInput) {
    requireManage(tenant)
    const job = await repo.create(tenant, input)
    auditLog.queue({
      tenant,
      module:   'pos',
      action:   'SERVICE_JOB_CREATED',
      recordId: job.id,
      newValue: { jobNumber: job.jobNumber, serviceType: job.serviceType, total: job.total },
    })
    notificationQueue.enqueue({
      tenant,
      eventType:     'service_job.created',
      data:          { jobNumber: job.jobNumber, serviceType: job.serviceType, customerName: job.customerName },
      link:          `/haraka/service-jobs/${job.id}`,
      titleOverride: `New service job ${job.jobNumber} created`,
    })
    return job
  }

  async update(
    tenant: TenantContext,
    id: string,
    patch: Parameters<typeof repo.update>[2],
  ) {
    requireManage(tenant)
    await this.getById(tenant, id)
    const job = await repo.update(tenant, id, patch)
    auditLog.queue({ tenant, module: 'pos', action: 'SERVICE_JOB_UPDATED', recordId: id, newValue: patch })
    return job
  }

  async updateStatus(tenant: TenantContext, id: string, newStatus: ServiceJobStatus) {
    requireManage(tenant)
    const job = await this.getById(tenant, id)
    if (!isValidTransition(job.status, newStatus)) {
      throw NextResponse.json(
        { error: `Cannot transition from '${job.status}' to '${newStatus}'` },
        { status: 400 },
      )
    }
    const updated = await repo.updateStatus(tenant, id, newStatus)
    auditLog.queue({
      tenant,
      module:   'pos',
      action:   'SERVICE_JOB_STATUS_CHANGED',
      recordId: id,
      newValue: { from: job.status, to: newStatus },
    })
    notificationQueue.enqueue({
      tenant,
      eventType:     'service_job.status_changed',
      data:          { jobNumber: job.jobNumber, status: newStatus },
      link:          `/haraka/service-jobs/${id}`,
      titleOverride: `Service job ${job.jobNumber} is now ${newStatus.replace('_', ' ')}`,
    })
    return updated
  }

  async recordPayment(
    tenant: TenantContext,
    id: string,
    amountPaid: number,
    paymentMethod: string | null,
  ) {
    requireManage(tenant)
    await this.getById(tenant, id)
    const job = await repo.recordPayment(tenant, id, amountPaid, paymentMethod)
    auditLog.queue({
      tenant,
      module:   'pos',
      action:   'SERVICE_JOB_PAYMENT_RECORDED',
      recordId: id,
      newValue: { amountPaid, paymentMethod, paymentStatus: job.paymentStatus },
    })
    return job
  }

  async generateInvoice(tenant: TenantContext, id: string) {
    requireManage(tenant)
    const job = await this.getById(tenant, id)
    if (job.status !== 'done') {
      throw NextResponse.json(
        { error: 'Invoice can only be generated once the job is done' },
        { status: 400 },
      )
    }
    const updated = await repo.generateInvoiceNumber(tenant, id)
    if (updated.invoiceNumber !== job.invoiceNumber) {
      auditLog.queue({
        tenant,
        module:   'pos',
        action:   'SERVICE_JOB_INVOICE_GENERATED',
        recordId: id,
        newValue: { invoiceNumber: updated.invoiceNumber },
      })
    }
    return updated
  }

  async addPayment(
    tenant: TenantContext,
    jobId: string,
    amount: number,
    paymentMethod: string | null,
    note: string | null,
  ) {
    requireManage(tenant)
    await this.getById(tenant, jobId)
    await repo.addPayment(tenant, jobId, amount, paymentMethod, note)
    auditLog.queue({
      tenant,
      module:   'pos',
      action:   'SERVICE_JOB_PAYMENT_ADDED',
      recordId: jobId,
      newValue: { amount, paymentMethod },
    })
  }

  async removePayment(tenant: TenantContext, jobId: string, paymentId: string) {
    requireManage(tenant)
    await this.getById(tenant, jobId)
    await repo.removePayment(tenant, jobId, paymentId)
    auditLog.queue({
      tenant,
      module:   'pos',
      action:   'SERVICE_JOB_PAYMENT_REMOVED',
      recordId: jobId,
      newValue: { paymentId },
    })
  }

  async listPayments(tenant: TenantContext, jobId: string) {
    requireView(tenant)
    return repo.listPayments(tenant, jobId)
  }

  async delete(tenant: TenantContext, id: string) {
    requireManage(tenant)
    const job = await this.getById(tenant, id)
    if (job.status === 'in_progress' || job.status === 'done') {
      throw NextResponse.json(
        { error: 'Cannot delete a job that is in progress or done' },
        { status: 400 },
      )
    }
    await repo.delete(tenant, id)
    auditLog.queue({ tenant, module: 'pos', action: 'SERVICE_JOB_DELETED', recordId: id })
  }
}
