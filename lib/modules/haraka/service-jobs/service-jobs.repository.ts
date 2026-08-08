import 'server-only'
import { randomBytes } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { TenantContext } from '@/lib/platform/tenancy/types'
import type {
  HarakaServiceJob,
  ServiceJobStatus,
  ServiceLine,
  OrderPaymentStatus,
  OrderDeliveryAddress,
  ServiceJobAgentAssignment,
} from '@/types'
import { priceCart, type CartLineInput } from '@/lib/modules/haraka/pricing/calc'
import { allocateServiceInvoiceNumber } from './invoice-numbering'

type Row = Record<string, unknown>

function toServiceLine(d: Row): ServiceLine {
  return {
    name:           (d.name as string) ?? '',
    description:    (d.description as string) ?? null,
    quantity:       Number(d.quantity ?? 0),
    unitPrice:      Number(d.unitPrice ?? 0),
    taxRate:        Number(d.taxRate ?? 0),
    taxAmount:      Number(d.taxAmount ?? 0),
    discountAmount: Number(d.discountAmount ?? 0),
    lineTotal:      Number(d.lineTotal ?? 0),
  }
}

function toJob(r: Row): HarakaServiceJob {
  return {
    id:              r.id as string,
    organizationId:  r.organization_id as string,
    spaceId:         (r.space_id as string) ?? null,
    jobNumber:       r.job_number as string,
    invoiceNumber:   (r.invoice_number as string) ?? null,
    serviceType:     (r.service_type as string) ?? null,
    status:          (r.status as ServiceJobStatus) ?? 'new',
    customerId:      (r.customer_id as string) ?? null,
    customerName:    (r.customer_name as string) ?? '',
    customerPhone:   (r.customer_phone as string) ?? null,
    staffMemberId:   (r.staff_member_id as string) ?? null,
    staffMemberName: (r.staff_member_name as string) ?? null,
    vehicleId:       (r.vehicle_id as string) ?? null,
    items:           Array.isArray(r.items) ? (r.items as Row[]).map(toServiceLine) : [],
    subtotal:        Number(r.subtotal ?? 0),
    discountAmount:  Number(r.discount_amount ?? 0),
    taxAmount:       Number(r.tax_amount ?? 0),
    total:           Number(r.total ?? 0),
    paymentStatus:   (r.payment_status as OrderPaymentStatus) ?? 'unpaid',
    amountPaid:      Number(r.amount_paid ?? 0),
    paymentMethod:   (r.payment_method as string) ?? null,
    scheduledAt:     r.scheduled_at ? new Date(r.scheduled_at as string) : null,
    serviceAddress:  (r.service_address as OrderDeliveryAddress) ?? null,
    notes:           (r.notes as string) ?? null,
    createdAt:       r.created_at ? new Date(r.created_at as string) : new Date(),
    createdBy:       (r.created_by as string) ?? null,
    updatedAt:       r.updated_at ? new Date(r.updated_at as string) : new Date(),
    updatedBy:       (r.updated_by as string) ?? null,
  }
}

async function allocateJobNumber(orgId: string, spaceId?: string | null): Promise<string> {
  const sid = spaceId ?? ''
  const { data } = await supabaseAdmin
    .from('haraka_service_job_counters')
    .select('last_job_number')
    .eq('organization_id', orgId)
    .eq('space_id', sid)
    .maybeSingle()
  const next = (data ? Number((data as unknown as Row).last_job_number ?? 0) : 0) + 1
  const { error } = await supabaseAdmin
    .from('haraka_service_job_counters')
    .upsert(
      { organization_id: orgId, space_id: sid, last_job_number: next },
      { onConflict: 'organization_id,space_id' },
    )
  if (error) throw error
  return `SVC-${String(next).padStart(6, '0')}`
}

export interface CreateServiceJobInput {
  serviceType?:     string | null
  customerName:     string
  customerPhone?:   string | null
  customerId?:      string | null
  staffMemberId?:   string | null
  staffMemberName?: string | null
  vehicleId?:       string | null
  lines: CartLineInput[]
  paymentMethod?:   string | null
  scheduledAt?:     string | null
  serviceAddress?:  OrderDeliveryAddress | null
  notes?:           string | null
  createdById:      string
}

export interface ListServiceJobsOpts {
  status?:        string
  serviceType?:   string
  staffMemberId?: string
  from?:          Date
  to?:            Date
  page?:          number
  pageSize?:      number
}

