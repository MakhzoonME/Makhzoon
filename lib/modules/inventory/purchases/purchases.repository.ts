import { supabaseAdmin } from '@/lib/supabase/admin'
import type { TenantContext } from '@/lib/platform/tenancy/types'
import type { Purchase, PurchaseLine, PurchaseStatus, DocumentRef } from '@/types'

type Row = Record<string, unknown>

function toLine(d: Row): PurchaseLine {
  return {
    itemId: (d.itemId as string) ?? null,
    itemName: d.itemName as string,
    sku: (d.sku as string) ?? null,
    barcode: (d.barcode as string) ?? null,
    quantity: Number(d.quantity ?? 0),
    unitCost: Number(d.unitCost ?? 0),
    taxRateId: (d.taxRateId as string) ?? null,
    taxAmount: Number(d.taxAmount ?? 0),
    lineTotal: Number(d.lineTotal ?? 0),
    notes: (d.notes as string) ?? null,
  }
}

function toPurchase(r: Row): Purchase {
  return {
    id: r.id as string,
    organizationId: r.organization_id as string,
    supplierName: r.supplier_name as string,
    supplierContact: (r.supplier_contact as string) ?? null,
    invoiceNumber: (r.invoice_number as string) ?? null,
    invoiceDate: r.invoice_date ? new Date(r.invoice_date as string) : new Date(),
    receivedDate: r.received_date ? new Date(r.received_date as string) : null,
    status: ((r.status as PurchaseStatus) ?? 'draft') as PurchaseStatus,
    lines: Array.isArray(r.lines) ? (r.lines as Row[]).map(toLine) : [],
    subtotal: Number(r.subtotal ?? 0),
    taxTotal: Number(r.tax_total ?? 0),
    total: Number(r.total ?? 0),
    notes: (r.notes as string) ?? null,
    documents: Array.isArray(r.documents) ? (r.documents as DocumentRef[]) : [],
    updateItemUnitCost: r.update_item_unit_cost === true,
    createdAt: r.created_at ? new Date(r.created_at as string) : new Date(),
    createdBy: (r.created_by as string) ?? '',
    createdByEmail: (r.created_by_email as string) ?? null,
    createdByName: (r.created_by_name as string) ?? null,
    updatedAt: r.updated_at ? new Date(r.updated_at as string) : new Date(),
    updatedBy: (r.updated_by as string) ?? '',
    updatedByEmail: (r.updated_by_email as string) ?? null,
    updatedByName: (r.updated_by_name as string) ?? null,
    receivedBy: (r.received_by as string) ?? null,
    receivedByName: (r.received_by_name as string) ?? null,
  }
}

export interface PurchaseLineInput {
  itemId?: string | null
  itemName: string
  sku?: string | null
  barcode?: string | null
  quantity: number
  unitCost: number
  taxRateId?: string | null
  notes?: string | null
}

export interface PurchaseInput {
  supplierName: string
  supplierContact?: string | null
  invoiceNumber?: string | null
  invoiceDate: Date
  notes?: string | null
  updateItemUnitCost?: boolean
  documents?: DocumentRef[]
  lines: PurchaseLineInput[]
}

interface TaxRateLookup {
  rates: Map<string, number>
}

async function loadTaxRates(tenant: TenantContext): Promise<TaxRateLookup> {
  const { data } = await supabaseAdmin
    .from('tax_rates')
    .select('id, rate')
    .eq('organization_id', tenant.organizationId)
  const map = new Map<string, number>()
  for (const d of data ?? []) {
    const r = (d as Row).rate
    if (typeof r === 'number') map.set((d as Row).id as string, r)
  }
  return { rates: map }
}

function priceLines(
  lines: PurchaseLineInput[],
  taxes: TaxRateLookup,
): { lines: PurchaseLine[]; subtotal: number; taxTotal: number; total: number } {
  let subtotal = 0
  let taxTotal = 0
  const priced: PurchaseLine[] = lines.map((line) => {
    const lineSubtotal = line.quantity * line.unitCost
    const taxRate = line.taxRateId ? taxes.rates.get(line.taxRateId) ?? 0 : 0
    const taxAmount = +(lineSubtotal * taxRate).toFixed(4)
    const lineTotal = +(lineSubtotal + taxAmount).toFixed(4)
    subtotal += lineSubtotal
    taxTotal += taxAmount
    return {
      itemId: line.itemId ?? null,
      itemName: line.itemName,
      sku: line.sku ?? null,
      barcode: line.barcode ?? null,
      quantity: line.quantity,
      unitCost: line.unitCost,
      taxRateId: line.taxRateId ?? null,
      taxAmount,
      lineTotal,
      notes: line.notes ?? null,
    }
  })
  const total = +(subtotal + taxTotal).toFixed(4)
  return { lines: priced, subtotal: +subtotal.toFixed(4), taxTotal: +taxTotal.toFixed(4), total }
}

