/**
 * Notification event catalog.
 * Every event type the system can emit, with its default delivery settings.
 * Used by the preferences UI and by notificationQueue to resolve recipients.
 */

export type NotificationEventType =
  | 'order.created'
  | 'order.status_changed'
  | 'order.assigned_to_you'
  | 'order.payment_recorded'
  | 'pos.session_closed'
  | 'pos.refund_issued'
  | 'pos.sale_voided'
  | 'inventory.low_stock'
  | 'inventory.out_of_stock'
  | 'inventory.purchase_received'
  | 'inventory.audit_completed'
  | 'requests.submitted'
  | 'requests.approved'
  | 'requests.rejected'
  | 'users.invited'
  | 'users.joined'
  | 'warranty.expiring'
  | 'subscription.expiring'
  | 'fawtara.failed'
  | 'service_job.created'
  | 'service_job.status_changed'

export type NotificationModule =
  | 'orders' | 'pos' | 'inventory' | 'requests' | 'users' | 'warranty' | 'system' | 'service_jobs'

export interface NotificationCatalogEntry {
  key: NotificationEventType
  label: string
  module: NotificationModule
  defaultRoles: string[]       // which org roles receive this by default
  defaultInApp: boolean
  defaultEmail: boolean
}

export const NOTIFICATION_CATALOG: NotificationCatalogEntry[] = [
  // ── Orders ────────────────────────────────────────────────────────────
  { key: 'order.created',          label: 'New order received',          module: 'orders',    defaultRoles: ['admin', 'org_owner'], defaultInApp: true,  defaultEmail: false },
  { key: 'order.status_changed',   label: 'Order status updated',        module: 'orders',    defaultRoles: ['admin', 'org_owner'], defaultInApp: true,  defaultEmail: false },
  { key: 'order.assigned_to_you',  label: 'Order assigned to you',       module: 'orders',    defaultRoles: ['staff', 'admin'],     defaultInApp: true,  defaultEmail: true  },
  { key: 'order.payment_recorded', label: 'Payment recorded on order',   module: 'orders',    defaultRoles: ['admin', 'org_owner'], defaultInApp: true,  defaultEmail: false },
  // ── POS ───────────────────────────────────────────────────────────────
  { key: 'pos.session_closed',     label: 'POS session closed',          module: 'pos',       defaultRoles: ['admin', 'org_owner'], defaultInApp: true,  defaultEmail: false },
  { key: 'pos.refund_issued',      label: 'Refund issued',               module: 'pos',       defaultRoles: ['admin', 'org_owner'], defaultInApp: true,  defaultEmail: true  },
  { key: 'pos.sale_voided',        label: 'Sale voided',                 module: 'pos',       defaultRoles: ['admin', 'org_owner'], defaultInApp: true,  defaultEmail: true  },
  // ── Inventory ──────────────────────────────────────────────────────────
  { key: 'inventory.low_stock',         label: 'Item stock is low',      module: 'inventory', defaultRoles: ['admin', 'org_owner'], defaultInApp: true,  defaultEmail: true  },
  { key: 'inventory.out_of_stock',      label: 'Item is out of stock',   module: 'inventory', defaultRoles: ['admin', 'org_owner'], defaultInApp: true,  defaultEmail: true  },
  { key: 'inventory.purchase_received', label: 'Purchase received',      module: 'inventory', defaultRoles: ['admin', 'org_owner'], defaultInApp: true,  defaultEmail: false },
  { key: 'inventory.audit_completed',   label: 'Stock audit completed',  module: 'inventory', defaultRoles: ['admin', 'org_owner'], defaultInApp: true,  defaultEmail: false },
  // ── Requests ───────────────────────────────────────────────────────────
  { key: 'requests.submitted',    label: 'New request submitted',        module: 'requests',  defaultRoles: ['admin', 'org_owner'], defaultInApp: true,  defaultEmail: true  },
  { key: 'requests.approved',     label: 'Your request was approved',    module: 'requests',  defaultRoles: ['staff', 'admin'],     defaultInApp: true,  defaultEmail: true  },
  { key: 'requests.rejected',     label: 'Your request was rejected',    module: 'requests',  defaultRoles: ['staff', 'admin'],     defaultInApp: true,  defaultEmail: true  },
  // ── Users ──────────────────────────────────────────────────────────────
  { key: 'users.invited', label: 'New user invited',                     module: 'users',     defaultRoles: ['admin', 'org_owner'], defaultInApp: true,  defaultEmail: false },
  { key: 'users.joined',  label: 'New user joined org',                  module: 'users',     defaultRoles: ['admin', 'org_owner'], defaultInApp: true,  defaultEmail: false },
  // ── System ─────────────────────────────────────────────────────────────
  { key: 'warranty.expiring',      label: 'Warranty expiring soon',      module: 'warranty',  defaultRoles: ['admin', 'org_owner'], defaultInApp: true,  defaultEmail: true  },
  { key: 'subscription.expiring',  label: 'Subscription expiring',       module: 'system',    defaultRoles: ['org_owner'],          defaultInApp: true,  defaultEmail: true  },
  { key: 'fawtara.failed',         label: 'Fawtara submission failed',   module: 'system',    defaultRoles: ['admin', 'org_owner'], defaultInApp: true,  defaultEmail: true  },
  // ── Service Jobs ────────────────────────────────────────────────────────
  { key: 'service_job.created',       label: 'New service job created',       module: 'service_jobs', defaultRoles: ['admin', 'org_owner'], defaultInApp: true, defaultEmail: false },
  { key: 'service_job.status_changed', label: 'Service job status updated',   module: 'service_jobs', defaultRoles: ['admin', 'org_owner'], defaultInApp: true, defaultEmail: false },
]

export const NOTIFICATION_EVENT_TYPES = NOTIFICATION_CATALOG.map((e) => e.key) as readonly NotificationEventType[]

export function getCatalogEntry(eventType: NotificationEventType): NotificationCatalogEntry | undefined {
  return NOTIFICATION_CATALOG.find((e) => e.key === eventType)
}

/** Group catalog entries by module for the preferences UI. */
export function getCatalogByModule(): Record<NotificationModule, NotificationCatalogEntry[]> {
  const result = {} as Record<NotificationModule, NotificationCatalogEntry[]>
  for (const entry of NOTIFICATION_CATALOG) {
    if (!result[entry.module]) result[entry.module] = []
    result[entry.module].push(entry)
  }
  return result
}