export interface ServiceJobPaymentEntry {
  id:            string
  amount:        number
  paymentMethod: string | null
  note:          string | null
  paidAt:        string
  createdAt:     string
}

export class ServiceJobsRepository {
  async list(tenant: TenantContext, opts?: ListServiceJobsOpts) {
    let q = supabaseAdmin
      .from('haraka_service_jobs')
      .select('*')
      .eq('organization_id', tenant.organizationId)
    if (opts?.status)        q = q.eq('status', opts.status)
    if (opts?.serviceType)   q = q.eq('service_type', opts.serviceType)
    if (opts?.staffMemberId) q = q.eq('staff_member_id', opts.staffMemberId)
    if (opts?.from)          q = q.gte('created_at', opts.from.toISOString())
    if (opts?.to)            q = q.lte('created_at', opts.to.toISOString())

    const { data, error } = await q.order('created_at', { ascending: false })
    if (error) throw error

    const items     = (data ?? []).map(toJob)
    const page      = opts?.page ?? 1
    const pageSize  = opts?.pageSize ?? 20
    const total     = items.length
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const safePage  = Math.min(page, totalPages)
    const start     = (safePage - 1) * pageSize
    const pageItems = items.slice(start, start + pageSize)

    await this.enrichWithVehiclesAndAgents(pageItems)

    return { items: pageItems, total, page: safePage, pageSize, totalPages }
  }

  /** Bulk-fetches vehicle plate + assigned agent names for a page of jobs, mutating them in place. */
  private async enrichWithVehiclesAndAgents(jobs: HarakaServiceJob[]): Promise<void> {
    if (jobs.length === 0) return
    const jobIds = jobs.map((j) => j.id)
    const vehicleIds = [...new Set(jobs.map((j) => j.vehicleId).filter((v): v is string => !!v))]

    const [vehiclesRes, agentsRes] = await Promise.all([
      vehicleIds.length > 0
        ? supabaseAdmin.from('haraka_service_vehicles').select('id, plate_number').in('id', vehicleIds)
        : Promise.resolve({ data: [] as Row[] }),
      supabaseAdmin
        .from('haraka_service_job_agents')
        .select('job_id, haraka_delivery_agents!inner(name)')
        .in('job_id', jobIds),
    ])

    const plateById = new Map<string, string>()
    for (const v of (vehiclesRes.data ?? []) as Row[]) {
      plateById.set(v.id as string, v.plate_number as string)
    }
    const agentNamesByJob = new Map<string, string[]>()
    for (const r of (agentsRes.data ?? []) as unknown as { job_id: string; haraka_delivery_agents: { name: string } }[]) {
      const list = agentNamesByJob.get(r.job_id) ?? []
      list.push(r.haraka_delivery_agents.name)
      agentNamesByJob.set(r.job_id, list)
    }

    for (const job of jobs) {
      job.vehiclePlateNumber = job.vehicleId ? plateById.get(job.vehicleId) ?? null : null
      job.assignedAgentNames = agentNamesByJob.get(job.id) ?? []
    }
  }

  async getById(tenant: TenantContext, id: string): Promise<HarakaServiceJob | null> {
    const { data } = await supabaseAdmin
      .from('haraka_service_jobs')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (!data || (data as unknown as Row).organization_id !== tenant.organizationId) return null
    return toJob(data as unknown as Row)
  }

  async create(tenant: TenantContext, input: CreateServiceJobInput): Promise<HarakaServiceJob> {
    const jobNumber = await allocateJobNumber(tenant.organizationId, tenant.spaceId)
    const priced = priceCart(input.lines)

    const items = priced.lines.map((l) => ({
      name:           l.itemName,
      description:    null,
      quantity:       l.quantity,
      unitPrice:      l.unitPrice,
      taxRate:        l.taxRate,
      taxAmount:      l.taxAmount,
      discountAmount: l.discount,
      lineTotal:      l.lineTotal,
    }))

    const { data, error } = await supabaseAdmin
      .from('haraka_service_jobs')
      .insert({
        organization_id:  tenant.organizationId,
        space_id:         tenant.spaceId ?? null,
        job_number:       jobNumber,
        service_type:     input.serviceType ?? null,
        status:           'new',
        customer_id:      input.customerId ?? null,
        customer_name:    input.customerName,
        customer_phone:   input.customerPhone ?? null,
        staff_member_id:  input.staffMemberId ?? null,
        staff_member_name: input.staffMemberName ?? null,
        vehicle_id:       input.vehicleId ?? null,
        items,
        subtotal:         priced.totals.subtotal,
        discount_amount:  priced.totals.discountTotal,
        tax_amount:       priced.totals.taxTotal,
        total:            priced.totals.total,
        payment_status:   'unpaid',
        amount_paid:      0,
        payment_method:   input.paymentMethod ?? null,
        scheduled_at:     input.scheduledAt ?? null,
        service_address:  input.serviceAddress ?? null,
        notes:            input.notes ?? null,
        created_by:       input.createdById,
        updated_by:       input.createdById,
      })
      .select('*')
      .single()
    if (error) throw error
    return toJob(data as unknown as Row)
  }

