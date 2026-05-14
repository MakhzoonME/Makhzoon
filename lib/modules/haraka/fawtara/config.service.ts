import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'
import type { TenantContext } from '@/lib/platform/tenancy/types'
import { hasPermission } from '@/lib/platform/permissions'
import { auditLog } from '@/lib/platform/audit'
import { encrypt, isEncrypted } from '@/lib/platform/crypto/secret-cipher'
import {
  DEFAULT_FAWTARA_CONFIG,
  type FawtaraConfig,
  type FawtaraMode,
  type FawtaraInvoiceType,
} from '@/types'

function requireFawtaraSettings(tenant: TenantContext) {
  if (!hasPermission(tenant, 'settings', 'fawtara')) {
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
}

export interface FawtaraConfigInput {
  enabled?: boolean
  mode?: FawtaraMode
  taxpayerNumber?: string | null
  activityNumber?: string | null
  invoiceTypeDefault?: FawtaraInvoiceType
  vatRegistered?: boolean
  /** Write-only on the UI; setting any of these updates the private secret doc. */
  clientId?: string | null
  clientSecret?: string | null
}

export class FawtaraConfigService {
  async get(tenant: TenantContext): Promise<FawtaraConfig> {
    requireFawtaraSettings(tenant)
    const doc = await adminDb.collection('organizations').doc(tenant.organizationId).get()
    if (!doc.exists) throw new Error('Organization not found')
    const config = (doc.data()?.fawtara as FawtaraConfig | undefined) ?? DEFAULT_FAWTARA_CONFIG

    const privDoc = await adminDb.collection('organizationsPrivate').doc(tenant.organizationId).get()
    const hasCreds =
      !!privDoc.exists &&
      !!privDoc.data()?.fawtara?.clientId &&
      !!privDoc.data()?.fawtara?.clientSecret

    return { ...config, hasClientCredentials: hasCreds }
  }

  async update(tenant: TenantContext, input: FawtaraConfigInput): Promise<FawtaraConfig> {
    requireFawtaraSettings(tenant)
    const orgRef = adminDb.collection('organizations').doc(tenant.organizationId)
    const privRef = adminDb.collection('organizationsPrivate').doc(tenant.organizationId)
    const orgDoc = await orgRef.get()
    if (!orgDoc.exists) throw new Error('Organization not found')
    const current: FawtaraConfig =
      (orgDoc.data()?.fawtara as FawtaraConfig | undefined) ?? DEFAULT_FAWTARA_CONFIG

    // Public part (org doc) — visible to the client.
    const next: FawtaraConfig = {
      enabled: input.enabled ?? current.enabled,
      mode: input.mode ?? current.mode,
      taxpayerNumber: input.taxpayerNumber ?? current.taxpayerNumber,
      activityNumber: input.activityNumber ?? current.activityNumber,
      hasClientCredentials: current.hasClientCredentials,
      invoiceTypeDefault: input.invoiceTypeDefault ?? current.invoiceTypeDefault,
      vatRegistered: input.vatRegistered ?? current.vatRegistered,
    }

    // Private part (separate doc) — only mutated when credentials change.
    // New writes are AES-GCM encrypted; existing rows may still be plaintext
    // and are preserved as-is until next write rotates them through encrypt().
    if (input.clientId !== undefined || input.clientSecret !== undefined) {
      const privDoc = await privRef.get()
      const existingPriv = privDoc.exists ? privDoc.data()?.fawtara ?? {} : {}
      const nextClientId =
        input.clientId !== undefined
          ? input.clientId
            ? encrypt(input.clientId)
            : null
          : existingPriv.clientId ?? null
      const nextClientSecret =
        input.clientSecret !== undefined
          ? input.clientSecret
            ? encrypt(input.clientSecret)
            : null
          : existingPriv.clientSecret ?? null
      await privRef.set(
        {
          organizationId: tenant.organizationId,
          fawtara: {
            ...existingPriv,
            clientId: nextClientId,
            clientSecret: nextClientSecret,
            // Flag for ops visibility — does NOT change decrypt behavior.
            cipherVersion: isEncrypted(nextClientSecret ?? '') ? 'v1' : 'plain',
            updatedAt: FieldValue.serverTimestamp(),
          },
        },
        { merge: true },
      )
      next.hasClientCredentials = !!nextClientId && !!nextClientSecret
    }

    await orgRef.update({
      fawtara: next,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: tenant.userId,
    })

    auditLog.queue({
      tenant,
      module: 'pos',
      action: 'FAWTARA_CONFIG_UPDATED',
      recordId: tenant.organizationId,
      newValue: {
        enabled: next.enabled,
        mode: next.mode,
        invoiceTypeDefault: next.invoiceTypeDefault,
        // Never log secrets.
      },
    })

    return next
  }
}
