import type { AuthUser } from '@/types/auth.types'
import type { Subscription } from '@/types/subscription.types'

export interface TenantContext {
  organizationId: string
  userId: string
  user: AuthUser
  role: AuthUser['role']
  permissions: AuthUser['permissions']
  subscription: Subscription | null
}