  async update(
    tenant: TenantContext,
    id: string,
    patch: {
      serviceType?:     string | null
      notes?:           string | null
      serviceAddress?:  OrderDeliveryAddress | null
      scheduledAt?:     string | null
      staffMemberId?:   string | null
      staffMemberName?: string | null
    },
  ): Promise<HarakaServiceJob> {
    const update: Row = { updated_by: tenant.userId }
    if ('serviceType'     in patch) update.service_type      = patch.serviceType
    if ('notes'           in patch) update.notes             = patch.notes
    if ('serviceAddress'  in patch) update.service_address   = patch.serviceAddress
    if ('scheduledAt'     in patch) update.scheduled_at      = patch.scheduledAt
    if ('staffMemberId'   in patch) update.staff_member_id   = patch.staffMemberId
    if ('staffMemberName' in patch) update.staff_member_name = patch.staffMemberName

    const { data, error } = await supabaseAdmin
      .from('haraka_service_jobs')
      .update(update)
      .eq('id', id)
      .eq('organization_id', tenant.organizationId)
      .select('*')
      .single()
    if (error) throw error
    return toJob(data as unknown as Row)
  }

  /**
   * Replace the job's line items and reprice its totals. Callers are
   * responsible for checking the job is still editable (not started/paid).
   */
  async replaceItems(
    tenant: TenantContext,
    id: string,
    lines: CartLineInput[],
  ): Promise<HarakaServiceJob> {
    const priced = priceCart(lines)
    const items = priced.lines.map((l) => ({
      name:           l.itemName,
      description:    null,
      quantity:       l.quantity,
      unitPrice:      l.unitPrice,
      taxRate:        l.taxRate,
      taxAmount:      l.taxAmount,
      discountAmount: l.discount,
      lineTotal:      l.lineTotal,
    }))
    const { data, error } = await supabaseAdmin
      .from('haraka_service_jobs')
      .update({
        items,
        subtotal:        priced.totals.subtotal,
        discount_amount: priced.totals.discountTotal,
        tax_amount:      priced.totals.taxTotal,
        total:           priced.totals.total,
        updated_by:      tenant.userId,
      })
      .eq('id', id)
      .eq('organization_id', tenant.organizationId)
      .select('*')
      .single()
    if (error) throw error
    return toJob(data as unknown as Row)
  }

  async addItems(
    tenant: TenantContext,
    id: string,
    newLines: CartLineInput[],
  ): Promise<HarakaServiceJob> {
    const job = await this.getById(tenant, id)
    if (!job) throw new Error('Service job not found')

    const existingLines: CartLineInput[] = job.items.map((it) => ({
      itemId:    '',
      itemName:  it.name,
      sku:       null,
      barcode:   null,
      quantity:  it.quantity,
      unitPrice: it.unitPrice,
      taxRateId: null,
      taxRate:   it.taxRate,
      discount:  it.discountAmount,
    }))
    const priced = priceCart([...existingLines, ...newLines])
    const items = priced.lines.map((l) => ({
      name:           l.itemName,
      description:    null,
      quantity:       l.quantity,
      unitPrice:      l.unitPrice,
      taxRate:        l.taxRate,
      taxAmount:      l.taxAmount,
      discountAmount: l.discount,
      lineTotal:      l.lineTotal,
    }))
    const { data, error } = await supabaseAdmin
      .from('haraka_service_jobs')
      .update({
        items,
        subtotal:        priced.totals.subtotal,
        discount_amount: priced.totals.discountTotal,
        tax_amount:      priced.totals.taxTotal,
        total:           priced.totals.total,
        updated_by:      tenant.userId,
      })
      .eq('id', id)
      .eq('organization_id', tenant.organizationId)
      .select('*')
      .single()
    if (error) throw error
    return toJob(data as unknown as Row)
  }

