import 'server-only';
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { hasPermission } from '@/lib/permissions'
import type { AuthUser, UserRole } from '@/types/auth.types'

export interface Approver {
  id: string
  displayName: string
  pinHash: string | null
}

type Row = Record<string, unknown>

function toCandidate(r: Row): { authUser: AuthUser; pinHash: string | null; displayName: string } {
  return {
    authUser: {
      uid: r.id as string,
      email: (r.email as string) ?? '',
      displayName: (r.display_name as string) ?? '',
      role: r.role as UserRole,
      organizationId: r.organization_id as string,
      permissions: (r.permissions ?? null) as AuthUser['permissions'],
    },
    pinHash: (r.discount_pin_hash as string) ?? null,
    displayName: (r.display_name as string) ?? '',
  }
}

export class DiscountApprovalRepository {
  /** Every active org user who currently holds haraka.approveDiscount. */
  async getApprovers(orgId: string): Promise<Approver[]> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, display_name, email, role, permissions, discount_pin_hash')
      .eq('organization_id', orgId)
      .eq('status', 'active')
    if (error) throw error
    return (data ?? [])
      .map(toCandidate)
      .filter((c) => hasPermission(c.authUser, 'haraka', 'approveDiscount'))
      .map((c) => ({ id: c.authUser.uid, displayName: c.displayName, pinHash: c.pinHash }))
  }

  async getPinHash(userId: string): Promise<string | null> {
    const { data } = await supabaseAdmin
      .from('users')
      .select('discount_pin_hash')
      .eq('id', userId)
      .maybeSingle()
    return (data?.discount_pin_hash as string) ?? null
  }

  async setPinHash(userId: string, pin: string | null): Promise<void> {
    const { error } = await supabaseAdmin
      .from('users')
      .update({ discount_pin_hash: pin ? bcrypt.hashSync(pin, 10) : null })
      .eq('id', userId)
    if (error) throw error
  }
}