export interface ListOpts {
  status?: PurchaseStatus
  search?: string
  page?: number
  pageSize?: number
}

export class PurchasesRepository {
  async list(tenant: TenantContext, opts?: ListOpts) {
    let q = supabaseAdmin
      .from('purchases')
      .select('*')
      .eq('organization_id', tenant.organizationId)
    if (tenant.spaceId) q = q.eq('space_id', tenant.spaceId)
    const { data, error } = await q
    if (error) throw error
    let items = (data ?? []).map(toPurchase)
    if (opts?.status) items = items.filter((p) => p.status === opts.status)
    if (opts?.search) {
      const term = opts.search.toLowerCase()
      items = items.filter(
        (p) =>
          p.supplierName.toLowerCase().includes(term) ||
          (p.invoiceNumber ?? '').toLowerCase().includes(term),
      )
    }
    items.sort((a, b) => b.invoiceDate.getTime() - a.invoiceDate.getTime())

    const page = opts?.page ?? 1
    const pageSize = opts?.pageSize ?? 20
    const total = items.length
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const safePage = Math.min(page, totalPages)
    const start = (safePage - 1) * pageSize
    return { items: items.slice(start, start + pageSize), total, page: safePage, pageSize, totalPages }
  }

  async getById(tenant: TenantContext, id: string): Promise<Purchase | null> {
    const { data } = await supabaseAdmin
      .from('purchases')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (!data || data.organization_id !== tenant.organizationId) return null
    return toPurchase(data)
  }

  async create(tenant: TenantContext, input: PurchaseInput): Promise<string> {
    const taxes = await loadTaxRates(tenant)
    const priced = priceLines(input.lines, taxes)
    const { data, error } = await supabaseAdmin
      .from('purchases')
      .insert({
        organization_id: tenant.organizationId,
        space_id: tenant.spaceId,
        supplier_name: input.supplierName,
        supplier_contact: input.supplierContact ?? null,
        invoice_number: input.invoiceNumber ?? null,
        invoice_date: new Date(input.invoiceDate).toISOString(),
        received_date: null,
        status: 'draft' as PurchaseStatus,
        lines: priced.lines,
        subtotal: priced.subtotal,
        tax_total: priced.taxTotal,
        total: priced.total,
        notes: input.notes ?? null,
        documents: input.documents ?? [],
        update_item_unit_cost: input.updateItemUnitCost === true,
        created_by: tenant.userId,
        created_by_email: tenant.user.email ?? null,
        created_by_name: tenant.user.displayName ?? null,
        updated_by: tenant.userId,
        updated_by_email: tenant.user.email ?? null,
        updated_by_name: tenant.user.displayName ?? null,
      })
      .select('id')
      .single()
    if (error) throw error
    return data.id as string
  }

  async update(tenant: TenantContext, id: string, input: Partial<PurchaseInput>): Promise<void> {
    const existing = await this.getById(tenant, id)
    if (!existing) throw new Error('Purchase not found')
    if (existing.status !== 'draft') throw new Error('Only draft purchases can be edited')

    const patch: Row = {
      updated_by: tenant.userId,
      updated_by_email: tenant.user.email ?? null,
      updated_by_name: tenant.user.displayName ?? null,
    }
    if (input.supplierName !== undefined) patch.supplier_name = input.supplierName
    if (input.supplierContact !== undefined) patch.supplier_contact = input.supplierContact ?? null
    if (input.invoiceNumber !== undefined) patch.invoice_number = input.invoiceNumber ?? null
    if (input.invoiceDate !== undefined) patch.invoice_date = new Date(input.invoiceDate).toISOString()
    if (input.notes !== undefined) patch.notes = input.notes ?? null
    if (input.documents !== undefined) patch.documents = input.documents
    if (input.updateItemUnitCost !== undefined) patch.update_item_unit_cost = input.updateItemUnitCost

    if (input.lines) {
      const taxes = await loadTaxRates(tenant)
      const priced = priceLines(input.lines, taxes)
      patch.lines = priced.lines
      patch.subtotal = priced.subtotal
      patch.tax_total = priced.taxTotal
      patch.total = priced.total
    }

    const { error } = await supabaseAdmin.from('purchases').update(patch).eq('id', id)
    if (error) throw error
  }

  async delete(tenant: TenantContext, id: string): Promise<void> {
    const existing = await this.getById(tenant, id)
    if (!existing) throw new Error('Purchase not found')
    if (existing.status === 'received') throw new Error('Cannot delete a received purchase')
    const { error } = await supabaseAdmin.from('purchases').delete().eq('id', id)
    if (error) throw error
  }

