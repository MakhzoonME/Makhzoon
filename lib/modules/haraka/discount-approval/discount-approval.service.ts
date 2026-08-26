import 'server-only';
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import type { TenantContext } from '@/lib/platform/tenancy/types'
import { hasPermission } from '@/lib/platform/permissions'
import { DiscountApprovalRepository } from './discount-approval.repository'

const repo = new DiscountApprovalRepository()

function requireApprover(tenant: TenantContext) {
  if (!hasPermission(tenant, 'haraka', 'approveDiscount')) {
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
}

export class DiscountApprovalService {
  async hasPin(tenant: TenantContext): Promise<boolean> {
    requireApprover(tenant)
    const hash = await repo.getPinHash(tenant.userId)
    return !!hash
  }

  /** Caller sets/changes their OWN PIN — must currently hold approveDiscount,
   *  and the PIN must not match any other approver's PIN in the org. */
  async setPin(tenant: TenantContext, pin: string): Promise<void> {
    requireApprover(tenant)
    const approvers = await repo.getApprovers(tenant.organizationId)
    const collision = approvers.some(
      (a) => a.id !== tenant.userId && a.pinHash && bcrypt.compareSync(pin, a.pinHash),
    )
    if (collision) {
      throw NextResponse.json(
        { error: 'This PIN is already in use by another approver. Choose a different one.' },
        { status: 409 },
      )
    }
    await repo.setPinHash(tenant.userId, pin)
  }

  async clearPin(tenant: TenantContext): Promise<void> {
    requireApprover(tenant)
    await repo.setPinHash(tenant.userId, null)
  }

  /** Matches a PIN against every current approver's PIN. Returns the match
   *  (for recording who approved) or null if no approver's PIN matches. */
  async verifyPin(tenant: TenantContext, pin: string): Promise<{ userId: string; displayName: string } | null> {
    const approvers = await repo.getApprovers(tenant.organizationId)
    const match = approvers.find((a) => a.pinHash && bcrypt.compareSync(pin, a.pinHash))
    return match ? { userId: match.id, displayName: match.displayName } : null
  }
}