  async updateStatus(
    tenant: TenantContext,
    id: string,
    newStatus: ServiceJobStatus,
  ): Promise<HarakaServiceJob> {
    const { data, error } = await supabaseAdmin
      .from('haraka_service_jobs')
      .update({ status: newStatus, updated_by: tenant.userId })
      .eq('id', id)
      .eq('organization_id', tenant.organizationId)
      .select('*')
      .single()
    if (error) throw error
    return toJob(data as unknown as Row)
  }

  async recordPayment(
    tenant: TenantContext,
    id: string,
    amountPaid: number,
    paymentMethod: string | null,
  ): Promise<HarakaServiceJob> {
    const job = await this.getById(tenant, id)
    if (!job) throw new Error('Service job not found')
    const paymentStatus: OrderPaymentStatus =
      amountPaid <= 0           ? 'unpaid'
      : amountPaid < job.total  ? 'partial'
      :                           'paid'
    const { data, error } = await supabaseAdmin
      .from('haraka_service_jobs')
      .update({
        amount_paid:    amountPaid,
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        updated_by:     tenant.userId,
      })
      .eq('id', id)
      .eq('organization_id', tenant.organizationId)
      .select('*')
      .single()
    if (error) throw error
    return toJob(data as unknown as Row)
  }

  async generateInvoiceNumber(
    tenant: TenantContext,
    id: string,
  ): Promise<HarakaServiceJob> {
    const job = await this.getById(tenant, id)
    if (!job) throw new Error('Service job not found')
    if (job.invoiceNumber) return job

    const invoiceNumber = await allocateServiceInvoiceNumber(tenant.organizationId)
    const { data, error } = await supabaseAdmin
      .from('haraka_service_jobs')
      .update({ invoice_number: invoiceNumber, updated_by: tenant.userId })
      .eq('id', id)
      .eq('organization_id', tenant.organizationId)
      .select('*')
      .single()
    if (error) throw error
    return toJob(data as unknown as Row)
  }

  async delete(tenant: TenantContext, id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('haraka_service_jobs')
      .delete()
      .eq('id', id)
      .eq('organization_id', tenant.organizationId)
    if (error) throw error
  }

  async listPayments(tenant: TenantContext, jobId: string): Promise<ServiceJobPaymentEntry[]> {
    const { data, error } = await supabaseAdmin
      .from('haraka_service_job_payments')
      .select('*')
      .eq('job_id', jobId)
      .eq('organization_id', tenant.organizationId)
      .order('paid_at', { ascending: false })
    if (error) throw error
    return (data ?? []).map((p) => {
      const r = p as unknown as Row
      return {
        id:            r.id as string,
        amount:        Number(r.amount),
        paymentMethod: (r.payment_method as string) ?? null,
        note:          (r.note as string) ?? null,
        paidAt:        r.paid_at as string,
        createdAt:     r.created_at as string,
      }
    })
  }

  async addPayment(
    tenant: TenantContext,
    jobId: string,
    amount: number,
    paymentMethod: string | null,
    note: string | null,
  ): Promise<void> {
    const { error: insertError } = await supabaseAdmin
      .from('haraka_service_job_payments')
      .insert({
        job_id:          jobId,
        organization_id: tenant.organizationId,
        amount,
        payment_method:  paymentMethod,
        note,
        created_by:      tenant.userId,
      })
    if (insertError) throw insertError

    const { data: payments } = await supabaseAdmin
      .from('haraka_service_job_payments')
      .select('amount')
      .eq('job_id', jobId)
    const totalPaid = (payments ?? []).reduce((acc, p) => acc + Number((p as unknown as Row).amount ?? 0), 0)

    const { data: jobRow } = await supabaseAdmin
      .from('haraka_service_jobs')
      .select('total')
      .eq('id', jobId)
      .maybeSingle()
    const jobTotal = Number((jobRow as unknown as Row | null)?.total ?? 0)
    const paymentStatus: OrderPaymentStatus =
      totalPaid <= 0              ? 'unpaid'
      : totalPaid < jobTotal      ? 'partial'
      :                             'paid'

    await supabaseAdmin
      .from('haraka_service_jobs')
      .update({
        amount_paid:    totalPaid,
        payment_status: paymentStatus,
        updated_by:     tenant.userId,
      })
      .eq('id', jobId)
      .eq('organization_id', tenant.organizationId)
  }

