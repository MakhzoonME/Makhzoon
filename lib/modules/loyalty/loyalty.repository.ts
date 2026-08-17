import 'server-only'
import { randomBytes } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { TenantContext } from '@/lib/platform/tenancy/types'
import type { LoyaltyProgram, LoyaltyMember, LoyaltyTransaction, LoyaltyTierThreshold } from '@/types'

type Row = Record<string, unknown>

function toProgram(r: Row): LoyaltyProgram {
  return {
    organizationId:    r.organization_id as string,
    enabled:            (r.enabled as boolean) ?? false,
    pointsPerCurrency:  Number(r.points_per_currency ?? 1),
    tiers:              (r.tiers as LoyaltyTierThreshold[]) ?? [{ tier: 'bronze', minPoints: 0 }],
    updatedAt:          r.updated_at ? new Date(r.updated_at as string) : new Date(),
    updatedBy:          (r.updated_by as string) ?? null,
  }
}

function toMember(r: Row): LoyaltyMember {
  return {
    id:             r.id as string,
    organizationId: r.organization_id as string,
    customerId:     r.customer_id as string,
    cardNumber:     r.card_number as string,
    tier:           (r.tier as string) ?? 'bronze',
    pointsBalance:  Number(r.points_balance ?? 0),
    enrolledAt:     r.enrolled_at ? new Date(r.enrolled_at as string) : new Date(),
    updatedAt:      r.updated_at ? new Date(r.updated_at as string) : new Date(),
  }
}

function toTransaction(r: Row): LoyaltyTransaction {
  return {
    id:              r.id as string,
    organizationId:  r.organization_id as string,
    memberId:        r.member_id as string,
    delta:           Number(r.delta ?? 0),
    reason:          r.reason as string,
    sourceModule:    (r.source_module as string) ?? null,
    sourceRecordId:  (r.source_record_id as string) ?? null,
    createdAt:       r.created_at ? new Date(r.created_at as string) : new Date(),
    createdBy:       (r.created_by as string) ?? null,
  }
}

function generateCardNumber(): string {
  // 12-digit numeric string — renders cleanly as a CODE128/EAN-13-style barcode.
  return randomBytes(6).readUIntBE(0, 6).toString().padStart(12, '0').slice(-12)
}

export class LoyaltyRepository {
  async getProgram(tenant: TenantContext): Promise<LoyaltyProgram | null> {
    const { data } = await supabaseAdmin
      .from('loyalty_programs')
      .select('*')
      .eq('organization_id', tenant.organizationId)
      .maybeSingle()
    return data ? toProgram(data as Row) : null
  }

  async upsertProgram(
    tenant: TenantContext,
    patch: Partial<{ enabled: boolean; pointsPerCurrency: number; tiers: LoyaltyTierThreshold[] }>,
  ): Promise<LoyaltyProgram> {
    const row: Row = { organization_id: tenant.organizationId, updated_by: tenant.userId }
    if (patch.enabled           !== undefined) row.enabled = patch.enabled
    if (patch.pointsPerCurrency !== undefined) row.points_per_currency = patch.pointsPerCurrency
    if (patch.tiers             !== undefined) row.tiers = patch.tiers
    const { data, error } = await supabaseAdmin
      .from('loyalty_programs')
      .upsert(row, { onConflict: 'organization_id' })
      .select('*')
      .single()
    if (error) throw error
    return toProgram(data as Row)
  }

  async getMemberByCustomer(tenant: TenantContext, customerId: string): Promise<LoyaltyMember | null> {
    const { data } = await supabaseAdmin
      .from('loyalty_members')
      .select('*')
      .eq('organization_id', tenant.organizationId)
      .eq('customer_id', customerId)
      .maybeSingle()
    return data ? toMember(data as Row) : null
  }

  async getMemberById(tenant: TenantContext, memberId: string): Promise<LoyaltyMember | null> {
    const { data } = await supabaseAdmin
      .from('loyalty_members')
      .select('*')
      .eq('organization_id', tenant.organizationId)
      .eq('id', memberId)
      .maybeSingle()
    return data ? toMember(data as Row) : null
  }

  async enroll(tenant: TenantContext, customerId: string): Promise<LoyaltyMember> {
    const { data, error } = await supabaseAdmin
      .from('loyalty_members')
      .insert({
        organization_id: tenant.organizationId,
        customer_id:      customerId,
        card_number:      generateCardNumber(),
      })
      .select('*')
      .single()
    if (error) throw error
    return toMember(data as Row)
  }

  async listTransactions(tenant: TenantContext, memberId: string): Promise<LoyaltyTransaction[]> {
    const { data, error } = await supabaseAdmin
      .from('loyalty_transactions')
      .select('*')
      .eq('organization_id', tenant.organizationId)
      .eq('member_id', memberId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []).map((r) => toTransaction(r as Row))
  }

  /** Append a ledger entry and update the member's cached balance + tier atomically-enough for this scale. */
  async applyPointsDelta(
    tenant: TenantContext,
    memberId: string,
    delta: number,
    reason: string,
    tiers: LoyaltyTierThreshold[],
    provenance: { sourceModule?: string | null; sourceRecordId?: string | null; createdBy?: string | null },
  ): Promise<LoyaltyMember> {
    const { error: insertError } = await supabaseAdmin
      .from('loyalty_transactions')
      .insert({
        organization_id:  tenant.organizationId,
        member_id:        memberId,
        delta,
        reason,
        source_module:     provenance.sourceModule ?? null,
        source_record_id:  provenance.sourceRecordId ?? null,
        created_by:        provenance.createdBy ?? null,
      })
    if (insertError) throw insertError

    const member = await this.getMemberById(tenant, memberId)
    if (!member) throw new Error('Loyalty member not found')
    const newBalance = Math.max(0, member.pointsBalance + delta)
    const newTier = [...tiers]
      .sort((a, b) => b.minPoints - a.minPoints)
      .find((t) => newBalance >= t.minPoints)?.tier ?? member.tier

    const { data, error } = await supabaseAdmin
      .from('loyalty_members')
      .update({ points_balance: newBalance, tier: newTier })
      .eq('id', memberId)
      .eq('organization_id', tenant.organizationId)
      .select('*')
      .single()
    if (error) throw error
    return toMember(data as Row)
  }
}
