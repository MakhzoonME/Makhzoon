import { adminDb } from '@/lib/firebase/admin'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import type { TenantContext } from '@/lib/platform/tenancy/types'
import type { TaxRate } from '@/types/pos.types'

function toTaxRate(id: string, d: FirebaseFirestore.DocumentData): TaxRate {
  return {
    id,
    organizationId: d.organizationId,
    name: d.name,
    rate: typeof d.rate === 'number' ? d.rate : 0,
    isDefault: d.isDefault === true,
    createdAt: d.createdAt instanceof Timestamp ? d.createdAt.toDate() : new Date(),
    createdBy: d.createdBy ?? '',
    updatedAt: d.updatedAt instanceof Timestamp ? d.updatedAt.toDate() : new Date(),
    updatedBy: d.updatedBy ?? '',
  }
}

export class TaxRatesRepository {
  async getAll(tenant: TenantContext): Promise<TaxRate[]> {
    const snap = await adminDb
      .collection('taxRates')
      .where('organizationId', '==', tenant.organizationId)
      .get()
    return snap.docs
      .map((d) => toTaxRate(d.id, d.data()))
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  async getById(tenant: TenantContext, id: string): Promise<TaxRate | null> {
    const doc = await adminDb.collection('taxRates').doc(id).get()
    if (!doc.exists) return null
    const d = doc.data()!
    if (d.organizationId !== tenant.organizationId) return null
    return toTaxRate(doc.id, d)
  }

  /**
   * Ensure at most one default exists per organization. Called from create/update
   * when the caller passes isDefault=true; flips every other doc to false in one batch.
   */
  private async clearOtherDefaults(tenant: TenantContext, excludeId?: string) {
    const snap = await adminDb
      .collection('taxRates')
      .where('organizationId', '==', tenant.organizationId)
      .where('isDefault', '==', true)
      .get()
    if (snap.empty) return
    const batch = adminDb.batch()
    snap.docs.forEach((d) => {
      if (d.id !== excludeId) batch.update(d.ref, { isDefault: false })
    })
    await batch.commit()
  }

  async create(
    tenant: TenantContext,
    input: { name: string; rate: number; isDefault?: boolean },
  ): Promise<string> {
    if (input.isDefault) await this.clearOtherDefaults(tenant)
    const now = new Date()
    const ref = await adminDb.collection('taxRates').add({
      organizationId: tenant.organizationId,
      name: input.name,
      rate: input.rate,
      isDefault: input.isDefault === true,
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
    input: { name?: string; rate?: number; isDefault?: boolean },
  ): Promise<void> {
    const doc = await adminDb.collection('taxRates').doc(id).get()
    if (!doc.exists || doc.data()!.organizationId !== tenant.organizationId) {
      throw new Error('Tax rate not found')
    }
    if (input.isDefault) await this.clearOtherDefaults(tenant, id)
    await doc.ref.update({
      ...input,
      updatedBy: tenant.userId,
      updatedAt: FieldValue.serverTimestamp(),
    })
  }

  async delete(tenant: TenantContext, id: string): Promise<void> {
    const doc = await adminDb.collection('taxRates').doc(id).get()
    if (!doc.exists || doc.data()!.organizationId !== tenant.organizationId) {
      throw new Error('Tax rate not found')
    }
    await doc.ref.delete()
  }
}
