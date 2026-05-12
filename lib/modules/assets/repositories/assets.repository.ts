import { adminDb } from '@/lib/firebase/admin'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import type { TenantContext } from '@/lib/platform/tenancy/types'
import type { Asset } from '@/types/asset.types'
import type { CreateAssetInput, UpdateAssetInput } from '@/lib/services/assets.service'

function tsToDate(v: unknown): Date | undefined {
  if (!v) return undefined
  if (v instanceof Timestamp) return v.toDate()
  if (v instanceof Date) return v
  if (typeof v === 'string') {
    const d = new Date(v)
    return isNaN(d.getTime()) ? undefined : d
  }
  return undefined
}

function toAsset(id: string, data: FirebaseFirestore.DocumentData): Asset {
  return {
    ...data,
    id,
    purchaseDate: tsToDate(data.purchaseDate),
    createdAt: tsToDate(data.createdAt) ?? new Date(),
    updatedAt: tsToDate(data.updatedAt) ?? new Date(),
  } as Asset
}

type SortField = 'name' | 'category' | 'status' | 'serialNumber' | 'assignedTo' | 'location' | 'purchaseDate' | 'createdAt'

export interface GetAllAssetsOpts {
  status?: string
  category?: string
  search?: string
  page?: number
  pageSize?: number
  sortBy?: SortField
  sortDir?: 'asc' | 'desc'
}

export class AssetsRepository {
  private col = adminDb.collection('assets')

  async getAll(
    tenant: TenantContext,
    opts?: GetAllAssetsOpts
  ): Promise<{ items: Asset[]; total: number; page: number; pageSize: number; totalPages: number }> {
    const page = opts?.page ?? 1
    const pageSize = opts?.pageSize ?? 10
    const sortBy = opts?.sortBy ?? 'createdAt'
    const sortDir = opts?.sortDir ?? 'desc'

    const snap = await this.col.where('organizationId', '==', tenant.organizationId).get()
    let items: Asset[] = snap.docs.map(d => toAsset(d.id, d.data()))

    if (opts?.status) {
      items = items.filter(a => a.status === opts.status)
    }
    if (opts?.category) {
      items = items.filter(a => a.category === opts.category)
    }
    if (opts?.search) {
      const term = opts.search.toLowerCase()
      items = items.filter(a =>
        a.name.toLowerCase().includes(term) ||
        (a.category ?? '').toLowerCase().includes(term) ||
        (a.serialNumber ?? '').toLowerCase().includes(term) ||
        (a.assignedTo ?? '').toLowerCase().includes(term) ||
        (a.location ?? '').toLowerCase().includes(term)
      )
    }

    const total = items.length

    items.sort((a, b) => {
      const aVal = a[sortBy] as unknown
      const bVal = b[sortBy] as unknown
      const mult = sortDir === 'asc' ? 1 : -1
      if (aVal == null && bVal == null) return 0
      if (aVal == null) return mult
      if (bVal == null) return -mult
      if (aVal instanceof Date && bVal instanceof Date) return (aVal.getTime() - bVal.getTime()) * mult
      if (typeof aVal === 'number' && typeof bVal === 'number') return (aVal - bVal) * mult
      return String(aVal).localeCompare(String(bVal)) * mult
    })

    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const safePage = Math.min(page, totalPages)
    const start = (safePage - 1) * pageSize
    const pagedItems = items.slice(start, start + pageSize)

    return { items: pagedItems, total, page: safePage, pageSize, totalPages }
  }

  async getCategories(tenant: TenantContext): Promise<string[]> {
    const snap = await this.col
      .where('organizationId', '==', tenant.organizationId)
      .select('category')
      .get()
    const cats = new Set<string>()
    snap.docs.forEach(d => {
      const c = d.data().category as string | undefined
      if (c) cats.add(c)
    })
    return Array.from(cats).sort()
  }

  async getById(tenant: TenantContext, id: string): Promise<Asset | null> {
    const snap = await this.col.doc(id).get()
    if (!snap.exists) return null
    const asset = toAsset(snap.id, snap.data()!)
    return asset.organizationId === tenant.organizationId ? asset : null
  }

  async create(tenant: TenantContext, input: CreateAssetInput): Promise<Asset> {
    const data = {
      ...input,
      organizationId: tenant.organizationId,
      createdAt: FieldValue.serverTimestamp(),
      createdBy: tenant.user.uid,
      createdByEmail: tenant.user.email,
      createdByName: tenant.user.displayName,
      createdByRole: tenant.user.role,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: tenant.user.uid,
      updatedByEmail: tenant.user.email,
      updatedByName: tenant.user.displayName,
      updatedByRole: tenant.user.role,
    }
    const ref = await this.col.add(data)
    const snap = await ref.get()
    return toAsset(ref.id, snap.data()!)
  }

  async update(tenant: TenantContext, id: string, input: UpdateAssetInput): Promise<Asset> {
    const data = {
      ...input,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: tenant.user.uid,
      updatedByEmail: tenant.user.email,
      updatedByName: tenant.user.displayName,
      updatedByRole: tenant.user.role,
    }
    await this.col.doc(id).update(data)
    return this.getById(tenant, id) as Promise<Asset>
  }

  async delete(_tenant: TenantContext, id: string): Promise<void> {
    await this.col.doc(id).delete()
  }
}
