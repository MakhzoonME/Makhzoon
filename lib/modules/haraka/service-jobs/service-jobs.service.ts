import { NextResponse } from 'next/server'
import type { TenantContext } from '@/lib/platform/tenancy/types'
import { hasPermission } from '@/lib/platform/permissions'
import { auditLog } from '@/lib/platform/audit'
import { notificationQueue } from '@/lib/notifications/notification-queue'
import type { ServiceJobStatus, ServiceJobAgentAssignment } from '@/types'
import { isValidTransition } from './schemas'
import {
  ServiceJobsRepository,
  type CreateServiceJobInput,
  type ListServiceJobsOpts,
} from './service-jobs.repository'
import { DeliveryAgentsRepository } from '@/lib/modules/haraka/delivery-agents/delivery-agents.repository'
import { selectBalancedAgents } from '@/lib/modules/haraka/delivery-agents/balanced-routing'
import { customerMessaging } from '@/lib/notifications/customer-messaging'

const repo = new ServiceJobsRepository()
const agentsRepo = new DeliveryAgentsRepository()

function requireView(tenant: TenantContext) {
  if (!hasPermission(tenant, 'haraka', 'servicesView')) {
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
}

function requireCreate(tenant: TenantContext) {
  if (!hasPermission(tenant, 'haraka', 'serviceJobsCreate') && !hasPermission(tenant, 'haraka', 'serviceJobsUpdate')) {
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
}

// Umbrella for every post-creation action (status changes, items, payments,
// invoice, delete) — same single-flag scope 'checkout_service_jobs' had.
function requireCheckout(tenant: TenantContext) {
  if (!hasPermission(tenant, 'haraka', 'serviceJobsUpdate')) {
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
    requireCreate(tenant)
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
    customerMessaging.enqueue({
      tenant,
      jobId:         job.id,
      customerPhone: job.customerPhone,
      template:      'order_received',
      variables:     { customerName: job.customerName, jobNumber: job.jobNumber },
    })
    return job
  }

  async update(
    tenant: TenantContext,
    id: string,
    patch: Parameters<typeof repo.update>[2],
  ) {
    requireCheckout(tenant)
    await this.getById(tenant, id)
    const job = await repo.update(tenant, id, patch)
    auditLog.queue({ tenant, module: 'pos', action: 'SERVICE_JOB_UPDATED', recordId: id, newValue: patch })
    return job
  }

  async addItems(
    tenant: TenantContext,
    id: string,
    lines: Parameters<typeof repo.addItems>[2],
  ) {
    requireCheckout(tenant)
    const job = await repo.addItems(tenant, id, lines)
    auditLog.queue({
      tenant,
      module:   'pos',
      action:   'SERVICE_JOB_ITEMS_ADDED',
      recordId: id,
      newValue: { addedCount: lines.length, total: job.total },
    })
    return job
  }

  async updateStatus(tenant: TenantContext, id: string, newStatus: ServiceJobStatus) {
    requireCheckout(tenant)
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

    if (newStatus === 'done') {
      customerMessaging.enqueue({
        tenant,
        jobId:         id,
        customerPhone: job.customerPhone,
        template:      'job_finished',
        variables:     { customerName: job.customerName, jobNumber: job.jobNumber },
      })
      const ratingToken = await repo.ensureRatingToken(tenant, id) // pre-generate so the public /rate/[token] page works whenever it's accessed
      notificationQueue.enqueue({
        tenant,
        eventType:     'service_job.rating_requested',
        data:          { jobNumber: job.jobNumber },
        link:          `/haraka/service-jobs/${id}/rate`,
        titleOverride: `Rating requested for service job ${job.jobNumber}`,
      })
      customerMessaging.enqueue({
        tenant,
        jobId:         id,
        customerPhone: job.customerPhone,
        template:      'rating_requested',
        variables:     {
          customerName: job.customerName,
          jobNumber:    job.jobNumber,
          ratingLink:   `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/rate/${ratingToken}`,
        },
      })
    } else {
      customerMessaging.enqueue({
        tenant,
        jobId:         id,
        customerPhone: job.customerPhone,
        template:      'status_update',
        variables:     { customerName: job.customerName, jobNumber: job.jobNumber, status: newStatus.replace('_', ' ') },
      })
    }

    return updated
  }

  async recordPayment(
    tenant: TenantContext,
    id: string,
    amountPaid: number,
    paymentMethod: string | null,
  ) {
    requireCheckout(tenant)
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
    requireCheckout(tenant)
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
    requireCheckout(tenant)
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
    requireCheckout(tenant)
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

  async listAgents(tenant: TenantContext, jobId: string): Promise<ServiceJobAgentAssignment[]> {
    requireView(tenant)
    return repo.listAgentAssignments(tenant, jobId)
  }

  /**
   * Assign delivery agents to a job. 'auto' picks the `count` active agents
   * with the lowest current open-job load (balanced routing); 'manual'
   * assigns exactly the given agentIds (receptionist override, e.g. the
   * customer asked for someone specific).
   */
  async assignAgents(
    tenant: TenantContext,
    jobId: string,
    opts: { mode: 'auto'; count: number } | { mode: 'manual'; agentIds: string[] },
  ) {
    requireCheckout(tenant)
    const job = await this.getById(tenant, jobId)

    let agentIds: string[]
    if (opts.mode === 'manual') {
      agentIds = opts.agentIds
    } else {
      const activeAgents = await agentsRepo.list(tenant, true)
      const counts = await agentsRepo.openJobCounts(tenant, activeAgents.map((a) => a.id))
      agentIds = selectBalancedAgents(activeAgents, counts, opts.count).map((a) => a.id)
    }

    await repo.setAgentAssignments(tenant, jobId, agentIds, tenant.userId)
    auditLog.queue({
      tenant,
      module:   'pos',
      action:   'SERVICE_JOB_AGENTS_ASSIGNED',
      recordId: jobId,
      newValue: { mode: opts.mode, agentIds },
    })
    notificationQueue.enqueue({
      tenant,
      eventType:     'service_job.agents_assigned',
      data:          { jobNumber: job.jobNumber, agentCount: agentIds.length },
      link:          `/haraka/service-jobs/${jobId}`,
      titleOverride: `Service job ${job.jobNumber} assigned to ${agentIds.length} agent(s)`,
    })
    return repo.listAgentAssignments(tenant, jobId)
  }

  async delete(tenant: TenantContext, id: string) {
    requireCheckout(tenant)
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
