import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
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
  clientId?: string | null
  clientSecret?: string | null
}

export class FawtaraConfigService {
  async get(tenant: TenantContext): Promise<FawtaraConfig> {
    requireFawtaraSettings(tenant)
    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('fawtara')
      .eq('id', tenant.organizationId)
      .maybeSingle()
    if (!org) throw new Error('Organization not found')
    const config =
      (org.fawtara as FawtaraConfig | undefined) ?? DEFAULT_FAWTARA_CONFIG

    const { data: priv } = await supabaseAdmin
      .from('organizations_private')
      .select('fawtara')
      .eq('organization_id', tenant.organizationId)
      .maybeSingle()
    const privFawtara = (priv?.fawtara as Record<string, unknown>) ?? {}
    const hasCreds = !!privFawtara.clientId && !!privFawtara.clientSecret

    return { ...config, hasClientCredentials: hasCreds }
  }

  async update(
    tenant: TenantContext,
    input: FawtaraConfigInput,
  ): Promise<FawtaraConfig> {
    requireFawtaraSettings(tenant)
    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('fawtara')
      .eq('id', tenant.organizationId)
      .maybeSingle()
    if (!org) throw new Error('Organization not found')
    const current: FawtaraConfig =
      (org.fawtara as FawtaraConfig | undefined) ?? DEFAULT_FAWTARA_CONFIG

    const next: FawtaraConfig = {
      enabled: input.enabled ?? current.enabled,
      mode: input.mode ?? current.mode,
      taxpayerNumber: input.taxpayerNumber ?? current.taxpayerNumber,
      activityNumber: input.activityNumber ?? current.activityNumber,
      hasClientCredentials: current.hasClientCredentials,
      invoiceTypeDefault:
        input.invoiceTypeDefault ?? current.invoiceTypeDefault,
      vatRegistered: input.vatRegistered ?? current.vatRegistered,
    }

    if (input.clientId !== undefined || input.clientSecret !== undefined) {
      const { data: priv } = await supabaseAdmin
        .from('organizations_private')
        .select('fawtara')
        .eq('organization_id', tenant.organizationId)
        .maybeSingle()
      const existingPriv =
        (priv?.fawtara as Record<string, unknown>) ?? {}
      const nextClientId =
        input.clientId !== undefined
          ? input.clientId
            ? encrypt(input.clientId)
            : null
          : (existingPriv.clientId as string | null) ?? null
      const nextClientSecret =
        input.clientSecret !== undefined
          ? input.clientSecret
            ? encrypt(input.clientSecret)
            : null
          : (existingPriv.clientSecret as string | null) ?? null
      const { error: privErr } = await supabaseAdmin
        .from('organizations_private')
        .upsert(
          {
            organization_id: tenant.organizationId,
            fawtara: {
              ...existingPriv,
              clientId: nextClientId,
              clientSecret: nextClientSecret,
              cipherVersion: isEncrypted(nextClientSecret ?? '')
                ? 'v1'
                : 'plain',
              updatedAt: new Date().toISOString(),
            },
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'organization_id' },
        )
      if (privErr) throw privErr
      next.hasClientCredentials = !!nextClientId && !!nextClientSecret
    }

    const { error: orgErr } = await supabaseAdmin
      .from('organizations')
      .update({ fawtara: next, updated_by: tenant.userId })
      .eq('id', tenant.organizationId)
    if (orgErr) throw orgErr

    auditLog.queue({
      tenant,
      module: 'pos',
      action: 'FAWTARA_CONFIG_UPDATED',
      recordId: tenant.organizationId,
      newValue: {
        enabled: next.enabled,
        mode: next.mode,
        invoiceTypeDefault: next.invoiceTypeDefault,
      },
    })

    return next
  }
}
