import { adminDb } from '@/lib/firebase/admin'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import type { TenantContext } from '@/lib/platform/tenancy/types'
import type { PosCustomer } from '@/types'

function tsToDate(v: unknown): Date {
  return v instanceof Timestamp ? v.toDate() : v instanceof Date ? v : new Date()
}

function toCustomer(id: string, d: FirebaseFirestore.DocumentData): PosCustomer {
  return {
    id,
    organizationId: d.organizationId,
    name: d.name ?? '',
    phone: d.phone ?? null,
    email: d.email ?? null,
    taxNumber: d.taxNumber ?? null,
    notes: d.notes ?? null,
    createdAt: tsToDate(d.createdAt),
    createdBy: d.createdBy ?? '',
    updatedAt: tsToDate(d.updatedAt),
    updatedBy: d.updatedBy ?? '',
  }
}

export interface CustomerListOpts {
  /** Free-text match against name/phone/email/taxNumber (case-insensitive). */
  search?: string
  page?: number
  pageSize?: number
}

export interface CustomerInput {
  name: string
  phone?: string | null
  email?: string | null
  taxNumber?: string | null
  notes?: string | null
}

export class CustomersRepository {
  async list(tenant: TenantContext, opts?: CustomerListOpts) {
    const snap = await adminDb
      .collection('posCustomers')
      .where('organizationId', '==', tenant.organizationId)
      .get()
    let items = snap.docs.map((d) => toCustomer(d.id, d.data()))

    const search = opts?.search?.trim().toLowerCase()
    if (search) {
      items = items.filter((c) => {
        const haystack = [c.name, c.phone ?? '', c.email ?? '', c.taxNumber ?? '']
          .join(' ')
          .toLowerCase()
        return haystack.includes(search)
      })
    }
    items.sort((a, b) => a.name.localeCompare(b.name))

    const page = opts?.page ?? 1
    const pageSize = opts?.pageSize ?? 20
    const total = items.length
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const safePage = Math.min(page, totalPages)
    const start = (safePage - 1) * pageSize
    return {
      items: items.slice(start, start + pageSize),
      total,
      page: safePage,
      pageSize,
      totalPages,
    }
  }

  async getById(tenant: TenantContext, id: string): Promise<PosCustomer | null> {
    const doc = await adminDb.collection('posCustomers').doc(id).get()
    if (!doc.exists) return null
    const d = doc.data()!
    if (d.organizationId !== tenant.organizationId) return null
    return toCustomer(doc.id, d)
  }

  async create(tenant: TenantContext, input: CustomerInput): Promise<string> {
    const now = new Date()
    const ref = await adminDb.collection('posCustomers').add({
      organizationId: tenant.organizationId,
      name: input.name,
      phone: input.phone ?? null,
      email: input.email ?? null,
      taxNumber: input.taxNumber ?? null,
      notes: input.notes ?? null,
      createdBy: tenant.userId,
      updatedBy: tenant.userId,
      createdAt: now,
      updatedAt: now,
    })
    return ref.id
  }

  async update(
    tenant: TenantContext,
    id: string,
    input: Partial<CustomerInput>,
  ): Promise<void> {
    const doc = await adminDb.collection('posCustomers').doc(id).get()
    if (!doc.exists || doc.data()!.organizationId !== tenant.organizationId) {
      throw new Error('Customer not found')
    }
    const patch: Record<string, unknown> = {
      updatedBy: tenant.userId,
      updatedAt: FieldValue.serverTimestamp(),
    }
    for (const key of ['name', 'phone', 'email', 'taxNumber', 'notes'] as const) {
      if (key in input) patch[key] = input[key] ?? null
    }
    await doc.ref.update(patch)
  }

  async delete(tenant: TenantContext, id: string): Promise<void> {
    const doc = await adminDb.collection('posCustomers').doc(id).get()
    if (!doc.exists || doc.data()!.organizationId !== tenant.organizationId) {
      throw new Error('Customer not found')
    }
    await doc.ref.delete()
  }
}
