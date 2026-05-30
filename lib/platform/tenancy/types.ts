import type { AuthUser } from '@/types/auth.types'
import type { Subscription } from '@/types/subscription.types'

export interface TenantContext {
  organizationId: string
  userId: string
  user: AuthUser
  role: AuthUser['role']
  permissions: AuthUser['permissions']
  subscription: Subscription | null
  /**
   * Spaces feature — populated by resolveTenant once PR-3 lands.
   * Until then undefined; repos that read it must fall back to org-only behavior.
   * Becomes required after the feature is enabled per env.
   */
  spaceId?: string
  accessibleSpaceIds?: string[]
  allSpaces?: boolean
}