  async removePayment(
    tenant: TenantContext,
    jobId: string,
    paymentId: string,
  ): Promise<void> {
    const { error } = await supabaseAdmin
      .from('haraka_service_job_payments')
      .delete()
      .eq('id', paymentId)
      .eq('job_id', jobId)
      .eq('organization_id', tenant.organizationId)
    if (error) throw error

    const { data: payments } = await supabaseAdmin
      .from('haraka_service_job_payments')
      .select('amount')
      .eq('job_id', jobId)
    const totalPaid = (payments ?? []).reduce((acc, p) => acc + Number((p as unknown as Row).amount ?? 0), 0)

    const { data: jobRow } = await supabaseAdmin
      .from('haraka_service_jobs')
      .select('total')
      .eq('id', jobId)
      .maybeSingle()
    const jobTotal = Number((jobRow as unknown as Row | null)?.total ?? 0)
    const paymentStatus: OrderPaymentStatus =
      totalPaid <= 0           ? 'unpaid'
      : totalPaid < jobTotal   ? 'partial'
      :                          'paid'

    await supabaseAdmin
      .from('haraka_service_jobs')
      .update({
        amount_paid:    totalPaid,
        payment_status: paymentStatus,
        updated_by:     tenant.userId,
      })
      .eq('id', jobId)
      .eq('organization_id', tenant.organizationId)
  }

  /** Generate (or reuse a still-valid) public rating-link token — 14 day TTL, same as orders' customer_token. */
  async ensureRatingToken(tenant: TenantContext, jobId: string): Promise<string> {
    const { data } = await supabaseAdmin
      .from('haraka_service_jobs')
      .select('rating_token, rating_token_expires_at')
      .eq('id', jobId)
      .eq('organization_id', tenant.organizationId)
      .maybeSingle()
    const existing = data as { rating_token: string | null; rating_token_expires_at: string | null } | null
    const stillValid = existing?.rating_token
      && existing.rating_token_expires_at
      && new Date(existing.rating_token_expires_at).getTime() > Date.now()
    if (stillValid) return existing!.rating_token!

    const token = randomBytes(24).toString('hex')
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
    const { error } = await supabaseAdmin
      .from('haraka_service_jobs')
      .update({ rating_token: token, rating_token_expires_at: expiresAt })
      .eq('id', jobId)
      .eq('organization_id', tenant.organizationId)
    if (error) throw error
    return token
  }

  async listAgentAssignments(
    tenant: TenantContext,
    jobId: string,
  ): Promise<ServiceJobAgentAssignment[]> {
    const { data, error } = await supabaseAdmin
      .from('haraka_service_job_agents')
      .select('delivery_agent_id, role, assigned_at, haraka_delivery_agents!inner(name, organization_id)')
      .eq('job_id', jobId)
      .eq('haraka_delivery_agents.organization_id', tenant.organizationId)
    if (error) throw error
    return (data ?? []).map((r) => {
      const row = r as unknown as {
        delivery_agent_id: string
        role: 'primary' | 'helper'
        assigned_at: string
        haraka_delivery_agents: { name: string }
      }
      return {
        agentId:    row.delivery_agent_id,
        agentName:  row.haraka_delivery_agents.name,
        role:       row.role,
        assignedAt: new Date(row.assigned_at),
      }
    })
  }

  /** Replace a job's agent assignments (used by both auto and manual assignment). */
  async setAgentAssignments(
    tenant: TenantContext,
    jobId: string,
    agentIds: string[],
    assignedBy: string,
  ): Promise<void> {
    const { error: deleteError } = await supabaseAdmin
      .from('haraka_service_job_agents')
      .delete()
      .eq('job_id', jobId)
    if (deleteError) throw deleteError

    if (agentIds.length === 0) return

    const rows = agentIds.map((agentId, i) => ({
      job_id:            jobId,
      delivery_agent_id: agentId,
      role:              i === 0 ? 'primary' : 'helper',
      assigned_by:       assignedBy,
    }))
    const { error: insertError } = await supabaseAdmin
      .from('haraka_service_job_agents')
      .insert(rows)
    if (insertError) throw insertError
  }
}