  async cancel(tenant: TenantContext, id: string): Promise<void> {
    const existing = await this.getById(tenant, id)
    if (!existing) throw new Error('Purchase not found')
    if (existing.status !== 'draft') throw new Error('Only draft purchases can be cancelled')
    const { error } = await supabaseAdmin
      .from('purchases')
      .update({ status: 'cancelled' as PurchaseStatus, updated_by: tenant.userId })
      .eq('id', id)
    if (error) throw error
  }

  /**
   * Receive a draft purchase: append a stock-IN ledger row per line, refresh
   * each item's stock_status (and optionally unit_cost/supplier), mark the
   * purchase received. Was a Firestore transaction; read-modify-write here
   * (same race caveat the original noted as acceptable for v1).
   */
  async receive(
    tenant: TenantContext,
    id: string,
  ): Promise<Array<{ itemId: string; quantityAfter: number }>> {
    const purchase = await this.getById(tenant, id)
    if (!purchase) throw new Error('Purchase not found')
    if (purchase.status !== 'draft') throw new Error('Only draft purchases can be received')
    const unresolved = purchase.lines.filter((l) => !l.itemId)
    if (unresolved.length > 0) {
      throw new Error(
        `Cannot receive — ${unresolved.length} line(s) have no resolved inventory item. ` +
          'Pick or create an item for each line first.',
      )
    }

    const uniqueItemIds = Array.from(new Set(purchase.lines.map((l) => l.itemId as string)))

    const { data: itemRows, error: itemErr } = await supabaseAdmin
      .from('inventory_items')
      .select('id, name, organization_id, minimum_threshold, quantity_on_hand')
      .in('id', uniqueItemIds)
    if (itemErr) throw itemErr
    const itemById = new Map<string, Row>()
    for (const r of itemRows ?? []) itemById.set((r as Row).id as string, r as Row)
    for (const iid of uniqueItemIds) {
      const r = itemById.get(iid)
      if (!r || r.organization_id !== tenant.organizationId) {
        throw new Error(`Inventory item not found: ${iid}`)
      }
    }

    // Running on-hand per item, seeded from the latest ledger row.
    const running = new Map<string, number>()
    for (const iid of uniqueItemIds) {
      const { data: lastTx } = await supabaseAdmin
        .from('inventory_transactions')
        .select('quantity_after')
        .eq('item_id', iid)
        .order('performed_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      const cached = (itemById.get(iid)!.quantity_on_hand as number) ?? 0
      running.set(iid, lastTx ? ((lastTx.quantity_after as number) ?? cached) : cached)
    }

    const results: Array<{ itemId: string; quantityAfter: number }> = []
    for (const line of purchase.lines) {
      const iid = line.itemId as string
      const before = running.get(iid) ?? 0
      const after = before + line.quantity
      running.set(iid, after)
      results.push({ itemId: iid, quantityAfter: after })

      const { error: txErr } = await supabaseAdmin.from('inventory_transactions').insert({
        organization_id: tenant.organizationId,
        space_id: tenant.spaceId,
        item_id: iid,
        item_name: line.itemName,
        type: 'in',
        quantity: line.quantity,
        quantity_before: before,
        quantity_after: after,
        reason: 'Purchase received',
        note: purchase.invoiceNumber ? `Invoice ${purchase.invoiceNumber}` : null,
        source: 'purchase',
        purchase_id: id,
        performed_by: tenant.userId,
        performed_by_email: tenant.user.email ?? null,
        performed_by_name: tenant.user.displayName ?? null,
        performed_by_role: tenant.role ?? null,
      })
      if (txErr) throw txErr
    }

    for (const iid of uniqueItemIds) {
      const itemData = itemById.get(iid)!
      const threshold = (itemData.minimum_threshold as number) ?? 0
      const finalQty = running.get(iid) ?? 0
      const statusUpdate: Row = {
        stock_status: finalQty === 0 ? 'out' : finalQty < threshold ? 'low' : 'ok',
        updated_by: tenant.userId,
        updated_by_email: tenant.user.email ?? null,
        updated_by_name: tenant.user.displayName ?? null,
      }
      if (purchase.updateItemUnitCost) {
        const matchingLine = purchase.lines.find((l) => l.itemId === iid)
        if (matchingLine) {
          statusUpdate.unit_cost = matchingLine.unitCost
          statusUpdate.supplier = purchase.supplierName
        }
      }
      const { error: upErr } = await supabaseAdmin
        .from('inventory_items')
        .update(statusUpdate)
        .eq('id', iid)
      if (upErr) throw upErr
    }

    const { error: pErr } = await supabaseAdmin
      .from('purchases')
      .update({
        status: 'received' as PurchaseStatus,
        received_date: new Date().toISOString(),
        received_by: tenant.userId,
        received_by_name: tenant.user.displayName ?? null,
        updated_by: tenant.userId,
      })
      .eq('id', id)
    if (pErr) throw pErr

    return results
  }
}
