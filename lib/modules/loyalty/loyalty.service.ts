import { NextResponse } from 'next/server'
import type { TenantContext } from '@/lib/platform/tenancy/types'
import { auditLog } from '@/lib/platform/audit'
import { LoyaltyRepository } from './loyalty.repository'
import type { LoyaltyTierThreshold } from '@/types'

const repo = new LoyaltyRepository()

export class LoyaltyService {
  async getProgram(tenant: TenantContext) {
    const program = await repo.getProgram(tenant)
    return program ?? {
      organizationId:    tenant.organizationId,
      enabled:            false,
      pointsPerCurrency:  1,
      tiers:              [{ tier: 'bronze', minPoints: 0 }] as LoyaltyTierThreshold[],
      updatedAt:          new Date(),
      updatedBy:          null,
    }
  }

  async updateProgram(
    tenant: TenantContext,
    patch: Partial<{ enabled: boolean; pointsPerCurrency: number; tiers: LoyaltyTierThreshold[] }>,
  ) {
    const program = await repo.upsertProgram(tenant, patch)
    auditLog.queue({ tenant, module: 'loyalty', action: 'LOYALTY_CONFIG_UPDATED', newValue: patch })
    return program
  }

  async getOrEnrollMember(tenant: TenantContext, customerId: string) {
    const existing = await repo.getMemberByCustomer(tenant, customerId)
    if (existing) return existing
    const member = await repo.enroll(tenant, customerId)
    auditLog.queue({
      tenant,
      module:   'loyalty',
      action:   'LOYALTY_MEMBER_ENROLLED',
      recordId: member.id,
      newValue: { customerId, cardNumber: member.cardNumber },
    })
    return member
  }

  async listTransactions(tenant: TenantContext, memberId: string) {
    return repo.listTransactions(tenant, memberId)
  }

  /**
   * Single generic entry point for awarding points on a completed sale.
   * sourceModule/sourceRecordId are provenance only, never a behavioral
   * branch — identical logic whether the sale came from POS, an order, or a
   * Haraka service job. Callers should no-op silently if the program isn't
   * enabled for the org (checked here, not by each caller).
   */
  async awardPoints(
    tenant: TenantContext,
    customerId: string | null,
    amount: number,
    sourceModule: string,
    sourceRecordId: string,
  ) {
    if (!customerId || amount <= 0) return null
    const program = await repo.getProgram(tenant)
    if (!program?.enabled) return null

    const member = await this.getOrEnrollMember(tenant, customerId)
    const points = Math.floor(amount * program.pointsPerCurrency)
    if (points <= 0) return member

    const updated = await repo.applyPointsDelta(
      tenant,
      member.id,
      points,
      'sale',
      program.tiers,
      { sourceModule, sourceRecordId, createdBy: tenant.userId },
    )
    auditLog.queue({
      tenant,
      module:   'loyalty',
      action:   'LOYALTY_POINTS_AWARDED',
      recordId: updated.id,
      newValue: { points, sourceModule, sourceRecordId, newBalance: updated.pointsBalance, newTier: updated.tier },
    })
    return updated
  }
}
