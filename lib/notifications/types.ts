import type { NotificationEventType } from './catalog'
import type { TenantContext } from '@/lib/platform/tenancy/types'

export interface NotificationEnqueueInput {
  tenant: TenantContext
  eventType: NotificationEventType
  data: Record<string, unknown>
  link?: string
  /** Plain-text title override (use when title needs runtime values, e.g. order number) */
  titleOverride?: string
  /** Explicit recipient IDs — skips role-based fanout when provided */
  recipientIds?: string[]
}

export interface NotificationRow {
  id: string
  organizationId: string
  spaceId: string | null
  recipientId: string
  eventType: NotificationEventType
  title: string
  body: string | null
  data: Record<string, unknown>
  link: string | null
  isRead: boolean
  readAt: Date | null
  createdAt: Date
}

export interface NotificationPreference {
  organizationId: string
  userId: string
  eventType: NotificationEventType
  inApp: boolean
  email: boolean
}

export interface OrgNotificationDefault {
  organizationId: string
  eventType: NotificationEventType
  inAppEnabled: boolean
  emailEnabled: boolean
  notifyRoles: string[]
}
