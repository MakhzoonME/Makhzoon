import { adminDb } from '@/lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'
import type { TenantContext } from '@/lib/platform/tenancy/types'
import type { Asset } from '@/types/asset.types'
import type { CreateAssetInput, UpdateAssetInput } from '@/lib/services/assets.service'

function toAsset(id: string, data: FirebaseFirestore.DocumentData): Asset {
  return { id, ...data } as Asset
}

export class AssetsRepository {
  private col = adminDb.collection('assets')

  async getAll(tenant: TenantContext): Promise<Asset[]> {
    const snap = await this.col.where('organizationId', '==', tenant.organizationId).get()
    return snap.docs.map(d => toAsset(d.id, d.data()))
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
      createdBy: tenant.userId,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: tenant.userId,
    }
    const ref = await this.col.add(data)
    const snap = await ref.get()
    return toAsset(ref.id, snap.data()!)
  }

  async update(tenant: TenantContext, id: string, input: UpdateAssetInput): Promise<Asset> {
    const data = {
      ...input,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: tenant.userId,
    }
    await this.col.doc(id).update(data)
    return this.getById(tenant, id) as Promise<Asset>
  }

  async delete(_tenant: TenantContext, id: string): Promise<void> {
    await this.col.doc(id).delete()
  }
}
